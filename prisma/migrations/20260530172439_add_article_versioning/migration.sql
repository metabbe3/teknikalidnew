-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "lastGeneratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "Article_articleType_tickerTag_lastGeneratedAt_idx" ON "Article"("articleType", "tickerTag", "lastGeneratedAt");
