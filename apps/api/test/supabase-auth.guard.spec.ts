import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthenticatedRequest, SupabaseAuthGuard } from '../src/auth/supabase-auth.guard';
import { ActiveUserGuard } from '../src/auth/active-user.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { UserStatus } from '@prisma/client';

const verifySupabaseJwt = jest.fn();

jest.mock('../src/auth/supabase-jwt', () => ({
  verifySupabaseJwt: (token: string) => verifySupabaseJwt(token),
}));

@Controller('auth-test')
class AuthTestController {
  @UseGuards(SupabaseAuthGuard)
  @Get('me')
  getMe(@Req() req: AuthenticatedRequest) {
    return req.user;
  }

  @UseGuards(SupabaseAuthGuard, ActiveUserGuard)
  @Get('protected')
  getProtected() {
    return { ok: true };
  }
}

describe('SupabaseAuthGuard', () => {
  let app: INestApplication;
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeAll(async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_JWKS_URL = 'https://example.supabase.co/auth/v1/.well-known/jwks.json';
    process.env.SUPABASE_ISSUER = 'https://example.supabase.co/auth/v1';
    process.env.SUPABASE_AUDIENCE = 'authenticated';

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthTestController],
      providers: [
        SupabaseAuthGuard,
        ActiveUserGuard,
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
    verifySupabaseJwt.mockReset();
    mockPrisma.user.findUnique.mockReset();
    mockPrisma.user.create.mockReset();
    mockPrisma.user.update.mockReset();
  });

  it('returns 401 when missing auth header', async () => {
    await request(app.getHttpServer()).get('/auth-test/me').expect(401);
  });

  it('returns 401 when token is invalid', async () => {
    verifySupabaseJwt.mockRejectedValue(new Error('invalid'));
    await request(app.getHttpServer())
      .get('/auth-test/me')
      .set('Authorization', 'Bearer bad-token')
      .expect(401);
  });

  it('creates a local user on first login', async () => {
    verifySupabaseJwt.mockResolvedValue({ sub: 'supabase-1', email: 'a@test.com' });
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'user_1',
      email: 'a@test.com',
      supabaseUserId: 'supabase-1',
      status: UserStatus.PENDING_REVIEW,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await request(app.getHttpServer())
      .get('/auth-test/me')
      .set('Authorization', 'Bearer good-token')
      .expect(200);

    expect(mockPrisma.user.create).toHaveBeenCalled();
  });

  it('blocks protected endpoint for pending users', async () => {
    verifySupabaseJwt.mockResolvedValue({ sub: 'supabase-1', email: 'a@test.com' });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user_2',
      email: 'a@test.com',
      supabaseUserId: 'supabase-1',
      status: UserStatus.PENDING_REVIEW,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await request(app.getHttpServer())
      .get('/auth-test/protected')
      .set('Authorization', 'Bearer good-token')
      .expect(403);
  });
});
