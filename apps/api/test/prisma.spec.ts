import { PrismaClient } from '@prisma/client';

describe('Prisma', () => {
  const testDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  const runTest = testDbUrl ? it : it.skip;

  runTest('connects to the database', async () => {
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: testDbUrl
        }
      }
    });

    await prisma.$connect();
    await prisma.$disconnect();
  });
});
