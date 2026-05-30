import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { aggregateDaily } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(todayStart.getTime() - 14 * 24 * 60 * 60 * 1000);

  const activeWhere = (since: Date) => ({
    OR: [
      { posts: { some: { createdAt: { gte: since } } } },
      { comments: { some: { createdAt: { gte: since } } } },
    ],
  });

  const [
    totalUsers,
    newUsersThisWeek,
    dau,
    mau,
    dailySignups,
    accountProviders,
    topReputation,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.user.count({ where: activeWhere(todayStart) }),
    prisma.user.count({ where: activeWhere(monthStart) }),
    prisma.user.groupBy({
      by: ["createdAt"],
      where: { createdAt: { gte: fourteenDaysAgo } },
      _count: true,
    }),
    prisma.account.groupBy({
      by: ["provider"],
      _count: { provider: true },
    }),
    prisma.user.findMany({
      where: { reputation: { gt: 0 } },
      orderBy: { reputation: "desc" },
      take: 5,
      select: { id: true, username: true, name: true, image: true, reputation: true },
    }),
  ]);

  const [retentionCohorts, peakHours] = await Promise.all([
    buildRetentionCohorts(todayStart, activeWhere),
    buildPeakHours(weekStart),
  ]);

  const dailyStats = aggregateDaily(dailySignups, fourteenDaysAgo);

  return NextResponse.json({
    overview: { totalUsers, dau, mau, newUsersThisWeek },
    dailyStats,
    retentionCohorts,
    peakHours,
    providers: accountProviders.map((p) => ({ provider: p.provider, count: p._count.provider })),
    topReputation,
  });
  } catch (error) {
    return handleApiError(error, "fetch user analytics");
  }
}

async function buildRetentionCohorts(
  todayStart: Date,
  activeWhere: (since: Date) => Record<string, unknown>,
) {
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const activeSince = new Date(todayStart.getTime() - weekMs);

  const results = await Promise.all(
    [1, 2, 3, 4].map(async (weeksAgo) => {
      const cohortStart = new Date(todayStart.getTime() - weeksAgo * weekMs);
      const cohortEnd = new Date(cohortStart.getTime() + weekMs);
      const [signupCount, activeCount] = await Promise.all([
        prisma.user.count({ where: { createdAt: { gte: cohortStart, lt: cohortEnd } } }),
        prisma.user.count({
          where: { createdAt: { gte: cohortStart, lt: cohortEnd }, ...activeWhere(activeSince) },
        }),
      ]);
      return { label: `Week ${weeksAgo}`, signupCount, activeCount, pct: signupCount > 0 ? Math.round((activeCount / signupCount) * 100) : 0 };
    }),
  );

  return results;
}

async function buildPeakHours(since: Date) {
  const [posts, comments] = await Promise.all([
    prisma.post.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.comment.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
  ]);

  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (const item of [...posts, ...comments]) {
    const d = new Date(item.createdAt);
    grid[d.getDay()][d.getHours()]++;
  }

  return grid.map((hours, dayIdx) => ({ day: dayNames[dayIdx], hours }));
}
