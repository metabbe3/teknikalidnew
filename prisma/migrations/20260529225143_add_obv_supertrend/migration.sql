-- AlterTable
ALTER TABLE "StockIndicator" ADD COLUMN     "obv" DECIMAL(16,2),
ADD COLUMN     "obvTrend" VARCHAR(15),
ADD COLUMN     "supertrend" DECIMAL(12,2);
