import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/guest-quota?days=14
 *
 * Retention Loop v2 metrics (owner 20 Okt): anon browsing depth vs the
 * 5-stocks/day soft quota. Source: ShareEvent beacons with target='guest_quota'
 * fired by GuestStockTracker on each UNIQUE ticker an anon opens per day;
 * context column carries the running count (1..N).
 *
 * All days are WIB calendar days (admin date convention). userId IS NULL and
 * isBot=false — quota beacons only fire for authenticated-free visitors.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const days = Math.min(
      Math.max(Number(request.nextUrl.searchParams.get("days")) || 14, 7),
      60,
    );

    const rows = await prisma.$queryRaw<
      { day: Date; visitorKey: string; maxN: bigint; events: bigint }[]
    >`
      SELECT ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::date AS day,
             COALESCE("userId"::text, "ip") AS "visitorKey",
             MAX(CAST("context" AS INTEGER)) AS "maxN",
             COUNT(*) AS events
      FROM "ShareEvent"
      WHERE "target" = 'guest_quota'
        AND "isBot" = false
        AND "userId" IS NULL
        AND "createdAt" >= (NOW() - (${days} || ' days')::interval)
      GROUP BY 1, 2
      ORDER BY 1 DESC
    `;

    // Aggregate per day + depth buckets across the window
    const byDay = new Map<string, { visitors: number; events: number; hitCap: number; tickerSum: number }>();
    const depthCounts = new Map<number, number>();
    let totalVisitors = 0;
    let totalEvents = 0;
    let totalCap = 0;
    let tickerSum = 0;

    for (const r of rows) {
      const day = new Date(r.day).toISOString().slice(0, 10);
      const n = Number(r.maxN);
      const ev = Number(r.events);
      const d = byDay.get(day) ?? { visitors: 0, events: 0, hitCap: 0, tickerSum: 0 };
      d.visitors += 1;
      d.events += ev;
      d.tickerSum += n;
      if (n >= 6) d.hitCap += 1;
      byDay.set(day, d);

      depthCounts.set(n, (depthCounts.get(n) ?? 0) + 1);
      totalVisitors += 1;
      totalEvents += ev;
      if (n >= 6) totalCap += 1;
      tickerSum += n;
    }

    const depth = [...depthCounts.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([n, visitors]) => ({
        bucket: n >= 6 ? "6+" : String(n),
        visitors,
      }));

    const series = [...byDay.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([day, d]) => ({ day, visitors: d.visitors, events: d.events, hitCap: d.hitCap }));

    return NextResponse.json({
      data: {
        series,
        totals: {
          visitors: totalVisitors,
          events: totalEvents,
          hitCap: totalCap,
          avgTickers: totalVisitors ? tickerSum / totalVisitors : 0,
        },
        depth,
      },
    });
  } catch (error) {
    return handleApiError(error, "guest-quota");
  }
}
