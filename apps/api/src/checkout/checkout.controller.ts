import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards
} from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { SupabaseAuthGuard, AuthenticatedRequest } from '../auth/supabase-auth.guard';

@UseGuards(SupabaseAuthGuard)
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('create')
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() body: { shippingAddress?: string }
  ) {
    const supabaseUserId = request.auth?.supabaseUserId;
    if (!supabaseUserId) {
      throw new BadRequestException('Missing auth context.');
    }

    return this.checkoutService.createCheckoutOrder(supabaseUserId, body?.shippingAddress);
  }

  @Post('pay')
  async pay(
    @Req() request: AuthenticatedRequest,
    @Body()
    body: {
      cartId?: string;
      sourceId?: string;
      buyerEmail?: string;
      shippingAddress?: string;
    }
  ) {
    const supabaseUserId = request.auth?.supabaseUserId;
    if (!supabaseUserId) {
      throw new BadRequestException('Missing auth context.');
    }

    if (!body?.cartId || !body?.sourceId || !body?.shippingAddress) {
      throw new BadRequestException('cartId, sourceId, and shippingAddress are required.');
    }

    const buyerEmail = body?.buyerEmail?.trim() || request.auth?.email || request.user?.email || null;

    return this.checkoutService.payOrder({
      supabaseUserId,
      cartId: body.cartId,
      sourceId: body.sourceId,
      buyerEmail,
      shippingAddress: body.shippingAddress
    });
  }

  @Get(':orderId/status')
  async status(
    @Req() request: AuthenticatedRequest,
    @Param('orderId') orderId: string
  ) {
    const supabaseUserId = request.auth?.supabaseUserId;
    if (!supabaseUserId) {
      throw new BadRequestException('Missing auth context.');
    }

    return this.checkoutService.getOrderStatus(supabaseUserId, orderId);
  }
}
