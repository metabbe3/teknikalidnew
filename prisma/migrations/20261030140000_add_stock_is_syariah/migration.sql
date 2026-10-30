-- AlterTable: status DES/ISSI (null = belum disinkron; AI dilarang menebak — riset Argon G3)
-- Idempotent: kolom sudah manual-applied di prod 30 Okt (ADD COLUMN IF NOT EXISTS aman jalan ulang)
ALTER TABLE "Stock" ADD COLUMN IF NOT EXISTS "isSyariah" BOOLEAN;
