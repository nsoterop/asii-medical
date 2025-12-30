import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, type Product, type Sku } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService, type SkuSearchDocument } from '../search/search.service';

type SkuWithProduct = Sku & {
  product: Product & {
    manufacturer?: { name: string } | null;
    primaryCategoryPath?: { categoryPathName: string } | null;
  };
};

export type AdminProductDto = {
  itemId: number;
  skuId: number;
  productId: number;
  productName: string;
  itemName: string;
  manufacturerName: string | null;
  ndcItemCode: string | null;
  categoryPathName: string | null;
  imageUrl: string | null;
  price: number | null;
  currency: string;
};

@Injectable()
export class AdminProductsService {
  private readonly logger = new Logger(AdminProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly searchService: SearchService
  ) {}

  async getByItemId(itemId: number) {
    const sku = await this.prisma.sku.findUnique({
      where: { itemId },
      include: {
        product: {
          include: {
            manufacturer: true,
            primaryCategoryPath: true
          }
        }
      }
    });

    if (!sku) {
      throw new NotFoundException('Item not found.');
    }

    return this.mapSkuToDto(sku);
  }

  async updateByItemId(
    itemId: number,
    updates: { price?: number; imageUrl?: string | null }
  ) {
    const data: Prisma.SkuUpdateInput = {};
    if (updates.price !== undefined) {
      data.unitPrice = new Prisma.Decimal(updates.price);
    }
    if (updates.imageUrl !== undefined) {
      data.itemImageUrl = updates.imageUrl;
    }

    let sku: SkuWithProduct;
    try {
      sku = await this.prisma.sku.update({
        where: { itemId },
        data,
        include: {
          product: {
            include: {
              manufacturer: true,
              primaryCategoryPath: true
            }
          }
        }
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Item not found.');
      }
      throw error;
    }

    await this.reindexSku(sku);
    return this.mapSkuToDto(sku);
  }

  private mapSkuToDto(sku: SkuWithProduct): AdminProductDto {
    return {
      itemId: sku.itemId,
      skuId: sku.itemId,
      productId: sku.productId,
      productName: sku.product.productName,
      itemName:
        sku.itemDescription?.trim() ||
        sku.manufacturerItemCode?.trim() ||
        `Item ${sku.itemId}`,
      manufacturerName: sku.product.manufacturer?.name ?? null,
      ndcItemCode: sku.ndcItemCode ?? null,
      categoryPathName: sku.product.primaryCategoryPath?.categoryPathName ?? null,
      imageUrl: sku.itemImageUrl ?? null,
      price: sku.unitPrice ? Number(sku.unitPrice.toString()) : null,
      currency: 'USD'
    };
  }

  private mapSkuToSearchDocument(sku: SkuWithProduct): SkuSearchDocument {
    return {
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
    };
  }

  private async reindexSku(sku: SkuWithProduct) {
    try {
      await this.searchService.indexSkus([this.mapSkuToSearchDocument(sku)]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reindex sku';
      this.logger.warn(message);
    }
  }
}
