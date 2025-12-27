import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AdminImportsController } from '../src/imports/admin-imports.controller';
import { ImportService } from '../src/imports/import.service';
import { IMPORTS_QUEUE } from '../src/imports/imports.constants';

const mockImportService = {
  listImportRuns: jest.fn().mockResolvedValue([]),
  createImportRunWithId: jest.fn(),
  getImportRun: jest.fn(),
  listImportErrors: jest.fn(),
  markFailedIfRunning: jest.fn().mockResolvedValue({ id: 'run_1', status: 'FAILED' })
};

const mockQueue = {
  add: jest.fn()
};

describe('Admin auth guard', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.ADMIN_SHARED_SECRET = 'test-secret';

    const moduleRef = await Test.createTestingModule({
      controllers: [AdminImportsController],
      providers: [
        { provide: ImportService, useValue: mockImportService },
        { provide: IMPORTS_QUEUE, useValue: mockQueue }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 when missing admin secret', async () => {
    await request(app.getHttpServer()).get('/admin/imports').expect(401);
  });

  it('returns 401 when admin secret is invalid', async () => {
    await request(app.getHttpServer())
      .get('/admin/imports')
      .set('X-Admin-Secret', 'wrong')
      .expect(401);
  });

  it('marks import as failed when authorized', async () => {
    await request(app.getHttpServer())
      .post('/admin/imports/run_1/mark-failed')
      .set('X-Admin-Secret', 'test-secret')
      .expect(201);
  });
});
