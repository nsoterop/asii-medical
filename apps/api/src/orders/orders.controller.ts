import { BadRequestException, Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { SupabaseAuthGuard, AuthenticatedRequest } from '../auth/supabase-auth.guard';

@UseGuards(SupabaseAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async list(@Req() request: AuthenticatedRequest, @Query('status') status?: string) {
    const supabaseUserId = request.auth?.supabaseUserId;
    if (!supabaseUserId) {
      throw new BadRequestException('Missing auth context.');
    }

    return this.ordersService.listUserOrders(supabaseUserId, status);
  }

  @Get(':id')
  async detail(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    const supabaseUserId = request.auth?.supabaseUserId;
    if (!supabaseUserId) {
      throw new BadRequestException('Missing auth context.');
    }

    return this.ordersService.getUserOrder(supabaseUserId, id);
  }
}
