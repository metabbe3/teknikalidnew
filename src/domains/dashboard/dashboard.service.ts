import { paperTradingService } from "@/domains/paper-trading/paper-trading.service";
import { watchlistService } from "@/domains/watchlist/watchlist.service";
import { reputationService } from "@/domains/reputation/reputation.service";
import { prisma } from "@/lib/prisma";

export const dashboardService = {
  async getSummary(userId: string) {
    const [paperAccount, watchlistItems, userRep, userStreak, recentPosts] = await Promise.all([
      paperTradingService.getAccount(userId).catch(() => null),
      watchlistService.getWatchlist(userId).catch(() => []),
      reputationService.getUserReputation(userId).catch(() => null),
      prisma.user.findUnique({
        where: { id: userId },
        select: { dailyStreak: true, lastDailyClaimAt: true },
      }).catch(() => null),
      prisma.post.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: { select: { username: true, name: true, image: true } },
          tickerTag: true,
        },
      }).catch(() => []),
    ]);

    // Process paper trading
    const paperTrading = paperAccount
      ? {
          balance: paperAccount.balance,
          initialBalance: paperAccount.initialBalance,
          totalValue: paperAccount.totalValue,
          totalPnl: paperAccount.totalPnl,
          totalPnlPct: paperAccount.totalPnlPct,
          positionCount: paperAccount.positionCount,
        }
      : null;

    // Process watchlist (top 5 movers by absolute change %)
    const watchlistMovers = (watchlistItems || [])
      .filter((item) => item.changePercent !== null)
      .sort((a, b) => Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0))
      .slice(0, 5)
      .map((item) => ({
        ticker: item.ticker,
        name: item.name,
        change: item.change,
        changePercent: item.changePercent,
      }));

    // Process daily reward status
    const badge = userRep?.badge ?? { level: "Pemula", color: "slate" };
    const streak = userStreak?.dailyStreak ?? 0;
    const lastClaim = userStreak?.lastDailyClaimAt ?? null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const canClaim = !lastClaim || new Date(lastClaim).getTime() < today.getTime();

    return {
      paperTrading,
      watchlistMovers,
      reputation: {
        score: userRep?.reputation ?? 0,
        badge: badge.level,
        badgeColor: badge.color,
      },
      recentPosts,
      dailyReward: {
        canClaim,
        streak,
        lastClaimDate: lastClaim?.toISOString() ?? null,
      },
    };
  },
};
