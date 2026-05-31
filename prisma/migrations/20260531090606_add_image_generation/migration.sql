-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "imageUrl" VARCHAR(1000);

-- CreateTable
CREATE TABLE "ImageGenerationJob" (
    "id" TEXT NOT NULL,
    "prompt" VARCHAR(2000) NOT NULL,
    "source" VARCHAR(20) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "comfyuiPromptId" TEXT,
    "outputFilename" VARCHAR(500),
    "imageUrl" VARCHAR(1000),
    "error" VARCHAR(500),
    "requestedBy" TEXT NOT NULL,
    "postId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ImageGenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImageGenerationJob_status_idx" ON "ImageGenerationJob"("status");

-- CreateIndex
CREATE INDEX "ImageGenerationJob_requestedBy_idx" ON "ImageGenerationJob"("requestedBy");

-- CreateIndex
CREATE INDEX "ImageGenerationJob_createdAt_idx" ON "ImageGenerationJob"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "ImageGenerationJob" ADD CONSTRAINT "ImageGenerationJob_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageGenerationJob" ADD CONSTRAINT "ImageGenerationJob_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
