import { BaseAgent } from "./base-agent";
import type { AgentType, AgentJobPayload, AgentJobResult } from "../agent-hub.types";
import { prisma } from "@/lib/prisma";
import { NotificationType } from "@/generated/prisma/client";
import { decimalToNumber, bigIntToNumber } from "@/lib/serialize";

interface Anomaly {
  ticker: string;
  type: string;
  severity: "info" | "warning" | "critical";
  details: string;
}

export class AnomalyDetectionAgent extends BaseAgent {
  readonly type: AgentType = "anomaly_detection";
  readonly label = "Anomaly Detection";

  async execute(payload: AgentJobPayload): Promise<AgentJobResult> {
    const config = await this.getAgentConfig();
    const notifyAlerts = (config?.notifyAlerts as boolean) ?? true;
    const maxAlerts = (config?.maxAlertsPerRun as number) ?? 30;
    const priceThreshold = (config?.priceChangeThreshold as number) ?? 5;
    const volumeMultiplier = (config?.volumeSpikeMultiplier as number) ?? 3;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const twentyDaysAgo = new Date(today);
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 21);

    // Fetch recent prices
    const prices = await prisma.stockPrice.findMany({
      where: { date: { gte: twentyDaysAgo } },
      include: { stock: { select: { ticker: true } } },
      orderBy: { date: "desc" },
    });

    // Group by stock
    const stockPrices = new Map<string, Array<{ date: Date; open: number; high: number; low: number; close: number; volume: number }>>();
    for (const p of prices) {
      const open = decimalToNumber(p.open);
      const high = decimalToNumber(p.high);
      const low = decimalToNumber(p.low);
      const close = decimalToNumber(p.close);
      const volume = bigIntToNumber(p.volume);
      if (open === null || high === null || low === null || close === null || volume === null) continue;
      const arr = stockPrices.get(p.stock.ticker) ?? [];
      arr.push({ date: p.date, open, high, low, close, volume });
      stockPrices.set(p.stock.ticker, arr);
    }

    // Fetch today's indicators
    const todayIndicators = await prisma.stockIndicator.findMany({
      where: { date: today, interval: "daily" },
      include: { stock: { select: { ticker: true } } },
    });

    // Fetch indicators from 5 days ago for divergence check
    const fiveDaysAgo = new Date(today);
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const pastIndicators = await prisma.stockIndicator.findMany({
      where: { date: fiveDaysAgo, interval: "daily" },
      include: { stock: { select: { ticker: true } } },
    });
    const pastIndicatorMap = new Map(pastIndicators.map((i) => [i.stock.ticker, i]));
    const todayIndicatorMap = new Map(todayIndicators.map((i) => [i.stock.ticker, i]));

    const anomalies: Anomaly[] = [];
    const anomalyCountPerStock = new Map<string, number>();

