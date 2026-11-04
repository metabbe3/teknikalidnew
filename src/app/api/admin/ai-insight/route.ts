import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { TtlCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/ai-insight — telemetri Tanya AI (AiChatLog + AiEvalRun).
 * Audit bo-2026-11-04-01: data sehat (QA log + run juri) tapi yatim UI —
 * pilar AI-SEARCH tanpa permukaan admin. Flywheel Tanya AI (owner 30 Okt)
 * butuh tren terlihat harian. Cache in-memory 5 mnt (mirror /api/admin/engagement).
 * Kalender-hari WIB via + interval '7 hours' (JANGAN AT TIME ZONE).
 * 0 PII — anonId client-side uuid; kolom anonId/userId belum diisi writer
 * sepanjang masa = dilaporkan apa adanya (attribution gap flywheel).
 */

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new TtlCache<AiInsightOverview>(1);

interface TotalsRow { n24: bigint; n7: bigint; attributed7: bigint }
interface RouteRow { route: string; n: bigint; avg_lat: number | null }
interface DayRow { d: Date; n: bigint; avg_lat: number | null }
interface TickerRow { ticker: string; n: bigint }
interface EvalDayRow { d: Date; n: bigint; routing: number | null; quality: number | null; fit: number | null }

export interface AiInsightOverview {
  generatedAt: string;
  totals: { questions24h: number; questions7d: number; attributed7d: number };
  byRoute7d: Array<{ route: string; count: number; avgLatencyMs: number | null }>;
  byDay14d: Array<{ day: string; count: number; avgLatencyMs: number | null }>;
  topTickers7d: Array<{ ticker: string; count: number }>;
  evalTrend14d: Array<{ day: string; runs: number; routing: number | null; quality: number | null; fit: number | null }>;
}

async function getAiInsight(now: Date = new Date()): Promise<AiInsightOverview> {
  const cached = cache.get("ai-insight");
  if (cached) return cached;

  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const since14d = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [totalsRows, routeRows, dayRows, tickerRows, evalRows] = await Promise.all([
    prisma.$queryRaw<TotalsRow[]>`
      SELECT count(*) FILTER (WHERE "createdAt" >= ${since24h}) AS n24,
             count(*) FILTER (WHERE "createdAt" >= ${since7d}) AS n7,
             count(*) FILTER (WHERE "createdAt" >= ${since7d}
                               AND ("userId" IS NOT NULL OR "anonId" IS NOT NULL)) AS attributed7
      FROM "AiChatLog"`,
    prisma.$queryRaw<RouteRow[]>`
      SELECT route, count(*) AS n, avg("latencyMs") AS avg_lat
      FROM "AiChatLog" WHERE "createdAt" >= ${since7d}
      GROUP BY route ORDER BY n DESC`,
    prisma.$queryRaw<DayRow[]>`
      SELECT date_trunc('day', "createdAt" + interval '7 hours') AS d,
             count(*) AS n, avg("latencyMs") AS avg_lat
      FROM "AiChatLog" WHERE "createdAt" >= ${since14d}
      GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw<TickerRow[]>`
      SELECT ticker, count(*) AS n
      FROM "AiChatLog" WHERE "createdAt" >= ${since7d}
        AND ticker IS NOT NULL AND ticker <> ''
      GROUP BY ticker ORDER BY n DESC LIMIT 8`,
    prisma.$queryRaw<EvalDayRow[]>`
      SELECT date_trunc('day', "createdAt" + interval '7 hours') AS d,
             count(*) AS n,
             avg("routingScore") AS routing,
             avg("qualityScore") AS quality,
             avg("fitScore") AS fit
      FROM "AiEvalRun" WHERE "createdAt" >= ${since14d}
      GROUP BY 1 ORDER BY 1`,
  ]);

  const overview: AiInsightOverview = {
    generatedAt: now.toISOString(),
    totals: {
      questions24h: Number(totalsRows[0]?.n24 ?? 0),
      questions7d: Number(totalsRows[0]?.n7 ?? 0),
      attributed7d: Number(totalsRows[0]?.attributed7 ?? 0),
    },
    byRoute7d: routeRows.map((r) => ({
      route: r.route,
      count: Number(r.n),
      avgLatencyMs: r.avg_lat == null ? null : Math.round(r.avg_lat),
    })),
    byDay14d: dayRows.map((r) => ({
      day: r.d.toISOString().slice(0, 10),
      count: Number(r.n),
      avgLatencyMs: r.avg_lat == null ? null : Math.round(r.avg_lat),
    })),
    topTickers7d: tickerRows.map((r) => ({ ticker: r.ticker, count: Number(r.n) })),
    evalTrend14d: evalRows.map((r) => ({
      day: r.d.toISOString().slice(0, 10),
      runs: Number(r.n),
      routing: r.routing == null ? null : Math.round(r.routing * 10) / 10,
      quality: r.quality == null ? null : Math.round(r.quality * 10) / 10,
      fit: r.fit == null ? null : Math.round(r.fit * 10) / 10,
    })),
  };

  cache.set("ai-insight", overview, CACHE_TTL_MS);
  return overview;
}

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(await getAiInsight());
  } catch (error) {
    return handleApiError(error, "fetch ai-insight overview");
  }
}
