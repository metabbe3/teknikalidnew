import { prisma } from "@/lib/prisma";

export interface AnnouncementInput {
  title: string;
  body: string;
  severity?: "info" | "warning" | "critical";
  withBanner?: boolean;
}

/**
 * Site announcements (19 Okt, owner directive): bell harus jadi saluran info
 * penting situs (insiden down, maintenance, fitur baru) — bukan hanya notif
 * community. Broadcast = satu baris Notification SITE_ANNOUNCEMENT per user
 * aktif (bannedAt IS NULL). meta: { title, body, severity, banner } — banner
 * P0 dirender global di layout sampai dibaca (dismiss per user).
 */
export const announcementService = {
  async broadcast(input: AnnouncementInput) {
    const title = input.title.trim().slice(0, 120);
    const body = input.body.trim().slice(0, 500);
    if (!title || !body) throw new Error("Judul dan isi wajib diisi");

    const meta = {
      title,
      body,
      severity: input.severity ?? "info",
      banner: input.withBanner ?? input.severity === "critical",
    };

    const users = await prisma.user.findMany({
      where: { bannedAt: null },
      select: { id: true },
    });

    const BATCH = 200;
    let inserted = 0;
    for (let i = 0; i < users.length; i += BATCH) {
      const rows = users.slice(i, i + BATCH).map((u) => ({
        type: "SITE_ANNOUNCEMENT" as const,
        recipientId: u.id,
        actorId: null,
        meta,
      }));
      const res = await prisma.notification.createMany({ data: rows });
      inserted += res.count;
    }
    return { recipients: inserted, meta };
  },
};
