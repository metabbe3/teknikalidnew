-- AlterTable
ALTER TABLE "Stock" ADD COLUMN     "listingBoard" VARCHAR(50);

-- CreateIndex
CREATE INDEX "Stock_listingBoard_idx" ON "Stock"("listingBoard");
