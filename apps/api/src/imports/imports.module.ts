import { Module } from '@nestjs/common';
import { AdminImportsController } from './admin-imports.controller';
import { CsvParserService } from './csv-parser.service';
import { ImportService } from './import.service';
import { ImportReconcilerService } from './import-reconciler.service';
import { ImportWorker } from './import.worker';
import { SearchModule } from '../search/search.module';
import { CatalogModule } from '../catalog/catalog.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SearchModule, CatalogModule, AuthModule],
  controllers: [AdminImportsController],
  providers: [CsvParserService, ImportService, ImportReconcilerService, ImportWorker],
})
export class AdminImportsModule {}
