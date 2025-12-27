import { Injectable, Logger } from '@nestjs/common';
import { Prisma, ImportRunStatus } from '@prisma/client';
import { CsvParserService, MissingHeadersError } from './csv-parser.service';
import { PrismaService } from '../prisma/prisma.service';
import { CategoryTreeService } from '../catalog/category-tree.service';
import { buildCategoryNodes } from './category-utils';

export class RowValidationError extends Error {
  constructor(message: string, public readonly field?: string) {
    super(message);
  }
}

type RowChunk = {
  rows: Record<string, string>[];
  startIndex: number;
};

type ParsedRow = {
  rowNumber: number;
  itemId: number;
  productId: number;
  productName: string;
  productDescription: string | null;
  manufacturerId: number;
  manufacturerName: string;
  categoryPathId: string | null;
  categoryPathName: string | null;
  missingCategoryPath: boolean;
  manufacturerItemCode: string | null;
  itemDescription: string | null;
  itemImageUrl: string | null;
  ndcItemCode: string | null;
  pkg: string | null;
  unitPrice: Prisma.Decimal | null;
  priceDescription: string | null;
  availabilityRaw: string | null;
  packingListDescription: string | null;
  unitWeight: number | null;
  unitVolume: number | null;
  uomFactor: number | null;
  countryOfOrigin: string | null;
  harmonizedTariffCode: string | null;
  hazMatClass: string | null;
  hazMatCode: string | null;
  pharmacyProductType: string | null;
  nationalDrugCode: string | null;
  brandId: string | null;
  brandName: string | null;
};

