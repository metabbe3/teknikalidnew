-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'THESIS_BREACH';

-- AlterEnum
ALTER TYPE "ArticleType" ADD VALUE 'MOVEMENT_ANALYSIS';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "flaggedAt" TIMESTAMP(3),
ADD COLUMN     "signupAsn" VARCHAR(20),
ADD COLUMN     "signupIp" VARCHAR(45);

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "meta" JSONB,
ADD COLUMN     "ticker" VARCHAR(20);

-- AlterTable
ALTER TABLE "PageView" ADD COLUMN     "isBot" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "StockThesis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticker" VARCHAR(20) NOT NULL,
    "bias" VARCHAR(10) NOT NULL,
    "targetPrice" DECIMAL(12,2),
    "stopLoss" DECIMAL(12,2),
    "rationale" VARCHAR(280),
    "lastNotifiedBreach" VARCHAR(20),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockThesis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedIp" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "bannedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "BlockedIp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockThesis_userId_idx" ON "StockThesis"("userId");

-- CreateIndex
CREATE INDEX "StockThesis_ticker_idx" ON "StockThesis"("ticker");

-- CreateIndex
CREATE UNIQUE INDEX "StockThesis_userId_ticker_key" ON "StockThesis"("userId", "ticker");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedIp_ip_key" ON "BlockedIp"("ip");

-- CreateIndex
CREATE INDEX "BlockedIp_ip_idx" ON "BlockedIp"("ip");

-- CreateIndex
CREATE INDEX "Post_predictionOutcome_idx" ON "Post"("predictionOutcome");

-- CreateIndex
CREATE INDEX "PageView_isBot_idx" ON "PageView"("isBot");

-- AddForeignKey
ALTER TABLE "StockThesis" ADD CONSTRAINT "StockThesis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

