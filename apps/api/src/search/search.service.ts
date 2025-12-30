import { Injectable, Logger } from '@nestjs/common';
import { MeiliSearch } from 'meilisearch';
import { SKUS_INDEX_NAME } from './search.constants';
import { SearchFilters } from '../catalog/catalog.types';

export type SkuSearchDocument = {
  skuItemId: number;
  productId: number;
  productName: string;
  productDescription: string | null;
  itemDescription: string | null;
  manufacturerName: string | null;
  manufacturerItemCode: string | null;
  ndcItemCode: string | null;
  nationalDrugCode: string | null;
  categoryPathName: string | null;
  unitPrice: number | null;
  availabilityRaw: string | null;
  pkg: string | null;
  imageUrl: string | null;
  isActive: boolean;
};

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private client: MeiliSearch;

  constructor() {
    const host = process.env.MEILI_URL || 'http://localhost:7700';
    const apiKey = process.env.MEILI_MASTER_KEY || undefined;
    this.client = new MeiliSearch({ host, apiKey });
  }

  getHost() {
    return process.env.MEILI_URL || 'http://localhost:7700';
  }

  hasApiKey() {
    return Boolean(process.env.MEILI_MASTER_KEY);
  }

  async ensureSkuIndex() {
    try {
      await this.client.createIndex(SKUS_INDEX_NAME, { primaryKey: 'skuItemId' });
    } catch (error) {
      // Index already exists.
    }

    const index = this.client.index(SKUS_INDEX_NAME);

    await index.updateSettings({
      searchableAttributes: [
        'productName',
        'productDescription',
        'itemDescription',
        'manufacturerName',
        'manufacturerItemCode',
        'ndcItemCode',
        'nationalDrugCode',
        'categoryPathName',
      ],
      filterableAttributes: [
        'manufacturerName',
        'categoryPathName',
        'availabilityRaw',
        'pkg',
        'isActive',
        'unitPrice',
      ],
      sortableAttributes: ['unitPrice', 'productName'],
      faceting: {
        maxValuesPerFacet: 2000,
      },
    });
  }

  async indexSkus(documents: SkuSearchDocument[]) {
    if (documents.length === 0) {
      return;
    }

    await this.ensureSkuIndex();

    const index = this.client.index(SKUS_INDEX_NAME);
    await index.addDocuments(documents);
    this.logger.log(`Indexed ${documents.length} skus`);
  }

  async searchSkus(query: string, page: number, pageSize: number, filters: SearchFilters) {
    await this.ensureSkuIndex();
    const index = this.client.index(SKUS_INDEX_NAME);

    const filterExpressions: string[] = [];
    const escapeFilterValue = (value: string) => value.replace(/"/g, '\\"');

    if (filters.manufacturerName && filters.manufacturerName.length > 0) {
      const names = filters.manufacturerName
        .map((name) => `"${escapeFilterValue(name)}"`)
        .join(', ');
      filterExpressions.push(`manufacturerName IN [${names}]`);
    }

    if (filters.categoryPathName && filters.categoryPathName.length > 0) {
      const names = filters.categoryPathName
        .map((name) => `"${escapeFilterValue(name)}"`)
        .join(', ');
      filterExpressions.push(`categoryPathName IN [${names}]`);
    }

    if (filters.availabilityRaw && filters.availabilityRaw.length > 0) {
      const values = filters.availabilityRaw
        .map((name) => `"${escapeFilterValue(name)}"`)
        .join(', ');
      filterExpressions.push(`availabilityRaw IN [${values}]`);
    }

    if (filters.minPrice !== undefined) {
      filterExpressions.push(`unitPrice >= ${filters.minPrice}`);
    }

    if (filters.maxPrice !== undefined) {
      filterExpressions.push(`unitPrice <= ${filters.maxPrice}`);
    }

    const response = await index.search<SkuSearchDocument>(query, {
      limit: pageSize,
      offset: (page - 1) * pageSize,
      filter: filterExpressions.length > 0 ? filterExpressions.join(' AND ') : undefined,
      facets: ['manufacturerName', 'categoryPathName', 'availabilityRaw', 'pkg', 'isActive'],
    });

    const total = response.estimatedTotalHits ?? response.hits.length;

    return {
      hits: response.hits,
      total,
      page,
      pageSize,
      facets: response.facetDistribution ?? {},
    };
  }

  getIndex(indexName: string) {
    return this.client.index(indexName);
  }

  async waitForTask(taskUid: number) {
    await this.client.waitForTask(taskUid);
  }

  async getIndexStats(indexName: string) {
    const index = this.client.index(indexName);
    return index.getStats();
  }
}
