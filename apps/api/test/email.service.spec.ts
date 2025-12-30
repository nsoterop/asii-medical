import { EmailService } from '../src/notifications/email.service';
import { buildOrderConfirmation } from '../src/notifications/templates/order-confirmation';
import { buildShippingConfirmation } from '../src/notifications/templates/shipping-confirmation';

describe('Email templates', () => {
  it('builds order confirmation content', () => {
    const template = buildOrderConfirmation({
      orderId: 'order_123',
      createdAt: '2024-01-01T00:00:00Z',
      currency: 'USD',
      total: 99.5,
      items: [{ name: 'Gloves', qty: 2, unitPrice: 10 }],
    });

    expect(template.subject).toContain('order_123');
    expect(template.html).toContain('Gloves');
    expect(template.text).toContain('Total');
  });

  it('builds shipping confirmation content', () => {
    const template = buildShippingConfirmation({
      orderId: 'order_456',
      shippedAt: '2024-02-02T00:00:00Z',
      carrier: 'UPS',
      trackingNo: '1Z999',
      trackingUrl: 'https://track.example.com/1Z999',
    });

    expect(template.subject).toContain('order_456');
    expect(template.html).toContain('UPS');
    expect(template.text).toContain('1Z999');
  });
});

describe('EmailService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.EMAIL_PROVIDER;
    delete process.env.EMAIL_FROM;
    delete process.env.RESEND_API_KEY;
  });

  it('sends via Resend when configured', async () => {
    process.env.EMAIL_PROVIDER = 'resend';
    process.env.EMAIL_FROM = 'orders@example.com';
    process.env.RESEND_API_KEY = 'test-key';

    const fetchMock = jest.fn().mockResolvedValue({ ok: true, text: async () => '' });
    global.fetch = fetchMock as unknown as typeof fetch;

    const service = new EmailService();
    await service.sendOrderConfirmation('buyer@example.com', {
      orderId: 'order_789',
      createdAt: new Date('2024-03-03T00:00:00Z'),
      currency: 'USD',
      total: 42,
      items: [{ name: 'Mask', qty: 1, unitPrice: 42 }],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
        }),
      }),
    );
  });

  it('skips sending when email is missing', async () => {
    process.env.EMAIL_PROVIDER = 'log';
    const service = new EmailService();

    await expect(
      service.sendShippingConfirmation(null, {
        orderId: 'order_000',
        shippedAt: new Date(),
      }),
    ).resolves.toBeUndefined();
  });
});
