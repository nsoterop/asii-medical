import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { getEnv } from '../env';
import type {
  PaymentsClient,
  PaymentsOrderInput,
  PaymentsOrderResponse,
  PaymentsPaymentInput,
  PaymentsPaymentResponse,
  PaymentsRefundInput,
  PaymentsRefundResponse,
} from './payments.types';

const hashKey = (value: string) => createHash('sha256').update(value).digest('hex').slice(0, 16);

const buildMockId = (prefix: string, seed: string) => `${prefix}_${hashKey(seed)}`;

@Injectable()
export class MockPaymentsClient implements PaymentsClient {
  provider: PaymentsClient['provider'] = 'mock';
  requiresSourceId = false;
  private readonly currency: string;

  constructor() {
    this.currency = getEnv().SQUARE_CURRENCY;
  }

  getDefaultCurrency(): string {
    return this.currency;
  }

  async createOrder(input: PaymentsOrderInput): Promise<PaymentsOrderResponse> {
    const subtotal = input.lineItems.reduce(
      (acc, item) => acc + item.amountCents * item.quantity,
      0,
    );
    const taxCents = (input.taxes ?? []).reduce((acc, tax) => {
      const rate = Number(tax.percentage);
      if (!Number.isFinite(rate) || rate <= 0) {
        return acc;
      }
      return acc + Math.round(subtotal * (rate / 100));
    }, 0);
    const totalCents = subtotal + taxCents;
    const currency = input.lineItems[0]?.currency ?? this.currency;

    return {
      id: buildMockId('mock_order', input.idempotencyKey),
      totalMoney: { amount: totalCents, currency },
    };
  }

  async createPayment(input: PaymentsPaymentInput): Promise<PaymentsPaymentResponse> {
    const id = buildMockId('mock_payment', input.idempotencyKey);
    return {
      id,
      receiptUrl: `https://example.test/receipts/${id}`,
    };
  }

  async refundPayment(input: PaymentsRefundInput): Promise<PaymentsRefundResponse> {
    return { id: buildMockId('mock_refund', input.idempotencyKey) };
  }
}
