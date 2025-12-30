import { BadRequestException } from '@nestjs/common';
import { SquareWebhookController } from '../src/square/square.webhook.controller';
import { OrderStatus } from '@prisma/client';

const makeRequest = (body: unknown) =>
  ({
    body: Buffer.from(JSON.stringify(body)),
    protocol: 'https',
    get: () => 'api.example.com',
    originalUrl: '/webhooks/square'
  }) as any;

describe('SquareWebhookController', () => {
  it('rejects invalid signatures', async () => {
    const squareService = { verifyWebhookSignature: jest.fn().mockResolvedValue(false) } as any;
    const prisma = {} as any;
    const controller = new SquareWebhookController(squareService, prisma);

    await expect(
      controller.handleSquareWebhook(makeRequest({ type: 'payment.updated' }) as any, 'bad')
    ).rejects.toThrow(BadRequestException);
  });

  it('marks order paid on completed payment', async () => {
    const squareService = { verifyWebhookSignature: jest.fn().mockResolvedValue(true) } as any;
    const prisma = {
      order: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'order_1',
          cartId: 'cart_1',
          status: OrderStatus.PENDING_PAYMENT,
          squarePaymentId: null
        }),
        update: jest.fn().mockResolvedValue({ id: 'order_1' })
      },
      cart: {
        update: jest.fn().mockResolvedValue({ id: 'cart_1' })
      },
      orderStatusEvent: {
        create: jest.fn().mockResolvedValue({ id: 'evt_1' })
      },
      $transaction: jest.fn(async (ops: Array<Promise<unknown>>) => Promise.all(ops))
    } as any;
    const controller = new SquareWebhookController(squareService, prisma);

    await controller.handleSquareWebhook(
      makeRequest({
        type: 'payment.updated',
        data: { object: { payment: { id: 'pay_1', status: 'COMPLETED', orderId: 'sq_1' } } }
      }) as any,
      'sig'
    );

    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order_1' },
        data: expect.objectContaining({ status: OrderStatus.PAID })
      })
    );
  });

  it('marks order refunded when refund equals total', async () => {
    const squareService = { verifyWebhookSignature: jest.fn().mockResolvedValue(true) } as any;
    const prisma = {
      order: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'order_2',
          status: OrderStatus.PAID,
          total: { toString: () => '10.00' }
        }),
        update: jest.fn().mockResolvedValue({ id: 'order_2' })
      },
      orderStatusEvent: {
        create: jest.fn().mockResolvedValue({ id: 'evt_2' })
      },
      $transaction: jest.fn(async (ops: Array<Promise<unknown>>) => Promise.all(ops))
    } as any;
    const controller = new SquareWebhookController(squareService, prisma);

    await controller.handleSquareWebhook(
      makeRequest({
        type: 'refund.created',
        data: { object: { refund: { paymentId: 'pay_2', amountMoney: { amount: 1000 } } } }
      }) as any,
      'sig'
    );

    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: OrderStatus.REFUNDED }
      })
    );
  });
});
