import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const stocks = await prisma.stock.findMany({
    where: { isActive: true },
    select: {
      id: true,
      ticker: true,
      name: true,
      indicators: {
        orderBy: { date: "desc" },
        take: 1,
        select: {
          date: true,
          interval: true,
          sma20: true,
          sma50: true,
          sma200: true,
          ema12: true,
          ema26: true,
          rsi14: true,
          macdLine: true,
          macdSignal: true,
          macdHist: true,
          bbUpper: true,
          bbMiddle: true,
          bbLower: true,
          stochK: true,
          stochD: true,
          adx: true,
          vwap: true,
          atr: true,
          obv: true,
          supertrend: true,
        },
      },
    },
    orderBy: { ticker: "asc" },
  });

  const INDICATOR_FIELDS = [
    "sma20", "sma50", "sma200", "ema12", "ema26", "rsi14",
    "macdLine", "macdSignal", "macdHist", "bbUpper", "bbMiddle", "bbLower",
    "stochK", "stochD", "adx", "vwap", "atr", "obv", "supertrend",
  ] as const;

  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  const indicators = stocks.map((stock) => {
    const latest = stock.indicators[0];
    if (!latest) {
      return {
        ticker: stock.ticker,
        name: stock.name,
        date: null,
        interval: null,
        status: "missing" as const,
        fieldsPopulated: 0,
        totalFields: INDICATOR_FIELDS.length,
      };
    }

    const populated = INDICATOR_FIELDS.filter((f) => latest[f] !== null).length;
    const status = latest.date < twoDaysAgo ? ("stale" as const) : ("fresh" as const);

    return {
      ticker: stock.ticker,
      name: stock.name,
      date: latest.date.toISOString(),
      interval: latest.interval,
      status,
      fieldsPopulated: populated,
      totalFields: INDICATOR_FIELDS.length,
    };
  });

  const summary = {
    total: indicators.length,
    fresh: indicators.filter((i) => i.status === "fresh").length,
    stale: indicators.filter((i) => i.status === "stale").length,
    missing: indicators.filter((i) => i.status === "missing").length,
  };

  return NextResponse.json({ indicators, summary });
  } catch (error) {
    return handleApiError(error, "fetch admin indicators");
  }
}
