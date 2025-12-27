-- AlterTable
ALTER TABLE "Sku" ADD COLUMN "lastSeenImportRunId" TEXT,
ADD COLUMN "lastSeenAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Sku_lastSeenImportRunId_idx" ON "Sku"("lastSeenImportRunId");

-- CreateIndex
CREATE INDEX "Sku_isActive_idx" ON "Sku"("isActive");
