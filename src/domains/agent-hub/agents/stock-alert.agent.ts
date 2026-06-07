import { BaseAgent } from "./base-agent";
import type { AgentType, AgentJobPayload, AgentJobResult } from "../agent-hub.types";
import { prisma } from "@/lib/prisma";
import { NotificationType } from "@/generated/prisma/client";
import { decimalToNumber } from "@/lib/serialize";

interface Alert {
  ticker: string;
  signal: "bullish" | "bearish" | "volatile";
  rule: string;
  details: string;
}

export class StockAlertAgent extends BaseAgent {
  readonly type: AgentType = "stock_alert";
  readonly label = "Stock Alert";

  async execute(payload: AgentJobPayload): Promise<AgentJobResult> {
    const config = await this.getAgentConfig();
    const notifyWatchlist = (config?.notifyWatchlist as boolean) ?? true;
    const notifyStockFollows = (config?.notifyStockFollows as boolean) ?? true;
    const maxAlerts = (config?.maxAlertsPerRun as number) ?? 50;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Fetch today's indicators with stock info
    const todayIndicators = await prisma.stockIndicator.findMany({
      where: { date: today, interval: "daily" },
      include: {
        stock: { select: { ticker: true, id: true } },
      },
    });

    // Fetch yesterday's indicators for comparison
    const yesterdayIndicators = await prisma.stockIndicator.findMany({
      where: { date: yesterday, interval: "daily" },
      include: {
        stock: { select: { ticker: true } },
      },
    });

    const yesterdayMap = new Map(
      yesterdayIndicators.map((i) => [i.stockId, i]),
    );

    // Fetch today's and yesterday's prices for close comparison
    const todayPrices = await prisma.stockPrice.findMany({
      where: { date: today },
      select: { stockId: true, close: true },
    });
    const yesterdayPrices = await prisma.stockPrice.findMany({
      where: { date: yesterday },
      select: { stockId: true, close: true },
    });

    const todayPriceMap = new Map(todayPrices.map((p) => [p.stockId, p.close]));
    const yesterdayPriceMap = new Map(yesterdayPrices.map((p) => [p.stockId, p.close]));

    const alerts: Alert[] = [];

    for (const ind of todayIndicators) {
      const ticker = ind.stock.ticker;
      const prev = yesterdayMap.get(ind.stockId);
      const close = todayPriceMap.get(ind.stockId);
      const prevClose = yesterdayPriceMap.get(ind.stockId);

      // RSI Oversold / Overbought
      const rsi = ind.rsi14 ? decimalToNumber(ind.rsi14) : null;
      if (rsi !== null) {
        if (rsi < 30) {
          alerts.push({ ticker, signal: "bullish", rule: "rsi_oversold", details: `RSI at ${rsi.toFixed(1)} (oversold)` });
        } else if (rsi > 70) {
          alerts.push({ ticker, signal: "bearish", rule: "rsi_overbought", details: `RSI at ${rsi.toFixed(1)} (overbought)` });
        }
      }

      // MACD Bullish Cross
      const macdHist = ind.macdHist ? decimalToNumber(ind.macdHist) : null;
      const prevMacdHist = prev?.macdHist ? decimalToNumber(prev.macdHist) : null;
      if (macdHist !== null && prevMacdHist !== null && prevMacdHist <= 0 && macdHist > 0) {
        alerts.push({ ticker, signal: "bullish", rule: "macd_bullish_cross", details: `MACD histogram crossed above zero (${prevMacdHist.toFixed(4)} → ${macdHist.toFixed(4)})` });
      }

      // SMA Cross signals
      if (ind.smaCrossSignal) {
        if (ind.smaCrossSignal === "golden_cross") {
          alerts.push({ ticker, signal: "bullish", rule: "sma_golden_cross", details: "SMA 20/50 golden cross detected" });
        } else if (ind.smaCrossSignal === "death_cross") {
          alerts.push({ ticker, signal: "bearish", rule: "sma_death_cross", details: "SMA 20/50 death cross detected" });
        }
      }

      // Price vs SMA200 breakout
      const sma200 = ind.sma200 ? decimalToNumber(ind.sma200) : null;
      const closeNum = close ? decimalToNumber(close) : null;
      const prevCloseNum = prevClose ? decimalToNumber(prevClose) : null;
      if (sma200 !== null && closeNum !== null && prevCloseNum !== null) {
        if (closeNum > sma200 && prevCloseNum <= sma200) {
          alerts.push({ ticker, signal: "bullish", rule: "above_sma200", details: `Price broke above SMA200 (${sma200.toFixed(0)})` });
        }
      }

      // Bollinger Band breakout
      const bbUpper = ind.bbUpper ? decimalToNumber(ind.bbUpper) : null;
      const bbLower = ind.bbLower ? decimalToNumber(ind.bbLower) : null;
      if (bbUpper !== null && bbLower !== null && closeNum !== null) {
        if (closeNum > bbUpper) {
          alerts.push({ ticker, signal: "volatile", rule: "bb_breakout_upper", details: `Price above upper Bollinger Band (${bbUpper.toFixed(0)})` });
        } else if (closeNum < bbLower) {
          alerts.push({ ticker, signal: "volatile", rule: "bb_breakout_lower", details: `Price below lower Bollinger Band (${bbLower.toFixed(0)})` });
        }
      }

      // Supertrend flip
      const st = ind.supertrend ? decimalToNumber(ind.supertrend) : null;
      const prevSt = prev?.supertrend ? decimalToNumber(prev.supertrend) : null;
      if (st !== null && prevSt !== null && closeNum !== null && prevCloseNum !== null) {
        const todayAbove = closeNum > st;
        const prevAbove = prevCloseNum > prevSt;
        if (todayAbove && !prevAbove) {
          alerts.push({ ticker, signal: "bullish", rule: "supertrend_bullish", details: "Supertrend flipped bullish" });
        } else if (!todayAbove && prevAbove) {
          alerts.push({ ticker, signal: "bearish", rule: "supertrend_bearish", details: "Supertrend flipped bearish" });
        }
      }
    }

    // Limit alerts
    const limitedAlerts = alerts.slice(0, maxAlerts);

    // Notify users
    let usersNotified = 0;
    if (limitedAlerts.length > 0) {
      const tickers = [...new Set(limitedAlerts.map((a) => a.ticker))];

      // Find users interested in these tickers
      const interestedUsers = new Map<string, Set<string>>();

      if (notifyStockFollows) {
        const follows = await prisma.stockFollow.findMany({
          where: { ticker: { in: tickers } },
          select: { userId: true, ticker: true },
        });
        for (const f of follows) {
          if (!interestedUsers.has(f.userId)) interestedUsers.set(f.userId, new Set());
          interestedUsers.get(f.userId)!.add(f.ticker);
        }
      }

      if (notifyWatchlist) {
        const watchlists = await prisma.watchlist.findMany({
          where: { stockTicker: { in: tickers } },
          select: { userId: true, stockTicker: true },
        });
        for (const w of watchlists) {
          if (!interestedUsers.has(w.userId)) interestedUsers.set(w.userId, new Set());
          interestedUsers.get(w.userId)!.add(w.stockTicker);
        }
      }

      // Find system user for agent notifications
      const systemUser = await prisma.user.findFirst({
        where: { role: "ADMIN" },
        select: { id: true },
      });
      if (!systemUser) {
        return { alertsFound: limitedAlerts.length, usersNotified: 0, alerts: limitedAlerts };
      }

      // Check existing notifications today to deduplicate
      const existingNotifs = await prisma.notification.findMany({
        where: {
          type: "STOCK_ALERT" as NotificationType,
          createdAt: { gte: today },
        },
        select: { recipientId: true },
      });
      const alreadyNotified = new Set(existingNotifs.map((n) => n.recipientId));

      // Create notifications
      const notifs: Array<{ type: NotificationType; recipientId: string; actorId: string }> = [];
      for (const [userId, userTickers] of interestedUsers) {
        if (alreadyNotified.has(userId)) continue;
        const userAlerts = limitedAlerts.filter((a) => userTickers.has(a.ticker));
        if (userAlerts.length > 0) {
          notifs.push({
            type: "STOCK_ALERT" as NotificationType,
            recipientId: userId,
            actorId: systemUser.id,
          });
        }
      }

      if (notifs.length > 0) {
        await prisma.notification.createMany({ data: notifs });
        usersNotified = notifs.length;
      }
    }

    return {
      summary: `Found ${limitedAlerts.length} alerts across ${new Set(limitedAlerts.map((a) => a.ticker)).size} stocks, notified ${usersNotified} users`,
      alertsFound: limitedAlerts.length,
      usersNotified,
      alerts: limitedAlerts,
    };
  }
}
