-- AlterTable
ALTER TABLE "Stock" ADD COLUMN     "businessActivity" VARCHAR(500),
ADD COLUMN     "foreignOwnershipPercent" DECIMAL(6,2),
ADD COLUMN     "isinCode" VARCHAR(20),
ADD COLUMN     "listedShares" BIGINT;

-- CreateIndex
CREATE INDEX "Stock_isinCode_idx" ON "Stock"("isinCode");
