CREATE TABLE IF NOT EXISTS "AiEvalRun" (
    "id" SERIAL PRIMARY KEY,
    "question" VARCHAR(500) NOT NULL,
    "route" VARCHAR(16) NOT NULL,
    "ticker" VARCHAR(12),
    "answer" TEXT NOT NULL,
    "routingScore" INTEGER NOT NULL,
    "qualityScore" INTEGER NOT NULL,
    "fitScore" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "AiEvalRun_createdAt_idx" ON "AiEvalRun"("createdAt");
