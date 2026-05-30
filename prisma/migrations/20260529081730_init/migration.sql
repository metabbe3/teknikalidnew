-- CreateTable
CREATE TABLE "Stock" (
    "id" SERIAL NOT NULL,
    "ticker" VARCHAR(20) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "sector" VARCHAR(100) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockPrice" (
    "id" SERIAL NOT NULL,
    "stockId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "open" DECIMAL(12,2) NOT NULL,
    "high" DECIMAL(12,2) NOT NULL,
    "low" DECIMAL(12,2) NOT NULL,
    "close" DECIMAL(12,2) NOT NULL,
    "volume" BIGINT NOT NULL,
    "adjClose" DECIMAL(12,2),

    CONSTRAINT "StockPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockIndicator" (
    "id" SERIAL NOT NULL,
    "stockId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "interval" VARCHAR(10) NOT NULL,
    "sma20" DECIMAL(12,2),
    "sma50" DECIMAL(12,2),
    "sma200" DECIMAL(12,2),
    "ema12" DECIMAL(12,2),
    "ema26" DECIMAL(12,2),
    "rsi14" DECIMAL(8,2),
    "macdLine" DECIMAL(12,4),
    "macdSignal" DECIMAL(12,4),
    "macdHist" DECIMAL(12,4),
    "bbUpper" DECIMAL(12,2),
    "bbMiddle" DECIMAL(12,2),
    "bbLower" DECIMAL(12,2),

    CONSTRAINT "StockIndicator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CachedApiCall" (
    "id" SERIAL NOT NULL,
    "cacheKey" VARCHAR(255) NOT NULL,
    "data" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CachedApiCall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Stock_ticker_key" ON "Stock"("ticker");

-- CreateIndex
CREATE INDEX "Stock_sector_idx" ON "Stock"("sector");

-- CreateIndex
CREATE INDEX "Stock_isActive_idx" ON "Stock"("isActive");

-- CreateIndex
CREATE INDEX "StockPrice_stockId_date_idx" ON "StockPrice"("stockId", "date" DESC);

-- CreateIndex
CREATE INDEX "StockPrice_date_idx" ON "StockPrice"("date");

-- CreateIndex
CREATE UNIQUE INDEX "StockPrice_stockId_date_key" ON "StockPrice"("stockId", "date");

-- CreateIndex
CREATE INDEX "StockIndicator_stockId_date_idx" ON "StockIndicator"("stockId", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "StockIndicator_stockId_date_interval_key" ON "StockIndicator"("stockId", "date", "interval");

-- CreateIndex
CREATE UNIQUE INDEX "CachedApiCall_cacheKey_key" ON "CachedApiCall"("cacheKey");

-- CreateIndex
CREATE INDEX "CachedApiCall_expiresAt_idx" ON "CachedApiCall"("expiresAt");

-- AddForeignKey
ALTER TABLE "StockPrice" ADD CONSTRAINT "StockPrice_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockIndicator" ADD CONSTRAINT "StockIndicator_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
