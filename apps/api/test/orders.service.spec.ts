import { NotFoundException } from '@nestjs/common';
import { OrderStatus, ShipmentStatus } from '@prisma/client';
import { OrdersService } from '../src/orders/orders.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { EmailService } from '../src/notifications/email.service';
import { SquareService } from '../src/square/square.service';

type OrderStub = {
  id: string;
  userId: string;
  status: OrderStatus;
  createdAt: Date;
  shipments: unknown[];
  squarePaymentId?: string | null;
  currency?: string;
  total?: { toString: () => string };
};

type MockPrisma = {
  order: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  shipment: {
    create: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  orderStatusEvent: {
    create: jest.Mock;
  };
  user: {
    findUnique: jest.Mock;
  };
  $transaction: jest.Mock;
};

type MockEmailService = {
  sendShippingConfirmation: jest.Mock;
};

type MockSquareService = {
  refundPayment: jest.Mock;
};

const makeOrder = (overrides?: Partial<OrderStub>): OrderStub => ({
  id: 'order_1',
  userId: 'user_1',
  status: OrderStatus.PAID,
  createdAt: new Date(),
  shipments: [],
  ...overrides,
});

describe('OrdersService', () => {
  const prisma: MockPrisma = {
    order: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    shipment: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    orderStatusEvent: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(async (ops: Array<Promise<unknown>>) => Promise.all(ops)),
  };

  const emailService: MockEmailService = {
    sendShippingConfirmation: jest.fn(),
  };

  const squareService: MockSquareService = {
    refundPayment: jest.fn(),
  };

  const service = new OrdersService(
    prisma as unknown as PrismaService,
    emailService as unknown as EmailService,
    squareService as unknown as SquareService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters user orders by open status', async () => {
    prisma.order.findMany.mockResolvedValue([]);

    await service.listUserOrders('user_1', 'open');

    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user_1',
          status: { in: [OrderStatus.PAID, OrderStatus.FULFILLING, OrderStatus.SHIPPED] },
        },
      }),
    );
  });

  it('throws when user order is missing', async () => {
    prisma.order.findFirst.mockResolvedValue(null);

    await expect(service.getUserOrder('user_1', 'order_x')).rejects.toThrow(NotFoundException);
  });

  it('fulfills an order and sends shipping email', async () => {
    prisma.order.findUnique.mockResolvedValue(
      makeOrder({
        status: OrderStatus.PAID,
        shipments: [],
      }),
    );
    prisma.shipment.create.mockResolvedValue({ id: 'ship_1', status: ShipmentStatus.SHIPPED });
    prisma.order.update.mockResolvedValue({ id: 'order_1' });
    prisma.orderStatusEvent.create.mockResolvedValue({ id: 'evt_1' });
    prisma.user.findUnique.mockResolvedValue({ email: 'buyer@example.com' });

    await service.fulfillOrder('order_1', { carrier: 'UPS', trackingNo: '1Z' });

    expect(prisma.shipment.create).toHaveBeenCalled();
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: OrderStatus.SHIPPED } }),
    );
    expect(emailService.sendShippingConfirmation).toHaveBeenCalled();
  });

  it('refunds on cancel when payment is captured', async () => {
    prisma.order.findUnique.mockResolvedValue(
      makeOrder({
        status: OrderStatus.PAID,
        squarePaymentId: 'pay_1',
        currency: 'USD',
        total: { toString: () => '10.00' },
        shipments: [],
      }),
    );
    squareService.refundPayment.mockResolvedValue({ id: 'refund_1' });
    prisma.order.update.mockResolvedValue({ id: 'order_1' });
    prisma.orderStatusEvent.create.mockResolvedValue({ id: 'evt_1' });

    const result = await service.cancelOrder('order_1');

    expect(squareService.refundPayment).toHaveBeenCalled();
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: OrderStatus.REFUNDED } }),
    );
    expect(result.status).toBe('REFUNDED');
  });
});
