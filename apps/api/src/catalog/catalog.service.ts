import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from '../search/search.service';
import { SearchFilters } from './catalog.types';

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly searchService: SearchService,
  ) {}

  async searchSkus(query: string, page: number, pageSize: number, filters: SearchFilters) {
    return this.searchService.searchSkus(query, page, pageSize, filters);
  }

  async getSku(itemId: number) {
    const sku = await this.prisma.sku.findUnique({
      where: { itemId },
      include: {
        product: {
          include: {
            manufacturer: true,
            primaryCategoryPath: true,
          },
        },
      },
    });

    if (!sku) {
      throw new NotFoundException('SKU not found');
    }

    return {
      ...sku,
      product: {
        ...sku.product,
        manufacturerName: sku.product.manufacturer?.name ?? null,
        categoryPathName: sku.product.primaryCategoryPath?.categoryPathName ?? null,
      },
    };
  }

  async getProduct(productId: number) {
    const product = await this.prisma.product.findUnique({
      where: { productId },
      include: {
        manufacturer: true,
        primaryCategoryPath: true,
        skus: {
          where: { isActive: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return {
      ...product,
      manufacturerName: product.manufacturer?.name ?? null,
      categoryPathName: product.primaryCategoryPath?.categoryPathName ?? null,
    };
  }
}
