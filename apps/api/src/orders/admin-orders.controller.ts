import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { OrdersService } from './orders.service';

@UseGuards(SupabaseAuthGuard, AdminGuard)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async list(
    @Query('status') status?: string,
    @Query('q') query?: string,
    @Query('date') date?: string
  ) {
    return this.ordersService.listAdminOrders(status, { query, date });
  }

  @Post(':id/fulfill')
  async fulfill(
    @Param('id') id: string,
    @Body()
    body: {
      carrier?: string;
      service?: string;
      trackingNo?: string;
      trackingUrl?: string;
    }
  ) {
    return this.ordersService.fulfillOrder(id, body ?? {});
  }

  @Post(':id/mark-delivered')
  async markDelivered(@Param('id') id: string) {
    return this.ordersService.markDelivered(id);
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string) {
    return this.ordersService.cancelOrder(id);
  }
}
