import { Module } from '@nestjs/common';
import { AdminSearchController } from './admin-search.controller';
import { SearchModule } from './search.module';

@Module({
  imports: [SearchModule],
  controllers: [AdminSearchController],
  providers: []
})
export class AdminSearchModule {}
