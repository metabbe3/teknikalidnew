import { paperTradingService } from "@/domains/paper-trading/paper-trading.service";
import { watchlistService } from "@/domains/watchlist/watchlist.service";
import { reputationService } from "@/domains/reputation/reputation.service";
import { prisma } from "@/lib/prisma";

export const dashboardService = {
  async getSummary(userId: string) {
    const [paperAccount, watchlistItems, reputation, recentPosts] = await Promise.all([
      paperTradingService.getAccount(userId).catch(() => null),
      watchlistService.getWatchlist(userId).catch(() => []),
      reputationService.getUserReputation(userId).catch(() => ({ reputation: 0, badge: { level: "Pemula", color: "slate" } })),
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

    return {
      paperTrading,
      watchlistMovers,
      reputation: {
        score: reputation?.reputation ?? 0,
        badge: reputation?.badge?.level ?? "Pemula",
        badgeColor: reputation?.badge?.color ?? "slate",
      },
      recentPosts,
    };
  },
};
