-- tracking-audit 2026-10-30 (Argon 422 baris) — additive, owner-directed
ALTER TABLE "ShareEvent" ADD COLUMN IF NOT EXISTS "anonId" VARCHAR(36);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "initialAnonId" VARCHAR(36);
CREATE INDEX IF NOT EXISTS "User_initialAnonId_idx" ON "User"("initialAnonId");
CREATE INDEX IF NOT EXISTS "ShareEvent_anonId_idx" ON "ShareEvent"("anonId");
ALTER TABLE "EngagementEvent" ALTER COLUMN "label" TYPE VARCHAR(64);
CREATE TABLE IF NOT EXISTS "AppErrorLog" (
  "id" SERIAL PRIMARY KEY,
  "fingerprint" VARCHAR(64) NOT NULL,
  "kind" VARCHAR(16) NOT NULL,
  "path" VARCHAR(255),
  "message" VARCHAR(500) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 1,
  "anonId" VARCHAR(36),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "AppErrorLog_fingerprint_idx" ON "AppErrorLog"("fingerprint");
CREATE INDEX IF NOT EXISTS "AppErrorLog_createdAt_idx" ON "AppErrorLog"("createdAt" DESC);
ALTER TABLE "TelegramWatch" ADD COLUMN IF NOT EXISTS "anonPrefix" VARCHAR(16);
CREATE INDEX IF NOT EXISTS "TelegramWatch_anonPrefix_idx" ON "TelegramWatch"("anonPrefix");
