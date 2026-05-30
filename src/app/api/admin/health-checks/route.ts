import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { fetchQuote } from "@/lib/yahoo-finance";
import { qstash } from "@/lib/queue";

export const dynamic = "force-dynamic";

let yahooCache = { result: "", timestamp: 0 };
const YAHOO_CACHE_TTL = 300_000; // 5 minutes

export async function GET() {
  try {
    await requireAdmin();
  const now = Date.now();

  // DB check
  let dbStatus = "connected";
  let dbLatency = 0;
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - start;
  } catch {
    dbStatus = "error";
  }

  // Yahoo Finance check (cached)
  let yahooStatus = "unknown";
  let yahooLatency = 0;
  if (now - yahooCache.timestamp < YAHOO_CACHE_TTL) {
    yahooStatus = yahooCache.result;
  } else {
    try {
      const start = Date.now();
      await fetchQuote("BBCA.JK");
      yahooLatency = Date.now() - start;
      yahooStatus = "connected";
      yahooCache = { result: yahooStatus, timestamp: now };
    } catch {
      yahooStatus = "error";
      yahooCache = { result: yahooStatus, timestamp: now };
    }
  }

  // QStash check
  let qstashStatus = "not_configured";
  try {
    await qstash.http.request({ path: ["v2", "messages"], method: "GET" });
    qstashStatus = "connected";
  } catch {
    qstashStatus = "error";
  }

  // Sentry check
  const sentryConfigured = !!process.env.SENTRY_DSN;

  return NextResponse.json({
    services: {
      yahoo: { status: yahooStatus, latency: yahooLatency },
      db: { status: dbStatus, latency: dbLatency },
      qstash: { status: qstashStatus },
      sentry: { configured: sentryConfigured },
    },
    envVars: {
      DATABASE_URL: !!process.env.DATABASE_URL,
      YAHOO_FINANCE_API: true,
      QSTASH_TOKEN: !!process.env.QSTASH_TOKEN,
      SENTRY_DSN: sentryConfigured,
      CRON_SECRET: !!process.env.CRON_SECRET,
    },
    timestamp: new Date().toISOString(),
  });
  } catch (error) {
    return handleApiError(error, "fetch health checks");
  }
}
