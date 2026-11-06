-- CreateEnum
CREATE TYPE "ProductFileScanStatus" AS ENUM ('PENDING', 'CLEAN', 'SUSPICIOUS', 'BLOCKED', 'ERROR');

-- CreateEnum
CREATE TYPE "ProductFileReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "ProductFile"
ADD COLUMN "scanStatus" "ProductFileScanStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "scanReport" JSONB,
ADD COLUMN "scannedAt" TIMESTAMP(3),
ADD COLUMN "reviewStatus" "ProductFileReviewStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "reviewedBy" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewNote" TEXT,
ALTER COLUMN "isCurrent" SET DEFAULT false;

-- CreateIndex
CREATE INDEX "ProductFile_productId_isCurrent_reviewStatus_scanStatus_idx" ON "ProductFile"("productId", "isCurrent", "reviewStatus", "scanStatus");
