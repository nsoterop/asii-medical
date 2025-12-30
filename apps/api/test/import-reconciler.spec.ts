import { PrismaClient } from '@prisma/client';
import { ImportReconcilerService } from '../src/imports/import-reconciler.service';
import { PrismaService } from '../src/prisma/prisma.service';

const testDbUrl = process.env.TEST_DATABASE_URL;

if (!testDbUrl) {
  describe('Import reconciler', () => {
    it('skips DB tests when TEST_DATABASE_URL is not set', () => {
      expect(testDbUrl).toBeUndefined();
    });
  });
} else {
  describe('Import reconciler', () => {
    let prisma: PrismaClient;
    let reconciler: ImportReconcilerService;
    let prismaService: PrismaService;

    beforeAll(async () => {
      process.env.DATABASE_URL = testDbUrl;
      process.env.IMPORT_RUN_STUCK_MINUTES = '30';
      prismaService = new PrismaService();
      await prismaService.$connect();
      prisma = prismaService;
      reconciler = new ImportReconcilerService(prismaService);
    });

    afterAll(async () => {
      await prismaService.$disconnect();
    });

    beforeEach(async () => {
      await prisma.importRowError.deleteMany();
      await prisma.importRun.deleteMany();
    });

    it('marks old RUNNING imports as FAILED on bootstrap', async () => {
      const startedAt = new Date(Date.now() - 31 * 60 * 1000);
      const run = await prisma.importRun.create({
        data: {
          status: 'RUNNING',
          originalFilename: 'stuck.csv',
          storedPath: '/tmp/stuck.csv',
          startedAt,
        },
      });

      await reconciler.onModuleInit();

      const updated = await prisma.importRun.findUnique({
        where: { id: run.id },
      });

      expect(updated?.status).toBe('FAILED');
      expect(updated?.finishedAt).toBeTruthy();
      expect(updated?.lastErrorText).toBe('Marked failed by reconciler (stuck)');
    });
  });
}
