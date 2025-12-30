import { Injectable } from '@nestjs/common';
import { SquareClient, SquareEnvironment, WebhooksHelper } from 'square';
import type { Currency, Order, Payment } from 'square';
import { getEnv } from '../env';

export type SquareLineItemInput = {
  name: string;
  quantity: number;
  amountCents: number;
  currency: Currency;
  note?: string | null;
};

export type SquareOrderTaxInput = {
  name: string;
  percentage: string;
};

export type SquareOrderInput = {
  referenceId: string;
  idempotencyKey: string;
  lineItems: SquareLineItemInput[];
  taxes?: SquareOrderTaxInput[];
};

export type SquarePaymentInput = {
  sourceId: string;
  squareOrderId: string;
  amountCents: number;
  currency: Currency;
  idempotencyKey: string;
  buyerEmail?: string | null;
};

export type SquareRefundInput = {
  paymentId: string;
  amountCents: number;
  currency: Currency;
  idempotencyKey: string;
  reason?: string | null;
};

export type SquareOrderResponse = Order & { id: string };
export type SquarePaymentResponse = Payment & { id: string };

@Injectable()
export class SquareService {
  private readonly client: SquareClient;
  private readonly locationId?: string;
  private readonly currency: Currency;
  private readonly webhookSignatureKey?: string;

  constructor() {
    const env = getEnv();
    this.locationId = env.SQUARE_LOCATION_ID;
    this.currency = env.SQUARE_CURRENCY as Currency;
    this.webhookSignatureKey = env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    this.client = new SquareClient({
      token: env.SQUARE_ACCESS_TOKEN,
      environment:
        env.SQUARE_ENV === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
    });
  }

  getDefaultCurrency(): Currency {
    return this.currency;
  }

  getLocationId() {
    if (!this.locationId) {
      throw new Error('SQUARE_LOCATION_ID is not configured.');
    }
    return this.locationId;
  }

  async createSquareOrderFromCart(input: SquareOrderInput): Promise<SquareOrderResponse> {
    const response = await this.client.orders.create({
      idempotencyKey: input.idempotencyKey,
      order: {
        locationId: this.getLocationId(),
        referenceId: input.referenceId,
        lineItems: input.lineItems.map((item) => ({
          name: item.name,
          note: item.note ?? undefined,
          quantity: String(item.quantity),
          basePriceMoney: {
            amount: BigInt(item.amountCents),
            currency: item.currency,
          },
        })),
        taxes: input.taxes?.map((tax) => ({
          name: tax.name,
          percentage: tax.percentage,
          type: 'ADDITIVE',
          scope: 'ORDER',
        })),
      },
    });

    if (response.errors?.length) {
      const message = response.errors[0]?.detail ?? 'Square order creation failed.';
      throw new Error(message);
    }

    if (!response.order?.id) {
      throw new Error('Square order creation failed.');
    }

    return response.order as SquareOrderResponse;
  }

  async createPayment(input: SquarePaymentInput): Promise<SquarePaymentResponse> {
    const response = await this.client.payments.create({
      sourceId: input.sourceId,
      idempotencyKey: input.idempotencyKey,
      orderId: input.squareOrderId,
      autocomplete: true,
      amountMoney: {
        amount: BigInt(input.amountCents),
        currency: input.currency,
      },
      buyerEmailAddress: input.buyerEmail ?? undefined,
    });

    if (response.errors?.length) {
      const message = response.errors[0]?.detail ?? 'Square payment failed.';
      throw new Error(message);
    }

    if (!response.payment?.id) {
      throw new Error('Square payment failed.');
    }

    return response.payment as SquarePaymentResponse;
  }

  async refundPayment(input: SquareRefundInput) {
    const response = await this.client.refunds.refundPayment({
      idempotencyKey: input.idempotencyKey,
      paymentId: input.paymentId,
      amountMoney: {
        amount: BigInt(input.amountCents),
        currency: input.currency,
      },
      reason: input.reason ?? undefined,
    });

    if (response.errors?.length) {
      const message = response.errors[0]?.detail ?? 'Square refund failed.';
      throw new Error(message);
    }

    if (!response.refund?.id) {
      throw new Error('Square refund failed.');
    }

    return response.refund;
  }

  async verifyWebhookSignature(body: string, signature: string, url: string): Promise<boolean> {
    if (!this.webhookSignatureKey) {
      return false;
    }

    return WebhooksHelper.verifySignature({
      requestBody: body,
      signatureHeader: signature,
      signatureKey: this.webhookSignatureKey,
      notificationUrl: url,
    });
  }
}
