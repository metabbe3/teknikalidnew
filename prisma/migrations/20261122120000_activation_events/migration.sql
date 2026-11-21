-- Wave-7: ACTIVATION FUNNEL EVENTS (Argon & Opus directive 21 Nov 2026)
-- Tabel ActivationEvent untuk mengukur funnel aktivasi pengunjung & guest AI chat

-- CreateTable
CREATE TABLE "ActivationEvent" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "props" JSONB,
    "anonId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivationEvent_event_createdAt_idx" ON "ActivationEvent"("event", "createdAt");

-- CreateIndex
CREATE INDEX "ActivationEvent_anonId_idx" ON "ActivationEvent"("anonId");
