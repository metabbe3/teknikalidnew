-- FASE T1: Hygiene Telemetri 3x (idempotent — doctrine P3005)
-- 1. AiChatLog: add isEval column + composite index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'AiChatLog' AND column_name = 'isEval'
  ) THEN
    ALTER TABLE "AiChatLog" ADD COLUMN "isEval" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "AiChatLog_isEval_createdAt_idx" ON "AiChatLog"("isEval", "createdAt");

-- 2. Seed isEval=true for AiEvalRun pattern rows in AiChatLog
UPDATE "AiChatLog" c
SET "isEval" = true
WHERE "isEval" = false
  AND EXISTS (
    SELECT 1 FROM "AiEvalRun" e
    WHERE e."question" = c."question"
       OR ABS(EXTRACT(EPOCH FROM (c."createdAt" - e."createdAt"))) < 60
  );

-- 3. Backfill PageView: mark Meta IPv6 preview crawler (non-in-app browser) as isBot=true
UPDATE "PageView"
SET "isBot" = true
WHERE "isBot" = false
  AND "ip" LIKE '2a03:2880:%'
  AND (
    "userAgent" IS NULL
    OR (
      "userAgent" NOT ILIKE '%Barcelona%'
      AND "userAgent" NOT ILIKE '%Instagram%'
      AND "userAgent" NOT ILIKE '%FBAN%'
      AND "userAgent" NOT ILIKE '%FBAV%'
    )
  );

-- 4. Backfill PageView: fix corrupted referrer 'https://teknikal.idundefined' to NULL
UPDATE "PageView"
SET "referrer" = NULL
WHERE "referrer" = 'https://teknikal.idundefined'
   OR "referrer" LIKE '%teknikal.idundefined%';
