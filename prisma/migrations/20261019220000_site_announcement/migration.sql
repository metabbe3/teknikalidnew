-- Site announcements: system broadcast notifications (no actor) + new type.
ALTER TYPE "NotificationType" ADD VALUE 'SITE_ANNOUNCEMENT';
ALTER TABLE "Notification" ALTER COLUMN "actorId" DROP NOT NULL;
ALTER TABLE "Notification" ALTER CONSTRAINT "Notification_actorId_fkey" DELETE SET NULL;
