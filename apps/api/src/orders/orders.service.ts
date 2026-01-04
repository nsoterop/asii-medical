import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma, ShipmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import { buildRefundIdempotencyKey, decimalToCents } from '../checkout/checkout.utils';
import { PAYMENTS_CLIENT } from '../payments/payments.constants';
import type { PaymentsClient } from '../payments/payments.types';

const OPEN_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.FULFILLING,
  OrderStatus.SHIPPED,
];

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    @Inject(PAYMENTS_CLIENT) private readonly paymentsClient: PaymentsClient,
  ) {}

  async listUserOrders(userId: string, status?: string) {
    const where: Prisma.OrderWhereInput = { userId };

    if (status === 'open') {
      where.status = { in: OPEN_ORDER_STATUSES };
    } else if (status && status !== 'all') {
      if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
        throw new BadRequestException('Invalid order status filter.');
      }
      where.status = status as OrderStatus;
    }

    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { items: true, shipments: true },
    });
    const hydrated = await Promise.all(orders.map((order) => this.ensureOrderItems(order)));
    return hydrated;
  }

  async getUserOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true, shipments: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    return this.ensureOrderItems(order);
  }

  async listAdminOrders(status?: string, filters?: { query?: string; date?: string }) {
    const where: Prisma.OrderWhereInput = {};

    if (status && status !== 'all') {
      const statusMap: Record<string, OrderStatus | OrderStatus[]> = {
        paid: [OrderStatus.PAID, OrderStatus.FULFILLING],
        shipped: OrderStatus.SHIPPED,
        completed: OrderStatus.DELIVERED,
      };
      const mapped = statusMap[status];
      if (!mapped) {
        throw new BadRequestException('Invalid admin status filter.');
      }
      if (Array.isArray(mapped)) {
        where.status = { in: mapped };
      } else {
        where.status = mapped;
      }
    }

    const query = filters?.query?.trim();
    if (query) {
      where.OR = [
        { id: { contains: query, mode: 'insensitive' } },
        { squareOrderId: { contains: query, mode: 'insensitive' } },
        { squarePaymentId: { contains: query, mode: 'insensitive' } },
        { items: { some: { name: { contains: query, mode: 'insensitive' } } } },
        { items: { some: { description: { contains: query, mode: 'insensitive' } } } },
        { shipments: { some: { trackingNo: { contains: query, mode: 'insensitive' } } } },
        { shipments: { some: { trackingUrl: { contains: query, mode: 'insensitive' } } } },
      ];
    }

    if (filters?.date) {
      const parsed = new Date(filters.date);
      if (!Number.isNaN(parsed.getTime())) {
        const start = new Date(parsed);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setUTCDate(start.getUTCDate() + 1);
        where.createdAt = { gte: start, lt: end };
      }
    }

    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { items: true, shipments: true },
    });
    const hydrated = await Promise.all(orders.map((order) => this.ensureOrderItems(order)));
    return hydrated;
  }

  async fulfillOrder(
    orderId: string,
    input: {
      carrier?: string;
      service?: string;
      trackingNo?: string;
      trackingUrl?: string;
    },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { shipments: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    const pendingShipment = order.shipments.find(
      (shipment) => shipment.status === ShipmentStatus.PENDING,
    );
    const sortedShipments = [...order.shipments].sort((a, b) => {
      const aTime = new Date(a.updatedAt ?? a.createdAt).getTime();
      const bTime = new Date(b.updatedAt ?? b.createdAt).getTime();
      return bTime - aTime;
    });
    const existing = pendingShipment ?? sortedShipments[0] ?? null;
    const shippedAt = new Date();

    const nextShipmentStatus =
      existing?.status === ShipmentStatus.DELIVERED
        ? ShipmentStatus.DELIVERED
        : ShipmentStatus.SHIPPED;
    const shipmentData: Prisma.ShipmentCreateInput = {
      order: { connect: { id: order.id } },
      carrier: input.carrier ?? null,
      service: input.service ?? null,
      trackingNo: input.trackingNo ?? null,
      trackingUrl: input.trackingUrl ?? null,
      shippedAt,
      status: nextShipmentStatus,
    };

    const transaction: Array<Prisma.PrismaPromise<unknown>> = [];

    if (existing) {
      transaction.push(
        this.prisma.shipment.update({
          where: { id: existing.id },
          data: {
            carrier: shipmentData.carrier,
            service: shipmentData.service,
            trackingNo: shipmentData.trackingNo,
            trackingUrl: shipmentData.trackingUrl,
            shippedAt,
            status: nextShipmentStatus,
          },
        }),
      );
    } else {
      transaction.push(this.prisma.shipment.create({ data: shipmentData }));
    }

    if (order.status !== OrderStatus.SHIPPED && order.status !== OrderStatus.DELIVERED) {
      transaction.push(
        this.prisma.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.SHIPPED },
        }),
      );
      transaction.push(
        this.prisma.orderStatusEvent.create({
          data: {
            orderId: order.id,
            from: order.status,
            to: OrderStatus.SHIPPED,
          },
        }),
      );
    }

    await this.prisma.$transaction(transaction);

    await this.sendShippingEmail(order.userId, {
      orderId: order.id,
      shippedAt,
      carrier: input.carrier,
      service: input.service,
      trackingNo: input.trackingNo,
      trackingUrl: input.trackingUrl,
    });

    return { status: 'SHIPPED' };
  }

  async markDelivered(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { shipments: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    const deliveredAt = new Date();
    const target =
      order.shipments.find((shipment) => shipment.status === ShipmentStatus.SHIPPED) ??
      order.shipments[0];

    if (target) {
      await this.prisma.shipment.update({
        where: { id: target.id },
        data: {
          deliveredAt,
          status: ShipmentStatus.DELIVERED,
        },
      });
    } else {
      await this.prisma.shipment.create({
        data: {
          order: { connect: { id: order.id } },
          status: ShipmentStatus.DELIVERED,
          deliveredAt,
        },
      });
    }

    if (order.status !== OrderStatus.DELIVERED) {
      await this.prisma.$transaction([
        this.prisma.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.DELIVERED },
        }),
        this.prisma.orderStatusEvent.create({
          data: {
            orderId: order.id,
            from: order.status,
            to: OrderStatus.DELIVERED,
          },
        }),
      ]);
    }

    return { status: 'DELIVERED' };
  }

  async cancelOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { shipments: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    if (order.status === OrderStatus.CANCELED) {
      return { status: 'CANCELED' };
    }

    const cancellableStatuses = new Set<OrderStatus>([
      OrderStatus.PAID,
      OrderStatus.FULFILLING,
      OrderStatus.PENDING_PAYMENT,
      OrderStatus.FAILED,
    ]);

    if (!cancellableStatuses.has(order.status)) {
      throw new BadRequestException('Order cannot be canceled.');
    }

    let nextStatus: OrderStatus = OrderStatus.CANCELED;
    let refundId: string | null = null;

    const shouldRefund =
      order.squarePaymentId &&
      (order.status === OrderStatus.PAID || order.status === OrderStatus.FULFILLING);

    if (shouldRefund && order.squarePaymentId) {
      try {
        const refund = await this.paymentsClient.refundPayment({
          paymentId: order.squarePaymentId,
          amountCents: decimalToCents(order.total),
          currency: order.currency,
          idempotencyKey: buildRefundIdempotencyKey(order.id, order.squarePaymentId),
          reason: `Canceled order ${order.id}`,
        });
        refundId = refund.id ?? null;
        nextStatus = OrderStatus.REFUNDED;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Refund failed.';
        this.logger.warn(`Refund failed for order ${order.id}: ${message}`);
        throw new BadRequestException('Refund failed. Order was not canceled.');
      }
    }

    const updates: Array<Prisma.PrismaPromise<unknown>> = [
      this.prisma.order.update({
        where: { id: order.id },
        data: { status: nextStatus },
      }),
      this.prisma.orderStatusEvent.create({
        data: {
          orderId: order.id,
          from: order.status,
          to: nextStatus,
          note: refundId ? `Refund ${refundId}` : undefined,
        },
      }),
    ];

    if (order.shipments.length > 0) {
      updates.push(
        this.prisma.shipment.updateMany({
          where: { orderId: order.id },
          data: { status: ShipmentStatus.CANCELED },
        }),
      );
    }

    await this.prisma.$transaction(updates);

    return { status: nextStatus };
  }

  private async sendShippingEmail(
    userId: string,
    shipment: {
      orderId: string;
      shippedAt?: Date;
      carrier?: string;
      service?: string;
      trackingNo?: string;
      trackingUrl?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { supabaseUserId: userId } });
    if (!user?.email) {
      this.logger.warn(`Shipping email skipped for order ${shipment.orderId}: missing user email.`);
      return;
    }

    try {
      await this.emailService.sendShippingConfirmation(user.email, {
        orderId: shipment.orderId,
        shippedAt: shipment.shippedAt ?? null,
        carrier: shipment.carrier ?? null,
        service: shipment.service ?? null,
        trackingNo: shipment.trackingNo ?? null,
        trackingUrl: shipment.trackingUrl ?? null,
      });
    } catch (error) {
      this.logger.warn(`Shipping email failed: ${(error as Error).message}`);
    }
  }

  private async ensureOrderItems(order: {
    id: string;
    cartId: string;
    currency: string;
    items?: Array<{
      id: string;
      name: string;
      description: string | null;
      qty: number;
      unitPrice: Prisma.Decimal;
      currency: string;
    }>;
    shipments?: unknown[];
  }) {
    if (order.items && order.items.length > 0) {
      return order;
    }

    const existingCount = await this.prisma.orderItem.count({ where: { orderId: order.id } });
    if (existingCount > 0) {
      const refreshed = await this.prisma.order.findUnique({
        where: { id: order.id },
        include: { items: true, shipments: true },
      });
      return refreshed ?? order;
    }

    const cart = await this.prisma.cart.findUnique({
      where: { id: order.cartId },
      include: { items: true },
    });

    if (!cart || cart.items.length === 0) {
      return order;
    }

    const items = cart.items.map((item) => {
      const rawMeta = (item.meta ?? {}) as Record<string, unknown>;
      const productName =
        typeof rawMeta.productName === 'string' && rawMeta.productName.trim()
          ? rawMeta.productName
          : null;
      const itemDescription =
        typeof rawMeta.itemDescription === 'string' && rawMeta.itemDescription.trim()
          ? rawMeta.itemDescription
          : null;
      const name =
        productName || itemDescription || `Item ${item.variantId ?? item.productId ?? item.id}`;
      const description = itemDescription && itemDescription !== name ? itemDescription : null;
      const meta = {
        ...rawMeta,
        ndcItemCode: typeof rawMeta.ndcItemCode === 'string' ? rawMeta.ndcItemCode : undefined,
        manufacturer:
          typeof rawMeta.manufacturerName === 'string' ? rawMeta.manufacturerName : undefined,
        uom: typeof rawMeta.uomFactor === 'number' ? rawMeta.uomFactor : undefined,
        manufacturerItemCode:
          typeof rawMeta.manufacturerItemCode === 'string'
            ? rawMeta.manufacturerItemCode
            : undefined,
      };

      return {
        orderId: order.id,
        productId: item.productId,
        variantId: item.variantId,
        name,
        description,
        qty: item.qty,
        unitPrice: item.unitPrice,
        currency: item.currency ?? order.currency,
        meta,
      };
    });

    await this.prisma.orderItem.createMany({ data: items });

    const refreshed = await this.prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true, shipments: true },
    });
    return refreshed ?? order;
  }
}
