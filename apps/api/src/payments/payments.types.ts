export type PaymentsProvider = 'mock' | 'square';

export type PaymentsLineItem = {
  name: string;
  note?: string | null;
  quantity: number;
  amountCents: number;
  currency: string;
};

export type PaymentsOrderTax = {
  name: string;
  percentage: string;
};

export type PaymentsOrderInput = {
  referenceId: string;
  idempotencyKey: string;
  lineItems: PaymentsLineItem[];
  taxes?: PaymentsOrderTax[];
};

export type PaymentsMoney = {
  amount?: number | bigint | null;
  currency?: string | null;
};

export type PaymentsOrderResponse = {
  id: string;
  totalMoney?: PaymentsMoney | null;
};

export type PaymentsPaymentInput = {
  sourceId?: string;
  orderId: string;
  amountCents: number;
  currency: string;
  idempotencyKey: string;
  buyerEmail?: string | null;
};

export type PaymentsPaymentResponse = {
  id: string;
  receiptUrl?: string | null;
};

export type PaymentsRefundInput = {
  paymentId: string;
  amountCents: number;
  currency: string;
  idempotencyKey: string;
  reason?: string | null;
};

export type PaymentsRefundResponse = {
  id: string;
};

export interface PaymentsClient {
  provider: PaymentsProvider;
  requiresSourceId: boolean;
  getDefaultCurrency(): string;
  createOrder(input: PaymentsOrderInput): Promise<PaymentsOrderResponse>;
  createPayment(input: PaymentsPaymentInput): Promise<PaymentsPaymentResponse>;
  refundPayment(input: PaymentsRefundInput): Promise<PaymentsRefundResponse>;
}
