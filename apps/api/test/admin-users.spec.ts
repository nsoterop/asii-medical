import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AdminUsersController } from '../src/auth/admin-users.controller';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Admin user activation', () => {
  let app: INestApplication;
  const mockPrisma = {
    user: {
      update: jest.fn()
    }
  };

  beforeAll(async () => {
    process.env.ADMIN_SHARED_SECRET = 'test-secret';

    const moduleRef = await Test.createTestingModule({
      controllers: [AdminUsersController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('activates user when admin secret is valid', async () => {
    mockPrisma.user.update.mockResolvedValue({ id: 'user_1', status: 'ACTIVE' });
    await request(app.getHttpServer())
      .post('/admin/users/user_1/activate')
      .set('X-Admin-Secret', 'test-secret')
      .expect(201);
  });
});
