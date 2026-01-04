import { Test } from '@nestjs/testing';

describe('PaymentsModule', () => {
  const originalProvider = process.env.PAYMENTS_PROVIDER;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = 'test';
    process.env.PAYMENTS_PROVIDER = 'mock';
  });

  afterEach(() => {
    if (originalProvider) {
      process.env.PAYMENTS_PROVIDER = originalProvider;
    } else {
      delete process.env.PAYMENTS_PROVIDER;
    }
    if (originalNodeEnv) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  it('returns the mock client when PAYMENTS_PROVIDER=mock', async () => {
    const { PaymentsModule } = await import('../src/payments/payments.module');
    const { PAYMENTS_CLIENT } = await import('../src/payments/payments.constants');

    const moduleRef = await Test.createTestingModule({
      imports: [PaymentsModule],
    }).compile();

    const client = moduleRef.get(PAYMENTS_CLIENT);
    expect(client.provider).toBe('mock');
  });

  it('returns the square client when PAYMENTS_PROVIDER=square', async () => {
    jest.resetModules();
    process.env.PAYMENTS_PROVIDER = 'square';

    const { PaymentsModule } = await import('../src/payments/payments.module');
    const { PAYMENTS_CLIENT } = await import('../src/payments/payments.constants');

    const moduleRef = await Test.createTestingModule({
      imports: [PaymentsModule],
    }).compile();

    const client = moduleRef.get(PAYMENTS_CLIENT);
    expect(client.provider).toBe('square');
  });
});
