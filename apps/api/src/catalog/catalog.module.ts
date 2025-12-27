import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CategoryTreeService } from './category-tree.service';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [SearchModule],
  controllers: [CatalogController],
  providers: [CatalogService, CategoryTreeService],
  exports: [CategoryTreeService]
})
export class CatalogModule {}
