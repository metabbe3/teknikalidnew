import { BaseAgent } from "./base-agent";
import type { AgentType, AgentJobPayload, AgentJobResult } from "../agent-hub.types";
import { prisma } from "@/lib/prisma";
import { NotificationType } from "@/generated/prisma/client";
import { decimalToNumber } from "@/lib/serialize";
import { marketEngine } from "@/lib/market-engine";

export class UserEngagementAgent extends BaseAgent {
  readonly type: AgentType = "user_engagement";
  readonly label = "User Engagement";

  async execute(payload: AgentJobPayload): Promise<AgentJobResult> {
    const config = await this.getAgentConfig();
    const reEngageDays = (config?.reEngageAfterDays as number) ?? 7;
    const maxNotifs = (config?.maxNotificationsPerRun as number) ?? 100;
    const priceThreshold = (config?.priceChangeThreshold as number) ?? 3;
    const enableReEngagement = (config?.enableReEngagement as boolean) ?? true;

    const systemUser = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
    if (!systemUser) {
      return { summary: "No admin user found", notificationsSent: 0 };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let totalSent = 0;

    // 1. Stock alert digest: find recent stock_alert job results
    const stockAlertDigest = await this.sendStockAlertDigest(systemUser.id, today, maxNotifs - totalSent);
    totalSent += stockAlertDigest;

    // 2. Re-engagement for inactive users
    if (enableReEngagement && totalSent < maxNotifs) {
      const reEngaged = await this.reEngageInactiveUsers(systemUser.id, today, reEngageDays, priceThreshold, maxNotifs - totalSent);
      totalSent += reEngaged;
    }


    return {
      summary: `Sent ${totalSent} personalized notifications`,
      notificationsSent: totalSent,
    };
  }

  private async sendStockAlertDigest(actorId: string, today: Date, limit: number): Promise<number> {
    if (limit <= 0) return 0;

    // Find the most recent completed stock_alert job
    const alertJob = await prisma.agentJob.findFirst({
      where: { agentType: "stock_alert", status: "done" },
      orderBy: { completedAt: "desc" },
      select: { result: true, completedAt: true },
    });

    if (!alertJob?.result) return 0;

    const result = alertJob.result as Record<string, unknown>;
    const alerts = (result.alerts as Array<{ ticker: string; signal: string; rule: string; details: string }>) ?? [];
    if (alerts.length === 0) return 0;

    const alertTickers = [...new Set(alerts.map((a) => a.ticker))];

    // Find users who have these stocks in watchlist/stock follows
    const watchlistUsers = await prisma.watchlist.findMany({
      where: { stockTicker: { in: alertTickers } },
      select: { userId: true, stockTicker: true },
    });
    const followUsers = await prisma.stockFollow.findMany({
      where: { ticker: { in: alertTickers } },
      select: { userId: true, ticker: true },
    });

    const userAlertTickers = new Map<string, Set<string>>();
    for (const w of watchlistUsers) {
      if (!userAlertTickers.has(w.userId)) userAlertTickers.set(w.userId, new Set());
      userAlertTickers.get(w.userId)!.add(w.stockTicker);
    }
    for (const f of followUsers) {
      if (!userAlertTickers.has(f.userId)) userAlertTickers.set(f.userId, new Set());
      userAlertTickers.get(f.userId)!.add(f.ticker);
    }

    // Deduplicate: skip users who already got STOCK_ALERT today
    const existing = await prisma.notification.findMany({
      where: { type: "STOCK_ALERT" as NotificationType, createdAt: { gte: today } },
      select: { recipientId: true },
    });
    const alreadyNotified = new Set(existing.map((n) => n.recipientId));

    const notifs = [...userAlertTickers.entries()]
      .filter(([userId]) => !alreadyNotified.has(userId))
      .slice(0, limit)
      .map(([userId]) => ({
        type: "STOCK_ALERT" as NotificationType,
        recipientId: userId,
        actorId,
      }));

    if (notifs.length > 0) {
      await prisma.notification.createMany({ data: notifs });
    }
    return notifs.length;
  }

  private async reEngageInactiveUsers(actorId: string, today: Date, afterDays: number, priceThreshold: number, limit: number): Promise<number> {
    if (limit <= 0) return 0;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - afterDays);

    // Find users who haven't posted or commented since cutoff
    const activeUserIds = await prisma.user.findMany({
      where: {
        role: "USER",
        OR: [
          { posts: { some: { createdAt: { gte: cutoff } } } },
          { comments: { some: { createdAt: { gte: cutoff } } } },
        ],
      },
      select: { id: true },
    });
    const activeIdSet = new Set(activeUserIds.map((u) => u.id));

    // Get users with watchlists who are NOT in the active set
    const usersWithWatchlists = await prisma.user.findMany({
      where: {
        role: "USER",
        watchlist: { some: {} },
        id: { notIn: [...activeIdSet] },
      },
      select: { id: true },
      take: limit * 2,
    });

    if (usersWithWatchlists.length === 0) return 0;

    const notifs: Array<{ type: NotificationType; recipientId: string; actorId: string }> = [];

    for (const user of usersWithWatchlists) {
      if (notifs.length >= limit) break;

      const watchlist = await prisma.watchlist.findMany({
        where: { userId: user.id },
        select: { stockTicker: true },
      });

      if (watchlist.length === 0) continue;

      const tickers = watchlist.map((w) => w.stockTicker);

      // Get today's and yesterday's prices for these tickers
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);

      const todayPrices = await prisma.stockPrice.findMany({
        where: { date: todayStart, stock: { ticker: { in: tickers } } },
        select: { close: true, stock: { select: { ticker: true } } },
      });
      const yesterdayPrices = await prisma.stockPrice.findMany({
        where: { date: yesterdayStart, stock: { ticker: { in: tickers } } },
        select: { close: true, stock: { select: { ticker: true } } },
      });

      const yesterdayPriceMap = new Map(yesterdayPrices.map((p) => [p.stock.ticker, p.close]));

      for (const tp of todayPrices) {
        const yc = yesterdayPriceMap.get(tp.stock.ticker);
        if (!yc) continue;
        const todayClose = decimalToNumber(tp.close);
        const yesterdayClose = decimalToNumber(yc);
        if (todayClose === null || yesterdayClose === null || yesterdayClose === 0) continue;
        // bo-2026-11-02-01: engine SATU PINTU (guard yesterdayClose 0 sudah continue di atas)
        const change = marketEngine.pctChange(todayClose, yesterdayClose) ?? 0;
        if (Math.abs(change) >= priceThreshold) {
          notifs.push({
            type: "RE_ENGAGE" as NotificationType,
            recipientId: user.id,
            actorId,
          });
          break; // one notification per user
        }
      }
    }

    if (notifs.length > 0) {
      await prisma.notification.createMany({ data: notifs });
    }
    return notifs.length;
  }

}
