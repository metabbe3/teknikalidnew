-- AlterTable
ALTER TABLE "Stock" ADD COLUMN     "address" VARCHAR(500),
ADD COLUMN     "email" VARCHAR(100),
ADD COLUMN     "fax" VARCHAR(50),
ADD COLUMN     "industry" VARCHAR(100),
ADD COLUMN     "listingDate" DATE,
ADD COLUMN     "logo" VARCHAR(500),
ADD COLUMN     "npwp" VARCHAR(50),
ADD COLUMN     "phone" VARCHAR(50),
ADD COLUMN     "subIndustry" VARCHAR(100),
ADD COLUMN     "subSector" VARCHAR(100),
ADD COLUMN     "website" VARCHAR(255);

-- AlterTable
ALTER TABLE "StockFundamental" ADD COLUMN     "averageDailyVolume3Month" BIGINT,
ADD COLUMN     "beta" DECIMAL(8,4),
ADD COLUMN     "bookValue" DECIMAL(12,2),
ADD COLUMN     "sharesOutstanding" BIGINT;

-- CreateTable
CREATE TABLE "StockShareholder" (
    "id" SERIAL NOT NULL,
    "stockId" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(100),
    "shares" DECIMAL(20,2),
    "percent" DECIMAL(6,2),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockShareholder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockDirector" (
    "id" SERIAL NOT NULL,
    "stockId" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "position" VARCHAR(100) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "independent" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockDirector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockCommissioner" (
    "id" SERIAL NOT NULL,
    "stockId" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "position" VARCHAR(100),
    "independent" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockCommissioner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockSubsidiary" (
    "id" SERIAL NOT NULL,
    "stockId" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "businessType" VARCHAR(255),
    "totalAssets" DECIMAL(20,2),
    "ownershipPercent" DECIMAL(6,2),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockSubsidiary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockDividend" (
    "id" SERIAL NOT NULL,
    "stockId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "currency" VARCHAR(10),
    "amount" DECIMAL(12,4),
    "totalAmount" DECIMAL(20,2),
    "cumDate" DATE,
    "exDate" DATE,
    "recordDate" DATE,
    "paymentDate" DATE,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockDividend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockShareholder_stockId_idx" ON "StockShareholder"("stockId");

-- CreateIndex
CREATE INDEX "StockDirector_stockId_idx" ON "StockDirector"("stockId");

-- CreateIndex
CREATE INDEX "StockCommissioner_stockId_idx" ON "StockCommissioner"("stockId");

-- CreateIndex
CREATE INDEX "StockSubsidiary_stockId_idx" ON "StockSubsidiary"("stockId");

-- CreateIndex
CREATE INDEX "StockDividend_stockId_year_idx" ON "StockDividend"("stockId", "year" DESC);

-- CreateIndex
CREATE INDEX "StockDividend_stockId_type_idx" ON "StockDividend"("stockId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "StockDividend_stockId_year_type_key" ON "StockDividend"("stockId", "year", "type");

-- AddForeignKey
ALTER TABLE "StockShareholder" ADD CONSTRAINT "StockShareholder_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockDirector" ADD CONSTRAINT "StockDirector_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCommissioner" ADD CONSTRAINT "StockCommissioner_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockSubsidiary" ADD CONSTRAINT "StockSubsidiary_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockDividend" ADD CONSTRAINT "StockDividend_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
