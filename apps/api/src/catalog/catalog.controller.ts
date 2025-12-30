import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CategoryTreeService } from './category-tree.service';
import { SearchFilters } from './catalog.types';

export function parseFilters(raw: {
  filters?: string;
  manufacturerName?: string | string[];
  categoryPathName?: string | string[];
  availabilityRaw?: string | string[];
  minPrice?: string;
  maxPrice?: string;
}): SearchFilters {
  let parsed: SearchFilters = {};

  if (raw.filters) {
    try {
      const json = JSON.parse(raw.filters) as SearchFilters;
      parsed = { ...json };
    } catch {
      // ignore invalid JSON, fallback to query params
    }
  }

  const normalizeList = (value?: string | string[]) => {
    if (!value) {
      return undefined;
    }
    const list = Array.isArray(value) ? value : [value];
    return list.map((entry) => entry.trim()).filter(Boolean);
  };

  const manufacturerName = normalizeList(raw.manufacturerName) ?? parsed.manufacturerName;
  const categoryPathName = normalizeList(raw.categoryPathName) ?? parsed.categoryPathName;
  const availabilityRaw = normalizeList(raw.availabilityRaw) ?? parsed.availabilityRaw;

  const minPrice = raw.minPrice ? Number(raw.minPrice) : parsed.minPrice;
  const maxPrice = raw.maxPrice ? Number(raw.maxPrice) : parsed.maxPrice;

  return {
    manufacturerName,
    categoryPathName,
    availabilityRaw,
    minPrice: Number.isFinite(minPrice as number) ? (minPrice as number) : undefined,
    maxPrice: Number.isFinite(maxPrice as number) ? (maxPrice as number) : undefined,
  };
}

@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly categoryTreeService: CategoryTreeService,
  ) {}

  @Get('search')
  async search(
    @Query('q') q = '',
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query() query: Record<string, string | string[]>,
  ) {
    const pageNumber = Math.max(1, Number(page) || 1);
    const size = Math.min(100, Math.max(1, Number(pageSize) || 20));
    const filters = parseFilters(query as Parameters<typeof parseFilters>[0]);

    return this.catalogService.searchSkus(q, pageNumber, size, filters);
  }

  @Get('sku/:itemId')
  async getSku(@Param('itemId') itemId: string) {
    const parsed = Number(itemId);
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException('Invalid itemId');
    }
    return this.catalogService.getSku(parsed);
  }

  @Get('product/:productId')
  async getProduct(@Param('productId') productId: string) {
    const parsed = Number(productId);
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException('Invalid productId');
    }
    return this.catalogService.getProduct(parsed);
  }

  @Get('categories/tree')
  async getCategoryTree() {
    return this.categoryTreeService.getTree();
  }
}
