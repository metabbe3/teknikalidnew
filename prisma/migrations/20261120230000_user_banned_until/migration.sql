-- 20 Nov: auto-ban scraping menjadi TEMPORER (self-heal). bannedAt tetap utk ban manual/permanen.
ALTER TABLE "User" ADD COLUMN "bannedUntil" TIMESTAMP(3);
