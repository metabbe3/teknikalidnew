-- Wave-5: DATA INTEGRITY (audit Opus 21 Nov 2026)
-- 1. Tambah kolom isInternal di AiChatLog untuk isolasi battery QA internal dari analytics funnel manusia riil.
-- 2. Backfill historis:
--    Kriteria: "anonId" IS NULL AND "userId" IS NULL
--    Fakta dari audit: 377 pesan battery internal berjalan tanpa anonId & userId (keduanya NULL).
--    Pengunjung manusia riil selalu memiliki anonId (dibuat via getAnonIdSafe di localStorage) atau userId (sesi login).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'AiChatLog' AND column_name = 'isInternal'
  ) THEN
    ALTER TABLE "AiChatLog" ADD COLUMN "isInternal" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "AiChatLog_isInternal_createdAt_idx" ON "AiChatLog"("isInternal", "createdAt");

-- Backfill baris historis QA battery internal (377 pesan tanpa identitas)
UPDATE "AiChatLog"
SET "isInternal" = true
WHERE "anonId" IS NULL AND "userId" IS NULL;
