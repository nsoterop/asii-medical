import { Module } from '@nestjs/common';
import { AdminImportsModule } from './imports/imports.module';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { SearchModule } from './search/search.module';
import { CatalogModule } from './catalog/catalog.module';
import { AdminSearchModule } from './search/admin-search.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    SearchModule,
    CatalogModule,
    AdminSearchModule,
    AdminImportsModule,
    AuthModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
