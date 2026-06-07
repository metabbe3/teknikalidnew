-- CreateTable
CREATE TABLE "CronLog" (
    "id" SERIAL NOT NULL,
    "jobName" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER NOT NULL,
    "result" JSONB,
    "errorMessage" TEXT,
    "triggeredBy" VARCHAR(20) NOT NULL DEFAULT 'cron',

    CONSTRAINT "CronLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CronLog_jobName_startedAt_idx" ON "CronLog"("jobName", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "CronLog_startedAt_idx" ON "CronLog"("startedAt");