type ChunkResult = {
  inserted: number;
  updated: number;
  errorRows: Prisma.ImportRowErrorCreateManyInput[];
  categoryPaths: Set<string>;
};

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly csvParser: CsvParserService,
    private readonly categoryTreeService: CategoryTreeService
  ) {}

  async listImportRuns(limit = 25) {
    return this.prisma.importRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        status: true,
        createdAt: true,
        startedAt: true,
        finishedAt: true,
        totalRows: true,
        inserted: true,
        updated: true,
        deactivated: true,
        errorCount: true
      }
    });
  }

  async getImportRun(id: string) {
    return this.prisma.importRun.findUnique({ where: { id } });
  }

  async listImportErrors(importRunId: string, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.importRowError.findMany({
        where: { importRunId },
        orderBy: { rowNumber: 'asc' },
        skip,
        take: pageSize
      }),
      this.prisma.importRowError.count({ where: { importRunId } })
    ]);

    return {
      items,
      page,
      pageSize,
      total,
      hasNext: skip + items.length < total
    };
  }

  async createImportRun(originalFilename: string, storedPath: string) {
    return this.prisma.importRun.create({
      data: {
        status: ImportRunStatus.QUEUED,
        originalFilename,
        storedPath
      }
    });
  }

  async createImportRunWithId(id: string, originalFilename: string, storedPath: string) {
    return this.prisma.importRun.create({
      data: {
        id,
        status: ImportRunStatus.QUEUED,
        originalFilename,
        storedPath
      }
    });
  }

  async markRunning(importRunId: string) {
    return this.prisma.importRun.update({
      where: { id: importRunId },
      data: {
        status: ImportRunStatus.RUNNING,
        startedAt: new Date(),
        lastErrorText: null
      }
    });
  }

  async markSucceeded(
    importRunId: string,
    stats: {
      totalRows: number;
      inserted: number;
      updated: number;
      deactivated: number;
      errorCount: number;
    }
  ) {
    return this.prisma.importRun.update({
      where: { id: importRunId },
      data: {
        status: ImportRunStatus.SUCCEEDED,
        finishedAt: new Date(),
        totalRows: stats.totalRows,
        inserted: stats.inserted,
        updated: stats.updated,
        deactivated: stats.deactivated,
        errorCount: stats.errorCount,
        lastErrorText: null
      }
    });
  }

  async markFailed(importRunId: string, errorText: string) {
    return this.prisma.importRun.update({
      where: { id: importRunId },
      data: {
        status: ImportRunStatus.FAILED,
        finishedAt: new Date(),
        lastErrorText: errorText
      }
    });
  }

  async markFailedIfRunning(importRunId: string) {
    const now = new Date();
    await this.prisma.importRun.updateMany({
      where: {
        id: importRunId,
        status: { in: [ImportRunStatus.RUNNING, ImportRunStatus.QUEUED] }
      },
      data: {
        status: ImportRunStatus.FAILED,
        finishedAt: now,
        lastErrorText: 'Manually marked failed'
      }
    });

    return this.prisma.importRun.findUnique({ where: { id: importRunId } });
  }

  async processImport(importRunId: string, filePath: string) {

    let rows: Record<string, string>[];
    try {
      rows = await this.csvParser.parseFile(filePath);
    } catch (error) {
      if (error instanceof MissingHeadersError) {
        this.logger.warn(error.message);
      }

      throw error;
    }

    const chunkSize = Number(process.env.IMPORT_BATCH_SIZE || 500);
    const concurrency = Number(process.env.IMPORT_CONCURRENCY || 4);
    const chunks = this.chunkRows(rows, chunkSize);
    const results = await this.runWithConcurrency(chunks, concurrency, (chunk) =>
      this.processChunk(importRunId, chunk)
    );

    let inserted = 0;
    let updated = 0;
    const categoryPaths = new Set<string>();
    const errorRows: Prisma.ImportRowErrorCreateManyInput[] = [];

    for (const result of results) {
      inserted += result.inserted;
      updated += result.updated;
      for (const path of result.categoryPaths) {
        categoryPaths.add(path);
      }
      errorRows.push(...result.errorRows);
    }

    if (errorRows.length > 0) {
      await this.flushImportErrors(errorRows);
    }

    if (categoryPaths.size > 0) {
      const categoryNodes = buildCategoryNodes(Array.from(categoryPaths));
      await this.prisma.category.createMany({
        data: categoryNodes,
        skipDuplicates: true
      });
      this.categoryTreeService.invalidateCache();
    }

    // TODO: Scope by supplier when supplierId is introduced.
    const deactivated = await this.prisma.sku.updateMany({
      where: {
        isActive: true,
        lastSeenImportRunId: { not: importRunId }
      },
      data: { isActive: false }
    });

    return {
      totalRows: rows.length,
      inserted,
      updated,
      deactivated: deactivated.count,
      errorCount: errorRows.length
    };
  }

  private chunkRows(rows: Record<string, string>[], size: number): RowChunk[] {
    const chunks: RowChunk[] = [];
    for (let index = 0; index < rows.length; index += size) {
      chunks.push({ rows: rows.slice(index, index + size), startIndex: index });
    }
    return chunks;
  }

  private async runWithConcurrency<T, R>(
    items: T[],
    limit: number,
    worker: (item: T) => Promise<R>
  ): Promise<R[]> {
    const results: R[] = [];
    let nextIndex = 0;
    const runners = Array.from({ length: Math.max(1, limit) }, async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        results.push(await worker(items[currentIndex]));
      }
    });
    await Promise.all(runners);
    return results;
  }

  private async processChunk(importRunId: string, chunk: RowChunk): Promise<ChunkResult> {
    const parsedRows: ParsedRow[] = [];
    const errorRows: Prisma.ImportRowErrorCreateManyInput[] = [];
    const categoryPaths = new Set<string>();

    chunk.rows.forEach((row, index) => {
      const rowNumber = chunk.startIndex + index + 2;
      try {
        const parsedRow = this.parseRow(row);
        if (parsedRow.categoryPathName) {
          categoryPaths.add(parsedRow.categoryPathName);
        } else if (parsedRow.missingCategoryPath) {
          errorRows.push({
            importRunId,
            rowNumber,
            field: 'CategoryPathID',
            message: 'Missing; set to Uncategorized'
          });
        }
        parsedRows.push({ ...parsedRow, rowNumber });
      } catch (error) {
        const field = error instanceof RowValidationError ? error.field : undefined;
        const message = error instanceof Error ? error.message : 'Unknown error';
        errorRows.push({
          importRunId,
          rowNumber,
          field,
          message
        });
      }
    });

    if (parsedRows.length === 0) {
      return { inserted: 0, updated: 0, errorRows, categoryPaths };
    }

    const manufacturerMap = new Map<number, string>();
    const categoryPathMap = new Map<string, string>();
    const productMap = new Map<number, ParsedRow>();
    const skuMap = new Map<number, ParsedRow>();

    parsedRows.forEach((row) => {
      manufacturerMap.set(row.manufacturerId, row.manufacturerName);
      if (row.categoryPathId && row.categoryPathName) {
        categoryPathMap.set(row.categoryPathId, row.categoryPathName);
      }
      productMap.set(row.productId, row);
      skuMap.set(row.itemId, row);
    });

    const skuRows = Array.from(skuMap.values());
    const skuIds = skuRows.map((row) => row.itemId);
    let updated = 0;
    let inserted = 0;

    try {
      await this.withRetry(async () => {
        const existingSkus = await this.prisma.sku.findMany({
          where: { itemId: { in: skuIds } },
          select: { itemId: true }
        });
        const existingSet = new Set(existingSkus.map((sku) => sku.itemId));
        updated = existingSet.size;
        inserted = skuIds.length - updated;

        await this.bulkUpsertManufacturers(Array.from(manufacturerMap.entries()));
        await this.bulkUpsertCategoryPaths(Array.from(categoryPathMap.entries()));
        await this.bulkUpsertProducts(Array.from(productMap.values()));
        await this.bulkUpsertSkus(importRunId, skuRows);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      skuRows.forEach((row) => {
        errorRows.push({
          importRunId,
          rowNumber: row.rowNumber,
          message
        });
      });
      return { inserted: 0, updated: 0, errorRows, categoryPaths };
    }

    return { inserted, updated, errorRows, categoryPaths };
  }

  private async flushImportErrors(rows: Prisma.ImportRowErrorCreateManyInput[]) {
    const batchSize = 200;
    for (let index = 0; index < rows.length; index += batchSize) {
      await this.prisma.importRowError.createMany({
        data: rows.slice(index, index + batchSize)
      });
    }
  }

  private async bulkUpsertManufacturers(entries: Array<[number, string]>) {
    if (entries.length === 0) {
      return;
    }
    const values = entries.map(([manufacturerId, name]) => Prisma.sql`(${manufacturerId}, ${name})`);
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO "Manufacturer" ("manufacturerId", "name")
      VALUES ${Prisma.join(values)}
      ON CONFLICT ("manufacturerId") DO UPDATE SET "name" = EXCLUDED."name"
    `);
  }

  private async bulkUpsertCategoryPaths(entries: Array<[string, string]>) {
    if (entries.length === 0) {
      return;
    }
    const values = entries.map(([categoryPathId, categoryPathName]) =>
      Prisma.sql`(${categoryPathId}, ${categoryPathName})`
    );
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO "CategoryPath" ("categoryPathId", "categoryPathName")
      VALUES ${Prisma.join(values)}
      ON CONFLICT ("categoryPathId") DO UPDATE SET "categoryPathName" = EXCLUDED."categoryPathName"
    `);
  }

  private async bulkUpsertProducts(rows: ParsedRow[]) {
    if (rows.length === 0) {
      return;
    }
    const values = rows.map((row) =>
      Prisma.sql`(${row.productId}, ${row.productName}, ${row.productDescription}, ${row.manufacturerId}, ${row.categoryPathId})`
    );
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO "Product" (
        "productId",
        "productName",
        "productDescription",
        "manufacturerId",
        "primaryCategoryPathId"
      )
      VALUES ${Prisma.join(values)}
      ON CONFLICT ("productId")
      DO UPDATE SET
        "productName" = EXCLUDED."productName",
        "productDescription" = EXCLUDED."productDescription",
        "manufacturerId" = EXCLUDED."manufacturerId",
        "primaryCategoryPathId" = EXCLUDED."primaryCategoryPathId"
    `);
  }

  private async bulkUpsertSkus(importRunId: string, rows: ParsedRow[]) {
    if (rows.length === 0) {
      return;
    }
    const now = new Date();
    const values = rows.map((row) =>
      Prisma.sql`(
        ${row.itemId},
        ${row.productId},
        ${row.manufacturerItemCode},
        ${row.itemDescription},
        ${row.itemImageUrl},
        ${row.ndcItemCode},
        ${row.pkg},
        ${row.unitPrice},
        ${row.priceDescription},
        ${row.availabilityRaw},
        ${row.packingListDescription},
        ${row.unitWeight},
        ${row.unitVolume},
        ${row.uomFactor},
        ${row.countryOfOrigin},
        ${row.harmonizedTariffCode},
        ${row.hazMatClass},
        ${row.hazMatCode},
        ${row.pharmacyProductType},
        ${row.nationalDrugCode},
        ${row.brandId},
        ${row.brandName},
        ${true},
        ${importRunId},
        ${now},
        ${now}
      )`
    );
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO "Sku" (
        "itemId",
        "productId",
        "manufacturerItemCode",
        "itemDescription",
        "itemImageUrl",
        "ndcItemCode",
        "pkg",
        "unitPrice",
        "priceDescription",
        "availabilityRaw",
        "packingListDescription",
        "unitWeight",
        "unitVolume",
        "uomFactor",
        "countryOfOrigin",
        "harmonizedTariffCode",
        "hazMatClass",
        "hazMatCode",
        "pharmacyProductType",
        "nationalDrugCode",
        "brandId",
        "brandName",
        "isActive",
        "lastSeenImportRunId",
        "lastSeenAt",
        "updatedAt"
      )
      VALUES ${Prisma.join(values)}
      ON CONFLICT ("itemId")
      DO UPDATE SET
        "productId" = EXCLUDED."productId",
        "manufacturerItemCode" = EXCLUDED."manufacturerItemCode",
        "itemDescription" = EXCLUDED."itemDescription",
        "itemImageUrl" = EXCLUDED."itemImageUrl",
        "ndcItemCode" = EXCLUDED."ndcItemCode",
        "pkg" = EXCLUDED."pkg",
        "unitPrice" = EXCLUDED."unitPrice",
        "priceDescription" = EXCLUDED."priceDescription",
        "availabilityRaw" = EXCLUDED."availabilityRaw",
        "packingListDescription" = EXCLUDED."packingListDescription",
        "unitWeight" = EXCLUDED."unitWeight",
        "unitVolume" = EXCLUDED."unitVolume",
        "uomFactor" = EXCLUDED."uomFactor",
        "countryOfOrigin" = EXCLUDED."countryOfOrigin",
        "harmonizedTariffCode" = EXCLUDED."harmonizedTariffCode",
        "hazMatClass" = EXCLUDED."hazMatClass",
        "hazMatCode" = EXCLUDED."hazMatCode",
        "pharmacyProductType" = EXCLUDED."pharmacyProductType",
        "nationalDrugCode" = EXCLUDED."nationalDrugCode",
        "brandId" = EXCLUDED."brandId",
        "brandName" = EXCLUDED."brandName",
        "isActive" = EXCLUDED."isActive",
        "lastSeenImportRunId" = EXCLUDED."lastSeenImportRunId",
        "lastSeenAt" = EXCLUDED."lastSeenAt",
        "updatedAt" = EXCLUDED."updatedAt"
    `);
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts = 4,
    baseDelayMs = 150
  ): Promise<T> {
    let attempt = 0;
    while (attempt < maxAttempts) {
      try {
        return await operation();
      } catch (error) {
        attempt += 1;
        if (!this.isDeadlockError(error) || attempt >= maxAttempts) {
          throw error;
        }
        await this.sleep(baseDelayMs * attempt);
      }
    }
    throw new Error('Retry attempts exhausted.');
  }

  private isDeadlockError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2034') {
        return true;
      }
      if (error.code === 'P2010' && error.message.includes('40P01')) {
        return true;
      }
    }
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('deadlock') || message.includes('40p01');
    }
    return false;
  }

  private async sleep(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private parseRow(row: Record<string, string>) {
    const itemId = this.parseIntField(row.ItemID, 'ItemID');
    const productId = this.parseIntField(row.ProductID, 'ProductID');
    const manufacturerId = this.parseIntField(row.ManufacturerID, 'ManufacturerID');

    const manufacturerName = this.parseRequiredString(row.ManufacturerName, 'ManufacturerName');
    const productName = this.parseRequiredString(row.ProductName, 'ProductName');
    const categoryPathId = this.toNullableString(row.CategoryPathID);
    const categoryPathNameRaw = this.toNullableString(row.CategoryPathName);
    const missingCategoryPath = !categoryPathId;
    let categoryPathName: string | null = null;
    if (categoryPathId) {
      if (!categoryPathNameRaw) {
        throw new RowValidationError('CategoryPathName is required', 'CategoryPathName');
      }
      categoryPathName = categoryPathNameRaw;
    }
    const unitPrice = this.parseDecimalOptional(row.UnitPrice, 'UnitPrice');
    const availabilityRaw = this.toNullableString(row.Availability);

    return {
      itemId,
      productId,
      productName,
      productDescription: this.toNullableString(row.ProductDescription),
      manufacturerId,
      manufacturerName,
      categoryPathId,
      categoryPathName,
      missingCategoryPath,
      manufacturerItemCode: this.toNullableString(row.ManufacturerItemCode),
      itemDescription: this.toNullableString(row.ItemDescription),
      itemImageUrl: this.toNullableString(row.ItemImageURL),
      ndcItemCode: this.toNullableString(row.NDCItemCode),
      pkg: this.toNullableString(row.Pkg),
      unitPrice,
      priceDescription: this.toNullableString(row.PriceDescription),
      availabilityRaw,
      packingListDescription: this.toNullableString(row.PackingListDescritpion),
      unitWeight: this.toNullableFloat(row.UnitWeight, 'UnitWeight'),
      unitVolume: this.toNullableFloat(row.UnitVolume, 'UnitVolume'),
      uomFactor: this.toNullableInt(row.UOMFactor, 'UOMFactor'),
      countryOfOrigin: this.toNullableString(row.CountryOfOrigin),
      harmonizedTariffCode: this.toNullableString(row.HarmonizedTariffCode),
      hazMatClass: this.toNullableString(row.HazMatClass),
      hazMatCode: this.toNullableString(row.HazMatCode),
      pharmacyProductType: this.toNullableString(row.PharmacyProductType),
      nationalDrugCode: this.toNullableString(row.NationalDrugCode),
      brandId: this.toNullableString(row.BrandID),
      brandName: this.toNullableString(row.BrandName)
    };
  }

  private parseRequiredString(value: string | undefined, field: string) {
    if (!value || value.trim() === '') {
      throw new RowValidationError(`${field} is required`, field);
    }

    return value.trim();
  }

  private parseDecimalOptional(value: string | undefined, field: string) {
    if (!value || value.trim() === '') {
      return null;
    }

    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      throw new RowValidationError(`${field} must be numeric`, field);
    }

    return new Prisma.Decimal(value);
  }

  private parseIntField(value: string | undefined, field: string) {
    const parsed = Number.parseInt(String(value), 10);
    if (Number.isNaN(parsed)) {
      throw new RowValidationError(`${field} must be an integer`, field);
    }

    return parsed;
  }

  private toNullableString(value: string | undefined) {
    if (!value || value.trim() === '') {
      return null;
    }

    return value.trim();
  }

  private toNullableFloat(value: string | undefined, field: string) {
    if (!value || value.trim() === '') {
      return null;
    }

    const parsed = Number.parseFloat(value);
    if (Number.isNaN(parsed)) {
      throw new RowValidationError(`${field} must be numeric`, field);
    }

    return parsed;
  }

  private toNullableInt(value: string | undefined, field: string) {
    if (!value || value.trim() === '') {
      return null;
    }

    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      throw new RowValidationError(`${field} must be numeric`, field);
    }

    return parsed;
  }
}
