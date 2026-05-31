-- AlterTable
ALTER TABLE "StockIndicator" ADD COLUMN     "isGorengan" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "signalLabel" VARCHAR(20),
ADD COLUMN     "signalScore" DECIMAL(5,2);
