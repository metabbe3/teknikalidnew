-- Phase 3 SEO: staged rollout of unpromoted stocks.
-- WaveAssignment tracks a ticker PENDING → GENERATED → PROMOTED/REJECTED.

-- CreateEnum
CREATE TYPE "WaveStatus" AS ENUM ('PENDING', 'GENERATED', 'PROMOTED', 'REJECTED');

-- CreateTable
CREATE TABLE "WaveAssignment" (
    "id" TEXT NOT NULL,
    "ticker" VARCHAR(20) NOT NULL,
    "waveNumber" INTEGER NOT NULL,
    "status" "WaveStatus" NOT NULL DEFAULT 'PENDING',
    "archetype" VARCHAR(30) NOT NULL,
    "landingArticleId" TEXT,
    "rankedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promotedAt" TIMESTAMP(3),

    CONSTRAINT "WaveAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaveAssignment_ticker_key" ON "WaveAssignment"("ticker");
CREATE UNIQUE INDEX "WaveAssignment_landingArticleId_key" ON "WaveAssignment"("landingArticleId");
CREATE INDEX "WaveAssignment_waveNumber_status_idx" ON "WaveAssignment"("waveNumber", "status");
CREATE INDEX "WaveAssignment_status_idx" ON "WaveAssignment"("status");
