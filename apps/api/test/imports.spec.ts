import { PrismaClient } from '@prisma/client';
import path from 'path';
import { promises as fsPromises } from 'fs';
const { writeFile, unlink, copyFile } = fsPromises;
import os from 'os';
import { CsvParserService } from '../src/imports/csv-parser.service';
import { ImportService } from '../src/imports/import.service';
import { ImportWorker } from '../src/imports/import.worker';
import { CategoryTreeService } from '../src/catalog/category-tree.service';

type TestContext = {
  prisma: PrismaClient;
  importService: ImportService;
  importWorker: ImportWorker;
};

const testDbUrl = process.env.TEST_DATABASE_URL;
const describeIfDb = testDbUrl ? describe : describe.skip;

async function resetDatabase(prisma: PrismaClient) {
  await prisma.importRowError.deleteMany();
  await prisma.importRun.deleteMany();
  await prisma.sku.deleteMany();
  await prisma.product.deleteMany();
  await prisma.categoryPath.deleteMany();
  await prisma.category.deleteMany();
  await prisma.manufacturer.deleteMany();
}

describeIfDb('Import pipeline', () => {
  const fixturePath = path.join(__dirname, 'fixtures', 'sample.csv');
  const context = {} as TestContext;

  beforeAll(async () => {
    context.prisma = new PrismaClient({
      datasources: { db: { url: testDbUrl } }
    });

    const csvParser = new CsvParserService();
    const categoryTreeService = new CategoryTreeService(context.prisma as any);
    context.importService = new ImportService(context.prisma as any, csvParser, categoryTreeService);
    const indexSkusJob = { run: jest.fn().mockResolvedValue(undefined) } as any;
    const queue = { add: jest.fn().mockResolvedValue(undefined) } as any;
    context.importWorker = new ImportWorker(context.importService, indexSkusJob, queue);
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
  });

  afterAll(async () => {
    await context.prisma.$disconnect();
  });

  it('imports fixture data and removes missing SKUs on re-import', async () => {
    const run1CsvPath = path.join(os.tmpdir(), `sample-${Date.now()}.csv`);
    await copyFile(fixturePath, run1CsvPath);
    const run1 = await context.prisma.importRun.create({
      data: {
        status: 'QUEUED',
        originalFilename: 'sample.csv',
        storedPath: run1CsvPath
      }
    });

    await context.importWorker.handleImportJob(run1.id, run1CsvPath);

    const run1Result = await context.prisma.importRun.findUnique({
      where: { id: run1.id }
    });

    expect(run1Result?.status).toBe('SUCCEEDED');
    expect(run1Result?.totalRows).toBe(3);
    expect(run1Result?.inserted).toBe(3);
    expect(run1Result?.updated).toBe(0);
    expect(run1Result?.deactivated).toBe(0);
    expect(run1Result?.errorCount).toBe(1);

    expect(await context.prisma.manufacturer.count()).toBe(2);
    expect(await context.prisma.categoryPath.count()).toBe(1);
    expect(await context.prisma.category.count()).toBe(1);
    expect(await context.prisma.product.count()).toBe(2);
    expect(await context.prisma.sku.count()).toBe(3);
    const sku1001First = await context.prisma.sku.findUnique({
      where: { itemId: 1001 }
    });
    expect(sku1001First?.lastSeenImportRunId).toBe(run1.id);
    expect(sku1001First?.manufacturerItemCode).toBe('ACM-1001');
    expect(sku1001First?.itemDescription).toBe('Widget A - small');
    expect(sku1001First?.itemImageUrl).toBe('http://example.com/a.jpg');
    expect(sku1001First?.ndcItemCode).toBe('12345');
    expect(sku1001First?.pkg).toBe('1 each');
    expect(sku1001First?.unitPrice?.toString()).toBe('12.34');
    expect(sku1001First?.priceDescription).toBe('MSRP');
    expect(sku1001First?.availabilityRaw).toBe('In Stock');
    expect(sku1001First?.packingListDescription).toBe('Box of 1');
    expect(sku1001First?.unitWeight).toBe(1.2);
    expect(sku1001First?.unitVolume).toBe(0.3);
    expect(sku1001First?.uomFactor).toBe(10);
    expect(sku1001First?.countryOfOrigin).toBe('USA');
    expect(sku1001First?.harmonizedTariffCode).toBe('HT123');
    expect(sku1001First?.hazMatClass).toBe('Class A');
    expect(sku1001First?.hazMatCode).toBe('HM1');
    expect(sku1001First?.pharmacyProductType).toBe('Type A');
    expect(sku1001First?.nationalDrugCode).toBe('ND123');
    expect(sku1001First?.brandId).toBe('BR1');
    expect(sku1001First?.brandName).toBe('BrandOne');
    const sku1003First = await context.prisma.sku.findUnique({
      where: { itemId: 1003 }
    });
    expect(sku1003First?.lastSeenImportRunId).toBe(run1.id);
    const product2002 = await context.prisma.product.findUnique({
      where: { productId: 2002 }
    });
    expect(product2002?.primaryCategoryPathId).toBeNull();
    expect(await context.prisma.importRowError.count()).toBe(1);

    const secondCsvPath = path.join(os.tmpdir(), `sample-${Date.now()}.csv`);
    const secondCsv = [
      'ItemID,ManufacturerID,ManufacturerName,ProductID,ProductName,ProductDescription,ManufacturerItemCode,ItemDescription,ItemImageURL,NDCItemCode,Pkg,UnitPrice,PriceDescription,Availability,CategoryPathID,CategoryPathName,PackingListDescritpion,UnitWeight,UnitVolume,UOMFactor,CountryOfOrigin,HarmonizedTariffCode,HazMatClass,HazMatCode,PharmacyProductType,NationalDrugCode,BrandID,BrandName',
      '1001,3001,Acme,2001,Widget A,Desc A,ACM-1001,Widget A - small,http://example.com/a.jpg,12345,1 each,12.34,MSRP,In Stock,cat-1,Consumables,Box of 1,1.2,0.3,10,USA,HT123,Class A,HM1,Type A,ND123,BR1,BrandOne'
    ].join('\n');

    await writeFile(secondCsvPath, secondCsv);

    const run2 = await context.prisma.importRun.create({
      data: {
        status: 'QUEUED',
        originalFilename: 'sample-2.csv',
        storedPath: secondCsvPath
      }
    });

    await context.importWorker.handleImportJob(run2.id, secondCsvPath);

    const run2Result = await context.prisma.importRun.findUnique({
      where: { id: run2.id }
    });

    expect(run2Result?.status).toBe('SUCCEEDED');
    expect(run2Result?.totalRows).toBe(1);
    expect(run2Result?.inserted).toBe(0);
    expect(run2Result?.updated).toBe(1);
    expect(run2Result?.deactivated).toBe(2);

    const sku2 = await context.prisma.sku.findUnique({
      where: { itemId: 1002 }
    });
    expect(sku2).toBeNull();
    const sku3 = await context.prisma.sku.findUnique({
      where: { itemId: 1003 }
    });
    expect(sku3).toBeNull();

    const sku1 = await context.prisma.sku.findUnique({
      where: { itemId: 1001 }
    });
    expect(sku1?.lastSeenImportRunId).toBe(run2.id);

    expect(await context.prisma.product.count()).toBe(1);

    await unlink(secondCsvPath).catch(() => undefined);
  });

  it('applies price margin percent during import', async () => {
    const marginCsvPath = path.join(os.tmpdir(), `sample-${Date.now()}-margin.csv`);
    await copyFile(fixturePath, marginCsvPath);
    const run = await context.prisma.importRun.create({
      data: {
        status: 'QUEUED',
        originalFilename: 'sample.csv',
        storedPath: marginCsvPath
      }
    });

    await context.importWorker.handleImportJob(run.id, marginCsvPath, 10);

    const sku = await context.prisma.sku.findUnique({
      where: { itemId: 1001 }
    });

    expect(sku?.unitPrice?.toString()).toBe('13.57');
  });

  it('marks import as FAILED when processing throws', async () => {
    const run = await context.prisma.importRun.create({
      data: {
        status: 'QUEUED',
        originalFilename: 'bad.csv',
        storedPath: '/tmp/bad.csv'
      }
    });

    const failingParser = {
      parseFile: async () => {
        throw new Error('boom');
      },
      getRequiredHeaders: () => []
    } as unknown as CsvParserService;

    const categoryTreeService = new CategoryTreeService(context.prisma as any);
    const importService = new ImportService(
      context.prisma as any,
      failingParser,
      categoryTreeService
    );
    const indexSkusJob = { run: jest.fn().mockResolvedValue(undefined) } as any;
    const queue = { add: jest.fn().mockResolvedValue(undefined) } as any;
    const worker = new ImportWorker(importService, indexSkusJob, queue);

    await expect(worker.handleImportJob(run.id, '/tmp/bad.csv')).rejects.toThrow('boom');

    const updated = await context.prisma.importRun.findUnique({
      where: { id: run.id }
    });

    expect(updated?.status).toBe('FAILED');
    expect(updated?.finishedAt).toBeTruthy();
    expect(updated?.lastErrorText).toBe('boom');
  });
});

