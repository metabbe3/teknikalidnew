-- Site announcements: system broadcast notifications (no actor) + new type.
-- (Applied manually 19 Okt via psql after the initial ALTER CONSTRAINT syntax
-- failed here; kept idempotent-safe: type value exists check is not supported
-- in ADD VALUE, so wrapped in DO block.)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SITE_ANNOUNCEMENT' AND typname = 'NotificationType') THEN
    ALTER TYPE "NotificationType" ADD VALUE 'SITE_ANNOUNCEMENT';
  END IF;
END $$;
ALTER TABLE "Notification" ALTER COLUMN "actorId" DROP NOT NULL;
ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_actorId_fkey";
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL;
