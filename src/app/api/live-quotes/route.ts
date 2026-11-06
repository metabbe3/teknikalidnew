// GET /api/live-quotes?s=BBCA.JK,BBRI.JK — live prices for arbitrary tickers.
// Used by LivePrice client component to refresh prices every N seconds during
// market hours. Backed by fetchQuotesBatch (TradingView scanner + Yahoo v8
// fallback) with an in-memory TTL cache (60s) to stay polite to upstream.

import { NextRequest, NextResponse } from "next/server";
import { fetchQuotesBatch } from "@/lib/yahoo-finance";
import { findPrevClosesByTicker } from "@/domains/stock/stock.repository";
import { handleApiError } from "@/lib/api-error";
import { TtlCache } from "@/lib/cache";
import {
  type LiveQuoteRow,
  isLiveMarketOpen,
  buildClosedQuoteRow,
} from "@/domains/stock/live-quotes.helper";

export const dynamic = "force-dynamic";

const CACHE = new TtlCache<unknown>(300);
const TTL_MS = 60 * 1000;
const CLOSED_TTL_MS = 5 * 60 * 1000;
const MAX_TICKERS = 120;

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

    const marketOpen = isLiveMarketOpen();
    if (!marketOpen) {
      // Pre-market guard (owner 21 Okt "IHSG -0% di header"): di luar jam bursa
      // (Sen-Jum 09:00-16:15 WIB), feed Yahoo masih memantulkan harga kemarin,
      // changePercent vs EOD prev ≈ ±0.000% → live updater menimpa SSR EOD yang
      // benar (+5,65%) jadi "-0%". Solusi: luar jam pasar = kolom live null →
      // client keep server-rendered EOD (badge freshness jujur "live saat pasar buka").
      // Fase L2: TANPA fetch TradingView/Yahoo saat pasar tutup — hemat 350-500ms roundtrip.
      let eodPrev: Map<string, number> = new Map();
      let eodLatest: Map<string, number> = new Map();
      try {
        [eodPrev, eodLatest] = await Promise.all([
          findPrevClosesByTicker(tickers),
          findPrevClosesByTicker(tickers, { includeToday: true }),
        ]);
      } catch (e) {
        console.error("[LiveQuotes] EOD prev lookup failed, fallback feed prev", e);
      }

      const closed: LiveQuoteRow[] = tickers.map((ticker) =>
        buildClosedQuoteRow(ticker, eodPrev, eodLatest)
      );

      const closedPayload = { quotes: closed, ts: Date.now(), cached: "closed" };
      CACHE.set(cacheKey, closedPayload, CLOSED_TTL_MS);
      return NextResponse.json(closedPayload);
    }

    // Cabang marketOpen: jalankan paralel fetchQuotesBatch dan findPrevClosesByTicker
    let results: Awaited<ReturnType<typeof fetchQuotesBatch>> = [];
    let eodPrev: Map<string, number> = new Map();
    try {
      [results, eodPrev] = await Promise.all([
        fetchQuotesBatch(tickers),
        findPrevClosesByTicker(tickers).catch((e) => {
          console.error("[LiveQuotes] EOD prev lookup failed, fallback feed prev", e);
          return new Map<string, number>();
        }),
      ]);
    } catch (e) {
      console.error("[LiveQuotes] Batch quote fetch failed", e);
      return NextResponse.json({ quotes: [], ts: Date.now() });
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
