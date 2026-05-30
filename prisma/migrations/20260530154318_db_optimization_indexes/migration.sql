-- DropIndex
DROP INDEX "StockFundamental_dividendYield_idx";

-- DropIndex
DROP INDEX "StockFundamental_marketCap_idx";

-- DropIndex
DROP INDEX "StockFundamental_pb_idx";

-- DropIndex
DROP INDEX "StockFundamental_pe_idx";

-- CreateIndex
CREATE INDEX "Post_authorId_createdAt_idx" ON "Post"("authorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "StockFundamental_date_pe_idx" ON "StockFundamental"("date", "pe");

-- CreateIndex
CREATE INDEX "StockFundamental_date_dividendYield_idx" ON "StockFundamental"("date", "dividendYield");

-- CreateIndex
CREATE INDEX "StockFundamental_date_marketCap_idx" ON "StockFundamental"("date", "marketCap");

-- CreateIndex
CREATE INDEX "StockIndicator_stockId_interval_date_idx" ON "StockIndicator"("stockId", "interval", "date" DESC);

-- CreateIndex
CREATE INDEX "StockIndicator_interval_date_idx" ON "StockIndicator"("interval", "date");

-- Partial index for oversold screener (tiny: only covers oversold rows)
CREATE INDEX "StockIndicator_oversold_screen_idx"
ON "StockIndicator" (date, "stockId")
WHERE interval = '1d' AND ("rsi14" <= 30 OR ("stochK" <= 20 AND "stochD" <= 20));
