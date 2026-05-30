-- CreateTable
CREATE TABLE "StockFundamental" (
    "id" SERIAL NOT NULL,
    "stockId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "pe" DECIMAL(10,2),
    "forwardPe" DECIMAL(10,2),
    "pb" DECIMAL(10,2),
    "eps" DECIMAL(12,2),
    "dividendYield" DECIMAL(6,4),
    "marketCap" BIGINT NOT NULL,

    CONSTRAINT "StockFundamental_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockFundamental_pe_idx" ON "StockFundamental"("pe");

-- CreateIndex
CREATE INDEX "StockFundamental_pb_idx" ON "StockFundamental"("pb");

-- CreateIndex
CREATE INDEX "StockFundamental_dividendYield_idx" ON "StockFundamental"("dividendYield");

-- CreateIndex
CREATE INDEX "StockFundamental_marketCap_idx" ON "StockFundamental"("marketCap");

-- CreateIndex
CREATE UNIQUE INDEX "StockFundamental_stockId_date_key" ON "StockFundamental"("stockId", "date");

-- AddForeignKey
ALTER TABLE "StockFundamental" ADD CONSTRAINT "StockFundamental_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
