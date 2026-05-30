-- AlterTable
ALTER TABLE "StockIndicator" ADD COLUMN     "adx" DECIMAL(8,2),
ADD COLUMN     "atr" DECIMAL(12,2),
ADD COLUMN     "emaCrossDate" DATE,
ADD COLUMN     "emaCrossSignal" VARCHAR(20),
ADD COLUMN     "smaCrossDate" DATE,
ADD COLUMN     "smaCrossSignal" VARCHAR(20),
ADD COLUMN     "stochD" DECIMAL(8,2),
ADD COLUMN     "stochK" DECIMAL(8,2),
ADD COLUMN     "vwap" DECIMAL(12,2);
