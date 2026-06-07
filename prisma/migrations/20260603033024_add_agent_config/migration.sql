-- AlterTable
ALTER TABLE "AgentJob" ADD COLUMN     "parentJobId" TEXT;

-- CreateTable
CREATE TABLE "AgentConfig" (
    "id" TEXT NOT NULL,
    "agentType" VARCHAR(50) NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "systemPrompt" TEXT,
    "scheduleCron" VARCHAR(50),
    "scheduleMeta" JSONB,
    "config" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentConfig_agentType_key" ON "AgentConfig"("agentType");

-- CreateIndex
CREATE INDEX "AgentConfig_agentType_idx" ON "AgentConfig"("agentType");

-- CreateIndex
CREATE INDEX "AgentJob_parentJobId_idx" ON "AgentJob"("parentJobId");
