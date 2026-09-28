import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { wibDayStart } from "@/lib/datetime-wib";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  const now = new Date();
  // WIB calendar day (00:00 WIB) — was server-local midnight, i.e. 07:00 WIB on the UTC container.
  const todayStart = wibDayStart();
  const fourteenDaysAgo = new Date(todayStart.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    activeSessions,
    totalAccounts,
    signups7d,
    bannedUsers,
    accountProviders,
    dailySignups,
    recentBans,
    cacheStats,
  ] = await Promise.all([
    prisma.session.count({ where: { expires: { gt: now } } }),
    prisma.account.count(),
    // Was "sessionsToday" (actually total sessions — JWT strategy keeps the Session
    // table near-empty, so the number was meaningless). Real signal: weekly signups.
    prisma.user.count({ where: { createdAt: { gte: fourteenDaysAgo } } }),
    prisma.user.count({ where: { bannedAt: { not: null } } }),

    prisma.account.groupBy({
      by: ["provider"],
      _count: { provider: true },
    }),

    // Daily signups (14 days) — grouped in SQL by calendar day.
    prisma.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::date AS day,
             count(*) AS count
      FROM "User"
      WHERE "createdAt" >= ${fourteenDaysAgo}
      GROUP BY 1
      ORDER BY 1
    `,

    prisma.user.findMany({
      where: { bannedAt: { not: null } },
      orderBy: { bannedAt: "desc" },
      take: 10,
      select: {
        id: true,
        username: true,
        email: true,
        bannedAt: true,
      },
    }),

    // Cached API calls
    prisma.cachedApiCall.findMany({
      orderBy: { fetchedAt: "desc" },
      take: 50,
      select: { cacheKey: true, fetchedAt: true },
    }),
  ]);

  // Aggregate cache by key prefix (before first colon)
  const cacheByKey = new Map<string, { count: number; lastFetched: Date }>();
  for (const c of cacheStats) {
    const prefix = c.cacheKey.split(":").slice(0, 2).join(":");
    const existing = cacheByKey.get(prefix);
    if (existing) {
      existing.count++;
      if (c.fetchedAt > existing.lastFetched) existing.lastFetched = c.fetchedAt;
    } else {
      cacheByKey.set(prefix, { count: 1, lastFetched: c.fetchedAt });
    }
  }

  return NextResponse.json({
    overview: {
      activeSessions,
      totalAccounts,
      signups14d: signups7d,
      bannedUsers,
    },
    providers: accountProviders.map((p) => ({
      provider: p.provider,
      count: p._count.provider,
    })),
    dailySessions: dailySignups.map((d) => ({
      date: new Date(d.day).toISOString().slice(0, 10),
      count: Number(d.count),
    })),
    recentBans,
    cacheUsage: Array.from(cacheByKey.entries())
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([key, val]) => ({
        keyPrefix: key,
        count: val.count,
        lastFetched: val.lastFetched.toISOString(),
      })),
  });
  } catch (error) {
    return handleApiError(error, "fetch auth health");
  }
}
