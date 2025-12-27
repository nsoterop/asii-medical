-- CreateEnum
CREATE TYPE "ImportRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'FAILED', 'SUCCEEDED');

-- CreateTable
CREATE TABLE "Manufacturer" (
    "manufacturerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Manufacturer_pkey" PRIMARY KEY ("manufacturerId")
);

-- CreateTable
CREATE TABLE "CategoryPath" (
    "categoryPathId" TEXT NOT NULL,
    "categoryPathName" TEXT NOT NULL,

    CONSTRAINT "CategoryPath_pkey" PRIMARY KEY ("categoryPathId")
);

-- CreateTable
CREATE TABLE "Product" (
    "productId" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "productDescription" TEXT,
    "manufacturerId" INTEGER,
    "primaryCategoryPathId" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("productId")
);

-- CreateTable
CREATE TABLE "Sku" (
    "itemId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "manufacturerItemCode" TEXT NOT NULL,
    "itemDescription" TEXT NOT NULL,
    "itemImageUrl" TEXT NOT NULL,
    "ndcItemCode" TEXT NOT NULL,
    "pkg" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "priceDescription" TEXT NOT NULL,
    "availabilityRaw" TEXT NOT NULL,
    "packingListDescription" TEXT NOT NULL,
    "unitWeight" DOUBLE PRECISION,
    "unitVolume" DOUBLE PRECISION,
    "uomFactor" INTEGER,
    "countryOfOrigin" TEXT,
    "harmonizedTariffCode" TEXT,
    "hazMatClass" TEXT,
    "hazMatCode" TEXT,
    "pharmacyProductType" TEXT,
    "nationalDrugCode" TEXT,
    "brandId" TEXT,
    "brandName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sku_pkey" PRIMARY KEY ("itemId")
);

-- CreateTable
CREATE TABLE "ImportRun" (
    "id" UUID NOT NULL,
    "status" "ImportRunStatus" NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "inserted" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "deactivated" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ImportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRowError" (
    "id" UUID NOT NULL,
    "importRunId" UUID NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "field" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportRowError_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Product_manufacturerId_idx" ON "Product"("manufacturerId");

-- CreateIndex
CREATE INDEX "Product_primaryCategoryPathId_idx" ON "Product"("primaryCategoryPathId");

-- CreateIndex
CREATE INDEX "Sku_productId_idx" ON "Sku"("productId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("manufacturerId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_primaryCategoryPathId_fkey" FOREIGN KEY ("primaryCategoryPathId") REFERENCES "CategoryPath"("categoryPathId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sku" ADD CONSTRAINT "Sku_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("productId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRowError" ADD CONSTRAINT "ImportRowError_importRunId_fkey" FOREIGN KEY ("importRunId") REFERENCES "ImportRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

