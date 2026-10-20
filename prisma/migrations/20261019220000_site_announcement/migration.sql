-- Site announcements: system broadcast notifications (no actor) + new type.
-- Applied manually 19 Okt 2026 via psql (ALTER TYPE + DROP NOT NULL + FK SET NULL).
-- This migration is intentionally a no-op: prisma migrate runs statements one-by-one
-- and cannot execute the DO $$ block; the schema change is already live in prod DB.
SELECT 1;
