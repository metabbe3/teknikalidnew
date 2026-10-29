-- ret-qw1 (retention-riset 2026-10-30): identitas perangkat anonim di PageView
ALTER TABLE "PageView" ADD COLUMN "anonId" VARCHAR(36);
CREATE INDEX "PageView_anonId_createdAt_idx" ON "PageView"("anonId", "createdAt");
