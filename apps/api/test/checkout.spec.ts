import { BadRequestException } from '@nestjs/common';
import { CartStatus, OrderStatus, Prisma } from '@prisma/client';
import { CheckoutService } from '../src/checkout/checkout.service';
import { buildPaymentIdempotencyKey } from '../src/checkout/checkout.utils';

const makeCartItem = (overrides?: Partial<any>) => ({
  id: 'item_1',
  cartId: 'cart_1',
  productId: 'product_1',
  variantId: 'variant_1',
  qty: 2,
  unitPrice: new Prisma.Decimal('12.50'),
  currency: 'USD',
  meta: { productName: 'Gloves', itemDescription: 'Latex gloves' },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

describe('CheckoutService', () => {
  const squareService = {
    getDefaultCurrency: jest.fn().mockReturnValue('USD'),
    createSquareOrderFromCart: jest.fn(),
    createPayment: jest.fn()
  };

  const emailService = {
    sendOrderConfirmation: jest.fn()
  };

  const taxService = {
    calculateSalesTax: jest.fn(),
    isManualProvider: jest.fn().mockReturnValue(true)
  };

  const prisma = {
    cart: {
      findFirst: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn()
    },
    order: {
      upsert: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn()
    },
    orderStatusEvent: {
      create: jest.fn()
    },
    orderItem: {
      count: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn()
    },
    shipment: {
      create: jest.fn()
    },
    $transaction: jest.fn(async (ops: Array<Promise<unknown>>) => Promise.all(ops))
  };

  const service = new CheckoutService(
    prisma as any,
    squareService as any,
    emailService as any,
    taxService as any
  );

  beforeEach(() => {
    jest.clearAllMocks();
    taxService.calculateSalesTax.mockResolvedValue({ taxCents: 0, rate: 0 });
  });

  it('throws when cart is empty', async () => {
    prisma.cart.findFirst.mockResolvedValue(null);

    await expect(service.createCheckoutOrder('user_1', '123 Main St, Austin, TX 78701')).rejects.toThrow(BadRequestException);
  });

  it('creates a checkout response from cart', async () => {
    const cart = {
      id: 'cart_1',
      userId: 'user_1',
      status: CartStatus.ACTIVE,
      items: [makeCartItem(), makeCartItem({ id: 'item_2', qty: 1, unitPrice: new Prisma.Decimal('5.00') })]
    };
    prisma.cart.findFirst.mockResolvedValue(cart);
    taxService.calculateSalesTax.mockResolvedValue({ taxCents: 240, rate: 0.08 });

    const result = await service.createCheckoutOrder('user_1', '123 Main St, Austin, TX 78701');

    expect(squareService.createSquareOrderFromCart).not.toHaveBeenCalled();
    expect(prisma.order.upsert).not.toHaveBeenCalled();
    expect(result).toEqual({
      cartId: 'cart_1',
      subtotalCents: 3000,
      taxCents: 240,
      amountCents: 3240,
      currency: 'USD'
    });
  });

  it('rejects payment when cart is missing', async () => {
    prisma.cart.findFirst.mockResolvedValue(null);

    await expect(
      service.payOrder({
        supabaseUserId: 'user_1',
        cartId: 'cart_1',
        sourceId: 'token',
        shippingAddress: '123 Main St, Austin, TX 78701'
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('returns paid when cart is already submitted', async () => {
    prisma.cart.findFirst.mockResolvedValue({
      id: 'cart_1',
      userId: 'user_1',
      status: CartStatus.SUBMITTED,
      items: [makeCartItem()]
    });
    prisma.order.findFirst.mockResolvedValue({
      id: 'order_1',
      userId: 'user_1',
      status: OrderStatus.PAID,
      cartId: 'cart_1',
      items: [],
      shipments: [],
      squarePaymentId: 'pay_1',
      currency: 'USD'
    });
    prisma.orderItem.count.mockResolvedValue(1);

    const result = await service.payOrder({
      supabaseUserId: 'user_1',
      cartId: 'cart_1',
      sourceId: 'token',
      shippingAddress: '123 Main St, Austin, TX 78701'
    });

    expect(result.status).toBe('PAID');
    expect(result.orderId).toBe('order_1');
    expect(result.squarePaymentId).toBe('pay_1');
  });

  it('captures payment and creates order + cart update', async () => {
    prisma.cart.findFirst.mockResolvedValue({
      id: 'cart_1',
      userId: 'user_1',
      status: CartStatus.ACTIVE,
      cartId: 'cart_1',
      items: [makeCartItem({ cartId: 'cart_1', productId: 'product_1', variantId: 'variant_1' })]
    });
    taxService.calculateSalesTax.mockResolvedValue({ taxCents: 200, rate: 0.1 });
    squareService.createSquareOrderFromCart.mockResolvedValue({ id: 'sq_order_1' });
    squareService.createPayment.mockResolvedValue({ id: 'pay_1', receiptUrl: 'https://example.com' });
    prisma.order.findFirst.mockResolvedValue(null);
    prisma.order.create.mockResolvedValue({
      id: 'order_1',
      userId: 'user_1',
      status: OrderStatus.PAID,
      squareOrderId: 'sq_order_1',
      total: new Prisma.Decimal('20.00'),
      currency: 'USD',
      createdAt: new Date(),
      cartId: 'cart_1',
      items: [],
      shipments: []
    });
    prisma.cart.update.mockResolvedValue({ id: 'cart_1' });
    prisma.orderItem.count.mockResolvedValue(0);
    prisma.cart.findUnique.mockResolvedValue({
      id: 'cart_1',
      items: [
        makeCartItem({ cartId: 'cart_1', productId: 'product_1', variantId: 'variant_1' })
      ]
    });
    prisma.orderItem.findMany.mockResolvedValue([
      { name: 'Gloves', qty: 2, unitPrice: new Prisma.Decimal('12.50') }
    ]);

    const result = await service.payOrder({
      supabaseUserId: 'user_1',
      cartId: 'cart_1',
      sourceId: 'token_1',
      buyerEmail: 'buyer@example.com',
      shippingAddress: '123 Main St, Austin, TX 78701'
    });

    expect(squareService.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: buildPaymentIdempotencyKey('cart_1', 'token_1')
      })
    );
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.order.create).toHaveBeenCalled();
    expect(prisma.orderItem.createMany).toHaveBeenCalled();
    expect(prisma.shipment.create).toHaveBeenCalled();
    expect(result).toEqual({
      status: 'PAID',
      orderId: 'order_1',
      squarePaymentId: 'pay_1',
      receiptUrl: 'https://example.com'
    });
  });
});
