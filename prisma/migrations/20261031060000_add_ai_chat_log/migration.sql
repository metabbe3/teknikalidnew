-- Flywheel Tanya AI (idempotent — doctrine P3005)
CREATE TABLE IF NOT EXISTS "AiChatLog" (
    "id" SERIAL PRIMARY KEY,
    "anonId" VARCHAR(36),
    "userId" TEXT,
    "route" VARCHAR(16) NOT NULL,
    "mode" VARCHAR(16),
    "ticker" VARCHAR(12),
    "question" VARCHAR(500) NOT NULL,
    "answer" TEXT NOT NULL,
    "provider" VARCHAR(24),
    "latencyMs" INTEGER,
    "followupClick" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "AiChatLog_createdAt_idx" ON "AiChatLog"("createdAt");
CREATE INDEX IF NOT EXISTS "AiChatLog_route_createdAt_idx" ON "AiChatLog"("route","createdAt" DESC);
CREATE INDEX IF NOT EXISTS "AiChatLog_ticker_idx" ON "AiChatLog"("ticker");
