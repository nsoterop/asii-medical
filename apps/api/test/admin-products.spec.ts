import { INestApplication, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AdminProductsController } from '../src/products/admin-products.controller';
import { AdminProductsService } from '../src/products/admin-products.service';
import { SupabaseAuthGuard } from '../src/auth/supabase-auth.guard';
import { AdminGuard } from '../src/auth/admin.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { UserStatus } from '@prisma/client';

const mockAdminProductsService = {
  getByItemId: jest.fn(),
  updateByItemId: jest.fn(),
};

const verifySupabaseJwt = jest.fn();

jest.mock('../src/auth/supabase-jwt', () => ({
  verifySupabaseJwt: (token: string) => verifySupabaseJwt(token),
}));

describe('AdminProductsController', () => {
  let app: INestApplication;
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  beforeAll(async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_JWKS_URL = 'https://example.supabase.co/auth/v1/.well-known/jwks.json';
    process.env.SUPABASE_ISSUER = 'https://example.supabase.co/auth/v1';
    process.env.SUPABASE_AUDIENCE = 'authenticated';

    const moduleRef = await Test.createTestingModule({
      controllers: [AdminProductsController],
      providers: [
        SupabaseAuthGuard,
        AdminGuard,
        { provide: AdminProductsService, useValue: mockAdminProductsService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    verifySupabaseJwt.mockReset();
    mockPrisma.user.findUnique.mockReset();
    mockPrisma.user.create.mockReset();
    mockPrisma.user.update.mockReset();
    mockPrisma.$queryRaw.mockReset();
  });

  const mockAdminAuth = () => {
    verifySupabaseJwt.mockResolvedValue({ sub: 'supabase-1', email: 'a@test.com' });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user_1',
      email: 'a@test.com',
      supabaseUserId: 'supabase-1',
      status: UserStatus.ACTIVE,
    });
    mockPrisma.$queryRaw.mockResolvedValue([{ is_admin: true }]);
  };

  it('rejects requests without a bearer token', async () => {
    await request(app.getHttpServer()).get('/admin/products/by-item/123').expect(401);
  });

  it('returns 404 when item is not found', async () => {
    mockAdminAuth();
    mockAdminProductsService.getByItemId.mockRejectedValueOnce(
      new NotFoundException('Item not found.'),
    );

    await request(app.getHttpServer())
      .get('/admin/products/by-item/999')
      .set('Authorization', 'Bearer good-token')
      .expect(404);
  });

  it('returns item details when found', async () => {
    mockAdminAuth();
    const payload = {
      itemId: 123,
      skuId: 123,
      productId: 456,
      productName: 'Test Product',
      itemName: 'Test Item',
      manufacturerName: 'Maker',
      ndcItemCode: null,
      categoryPathName: null,
      imageUrl: null,
      price: 12.5,
      currency: 'USD',
    };

    mockAdminProductsService.getByItemId.mockResolvedValueOnce(payload);

    const response = await request(app.getHttpServer())
      .get('/admin/products/by-item/123')
      .set('Authorization', 'Bearer good-token')
      .expect(200);

    expect(response.body).toEqual(payload);
  });

  it('rejects unexpected fields on update', async () => {
    mockAdminAuth();
    await request(app.getHttpServer())
      .patch('/admin/products/by-item/123')
      .set('Authorization', 'Bearer good-token')
      .send({ price: 10, foo: 'bar' })
      .expect(400);
  });

  it('rejects invalid price on update', async () => {
    mockAdminAuth();
    await request(app.getHttpServer())
      .patch('/admin/products/by-item/123')
      .set('Authorization', 'Bearer good-token')
      .send({ price: -1 })
      .expect(400);
  });

  it('updates price and image url when valid', async () => {
    mockAdminAuth();
    const payload = {
      itemId: 123,
      skuId: 123,
      productId: 456,
      productName: 'Test Product',
      itemName: 'Test Item',
      manufacturerName: 'Maker',
      ndcItemCode: null,
      categoryPathName: null,
      imageUrl: 'https://example.com/image.png',
      price: 99,
      currency: 'USD',
    };

    mockAdminProductsService.updateByItemId.mockResolvedValueOnce(payload);

    const response = await request(app.getHttpServer())
      .patch('/admin/products/by-item/123')
      .set('Authorization', 'Bearer good-token')
      .send({ price: 99, imageUrl: 'https://example.com/image.png' })
      .expect(200);

    expect(response.body).toEqual(payload);
  });
});
