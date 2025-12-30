import {
  BadRequestException,
  Controller,
  Headers,
  Logger,
  Post,
  Req
} from '@nestjs/common';
import { Request } from 'express';
import { CartStatus, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SquareService } from './square.service';

@Controller('webhooks')
export class SquareWebhookController {
  private readonly logger = new Logger(SquareWebhookController.name);

  constructor(
    private readonly squareService: SquareService,
    private readonly prisma: PrismaService
  ) {}

  @Post('square')
  async handleSquareWebhook(
    @Req() request: Request,
    @Headers('x-square-hmacsha256-signature') signature?: string
  ) {
    if (!signature) {
      throw new BadRequestException('Missing Square signature.');
    }

    const rawBody = this.getRawBody(request);

    const url = `${request.protocol}://${request.get('host')}${request.originalUrl}`;
    const valid = await this.squareService.verifyWebhookSignature(rawBody, signature, url);
    if (!valid) {
      throw new BadRequestException('Invalid Square signature.');
    }

    let event: any = null;
    try {
      event = JSON.parse(rawBody);
    } catch (error) {
      this.logger.warn('Square webhook payload was not valid JSON.');
    }

    if (event?.type) {
      this.logger.log(`Square webhook received: ${event.type}`);
    }

    if (event?.type === 'payment.updated') {
      const payment = event.data?.object?.payment;
      if (payment?.id) {
        const order = await this.prisma.order.findFirst({
          where: {
            OR: [
              { squarePaymentId: payment.id },
              { squareOrderId: payment.orderId ?? '' }
            ]
          }
        });

        if (order) {
          if (payment.status === 'COMPLETED') {
            await this.markOrderPaid(order, payment.id);
          } else if (['FAILED', 'CANCELED'].includes(payment.status)) {
            if (order.status === OrderStatus.PENDING_PAYMENT) {
              await this.transitionOrderStatus(order, OrderStatus.FAILED, {
                note: `Square payment ${payment.status?.toLowerCase() ?? 'failed'}`
              });
            }
          }
        }
      }
    }

    if (event?.type === 'refund.created' || event?.type === 'refund.updated') {
      const refund = event.data?.object?.refund;
      if (refund?.paymentId) {
        const order = await this.prisma.order.findFirst({
          where: {
            OR: [
              { squarePaymentId: refund.paymentId },
              { squareOrderId: refund.orderId ?? '' }
            ]
          }
        });

        if (order) {
          const refundAmount = Number(refund.amountMoney?.amount ?? 0);
          const totalAmount = Number(order.total.toString()) * 100;
          const nextStatus =
            refundAmount >= totalAmount ? OrderStatus.REFUNDED : OrderStatus.PARTIALLY_REFUNDED;
          await this.transitionOrderStatus(order, nextStatus, {
            note: 'Square refund processed'
          });
        }
      }
    }

    return { received: true };
  }

  private getRawBody(request: Request) {
    const typed = request as Request & { rawBody?: Buffer };
    if (typed.rawBody) {
      return typed.rawBody.toString('utf8');
    }
    if (Buffer.isBuffer(request.body)) {
      return request.body.toString('utf8');
    }
    if (typeof request.body === 'string') {
      return request.body;
    }
    return JSON.stringify(request.body ?? {});
  }

  private async markOrderPaid(order: { id: string; cartId: string; status: OrderStatus; squarePaymentId: string | null }, paymentId: string) {
    const updates: Array<Prisma.PrismaPromise<unknown>> = [];
    const data: Prisma.OrderUpdateInput = { status: OrderStatus.PAID };
    if (!order.squarePaymentId) {
      data.squarePaymentId = paymentId;
    }
    updates.push(
      this.prisma.order.update({
        where: { id: order.id },
        data
      })
    );
    if (order.status !== OrderStatus.PAID) {
      updates.push(
        this.prisma.orderStatusEvent.create({
          data: {
            orderId: order.id,
            from: order.status,
            to: OrderStatus.PAID
          }
        })
      );
    }
    updates.push(
      this.prisma.cart.update({
        where: { id: order.cartId },
        data: { status: CartStatus.SUBMITTED }
      })
    );

    await this.prisma.$transaction(updates);
  }

  private async transitionOrderStatus(
    order: { id: string; status: OrderStatus },
    nextStatus: OrderStatus,
    options?: { note?: string }
  ) {
    if (order.status === nextStatus) {
      return;
    }

    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: order.id },
        data: { status: nextStatus }
      }),
      this.prisma.orderStatusEvent.create({
        data: {
          orderId: order.id,
          from: order.status,
          to: nextStatus,
          note: options?.note
        }
      })
    ]);
  }
}
