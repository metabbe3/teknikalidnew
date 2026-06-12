import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = request.nextUrl;
    const period = searchParams.get("period") === "24h" || searchParams.get("period") === "30d"
      ? searchParams.get("period")!
      : "7d";
    const top = Math.min(Math.max(Number(searchParams.get("top")) || 20, 1), 100);

    const now = new Date();
    const msMap: Record<string, number> = {
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
    };
    const durationMs = msMap[period];
    const since = new Date(now.getTime() - durationMs);
    const prevSince = new Date(since.getTime() - durationMs);

    // --- Overview stats ---
    const [totalViews, uniqueVisitors, authedViews] = await Promise.all([
      prisma.pageView.count({ where: { createdAt: { gte: since } } }),
      prisma.pageView.groupBy({
        by: ["ip"],
        where: { createdAt: { gte: since }, ip: { not: null } },
        _count: { ip: true },
      }).then((rows) => rows.length),
      prisma.pageView.count({
        where: { userId: { not: null }, createdAt: { gte: since } },
      }),
    ]);
    const anonViews = totalViews - authedViews;

    // --- Top pages ---
    const topPagesRaw = await prisma.pageView.groupBy({
      by: ["path"],
      where: { createdAt: { gte: since } },
      _count: { path: true },
      orderBy: { _count: { path: "desc" } },
      take: top,
    });

    const topPages = await Promise.all(
      topPagesRaw.map(async (row) => {
        const currCount = row._count.path;
        const prevCount = await prisma.pageView.count({
          where: { path: row.path, createdAt: { gte: prevSince, lt: since } },
        });
        const changePct =
          prevCount > 0 ? Math.round(((currCount - prevCount) / prevCount) * 100) : null;

        const uniqueVisitorsForPage = await prisma.pageView.groupBy({
          by: ["ip"],
          where: { path: row.path, createdAt: { gte: since }, ip: { not: null } },
          _count: { ip: true },
        });

        return {
          path: row.path,
          views: currCount,
          uniqueVisitors: uniqueVisitorsForPage.length,
          changePct,
        };
      }),
    );

    // --- Daily views ---
    const dailyViews = await prisma.$queryRaw<
      { date: Date; views: bigint; uniqueVisitors: bigint }[]
    >`
      SELECT DATE("createdAt") as date, COUNT(*) as views, COUNT(DISTINCT ip) as "uniqueVisitors"
      FROM "PageView"
      WHERE "createdAt" >= ${since}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    // --- Top referrers ---
    const topReferrersRaw = await prisma.pageView.groupBy({
      by: ["referrer"],
      where: { createdAt: { gte: since }, referrer: { not: null } },
      _count: { referrer: true },
      orderBy: { _count: { referrer: "desc" } },
      take: 10,
    });

    return NextResponse.json({
      data: {
        overview: { totalViews, uniqueVisitors, authedViews, anonViews },
        topPages,
        dailyViews: dailyViews.map((row) => ({
          date: row.date,
          views: Number(row.views),
          uniqueVisitors: Number(row.uniqueVisitors),
        })),
        topReferrers: topReferrersRaw.map((row) => ({
          referrer: row.referrer,
          count: row._count.referrer,
        })),
      },
    });
  } catch (error) {
    return handleApiError(error, "fetch page view analytics");
  }
}
