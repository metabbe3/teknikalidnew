import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { TtlCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/engagement — engagement telemetry overview (prd-2026-10-10-01).
 * Bukti untuk "kenapa returning rendah": dwell/scroll depth + CTA funnel.
 * Cache in-memory 5 menit (mirror /api/admin/retention). 0 PII — anonId only.
 * WIB: server UTC; kalender-hari via + interval '7 hours' (JANGAN AT TIME ZONE).
 */

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new TtlCache<EngagementOverview>(1);

interface TotalRow { n24: bigint; n7: bigint }
interface TypeRow { type: string; n: bigint }
interface GroupRow {
  grp: string;
  dwell_n: bigint;
  dwell_avg: number | null;
  dwell_median: number | null;
  scroll_n: bigint;
  scroll_avg: number | null;
}
interface FunnelRow { viewed: bigint; dwell60: bigint; cta_after: bigint; returned: bigint }

export interface EngagementGroup {
  group: string;
  dwellCount: number;
  dwellAvgSec: number | null;
  dwellMedianSec: number | null;
  scrollCount: number;
  scrollAvgPct: number | null;
}

export interface EngagementOverview {
  generatedAt: string;
  totals: { events24h: number; events7d: number };
  byType24h: Record<string, number>;
  groups7d: EngagementGroup[];
  funnel7d: { viewed: number; dwell60Plus: number; ctaAfterDwell: number; returnedLaterDay: number };
}

async function getEngagementOverview(now: Date = new Date()): Promise<EngagementOverview> {
  const cached = cache.get("engagement-overview");
  if (cached) return cached;

  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalRows, typeRows, groupRows, funnelRows] = await Promise.all([
    prisma.$queryRaw<TotalRow[]>`
      SELECT count(*) FILTER (WHERE "createdAt" >= ${since24h}) AS n24,
             count(*) FILTER (WHERE "createdAt" >= ${since7d}) AS n7
      FROM "EngagementEvent"`,
    prisma.$queryRaw<TypeRow[]>`
      SELECT type, count(*) AS n
      FROM "EngagementEvent"
      WHERE "createdAt" >= ${since24h}
      GROUP BY type`,
    prisma.$queryRaw<GroupRow[]>`
      SELECT
        CASE WHEN path LIKE '/stocks%' THEN '/stocks'
             WHEN path LIKE '/berita%' THEN '/berita'
             WHEN path LIKE '/akademi%' THEN '/akademi'
             ELSE 'other' END AS grp,
        count(*) FILTER (WHERE type = 'dwell_tick') AS dwell_n,
        (round(avg("valueNum") FILTER (WHERE type = 'dwell_tick'))::float8) AS dwell_avg,
        (percentile_cont(0.5) WITHIN GROUP (ORDER BY "valueNum")
          FILTER (WHERE type = 'dwell_tick')::float8) AS dwell_median,
        count(*) FILTER (WHERE type = 'scroll_max') AS scroll_n,
        (round(avg("valueNum") FILTER (WHERE type = 'scroll_max'))::float8) AS scroll_avg
      FROM "EngagementEvent"
      WHERE "createdAt" >= ${since7d} AND type IN ('dwell_tick', 'scroll_max')
      GROUP BY grp
      ORDER BY grp`,
    prisma.$queryRaw<FunnelRow[]>`
      WITH e AS (
        SELECT "anonId", type, "valueNum",
               ("createdAt" + interval '7 hours')::date AS d
        FROM "EngagementEvent"
        WHERE "createdAt" >= ${since7d}
      ), a AS (
        SELECT "anonId",
               bool_or(type = 'dwell_tick' AND "valueNum" >= 60) AS deep,
               bool_or(type = 'cta_click') AS cta,
               min(d) AS first_d
        FROM e
        GROUP BY "anonId"
      )
      SELECT count(*) AS viewed,
             count(*) FILTER (WHERE deep) AS dwell60,
             count(*) FILTER (WHERE deep AND cta) AS cta_after,
             count(*) FILTER (WHERE deep AND cta AND EXISTS (
               SELECT 1 FROM e WHERE e."anonId" = a."anonId" AND e.d > a.first_d
             )) AS returned
      FROM a`,
  ]);

  const overview: EngagementOverview = {
    generatedAt: now.toISOString(),
    totals: {
      events24h: Number(totalRows[0]?.n24 ?? 0),
      events7d: Number(totalRows[0]?.n7 ?? 0),
    },
    byType24h: Object.fromEntries(typeRows.map((r) => [r.type, Number(r.n)])),
    groups7d: groupRows.map((r) => ({
      group: r.grp,
      dwellCount: Number(r.dwell_n),
      dwellAvgSec: r.dwell_avg,
      dwellMedianSec: r.dwell_median,
      scrollCount: Number(r.scroll_n),
      scrollAvgPct: r.scroll_avg,
    })),
    funnel7d: {
      viewed: Number(funnelRows[0]?.viewed ?? 0),
      dwell60Plus: Number(funnelRows[0]?.dwell60 ?? 0),
      ctaAfterDwell: Number(funnelRows[0]?.cta_after ?? 0),
      returnedLaterDay: Number(funnelRows[0]?.returned ?? 0),
    },
  };

  cache.set("engagement-overview", overview, CACHE_TTL_MS);
  return overview;
}

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(await getEngagementOverview());
  } catch (error) {
    return handleApiError(error, "fetch engagement overview");
  }
}
