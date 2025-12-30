import { Module } from '@nestjs/common';
import { AdminProductsController } from './admin-products.controller';
import { AdminProductsService } from './admin-products.service';
import { SearchModule } from '../search/search.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SearchModule, AuthModule],
  controllers: [AdminProductsController],
  providers: [AdminProductsService]
})
export class AdminProductsModule {}
