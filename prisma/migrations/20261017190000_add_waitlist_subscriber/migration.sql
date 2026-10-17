-- WaitlistSubscriber: capture "Brief Pasar 06:30" (prd-2026-10-16-02)
CREATE TABLE "WaitlistSubscriber" (
    "id" SERIAL NOT NULL,
    "channel" VARCHAR(8) NOT NULL,
    "value" VARCHAR(255) NOT NULL,
    "source" VARCHAR(64) NOT NULL DEFAULT 'waitlist-landing',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WaitlistSubscriber_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WaitlistSubscriber_value_key" ON "WaitlistSubscriber"("value");
CREATE INDEX "WaitlistSubscriber_createdAt_idx" ON "WaitlistSubscriber"("createdAt");
