import { Module } from '@nestjs/common';
import { AdminImportsModule } from './imports/imports.module';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { SearchModule } from './search/search.module';
import { CatalogModule } from './catalog/catalog.module';
import { AdminSearchModule } from './search/admin-search.module';
import { AuthModule } from './auth/auth.module';
import { SquareModule } from './square/square.module';
import { CheckoutModule } from './checkout/checkout.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OrdersModule } from './orders/orders.module';
import { AdminProductsModule } from './products/admin-products.module';

@Module({
  imports: [
    PrismaModule,
    SearchModule,
    CatalogModule,
    AdminSearchModule,
    AdminImportsModule,
    AuthModule,
    SquareModule,
    CheckoutModule,
    NotificationsModule,
    OrdersModule,
    AdminProductsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
