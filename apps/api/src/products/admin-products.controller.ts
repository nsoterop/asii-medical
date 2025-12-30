import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { AdminProductsService } from './admin-products.service';

@Controller('admin/products')
@UseGuards(SupabaseAuthGuard, AdminGuard)
export class AdminProductsController {
  constructor(private readonly adminProductsService: AdminProductsService) {}

  @Get('by-item/:itemId')
  async getByItem(@Param('itemId') itemId: string) {
    const parsed = Number(itemId);
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException('Item ID must be a number.');
    }

    return this.adminProductsService.getByItemId(parsed);
  }

  @Patch('by-item/:itemId')
  async updateByItem(
    @Param('itemId') itemId: string,
    @Body() body: { price?: unknown; imageUrl?: unknown },
  ) {
    const parsed = Number(itemId);
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException('Item ID must be a number.');
    }

    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Invalid update payload.');
    }

    const allowedKeys = new Set(['price', 'imageUrl']);
    const keys = Object.keys(body);

    if (keys.length === 0) {
      throw new BadRequestException('No updates provided.');
    }

    const unexpected = keys.filter((key) => !allowedKeys.has(key));
    if (unexpected.length > 0) {
      throw new BadRequestException('Only price and imageUrl can be updated.');
    }

    let price: number | undefined;
    let imageUrl: string | null | undefined;

    if ('price' in body) {
      if (body.price === null || body.price === '') {
        throw new BadRequestException('Price must be a number.');
      }
      const parsedPrice = typeof body.price === 'number' ? body.price : Number(body.price);
      if (!Number.isFinite(parsedPrice)) {
        throw new BadRequestException('Price must be a number.');
      }
      if (parsedPrice < 0 || parsedPrice > 1_000_000) {
        throw new BadRequestException('Price must be between 0 and 1,000,000.');
      }
      price = parsedPrice;
    }

    if ('imageUrl' in body) {
      if (body.imageUrl === null || body.imageUrl === '') {
        imageUrl = null;
      } else if (typeof body.imageUrl !== 'string') {
        throw new BadRequestException('Image URL must be a string.');
      } else {
        const trimmed = body.imageUrl.trim();
        if (!trimmed) {
          imageUrl = null;
        } else {
          try {
            const url = new URL(trimmed);
            if (url.protocol !== 'http:' && url.protocol !== 'https:') {
              throw new Error('Invalid protocol');
            }
          } catch {
            throw new BadRequestException('Image URL must be a valid URL.');
          }
          imageUrl = trimmed;
        }
      }
    }

    return this.adminProductsService.updateByItemId(parsed, {
      price,
      imageUrl,
    });
  }
}
