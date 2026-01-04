import { MockPaymentsClient } from '../src/payments/mock-payments.client';

describe('MockPaymentsClient', () => {
  it('returns deterministic ids and totals', async () => {
    const client = new MockPaymentsClient();
    const orderInput = {
      referenceId: 'cart_1',
      idempotencyKey: 'order_key',
      lineItems: [
        { name: 'Gloves', quantity: 2, amountCents: 1000, currency: 'USD' },
        { name: 'Masks', quantity: 1, amountCents: 500, currency: 'USD' },
      ],
      taxes: [{ name: 'Sales Tax', percentage: '10' }],
    };

    const firstOrder = await client.createOrder(orderInput);
    const secondOrder = await client.createOrder(orderInput);

    expect(firstOrder.id).toBe(secondOrder.id);
    expect(firstOrder.totalMoney?.amount).toBe(2750);

    const firstPayment = await client.createPayment({
      orderId: firstOrder.id,
      amountCents: 2750,
      currency: 'USD',
      idempotencyKey: 'pay_key',
    });
    const secondPayment = await client.createPayment({
      orderId: firstOrder.id,
      amountCents: 2750,
      currency: 'USD',
      idempotencyKey: 'pay_key',
    });

    expect(firstPayment.id).toBe(secondPayment.id);

    const refund = await client.refundPayment({
      paymentId: firstPayment.id,
      amountCents: 2750,
      currency: 'USD',
      idempotencyKey: 'refund_key',
    });

    expect(refund.id).toMatch(/^mock_refund_/);
  });
});
