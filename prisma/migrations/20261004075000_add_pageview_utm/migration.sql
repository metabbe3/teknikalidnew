-- UTM attribution register hook (PRD idea-2026-09-25-1, owner-approved additive)
ALTER TABLE "PageView" ADD COLUMN "utmSource" VARCHAR(32);
ALTER TABLE "PageView" ADD COLUMN "utmMedium" VARCHAR(32);
