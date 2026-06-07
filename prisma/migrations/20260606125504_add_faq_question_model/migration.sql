-- CreateEnum
CREATE TYPE "QuestionSource" AS ENUM ('AI_GENERATED', 'USER_SUBMITTED', 'TRENDING');

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('PENDING', 'ANSWERED', 'REJECTED');

-- CreateEnum
CREATE TYPE "QuestionFormat" AS ENUM ('FAQ', 'MINI_ARTICLE');

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "question" VARCHAR(500) NOT NULL,
    "shortAnswer" VARCHAR(1000) NOT NULL,
    "longAnswer" TEXT,
    "format" "QuestionFormat" NOT NULL DEFAULT 'FAQ',
    "category" VARCHAR(50) NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "relatedTickers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" "QuestionSource" NOT NULL DEFAULT 'AI_GENERATED',
    "status" "QuestionStatus" NOT NULL DEFAULT 'ANSWERED',
    "submittedById" TEXT,
    "aiProvider" VARCHAR(20),
    "generationMeta" JSONB,
    "views" INTEGER NOT NULL DEFAULT 0,
    "helpfulVotes" INTEGER NOT NULL DEFAULT 0,
    "unhelpfulVotes" INTEGER NOT NULL DEFAULT 0,
    "metaDescription" VARCHAR(300),
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionFeedback" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isHelpful" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Question_slug_key" ON "Question"("slug");

-- CreateIndex
CREATE INDEX "Question_status_category_idx" ON "Question"("status", "category");

-- CreateIndex
CREATE INDEX "Question_status_publishedAt_idx" ON "Question"("status", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "Question_relatedTickers_idx" ON "Question"("relatedTickers");

-- CreateIndex
CREATE INDEX "QuestionFeedback_questionId_idx" ON "QuestionFeedback"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionFeedback_userId_questionId_key" ON "QuestionFeedback"("userId", "questionId");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionFeedback" ADD CONSTRAINT "QuestionFeedback_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionFeedback" ADD CONSTRAINT "QuestionFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
