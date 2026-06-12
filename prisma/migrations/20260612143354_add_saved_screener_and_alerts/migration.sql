-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'SCREENER_MATCH';

-- CreateTable
CREATE TABLE "SavedScreener" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "filters" JSONB NOT NULL,
    "tradingStyle" VARCHAR(30),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "lastRunAt" TIMESTAMP(3),
    "lastResultCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedScreener_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreenerAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "savedScreenerId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "frequency" VARCHAR(20) NOT NULL DEFAULT 'daily',
    "lastTriggeredAt" TIMESTAMP(3),
    "lastMatchCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScreenerAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedScreener_userId_idx" ON "SavedScreener"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedScreener_userId_name_key" ON "SavedScreener"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ScreenerAlert_savedScreenerId_key" ON "ScreenerAlert"("savedScreenerId");

-- CreateIndex
CREATE INDEX "ScreenerAlert_userId_idx" ON "ScreenerAlert"("userId");

-- CreateIndex
CREATE INDEX "ScreenerAlert_isEnabled_frequency_idx" ON "ScreenerAlert"("isEnabled", "frequency");

-- AddForeignKey
ALTER TABLE "SavedScreener" ADD CONSTRAINT "SavedScreener_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreenerAlert" ADD CONSTRAINT "ScreenerAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreenerAlert" ADD CONSTRAINT "ScreenerAlert_savedScreenerId_fkey" FOREIGN KEY ("savedScreenerId") REFERENCES "SavedScreener"("id") ON DELETE CASCADE ON UPDATE CASCADE;
