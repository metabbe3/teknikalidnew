-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ArticleType" AS ENUM ('STOCK_ANALYSIS', 'EDUCATIONAL');

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "aiProvider" VARCHAR(20),
ADD COLUMN     "articleType" "ArticleType" NOT NULL DEFAULT 'STOCK_ANALYSIS',
ADD COLUMN     "generationMeta" JSONB,
ADD COLUMN     "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "tickerTag" VARCHAR(20);

-- CreateIndex
CREATE INDEX "Article_status_articleType_idx" ON "Article"("status", "articleType");

-- CreateIndex
CREATE INDEX "Article_tickerTag_idx" ON "Article"("tickerTag");
