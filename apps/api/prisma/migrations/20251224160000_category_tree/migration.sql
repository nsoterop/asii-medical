CREATE TABLE "Category" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "parentPath" TEXT,
  "depth" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Category_path_key" ON "Category"("path");
CREATE INDEX "Category_parentPath_idx" ON "Category"("parentPath");
CREATE INDEX "Category_depth_idx" ON "Category"("depth");
