import { Injectable } from '@nestjs/common';
import type { Currency } from 'square';
import { SquareService } from '../square/square.service';
import type {
  PaymentsClient,
  PaymentsOrderInput,
  PaymentsOrderResponse,
  PaymentsPaymentInput,
  PaymentsPaymentResponse,
  PaymentsRefundInput,
  PaymentsRefundResponse,
} from './payments.types';

@Injectable()
export class SquarePaymentsClient implements PaymentsClient {
  provider: PaymentsClient['provider'] = 'square';
  requiresSourceId = true;

  constructor(private readonly squareService: SquareService) {}

  getDefaultCurrency(): string {
    return this.squareService.getDefaultCurrency();
  }

  async createOrder(input: PaymentsOrderInput): Promise<PaymentsOrderResponse> {
    const order = await this.squareService.createSquareOrderFromCart({
      referenceId: input.referenceId,
      idempotencyKey: input.idempotencyKey,
      lineItems: input.lineItems.map((item) => ({
        name: item.name,
        note: item.note,
        quantity: item.quantity,
        amountCents: item.amountCents,
        currency: item.currency as Currency,
      })),
      taxes: input.taxes,
    });

    return {
      id: order.id,
      totalMoney: order.totalMoney
        ? {
            amount: order.totalMoney.amount ?? null,
            currency: order.totalMoney.currency ?? null,
          }
        : null,
    };
  }

  async createPayment(input: PaymentsPaymentInput): Promise<PaymentsPaymentResponse> {
    if (!input.sourceId) {
      throw new Error('Payment source is required.');
    }

    const payment = await this.squareService.createPayment({
      sourceId: input.sourceId,
      squareOrderId: input.orderId,
      amountCents: input.amountCents,
      currency: input.currency as Currency,
      idempotencyKey: input.idempotencyKey,
      buyerEmail: input.buyerEmail ?? undefined,
    });

    return {
      id: payment.id,
      receiptUrl: payment.receiptUrl ?? null,
    };
  }

  async refundPayment(input: PaymentsRefundInput): Promise<PaymentsRefundResponse> {
    const refund = await this.squareService.refundPayment({
      paymentId: input.paymentId,
      amountCents: input.amountCents,
      currency: input.currency as Currency,
      idempotencyKey: input.idempotencyKey,
      reason: input.reason ?? undefined,
    });

    return { id: refund.id };
  }
}