describe('ImportWorker enqueue behavior', () => {
  it('enqueues index job on success', async () => {
    const importService = {
      markRunning: jest.fn().mockResolvedValue(undefined),
      processImport: jest.fn().mockResolvedValue({
        totalRows: 1,
        inserted: 1,
        updated: 0,
        deactivated: 0,
        errorCount: 1
      }),
      markSucceeded: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined)
    } as unknown as ImportService;

    const indexSkusJob = { run: jest.fn() } as any;
    const queue = { add: jest.fn().mockResolvedValue(undefined) } as any;

    const worker = new ImportWorker(importService, indexSkusJob, queue);
    await worker.handleImportJob('run_1', '/tmp/file.csv');

    expect(queue.add).toHaveBeenCalledWith('index-skus', { importRunId: 'run_1' });
  });

  it('does not enqueue index job on failure', async () => {
    const importService = {
      markRunning: jest.fn().mockResolvedValue(undefined),
      processImport: jest.fn().mockRejectedValue(new Error('boom')),
      markSucceeded: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined)
    } as unknown as ImportService;

    const indexSkusJob = { run: jest.fn() } as any;
    const queue = { add: jest.fn().mockResolvedValue(undefined) } as any;

    const worker = new ImportWorker(importService, indexSkusJob, queue);
    await expect(worker.handleImportJob('run_2', '/tmp/file.csv')).rejects.toThrow('boom');

    expect(queue.add).not.toHaveBeenCalled();
  });
});
