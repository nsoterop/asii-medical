import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService, SkuSearchDocument } from './search.service';
import { SearchStatusService } from './search-status.service';
import { SKUS_INDEX_NAME } from './search.constants';

@Injectable()
export class IndexSkusJob {
  private readonly logger = new Logger(IndexSkusJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly searchService: SearchService,
    private readonly statusService: SearchStatusService
  ) {}

  async run() {
    this.statusService.setRunStarted();

    try {
      const skus = await this.prisma.sku.findMany({
        where: { isActive: true },
        include: {
          product: {
            include: {
              manufacturer: true,
              primaryCategoryPath: true
            }
          }
        }
      });

      const fetched = skus.length;
      this.logger.log(`Fetched ${fetched} active skus for indexing`);
      this.statusService.setRunCounts(fetched, 0);

      const documents: SkuSearchDocument[] = skus.map((sku) => ({
        skuItemId: sku.itemId,
        productId: sku.productId,
        productName: sku.product.productName,
        productDescription: sku.product.productDescription ?? null,
        itemDescription: sku.itemDescription ?? null,
        manufacturerName: sku.product.manufacturer?.name ?? null,
        manufacturerItemCode: sku.manufacturerItemCode ?? null,
        ndcItemCode: sku.ndcItemCode ?? null,
        nationalDrugCode: sku.nationalDrugCode ?? null,
        categoryPathName: sku.product.primaryCategoryPath?.categoryPathName ?? 'Uncategorized',
        unitPrice: sku.unitPrice ? Number(sku.unitPrice.toString()) : null,
        availabilityRaw: sku.availabilityRaw ?? null,
        pkg: sku.pkg ?? null,
        imageUrl: sku.itemImageUrl ?? null,
        isActive: sku.isActive
      }));

      if (documents.length === 0) {
        this.statusService.setRunCounts(0, 0);
        return { fetched: 0, indexed: 0 };
      }

      const index = this.searchService.getIndex(SKUS_INDEX_NAME);
      await this.searchService.ensureSkuIndex();
      const task = await index.addDocuments(documents, { primaryKey: 'skuItemId' });
      await this.searchService.waitForTask(task.taskUid);

      this.statusService.setRunCounts(fetched, documents.length);
      this.logger.log(`Indexed ${documents.length} skus`);
      return { fetched, indexed: documents.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Indexing failed';
      this.statusService.setRunError(message);
      this.logger.error(message);
      throw error;
    }
  }
}
