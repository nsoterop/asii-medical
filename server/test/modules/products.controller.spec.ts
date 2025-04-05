import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from '../../src/modules/products/products.controller';
import { ProductsService } from '../../src/modules/products/products.service';

describe('ProductsController', () => {
  let controller: ProductsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [ProductsService],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('should get list of products', () => {
    const products = [
      { id: 1, name: 'Product 1', price: 100 },
      { id: 2, name: 'Product 2', price: 200 },
      { id: 3, name: 'Product 300', price: 300 },
    ];

    expect(controller.getProducts()).toEqual(products);
  });
});
