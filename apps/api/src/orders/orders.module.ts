import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SquareModule } from '../square/square.module';
import { AdminOrdersController } from './admin-orders.controller';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [AuthModule, PrismaModule, NotificationsModule, SquareModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService]
})
export class OrdersModule {}
