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

    // Pre-market guard (owner 21 Okt "IHSG -0% di header"): di luar jam bursa
    // (Sen-Jum 09:00-16:15 WIB), feed Yahoo masih memantulkan harga kemarin,
    // changePercent vs EOD prev ≈ ±0.000% → live updater menimpa SSR EOD yang
    // benar (+5,65%) jadi "-0%". Solusi: luar jam pasar = kolom live null →
    // client keep server-rendered EOD (badge freshness jujur "live saat pasar buka").
    const nowWib = new Date(Date.now() + 7 * 3600_000);
    const wibDay = nowWib.getUTCDay(); // 0=Min .. 6=Sab
    const wibMinutes = nowWib.getUTCHours() * 60 + nowWib.getUTCMinutes();
    const marketOpen =
      wibDay >= 1 && wibDay <= 5 && wibMinutes >= 9 * 60 && wibMinutes <= 16 * 60 + 15;
    if (!marketOpen) {
      const closed: LiveQuoteRow[] = results.map(({ ticker }) => ({
        ticker,
        // Porto/dashboards eksternal butuh ANGKA (bukan null) saat tutup → kirim EOD prev
        // sebagai harga (pembeli live-price null-safe). changePercent TETAP null supaya
        // client live-updater tidak menimpa SSR EOD (fix IHSG -0%, owner 21 Okt).
        price: eodPrev.get(ticker) ?? null,
        change: null,
        changePercent: null,
        volume: null,
        dayHigh: null,
        dayLow: null,
        open: null,
        prevClose: eodPrev.get(ticker) ?? null,
        marketState: "CLOSED_WIB",
      }));
      const closedPayload = { quotes: closed, ts: Date.now() };
      CACHE.set(cacheKey, closedPayload, TTL_MS);
      return NextResponse.json(closedPayload);
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
