-- E-E-A-T: editor review tracking on AI-generated articles.
-- reviewedById IS NULL  → system-produced ("Diproduksi oleh sistem TeknikalID")
-- reviewedById IS SET   → human editor reviewed ("ditinjau oleh [editor]")

-- AlterTable
ALTER TABLE "Article" ADD COLUMN "reviewedById" TEXT;

-- CreateIndex
CREATE INDEX "Article_reviewedById_idx" ON "Article"("reviewedById");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
