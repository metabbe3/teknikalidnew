import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { IDX_STOCKS } from "@/lib/constants";

export const dynamic = "force-dynamic";

const tickerSector = new Map(IDX_STOCKS.map((s) => [s.ticker, s.sector]));

export async function GET() {
  try {
    await requireAdmin();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalFollows,
    taggedPostsToday,
    topFollowed,
    topDiscussed,
    trendingFollows,
    sectorTickers,
    uniqueTickers,
  ] = await Promise.all([
    prisma.stockFollow.count(),
    prisma.post.count({ where: { tickerTag: { not: null }, createdAt: { gte: todayStart } } }),

    prisma.stockFollow.groupBy({
      by: ["ticker"],
      _count: { ticker: true },
      orderBy: { _count: { ticker: "desc" } },
      take: 10,
    }),

    prisma.post.groupBy({
      by: ["tickerTag"],
      where: { tickerTag: { not: null }, createdAt: { gte: weekStart } },
      _count: { tickerTag: true },
      orderBy: { _count: { tickerTag: "desc" } },
      take: 10,
    }),

    prisma.stockFollow.groupBy({
      by: ["ticker"],
      where: { createdAt: { gte: weekStart } },
      _count: { ticker: true },
      orderBy: { _count: { ticker: "desc" } },
      take: 5,
    }),

    // Sector distribution via groupBy (instead of fetching all posts)
    prisma.post.groupBy({
      by: ["tickerTag"],
      where: { tickerTag: { not: null }, createdAt: { gte: weekStart } },
      _count: { tickerTag: true },
    }),

    prisma.stockFollow.groupBy({ by: ["ticker"] }),
  ]);

  const avgFollowers = uniqueTickers.length > 0 ? Math.round(totalFollows / uniqueTickers.length) : 0;
  const trendingMap = new Map(trendingFollows.map((s) => [s.ticker, s._count.ticker]));

  // Build sector counts from groupBy results
  const sectorCounts: Record<string, number> = {};
  for (const g of sectorTickers) {
    const sector = tickerSector.get(g.tickerTag!) ?? "Other";
    sectorCounts[sector] = (sectorCounts[sector] ?? 0) + g._count.tickerTag;
  }
  const sectorDistribution = Object.entries(sectorCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([sector, count]) => ({ sector, count }));

  return NextResponse.json({
    overview: { totalFollows, taggedPostsToday, uniqueTickersThisWeek: sectorTickers.length, avgFollowers },
    topFollowed: topFollowed.map((s) => ({
      ticker: s.ticker,
      followers: s._count.ticker,
      newThisWeek: trendingMap.get(s.ticker) ?? 0,
    })),
    topDiscussed: topDiscussed.map((s) => ({ ticker: s.tickerTag!, posts: s._count.tickerTag })),
    trending: trendingFollows.map((s) => ({ ticker: s.ticker, newFollowers: s._count.ticker })),
    sectorDistribution,
  });
  } catch (error) {
    return handleApiError(error, "fetch stock engagement");
  }
}
