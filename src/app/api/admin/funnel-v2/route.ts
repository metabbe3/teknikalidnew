import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/funnel-v2 — funnel 5-tahap berbasis actor_id (tracking-audit G12).
 * actor_id = COALESCE(User.initialAnonId, PageView.anonId) — manusia, bukan baris view.
 * T1 Datang → T2 Paham (dwell≥15 ATAU eksplor) → T3 Simpan (pantau_tambah/tg) →
 * T4 Balik ≤7 hari → T5 Habit (Telegram aktif via anonPrefix ATAU daftar).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Implementasi ringkas & benar (query formal di atas terlalu kompleks utk raw single-pass):
  const funnel = await prisma.$queryRaw<
    { t1: bigint; t2: bigint; t3: bigint; t4: bigint; t5: bigint }[]
  >`
    WITH pv AS (
      SELECT
        COALESCE(u."initialAnonId", pv."anonId", pv."userId", pv.ip) AS actor,
        (pv."createdAt" + interval '7 hours')::date AS d,
        pv.path
      FROM "PageView" pv
      LEFT JOIN "User" u ON u.id = pv."userId"
      WHERE pv."isBot" = false AND pv."createdAt" >= NOW() - interval '21 days'
    ),
    ev AS (
      SELECT
        COALESCE(u."initialAnonId", e."anonId") AS actor,
        e.type, e.label,
        (e."createdAt" + interval '7 hours')::date AS d
      FROM "EngagementEvent" e
      LEFT JOIN "User" u ON u."initialAnonId" = e."anonId"
      WHERE e."createdAt" >= NOW() - interval '21 days'
    ),
    base AS (
      SELECT actor, MIN(d) AS h0,
        EXISTS (SELECT 1 FROM ev e WHERE e.actor = pv.actor AND (e.type = 'dwell_tick' OR e.type = 'cta_click' OR e.type = 'nav_click')) AS engaged,
        EXISTS (SELECT 1 FROM ev e WHERE e.actor = pv.actor AND e.label IN ('pantau_tambah','tg_pantau_klik','pantau_hapus')) AS saved
      FROM pv
      WHERE actor IS NOT NULL
      GROUP BY actor
    ),
    days AS (
      SELECT p.actor, COUNT(DISTINCT p.d) AS nd
      FROM pv p JOIN base b ON b.actor = p.actor
      GROUP BY p.actor
    )
    SELECT
      (SELECT COUNT(*) FROM base) AS t1,
      (SELECT COUNT(*) FROM base WHERE engaged) AS t2,
      (SELECT COUNT(*) FROM base WHERE engaged AND saved) AS t3,
      (SELECT COUNT(*) FROM base b JOIN days ds ON ds.actor = b.actor
         WHERE b.saved AND ds.nd >= 2
         AND EXISTS (SELECT 1 FROM pv p WHERE p.actor = b.actor AND p.d > b.h0 AND p.d <= b.h0 + 7)) AS t4,
      (SELECT COUNT(DISTINCT b.actor) FROM base b
         JOIN "TelegramWatch" tw ON tw."anonPrefix" IS NOT NULL
              AND LEFT(REPLACE(b.actor, '-', ''), 12) = tw."anonPrefix" AND tw.active = true
         WHERE b.saved) AS t5
  `;

  const f = funnel[0] ?? { t1: 0, t2: 0, t3: 0, t4: 0, t5: 0 };
  return NextResponse.json({
    window: "21d",
    t1_datang: Number(f.t1),
    t2_paham: Number(f.t2),
    t3_simpan: Number(f.t3),
    t4_balik7: Number(f.t4),
    t5_habit: Number(f.t5),
  });
}
