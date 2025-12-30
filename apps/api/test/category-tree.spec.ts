import { PrismaClient } from '@prisma/client';
import { CategoryTreeService } from '../src/catalog/category-tree.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { buildCategoryNodes } from '../src/imports/category-utils';

const testDbUrl = process.env.TEST_DATABASE_URL;

if (!testDbUrl) {
  describe('Category tree', () => {
    it('skips DB tests when TEST_DATABASE_URL is not set', () => {
      expect(testDbUrl).toBeUndefined();
    });
  });
} else {
  describe('Category tree', () => {
    let prisma!: PrismaClient;

    beforeAll(async () => {
      prisma = new PrismaClient({
        datasources: { db: { url: testDbUrl } },
      });
    });

    beforeEach(async () => {
      await prisma.category.deleteMany();
    });

    afterAll(async () => {
      await prisma.$disconnect();
    });

    it('builds a stable nested tree', async () => {
      const nodes = buildCategoryNodes([
        'Dental Merchandise>Anesthetics>Topicals',
        'Dental Merchandise>Infection Control',
        'Medical Devices>Respiratory',
      ]);

      await prisma.category.createMany({ data: nodes, skipDuplicates: true });

      const service = new CategoryTreeService(prisma as unknown as PrismaService);
      const tree = await service.getTree();

      const dental = tree.find((node) => node.path === 'Dental Merchandise');
      const medical = tree.find((node) => node.path === 'Medical Devices');

      expect(dental?.children.map((child) => child.path).sort()).toEqual([
        'Dental Merchandise>Anesthetics',
        'Dental Merchandise>Infection Control',
      ]);
      expect(
        dental?.children
          .find((child) => child.path === 'Dental Merchandise>Anesthetics')
          ?.children.map((child) => child.path),
      ).toEqual(['Dental Merchandise>Anesthetics>Topicals']);
      expect(medical?.children.map((child) => child.path)).toEqual(['Medical Devices>Respiratory']);
    });
  });
}
