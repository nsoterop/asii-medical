import { Controller, Get } from '@nestjs/common';
import { Product, ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  getHello(): Product[] {
    return this.productsService.getProducts();
  }
}
