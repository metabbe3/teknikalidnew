import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { guardActorSql } from "@/lib/actor-blocklist";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/funnel-v2 — funnel 5-tahap berbasis actor_id (tracking-audit G12).
 * actor_id = COALESCE(User.initialAnonId, PageView.anonId) — manusia, bukan baris view.
 * T1 Datang → T2 Paham (dwell≥15 ATAU eksplor) → T3 Simpan (pantau_tambah/tg) →
 * T4 Balik ≤7 hari → T5 Habit (user bot aktif: agent.agent_user.anon_id = LEFT(REPLACE(actor,'-',''),12)).
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
        -- ops-2026-11-10-03: guard self-traffic — smoke-test agen wajib anonId prefix 'qa-'
        -- (ACK CEO opsi-1 bo-2026-11-10-01; filter di level ACTOR, NULL-safe via COALESCE)
        AND COALESCE(u."initialAnonId", pv."anonId", pv."userId", pv.ip) NOT LIKE 'qa-%'
        -- ops-2026-11-11-01: blocklist actor UUID saver-smoke (ACK CEO opsi-B; bound params)
        ${guardActorSql(Prisma.sql`COALESCE(u."initialAnonId", pv."anonId", pv."userId", pv.ip)`)}
    ),
    ev AS (
      SELECT
        COALESCE(u."initialAnonId", e."anonId") AS actor,
        e.type, e.label,
        (e."createdAt" + interval '7 hours')::date AS d
      FROM "EngagementEvent" e
      LEFT JOIN "User" u ON u."initialAnonId" = e."anonId"
      WHERE e."createdAt" >= NOW() - interval '21 days'
        -- ops-2026-11-10-03: idem — event smoke tak boleh jadi 'saver' palsu (T3)
        AND COALESCE(u."initialAnonId", e."anonId") NOT LIKE 'qa-%'
        -- ops-2026-11-11-01: idem blocklist actor — event saver-smoke dikecualikan
        ${guardActorSql(Prisma.sql`COALESCE(u."initialAnonId", e."anonId")`)}
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
      -- ops-2026-11-12-01: join lama TelegramWatch.anonPrefix MATI PERMANEN
      -- (NULL 9/9 rows sejak 28 Okt; poll.mjs penulisnya tak pernah jalan; pivot
      -- 6 Nov arahkan deeplink ke TeknikalidAgentBot -> agent.agent_user.anon_id).
      -- Join baru = anon hint 12-hex dari UUID web actor; replay 12 Nov = 0 match
      -- jujur (belum ada web visitor yang start bot) — T5 tampil benar saat
      -- konversi bot dimulai. DISTINCT guard duplikat anon_id (defensif).
      (SELECT COUNT(DISTINCT b.actor) FROM base b
         JOIN agent.agent_user au ON au.anon_id IS NOT NULL
              AND LEFT(REPLACE(b.actor, '-', ''), 12) = au.anon_id
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
