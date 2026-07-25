-- CreateEnum
CREATE TYPE "AssetClass" AS ENUM ('EQUITY', 'CRYPTO');

-- AlterTable
ALTER TABLE "Stock" ADD COLUMN     "assetClass" "AssetClass" NOT NULL DEFAULT 'EQUITY';

