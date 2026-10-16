// GET /api/live-quotes?s=BBCA.JK,BBRI.JK — live prices for arbitrary tickers.
// Used by LivePrice client component to refresh prices every N seconds during
// market hours. Backed by fetchQuotesBatch (TradingView scanner + Yahoo v8
// fallback) with an in-memory TTL cache (60s) to stay polite to upstream.

import { NextRequest, NextResponse } from "next/server";
import { fetchQuotesBatch } from "@/lib/yahoo-finance";
import { findPrevClosesByTicker } from "@/domains/stock/stock.repository";
import { handleApiError } from "@/lib/api-error";
import { TtlCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

const CACHE = new TtlCache<unknown>(300);
const TTL_MS = 60 * 1000;
const MAX_TICKERS = 120;

interface LiveQuoteRow {
  ticker: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  open: number | null;
  prevClose: number | null;
  marketState: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const raw = request.nextUrl.searchParams.get("s") ?? "";
    const tickers = raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (t.includes(".") || t.startsWith("^") ? t : `${t}.JK`))
      .slice(0, MAX_TICKERS);

    if (tickers.length === 0) {
      return NextResponse.json({ quotes: [], ts: Date.now() });
    }

    const cacheKey = `live-quotes:${tickers.join(",")}`;
    const cached = CACHE.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const results = await fetchQuotesBatch(tickers);

    // Percent correction (owner 16 Okt "AKKU bilang +28% padahal flat"): prev dari
    // TV/Yahoo utk saham illiquid membandingkan ke session TERAKHIR saham trade,
    // bukan kemarin → saham tidak aktif tampil ±30% bohong. Prev kanonik = EOD DB.
    let eodPrev: Map<string, number> = new Map();
    try {
      eodPrev = await findPrevClosesByTicker(tickers);
    } catch (e) {
      console.error("[LiveQuotes] EOD prev lookup failed, fallback feed prev", e);
    }

    const quotes: LiveQuoteRow[] = results.map(({ ticker, quote }) => {
      const feedPrice = quote?.regularMarketPrice ?? null;
      const prev = eodPrev.get(ticker) ?? quote?.regularMarketPreviousClose ?? null;
      const changePercent =
        feedPrice != null && prev != null && prev > 0
          ? ((feedPrice - prev) / prev) * 100
          : quote?.regularMarketChangePercent ?? null;
      const change =
        feedPrice != null && prev != null ? feedPrice - prev : quote?.regularMarketChange ?? null;
      return {
        ticker,
        price: feedPrice,
        change,
        changePercent,
        volume: quote?.regularMarketVolume ?? null,
        dayHigh: quote?.regularMarketDayHigh ?? null,
        dayLow: quote?.regularMarketDayLow ?? null,
        open: quote?.regularMarketOpen ?? null,
        prevClose: prev,
        marketState: quote?.marketState ?? null,
      };
    });

    const payload = { quotes, ts: Date.now() };
    CACHE.set(cacheKey, payload, TTL_MS);
    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error, "live quotes");
  }
}
