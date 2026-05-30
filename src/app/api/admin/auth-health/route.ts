import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fourteenDaysAgo = new Date(todayStart.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    activeSessions,
    totalAccounts,
    sessionsToday,
    bannedUsers,
    accountProviders,
    dailySessions,
    recentBans,
    cacheStats,
  ] = await Promise.all([
    prisma.session.count({ where: { expires: { gt: now } } }),
    prisma.account.count(),
    prisma.session.count(), // total sessions as proxy for "today"
    prisma.user.count({ where: { bannedAt: { not: null } } }),

    prisma.account.groupBy({
      by: ["provider"],
      _count: { provider: true },
    }),

    // Daily sessions (14 days) — Session has no createdAt, use expires as proxy
    // Skip if no createdAt field; return empty
    Promise.resolve([] as { date: string; count: number }[]),

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
      sessionsToday,
      bannedUsers,
    },
    providers: accountProviders.map((p) => ({
      provider: p.provider,
      count: p._count.provider,
    })),
    dailySessions,
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
