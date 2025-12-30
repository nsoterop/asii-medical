import { Controller, Get, UseGuards } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { SupabaseAuthGuard } from '../src/auth/supabase-auth.guard';
import { AdminGuard } from '../src/auth/admin.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { UserStatus } from '@prisma/client';

const verifySupabaseJwt = jest.fn();

jest.mock('../src/auth/supabase-jwt', () => ({
  verifySupabaseJwt: (token: string) => verifySupabaseJwt(token),
}));

@Controller('admin-auth-test')
class AdminAuthTestController {
  @UseGuards(SupabaseAuthGuard, AdminGuard)
  @Get()
  getOk() {
    return { ok: true };
  }
}

describe('AdminGuard', () => {
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
      controllers: [AdminAuthTestController],
      providers: [SupabaseAuthGuard, AdminGuard, { provide: PrismaService, useValue: mockPrisma }],
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

  it('returns 401 when missing bearer token', async () => {
    await request(app.getHttpServer()).get('/admin-auth-test').expect(401);
  });

  it('returns 403 when user is not admin', async () => {
    verifySupabaseJwt.mockResolvedValue({ sub: 'supabase-1', email: 'a@test.com' });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user_1',
      email: 'a@test.com',
      supabaseUserId: 'supabase-1',
      status: UserStatus.ACTIVE,
    });
    mockPrisma.$queryRaw.mockResolvedValue([{ is_admin: false }]);

    await request(app.getHttpServer())
      .get('/admin-auth-test')
      .set('Authorization', 'Bearer good-token')
      .expect(403);
  });

  it('allows admin users', async () => {
    verifySupabaseJwt.mockResolvedValue({ sub: 'supabase-1', email: 'a@test.com' });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user_1',
      email: 'a@test.com',
      supabaseUserId: 'supabase-1',
      status: UserStatus.ACTIVE,
    });
    mockPrisma.$queryRaw.mockResolvedValue([{ is_admin: true }]);

    await request(app.getHttpServer())
      .get('/admin-auth-test')
      .set('Authorization', 'Bearer good-token')
      .expect(200);
  });
});
