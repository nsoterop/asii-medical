import { Module } from '@nestjs/common';
import { AdminSearchController } from './admin-search.controller';
import { SearchModule } from './search.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SearchModule, AuthModule],
  controllers: [AdminSearchController],
  providers: []
})
export class AdminSearchModule {}
