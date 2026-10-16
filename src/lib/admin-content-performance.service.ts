import { prisma } from "@/lib/prisma";
import { TtlCache } from "@/lib/cache";

/**
 * Read-only content performance for /admin/articles "Performa" tab (bo-2026-10-14-03).
 * Window = rolling `days` (createdAt >= now - days). No schema change, SELECT only.
 * Register attribution is IP-based ("register (IP sama)") — honest label, not identity.
 */

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new TtlCache<ContentPerformance>(2);

export interface ContentPerformanceTopItem {
  path: string;
  title: string | null;
  slug: string | null;
  status: string | null;
  articleType: string | null;
  publishedAt: Date | null;
  views: number;
  uniqIp: number;
  dwellAvgSec: number | null;
  scrollAvgPct: number | null;
  ctaClicks: number;
  register: number;
  convPct: number | null; // register / uniqIp, 1 decimal; null when uniqIp = 0
}

export interface ContentPerformanceBottomItem {
  id: string;
  slug: string;
  title: string;
  status: string;
  articleType: string;
  publishedAt: Date | null;
  views: number; // always 0 — query filters on it
}

export interface ContentPerformance {
  generatedAt: string;
  days: 7 | 30;
  kpis: {
    totalViews: number;
    totalUniqIp: number;
    avgDwellSec: number | null;
    registerTotal: number;
    registerAfterRead: number;
  };
  top: ContentPerformanceTopItem[];
  bottom: ContentPerformanceBottomItem[];
}

interface TopRow {
  path: string;
  views: bigint;
  uniq: bigint;
  title: string | null;
  slug: string | null;
  status: string | null;
  articleType: string | null;
  publishedAt: Date | null;
}
interface EngRow {
  path: string;
  dwell_avg: number | null;
  scroll_avg: number | null;
  cta_n: bigint;
}
interface RegRow { path: string; reg: bigint }
interface RegTotalRow { total: bigint; after_read: bigint }
interface KpiRow { views: bigint; uniq: bigint; dwell_avg: number | null }
interface BottomRow {
  id: string;
  slug: string;
  title: string;
  status: string;
  articleType: string;
  publishedAt: Date | null;
}

export async function getContentPerformance(days: 7 | 30, now: Date = new Date()): Promise<ContentPerformance> {
  const cacheKey = `content-performance-${days}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const [topRows, engRows, regRows, regTotalRows, kpiRows, bottomRows] = await Promise.all([
    prisma.$queryRaw<TopRow[]>`
      SELECT pv.path,
             count(*) AS views,
             count(DISTINCT pv.ip) AS uniq,
             a.title, a.slug, a.status::text AS status, a."articleType"::text AS "articleType", a."publishedAt"
      FROM "PageView" pv
      LEFT JOIN "Article" a ON '/berita/' || a.slug = pv.path
      WHERE pv.path LIKE '/berita/%' AND pv."isBot" = false AND pv."createdAt" >= ${since}
      GROUP BY pv.path, a.title, a.slug, a.status, a."articleType", a."publishedAt"
      ORDER BY views DESC
      LIMIT 10`,
    prisma.$queryRaw<EngRow[]>`
      SELECT path,
             (round(avg("valueNum") FILTER (WHERE type = 'dwell_tick'))::float8) AS dwell_avg,
             (round(avg("valueNum") FILTER (WHERE type = 'scroll_max'))::float8) AS scroll_avg,
             count(*) FILTER (WHERE type = 'cta_click') AS cta_n
      FROM "EngagementEvent"
      WHERE path LIKE '/berita/%' AND "createdAt" >= ${since}
      GROUP BY path`,
    prisma.$queryRaw<RegRow[]>`
      SELECT v.path, count(*) AS reg
      FROM "PageView" r
      JOIN (
        SELECT DISTINCT ip, path
        FROM "PageView"
        WHERE path LIKE '/berita/%' AND "isBot" = false AND "createdAt" >= ${since}
      ) v ON r.ip = v.ip
      WHERE r.path = '/auth/register' AND r."isBot" = false AND r."createdAt" >= ${since}
      GROUP BY v.path`,
    prisma.$queryRaw<RegTotalRow[]>`
      SELECT count(*) AS total,
             count(*) FILTER (WHERE ip IN (
               SELECT DISTINCT ip FROM "PageView"
               WHERE path LIKE '/berita/%' AND "isBot" = false AND "createdAt" >= ${since}
             )) AS after_read
      FROM "PageView"
      WHERE path = '/auth/register' AND "isBot" = false AND "createdAt" >= ${since}`,
    prisma.$queryRaw<KpiRow[]>`
      SELECT count(*) AS views,
             count(DISTINCT ip) AS uniq,
             (SELECT round(avg("valueNum"))::float8 FROM "EngagementEvent"
              WHERE path LIKE '/berita/%' AND type = 'dwell_tick' AND "createdAt" >= ${since}) AS dwell_avg
      FROM "PageView"
      WHERE path LIKE '/berita/%' AND "isBot" = false AND "createdAt" >= ${since}`,
    prisma.$queryRaw<BottomRow[]>`
      SELECT a.id, a.slug, a.title, a.status::text AS status, a."articleType"::text AS "articleType", a."publishedAt"
      FROM "Article" a
      LEFT JOIN (
        SELECT path, count(*) AS views
        FROM "PageView"
        WHERE path LIKE '/berita/%' AND "isBot" = false AND "createdAt" >= ${since}
        GROUP BY path
      ) pv ON '/berita/' || a.slug = pv.path
      WHERE a.status = 'PUBLISHED' AND COALESCE(pv.views, 0) = 0
      ORDER BY a."publishedAt" DESC NULLS LAST
      LIMIT 15`,
  ]);

  const engByPath = new Map(engRows.map((r) => [r.path, r]));
  const regByPath = new Map(regRows.map((r) => [r.path, Number(r.reg)]));

  const top: ContentPerformanceTopItem[] = topRows.map((r) => {
    const eng = engByPath.get(r.path);
    const reg = regByPath.get(r.path) ?? 0;
    const views = Number(r.views);
    const uniqIp = Number(r.uniq);
    return {
      path: r.path,
      title: r.title,
      slug: r.slug,
      status: r.status,
      articleType: r.articleType,
      publishedAt: r.publishedAt,
      views,
      uniqIp,
      dwellAvgSec: eng?.dwell_avg ?? null,
      scrollAvgPct: eng?.scroll_avg ?? null,
      ctaClicks: Number(eng?.cta_n ?? 0),
      register: reg,
      convPct: uniqIp > 0 ? Math.round((reg / uniqIp) * 1000) / 10 : null,
    };
  });

  const result: ContentPerformance = {
    generatedAt: now.toISOString(),
    days,
    kpis: {
      totalViews: Number(kpiRows[0]?.views ?? 0),
      totalUniqIp: Number(kpiRows[0]?.uniq ?? 0),
      avgDwellSec: kpiRows[0]?.dwell_avg ?? null,
      registerTotal: Number(regTotalRows[0]?.total ?? 0),
      registerAfterRead: Number(regTotalRows[0]?.after_read ?? 0),
    },
    top,
    bottom: bottomRows.map((r) => ({ ...r, views: 0 })),
  };

  cache.set(cacheKey, result, CACHE_TTL_MS);
  return result;
}
