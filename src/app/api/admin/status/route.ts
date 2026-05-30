import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { getRecentActivity } from "@/lib/activity-log";
import { fetchQuote } from "@/lib/yahoo-finance";

export const dynamic = "force-dynamic";

let yahooCache = { status: "unknown", latency: 0, timestamp: 0 };
const YAHOO_CACHE_TTL = 300_000;

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
    recentActivity: getRecentActivity(10),
  });
  } catch (error) {
    return handleApiError(error, "fetch admin status");
  }
}
