import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { getRecentActivity } from "@/lib/activity-log";
import { fetchQuote } from "@/lib/yahoo-finance";

export const dynamic = "force-dynamic";

let yahooCache = { status: "unknown", latency: 0, timestamp: 0 };
const YAHOO_CACHE_TTL = 300_000;

// FIX audit 28 Okt: recentActivity in-memory hilang tiap restart & jalur cron host tak menulis
// pushActivity — fallback baca CronLog DB (sumber kebenaran) supaya Recent Activity tidak kosong.
async function recentActivityFromDb(limit: number) {
  try {
    const rows = await prisma.cronLog.findMany({
      orderBy: { startedAt: "desc" },
      take: limit,
      select: { jobName: true, status: true, startedAt: true, durationMs: true, triggeredBy: true },
    });
    return rows.map((r) => ({
      action: r.jobName,
      timestamp: r.startedAt.toISOString(),
      duration: r.durationMs != null ? r.durationMs / 1000 : 0,
      status: r.status === "success" ? ("success" as const) : ("failed" as const),
      metadata: { triggeredBy: r.triggeredBy ?? "cron" },
    }));
  } catch {
    return [];
  }
}

// Info Uang (adm-2026-10-28-02): nilai portofolio LIVE = SUM(qty × close terbaru per ticker),
// fallback buyPrice kalau harga belum ada (pola perhitungan sama dengan profile/[username]).
async function moneyInfoFromDb() {
  try {
    const holdings = await prisma.portfolioHolding.findMany({
      select: {
        userId: true,
        quantity: true,
        buyPrice: true,
        stock: {
          select: {
            ticker: true,
            prices: { orderBy: { date: "desc" }, take: 1, select: { close: true, date: true } },
          },
        },
      },
    });
    let value = 0;
    let cost = 0;
    let latestDate: Date | null = null;
    for (const h of holdings) {
      const p = h.stock.prices[0];
      const cur = p ? Number(p.close) : Number(h.buyPrice);
      value += cur * h.quantity;
      cost += Number(h.buyPrice) * h.quantity;
      if (p?.date && (!latestDate || p.date > latestDate)) latestDate = p.date;
    }
    const [premiumCount, waitlistCount] = await Promise.all([
      prisma.user.count({ where: { isPremium: true } }),
      prisma.waitlistSubscriber.count(),
    ]);
    return {
      portfolioValue: value,
      portfolioCost: cost,
      holdingsCount: holdings.length,
      holdersCount: new Set(holdings.map((h) => h.userId)).size,
      priceDate: latestDate ? latestDate.toISOString() : null,
      premiumCount,
      waitlistCount,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    await requireAdmin();
  let dbConnected = true;

  let latestPrice: { date: Date } | null = null;
  let latestIndicator: { date: Date } | null = null;

  try {
    [latestPrice, latestIndicator] = await Promise.all([
      prisma.stockPrice.findFirst({ orderBy: { date: "desc" }, select: { date: true } }),
      prisma.stockIndicator.findFirst({ orderBy: { date: "desc" }, select: { date: true } }),
    ]);
  } catch {
    dbConnected = false;
  }

  // Yahoo Finance health check (cached 5 min)
  const now = Date.now();
  if (now - yahooCache.timestamp >= YAHOO_CACHE_TTL) {
    try {
      const start = Date.now();
      await fetchQuote("BBCA.JK");
      yahooCache = { status: "connected", latency: Date.now() - start, timestamp: now };
    } catch {
      yahooCache = { status: "error", latency: 0, timestamp: now };
    }
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const lastEodSync = latestIndicator?.date
    ? { status: latestIndicator.date > oneDayAgo ? "success" as const : "stale" as const, timestamp: latestIndicator.date.toISOString() }
    : { status: "never" as const, timestamp: null };

  const lastIntradaySync = latestPrice?.date
    ? { status: latestPrice.date > oneDayAgo ? "success" as const : "stale" as const, timestamp: latestPrice.date.toISOString() }
    : { status: "never" as const, timestamp: null };

  return NextResponse.json({
    lastEodSync,
    lastIntradaySync,
    dbPool: { status: dbConnected ? "connected" : "error" },
    yahooApi: { status: yahooCache.status, latency: yahooCache.latency },
    money: await moneyInfoFromDb(), // adm-2026-10-28-02 Info Uang live
    recentActivity: getRecentActivity(10).length
      ? getRecentActivity(10)
      : await recentActivityFromDb(10),
  });
  } catch (error) {
    return handleApiError(error, "fetch admin status");
  }
}