    for (const [ticker, days] of stockPrices) {
      if (days.length < 2) continue;

      const todayPrice = days[0]; // most recent
      const yesterdayPrice = days[1];

      // Only process today's data
      if (todayPrice.date.getTime() < today.getTime()) continue;

      // 20-day average volume (exclude today)
      const olderDays = days.slice(1, 21);
      const avgVolume = olderDays.length > 0
        ? olderDays.reduce((sum, d) => sum + d.volume, 0) / olderDays.length
        : 0;

      // Price Surge
      const changePercent = ((todayPrice.close - yesterdayPrice.close) / yesterdayPrice.close) * 100;
      if (Math.abs(changePercent) > priceThreshold) {
        const anomaly: Anomaly = {
          ticker,
          type: "price_surge",
          severity: Math.abs(changePercent) > 10 ? "critical" : "warning",
          details: `Price ${changePercent > 0 ? "surged" : "dropped"} ${Math.abs(changePercent).toFixed(1)}% (${yesterdayPrice.close.toFixed(0)} → ${todayPrice.close.toFixed(0)})`,
        };
        anomalies.push(anomaly);
        anomalyCountPerStock.set(ticker, (anomalyCountPerStock.get(ticker) ?? 0) + 1);
      }

      // Volume Spike
      if (avgVolume > 0 && todayPrice.volume > avgVolume * volumeMultiplier) {
        const anomaly: Anomaly = {
          ticker,
          type: "volume_spike",
          severity: "warning",
          details: `Volume ${todayPrice.volume.toLocaleString()} is ${(todayPrice.volume / avgVolume).toFixed(1)}x the 20-day avg (${Math.round(avgVolume).toLocaleString()})`,
        };
        anomalies.push(anomaly);
        anomalyCountPerStock.set(ticker, (anomalyCountPerStock.get(ticker) ?? 0) + 1);
      }

      // Price Gap Up/Down
      if (todayPrice.open > yesterdayPrice.high * 1.02) {
        const anomaly: Anomaly = {
          ticker,
          type: "gap_up",
          severity: "warning",
          details: `Gap up: opened at ${todayPrice.open.toFixed(0)} vs previous high ${yesterdayPrice.high.toFixed(0)} (+${(((todayPrice.open - yesterdayPrice.high) / yesterdayPrice.high) * 100).toFixed(1)}%)`,
        };
        anomalies.push(anomaly);
        anomalyCountPerStock.set(ticker, (anomalyCountPerStock.get(ticker) ?? 0) + 1);
      } else if (todayPrice.open < yesterdayPrice.low * 0.98) {
        const anomaly: Anomaly = {
          ticker,
          type: "gap_down",
          severity: "warning",
          details: `Gap down: opened at ${todayPrice.open.toFixed(0)} vs previous low ${yesterdayPrice.low.toFixed(0)} (${(((todayPrice.open - yesterdayPrice.low) / yesterdayPrice.low) * 100).toFixed(1)}%)`,
        };
        anomalies.push(anomaly);
        anomalyCountPerStock.set(ticker, (anomalyCountPerStock.get(ticker) ?? 0) + 1);
      }

      // RSI Divergence
      const todayInd = todayIndicatorMap.get(ticker);
      const pastInd = pastIndicatorMap.get(ticker);
      if (todayInd?.rsi14 && pastInd?.rsi14) {
        const todayRsi = decimalToNumber(todayInd.rsi14);
        const pastRsi = decimalToNumber(pastInd.rsi14);
        if (todayRsi !== null && pastRsi !== null) {
          if (todayPrice.close > yesterdayPrice.close && todayRsi < pastRsi) {
            anomalies.push({ ticker, type: "rsi_bearish_divergence", severity: "warning", details: `Bearish RSI divergence: price rising but RSI declining (${pastRsi.toFixed(1)} → ${todayRsi.toFixed(1)})` });
            anomalyCountPerStock.set(ticker, (anomalyCountPerStock.get(ticker) ?? 0) + 1);
          } else if (todayPrice.close < yesterdayPrice.close && todayRsi > pastRsi) {
            anomalies.push({ ticker, type: "rsi_bullish_divergence", severity: "warning", details: `Bullish RSI divergence: price falling but RSI rising (${pastRsi.toFixed(1)} → ${todayRsi.toFixed(1)})` });
            anomalyCountPerStock.set(ticker, (anomalyCountPerStock.get(ticker) ?? 0) + 1);
          }
        }
      }

      // Gorengan Alert
      const ind = todayIndicatorMap.get(ticker);
      if (ind?.isGorengan && avgVolume > 0 && todayPrice.volume > avgVolume * 2) {
        anomalies.push({ ticker, type: "gorengan_alert", severity: "critical", details: `Gorengan stock with ${(todayPrice.volume / avgVolume).toFixed(1)}x average volume` });
        anomalyCountPerStock.set(ticker, (anomalyCountPerStock.get(ticker) ?? 0) + 1);
      }
    }

    // Confluence: 3+ anomalies for same stock
    for (const [ticker, count] of anomalyCountPerStock) {
      if (count >= 3) {
        anomalies.push({ ticker, type: "confluence", severity: "critical", details: `${count} anomalies detected simultaneously` });
      }
    }

    const limitedAnomalies = anomalies.slice(0, maxAlerts);

    // Notify users for critical anomalies
    let usersNotified = 0;
    if (notifyAlerts) {
      const criticalTickers = [...new Set(limitedAnomalies.filter((a) => a.severity === "critical").map((a) => a.ticker))];
      if (criticalTickers.length > 0) {
        const follows = await prisma.stockFollow.findMany({
          where: { ticker: { in: criticalTickers } },
          select: { userId: true, ticker: true },
        });
        const watchlists = await prisma.watchlist.findMany({
          where: { stockTicker: { in: criticalTickers } },
          select: { userId: true, stockTicker: true },
        });

        const allUserIds = new Set([...follows.map((f) => f.userId), ...watchlists.map((w) => w.userId)]);

        const systemUser = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
        if (systemUser && allUserIds.size > 0) {
          const today2 = new Date();
          today2.setHours(0, 0, 0, 0);
          const existing = await prisma.notification.findMany({
            where: { type: "AGENT_ALERT" as NotificationType, createdAt: { gte: today2 } },
            select: { recipientId: true },
          });
          const alreadyNotified = new Set(existing.map((n) => n.recipientId));

          const notifs = [...allUserIds]
            .filter((id) => !alreadyNotified.has(id))
            .map((userId) => ({
              type: "AGENT_ALERT" as NotificationType,
              recipientId: userId,
              actorId: systemUser.id,
            }));

          if (notifs.length > 0) {
            await prisma.notification.createMany({ data: notifs });
            usersNotified = notifs.length;
          }
        }
      }
    }

    return {
      summary: `Detected ${limitedAnomalies.length} anomalies across ${new Set(limitedAnomalies.map((a) => a.ticker)).size} stocks, notified ${usersNotified} users`,
      anomaliesFound: limitedAnomalies.length,
      usersNotified,
      anomalies: limitedAnomalies,
    };
  }
}
