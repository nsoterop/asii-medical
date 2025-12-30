import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AdminUsersController } from '../src/auth/admin-users.controller';
import { PrismaService } from '../src/prisma/prisma.service';
import { SupabaseAuthGuard } from '../src/auth/supabase-auth.guard';
import { AdminGuard } from '../src/auth/admin.guard';
import { UserStatus } from '@prisma/client';

const verifySupabaseJwt = jest.fn();

jest.mock('../src/auth/supabase-jwt', () => ({
  verifySupabaseJwt: (token: string) => verifySupabaseJwt(token)
}));

describe('Admin user activation', () => {
  let app: INestApplication;
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    $queryRaw: jest.fn()
  };

  beforeAll(async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_JWKS_URL = 'https://example.supabase.co/auth/v1/.well-known/jwks.json';
    process.env.SUPABASE_ISSUER = 'https://example.supabase.co/auth/v1';
    process.env.SUPABASE_AUDIENCE = 'authenticated';

    const moduleRef = await Test.createTestingModule({
      controllers: [AdminUsersController],
      providers: [
        SupabaseAuthGuard,
        AdminGuard,
        { provide: PrismaService, useValue: mockPrisma }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    verifySupabaseJwt.mockReset();
    mockPrisma.user.findUnique.mockReset();
    mockPrisma.user.create.mockReset();
    mockPrisma.user.update.mockReset();
    mockPrisma.$queryRaw.mockReset();
  });

  it('activates user when requester is admin', async () => {
    verifySupabaseJwt.mockResolvedValue({ sub: 'supabase-1', email: 'a@test.com' });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user_1',
      email: 'a@test.com',
      supabaseUserId: 'supabase-1',
      status: UserStatus.ACTIVE
    });
    mockPrisma.$queryRaw.mockResolvedValue([{ is_admin: true }]);
    mockPrisma.user.update.mockResolvedValue({ id: 'user_1', status: 'ACTIVE' });

    await request(app.getHttpServer())
      .post('/admin/users/user_1/activate')
      .set('Authorization', 'Bearer good-token')
      .expect(201);
  });
});
