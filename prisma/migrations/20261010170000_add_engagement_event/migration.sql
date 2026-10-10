-- EngagementEvent: dwell/scroll/cta telemetry (additive, owner-direct prd-2026-10-10-01)
CREATE TABLE "EngagementEvent" (
    "id" SERIAL NOT NULL,
    "anonId" VARCHAR(36) NOT NULL,
    "path" VARCHAR(255) NOT NULL,
    "type" VARCHAR(16) NOT NULL,
    "label" VARCHAR(32),
    "valueNum" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EngagementEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EngagementEvent_createdAt_idx" ON "EngagementEvent"("createdAt");
CREATE INDEX "EngagementEvent_type_createdAt_idx" ON "EngagementEvent"("type", "createdAt" DESC);
CREATE INDEX "EngagementEvent_anonId_createdAt_idx" ON "EngagementEvent"("anonId", "createdAt");
CREATE INDEX "EngagementEvent_path_idx" ON "EngagementEvent"("path");
