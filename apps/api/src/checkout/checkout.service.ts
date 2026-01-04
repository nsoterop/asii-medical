import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CartStatus, OrderStatus, Prisma, ShipmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import {
  buildOrderIdempotencyKey,
  buildPaymentIdempotencyKey,
  calculateCartTotals,
  decimalToCents,
  extractUsStateFromAddress,
  parseUsShippingAddress,
} from './checkout.utils';
import { TaxService, type TaxQuote } from '../tax/tax.service';
import { PAYMENTS_CLIENT } from '../payments/payments.constants';
import type { PaymentsClient } from '../payments/payments.types';

export type CheckoutCreateResponse = {
  cartId: string;
  subtotalCents: number;
  taxCents: number;
  amountCents: number;
  currency: string;
};

export type CheckoutPayResponse = {
  status: 'PAID';
  orderId: string;
  squarePaymentId: string;
  receiptUrl?: string | null;
};

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENTS_CLIENT) private readonly paymentsClient: PaymentsClient,
    private readonly emailService: EmailService,
    private readonly taxService: TaxService,
  ) {}

  async createCheckoutOrder(
    supabaseUserId: string,
    shippingAddress?: string | null,
  ): Promise<CheckoutCreateResponse> {
    const cart = await this.prisma.cart.findFirst({
      where: { userId: supabaseUserId, status: CartStatus.ACTIVE },
      include: { items: true },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty.');
    }

    const parsedAddress = this.parseShippingAddressOrThrow(shippingAddress);

    const { subtotal } = calculateCartTotals(
      cart.items.map((item) => ({
        qty: item.qty,
        unitPrice: item.unitPrice,
      })),
    );

    const currency = this.resolveCurrency(cart.items);
    let taxQuote: TaxQuote;
    try {
      taxQuote = await this.taxService.calculateSalesTax({
        toAddress: parsedAddress,
        lineItems: this.buildTaxLineItems(cart.items),
      });
    } catch (error) {
      this.logger.warn(`Tax calculation failed: ${(error as Error).message}`);
      throw new BadRequestException('Unable to calculate sales tax.');
    }
    const subtotalCents = decimalToCents(subtotal);
    const taxCents = taxQuote.taxCents;
    const amountCents = subtotalCents + taxCents;
    if (amountCents <= 0) {
      throw new BadRequestException('Cart total must be greater than zero.');
    }

    return {
      cartId: cart.id,
      subtotalCents,
      taxCents,
      amountCents,
      currency,
    };
  }

  async payOrder(params: {
    supabaseUserId: string;
    cartId: string;
    sourceId?: string;
    buyerEmail?: string | null;
    shippingAddress?: string | null;
  }): Promise<CheckoutPayResponse> {
    const cart = await this.prisma.cart.findFirst({
      where: { id: params.cartId, userId: params.supabaseUserId },
      include: { items: true },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty.');
    }

    const existing = await this.prisma.order.findFirst({
      where: { cartId: cart.id, userId: params.supabaseUserId },
      include: { items: true, shipments: true },
    });

    if (
      existing &&
      existing.status !== OrderStatus.FAILED &&
      existing.status !== OrderStatus.CANCELED
    ) {
      if (cart.status !== CartStatus.SUBMITTED) {
        await this.prisma.cart.update({
          where: { id: cart.id },
          data: { status: CartStatus.SUBMITTED },
        });
      }
      if (existing.items.length === 0) {
        await this.snapshotOrderItems(existing.id, existing.cartId, existing.currency);
      }
      if (existing.shipments.length === 0) {
        await this.prisma.shipment.create({
          data: { orderId: existing.id, status: ShipmentStatus.PENDING },
        });
      }
      return {
        status: 'PAID',
        orderId: existing.id,
        squarePaymentId: existing.squarePaymentId ?? '',
        receiptUrl: null,
      };
    }

    if (cart.status === CartStatus.SUBMITTED) {
      throw new BadRequestException('Cart already submitted.');
    }

    if (cart.status !== CartStatus.ACTIVE) {
      throw new BadRequestException('Cart cannot be paid.');
    }

    const parsedAddress = this.parseShippingAddressOrThrow(params.shippingAddress);
    const sourceId = params.sourceId?.trim() || undefined;

    if (this.paymentsClient.requiresSourceId && !sourceId) {
      throw new BadRequestException('Payment source is required.');
    }

    const { subtotal } = calculateCartTotals(
      cart.items.map((item) => ({
        qty: item.qty,
        unitPrice: item.unitPrice,
      })),
    );

    const currency = this.resolveCurrency(cart.items);
    let taxQuote: TaxQuote;
    try {
      taxQuote = await this.taxService.calculateSalesTax({
        toAddress: parsedAddress,
        lineItems: this.buildTaxLineItems(cart.items),
      });
    } catch (error) {
      this.logger.warn(`Tax calculation failed: ${(error as Error).message}`);
      throw new BadRequestException('Unable to calculate sales tax.');
    }
    const subtotalCents = decimalToCents(subtotal);
    const taxCents = taxQuote.taxCents;
    const amountCents = subtotalCents + taxCents;
    if (amountCents <= 0) {
      throw new BadRequestException('Order total must be greater than zero.');
    }

    const taxRate =
      taxQuote.rate > 0 && Number.isFinite(taxQuote.rate)
        ? taxQuote.rate
        : subtotalCents > 0
          ? taxCents / subtotalCents
          : 0;
    const taxPercentage = taxRate > 0 ? (taxRate * 100).toFixed(4) : null;

    const lineItems = cart.items.map((item) => {
      const meta = (item.meta ?? {}) as Record<string, unknown>;
      const productName =
        typeof meta.productName === 'string' && meta.productName.trim() ? meta.productName : null;
      const itemDescription =
        typeof meta.itemDescription === 'string' && meta.itemDescription.trim()
          ? meta.itemDescription
          : null;

      const name =
        productName || itemDescription || `Item ${item.variantId ?? item.productId ?? item.id}`;

      const note = itemDescription && itemDescription !== name ? itemDescription : null;

      return {
        name,
        note,
        quantity: item.qty,
        amountCents: decimalToCents(item.unitPrice),
        currency,
      };
    });

    const lineItemSignature = cart.items
      .map(
        (item) =>
          `${item.productId}:${item.variantId ?? ''}:${item.qty}:${item.unitPrice.toString()}`,
      )
      .sort()
      .join('|');

    try {
      const paymentOrder = await this.paymentsClient.createOrder({
        referenceId: cart.id,
        idempotencyKey: buildOrderIdempotencyKey(`${cart.id}:${lineItemSignature}`),
        lineItems,
        taxes: taxPercentage
          ? [
              {
                name: 'Sales Tax',
                percentage: taxPercentage,
              },
            ]
          : undefined,
      });

      const squareTotalCents = paymentOrder.totalMoney?.amount
        ? Number(paymentOrder.totalMoney.amount)
        : amountCents;

      const payment = await this.paymentsClient.createPayment({
        sourceId,
        orderId: paymentOrder.id,
        amountCents: squareTotalCents,
        currency,
        idempotencyKey: buildPaymentIdempotencyKey(cart.id, sourceId ?? 'mock'),
        buyerEmail: params.buyerEmail,
      });

      const existingOrder = await this.prisma.order.findFirst({
        where: {
          userId: params.supabaseUserId,
          OR: [{ squarePaymentId: payment.id }, { squareOrderId: paymentOrder.id }],
        },
        include: { items: true, shipments: true },
      });

      if (existingOrder) {
        if (existingOrder.items.length === 0) {
          await this.snapshotOrderItems(
            existingOrder.id,
            existingOrder.cartId,
            existingOrder.currency,
          );
        }
        if (existingOrder.shipments.length === 0) {
          await this.prisma.shipment.create({
            data: { orderId: existingOrder.id, status: ShipmentStatus.PENDING },
          });
        }
        return {
          status: 'PAID',
          orderId: existingOrder.id,
          squarePaymentId: existingOrder.squarePaymentId ?? payment.id,
          receiptUrl: payment.receiptUrl ?? null,
        };
      }

      const createdOrder = await this.prisma.order.create({
        data: {
          userId: params.supabaseUserId,
          cartId: cart.id,
          squareOrderId: paymentOrder.id,
          squarePaymentId: payment.id,
          status: OrderStatus.PAID,
          currency,
          subtotal: new Prisma.Decimal(subtotal),
          total: new Prisma.Decimal(squareTotalCents).div(100),
        },
      });

      await this.prisma.$transaction([
        this.prisma.orderStatusEvent.create({
          data: {
            orderId: createdOrder.id,
            from: null,
            to: OrderStatus.PAID,
          },
        }),
        this.prisma.cart.update({
          where: { id: cart.id },
          data: { status: CartStatus.SUBMITTED },
        }),
      ]);

      await this.snapshotOrderItems(createdOrder.id, cart.id, currency);
      await this.prisma.shipment.create({
        data: { orderId: createdOrder.id, status: ShipmentStatus.PENDING },
      });

      try {
        await this.emailService.sendOrderConfirmation(params.buyerEmail, {
          orderId: createdOrder.id,
          createdAt: createdOrder.createdAt,
          currency: createdOrder.currency,
          total: createdOrder.total.toString(),
          items: await this.getOrderItemsForEmail(createdOrder.id),
        });
      } catch (error) {
        this.logger.warn(`Order confirmation email failed: ${(error as Error).message}`);
      }

      return {
        status: 'PAID',
        orderId: createdOrder.id,
        squarePaymentId: payment.id,
        receiptUrl: payment.receiptUrl ?? null,
      };
    } catch (error) {
      this.logger.error('Payment failed', error as Error);
      throw new BadRequestException('Payment failed. Please try again.');
    }
  }

  async getOrderStatus(supabaseUserId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId: supabaseUserId },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    return {
      orderId: order.id,
      status: order.status,
    };
  }

  private resolveCurrency(items: Array<{ currency: string | null }>): string {
    const fallback = this.paymentsClient.getDefaultCurrency();
    const currency = items.find((item) => item.currency)?.currency ?? fallback;

    const mismatched = items.find((item) => item.currency && item.currency !== currency);

    if (mismatched) {
      throw new BadRequestException('Cart contains mixed currencies.');
    }

    return currency ?? fallback;
  }

  private parseShippingAddressOrThrow(value?: string | null) {
    const raw = value?.trim() ?? '';
    if (!raw) {
      throw new BadRequestException('Shipping address is required.');
    }

    if (this.taxService.isManualProvider()) {
      const state = extractUsStateFromAddress(raw);
      if (!state) {
        throw new BadRequestException('Shipping address must include a state (e.g., NC).');
      }
      return {
        line1: raw,
        city: raw,
        state,
        zip: '',
        country: 'US',
      };
    }

    try {
      return parseUsShippingAddress(raw);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid shipping address.';
      throw new BadRequestException(message);
    }
  }

  private buildTaxLineItems(
    items: Array<{
      id: string;
      variantId: string | null;
      productId: string;
      qty: number;
      unitPrice: Prisma.Decimal;
    }>,
  ) {
    return items.map((item) => ({
      id: item.variantId ?? item.productId ?? item.id,
      quantity: item.qty,
      unitPrice: item.unitPrice,
    }));
  }

  private async snapshotOrderItems(orderId: string, cartId: string, currency: string) {
    const existing = await this.prisma.orderItem.count({ where: { orderId } });
    if (existing > 0) {
      return;
    }

    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: true },
    });

    if (!cart || cart.items.length === 0) {
      return;
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
        orderId,
        productId: item.productId,
        variantId: item.variantId,
        name,
        description,
        qty: item.qty,
        unitPrice: item.unitPrice,
        currency: item.currency ?? currency,
        meta,
      };
    });

    await this.prisma.orderItem.createMany({ data: items });
  }

  private async getOrderItemsForEmail(orderId: string) {
    const items = await this.prisma.orderItem.findMany({ where: { orderId } });
    return items.map((item) => ({
      name: item.name,
      qty: item.qty,
      unitPrice: item.unitPrice.toString(),
    }));
  }
}
