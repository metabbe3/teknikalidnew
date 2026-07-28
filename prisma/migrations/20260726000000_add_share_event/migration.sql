-- CreateTable
CREATE TABLE "ShareEvent" (
    "id" SERIAL NOT NULL,
    "target" VARCHAR(16) NOT NULL,
    "context" VARCHAR(16) NOT NULL,
    "path" VARCHAR(255) NOT NULL,
    "userId" TEXT,
    "ip" VARCHAR(45),
    "userAgent" VARCHAR(500),
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShareEvent_createdAt_idx" ON "ShareEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ShareEvent_target_createdAt_idx" ON "ShareEvent"("target", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ShareEvent_context_createdAt_idx" ON "ShareEvent"("context", "createdAt");

-- CreateIndex
CREATE INDEX "ShareEvent_isBot_idx" ON "ShareEvent"("isBot");

-- AddForeignKey
ALTER TABLE "ShareEvent" ADD CONSTRAINT "ShareEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
