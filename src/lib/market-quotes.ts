import type { StockQuote } from "@/types/stock";

/**
 * TradingView Indonesia scanner — batch quote provider.
 *
 * Replaced the Yahoo v7 quote endpoint (shut for unauthenticated use ~2026-09-08:
 * "User is unable to access this feature"). The scanner returns close/change%/
 * OHLC/volume/PE/marketCap/name for 150+ tickers per POST — 950 IDX stocks in a
 * handful of requests per sweep. Values verified to match Yahoo exactly.
 *
 * Unofficial API: fail-soft (callers treat null quotes as "skip"), chunked to
 * stay polite. TODO: Yahoo v8 spark batch (no volume/OHLC) as secondary fallback
 * if TradingView ever blocks this.
 */

const SCANNER_URL = "https://scanner.tradingview.com/indonesia/scan";
const CHUNK_SIZE = 150;
const TV_COLUMNS = [
  "close", "change", "volume", "high", "low", "open",
  "price_earnings_ttm", "market_cap_basic", "description", "currency",
];

/** Map "BBCA.JK" → "IDX:BBCA" (scanner symbol space). */
function toTvSymbol(ticker: string): string {
  return `IDX:${ticker.replace(/\.JK$/i, "")}`;
}

interface TvRow { s: string; d: (number | string | null)[] }

function mapRow(ticker: string, row: TvRow): StockQuote {
  const [
    close, changePct, volume, high, low, open,
    pe, marketCap, description, currency,
  ] = row.d;
  const price = typeof close === "number" ? close : null;
  const pct = typeof changePct === "number" ? changePct : null;
  const prevClose = price !== null && pct !== null && pct !== -100
    ? price / (1 + pct / 100)
    : null;

  return {
    symbol: ticker,
    regularMarketPrice: price,
    regularMarketChange: price !== null && prevClose !== null ? price - prevClose : null,
    regularMarketChangePercent: pct,
    regularMarketVolume: typeof volume === "number" ? volume : null,
    regularMarketDayHigh: typeof high === "number" ? high : null,
    regularMarketDayLow: typeof low === "number" ? low : null,
    regularMarketOpen: typeof open === "number" ? open : null,
    regularMarketPreviousClose: prevClose,
    regularMarketTime: null, // scanner has no trade timestamp — write-guard handles dating
    currency: typeof currency === "string" ? currency : "IDR",
    marketState: "REGULAR", // placeholder — consumers gate writes via market-hours, not this
    shortName: typeof description === "string" ? description : null,
    longName: typeof description === "string" ? description : null,
    fiftyTwoWeekHigh: null,
    fiftyTwoWeekLow: null,
    marketCap: typeof marketCap === "number" ? marketCap : null,
    trailingPE: typeof pe === "number" ? pe : null,
    forwardPE: null,
    priceToBook: null,
    trailingEps: null,
    dividendYield: null,
    averageDailyVolume3Month: null,
  };
}

async function fetchChunk(tvSymbols: string[]): Promise<TvRow[]> {
  const res = await fetch(SCANNER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Origin": "https://www.tradingview.com",
      "Referer": "https://www.tradingview.com/",
    },
    body: JSON.stringify({
      symbols: { tickers: tvSymbols, query: { types: [] } },
      columns: TV_COLUMNS,
    }),
  });
  if (!res.ok) throw new Error(`TradingView scanner ${res.status}`);
  const json = (await res.json()) as { data?: TvRow[] };
  return json.data ?? [];
}

/**
 * Batch quotes for IDX tickers ("BBCA.JK" form in, StockQuote[] aligned to input
 * order — missing symbols come back with a null-ish quote (price null) so the
 * existing data-sync filters skip them naturally.
 */
export async function fetchQuotesTradingView(tickers: string[]): Promise<StockQuote[]> {
  const results = new Map<string, StockQuote>();
  const lookup = new Map<string, string>(); // tvSymbol → ticker

  const chunks: string[][] = [];
  for (let i = 0; i < tickers.length; i += CHUNK_SIZE) {
    chunks.push(tickers.slice(i, i + CHUNK_SIZE).map((t) => {
      const tv = toTvSymbol(t);
      lookup.set(tv, t);
      return tv;
    }));
  }

  // Sequential chunks (each carries 150 symbols — no need for concurrency).
  for (const chunk of chunks) {
    try {
      const rows = await fetchChunk(chunk);
      for (const row of rows) {
        const ticker = lookup.get(row.s);
        if (ticker && row.d && typeof row.d[0] === "number") {
          results.set(ticker, mapRow(ticker, row));
        }
      }
    } catch (err) {
      console.error(`[TradingView] chunk failed (${chunk[0]}…):`, err instanceof Error ? err.message : err);
    }
  }

  return tickers.map((t) => results.get(t) ?? mapRow(t, { s: toTvSymbol(t), d: [null, null, null, null, null, null, null, null, null, null] }));
}
