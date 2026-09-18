import YahooFinance from "yahoo-finance2";
import { fetchQuotesTradingView } from "@/lib/market-quotes";
import pLimit from "p-limit";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { toDateKey } from "@/lib/utils";
import { TtlCache } from "@/lib/cache";
import type { StockQuote, OHLCV } from "@/types/stock";

const yahooFinance = new YahooFinance({ suppressNotices: ["ripHistorical", "yahooSurvey"] });
const limit = pLimit(1);

const memoryCache = new TtlCache<unknown>(200);

const QUOTE_TTL_MS = 5 * 60 * 1000;
const HISTORICAL_TTL_MS = 60 * 60 * 1000;
const HISTORICAL_DB_TTL_MS = 24 * 60 * 60 * 1000;

const QuoteSchema = z
  .object({
    symbol: z.string(),
    regularMarketPrice: z.number().nullable().optional(),
    regularMarketChange: z.number().nullable().optional(),
    regularMarketChangePercent: z.number().nullable().optional(),
    regularMarketVolume: z.number().nullable().optional(),
    regularMarketTime: z.number().nullable().optional(),
    regularMarketDayHigh: z.number().nullable().optional(),
    regularMarketDayLow: z.number().nullable().optional(),
    regularMarketOpen: z.number().nullable().optional(),
    regularMarketPreviousClose: z.number().nullable().optional(),
    currency: z.string().optional(),
    marketState: z.string(),
    shortName: z.string().optional(),
    longName: z.string().optional(),
    fiftyTwoWeekHigh: z.number().nullable().optional(),
    fiftyTwoWeekLow: z.number().nullable().optional(),
    marketCap: z.number().nullable().optional(),
    trailingPE: z.number().nullable().optional(),
    forwardPE: z.number().nullable().optional(),
    priceToBook: z.number().nullable().optional(),
    trailingEps: z.number().nullable().optional(),
    dividendYield: z.number().nullable().optional(),
    bookValue: z.number().nullable().optional(),
    averageDailyVolume3Month: z.number().nullable().optional(),
  })
  .passthrough();

const HistoricalRowSchema = z
  .object({
    date: z.union([z.date(), z.string()]),
    open: z.number(),
    high: z.number(),
    low: z.number(),
    close: z.number(),
    volume: z.number(),
    adjClose: z.number().optional(),
  })
  .passthrough();

const ChartQuoteSchema = z
  .object({
    date: z.union([z.date(), z.string()]),
    open: z.number().nullable(),
    high: z.number().nullable(),
    low: z.number().nullable(),
    close: z.number().nullable(),
    volume: z.number().nullable(),
    adjclose: z.number().nullable().optional(),
  })
  .passthrough();

async function fetchWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const err = error as { response?: { status?: number }; message?: string; name?: string };
      const is429 =
        err?.response?.status === 429 ||
        err?.message?.includes("429") ||
        err?.name === "FailedYahooValidationError";
      if (!is429 || attempt === maxRetries) throw error;
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Unreachable");
}


async function getDbCache<T>(key: string): Promise<T | null> {
  const row = await prisma.cachedApiCall.findUnique({ where: { cacheKey: key } });
  if (row && row.expiresAt > new Date()) return row.data as T;
  return null;
}

async function setDbCache(key: string, data: unknown, ttlMs: number): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlMs);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsonData = data as any;
  await prisma.cachedApiCall.upsert({
    where: { cacheKey: key },
    update: { data: jsonData, fetchedAt: new Date(), expiresAt },
    create: { cacheKey: key, data: jsonData, fetchedAt: new Date(), expiresAt },
  });
}

async function cachedFetch<T>(
  cacheKey: string,
  ttlMs: number,
  dbTtlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const memResult = memoryCache.get(cacheKey);
  if (memResult !== undefined) return memResult as T;

  const dbResult = await getDbCache<T>(cacheKey);
  if (dbResult !== null) {
    memoryCache.set(cacheKey, dbResult, ttlMs);
    return dbResult;
  }

  const result = await limit(() => fetchWithRetry(fetcher));
  memoryCache.set(cacheKey, result, ttlMs);
  await setDbCache(cacheKey, result, dbTtlMs);
  return result;
}

function normalizePriceToBook(raw: number | null | undefined, price: number | null | undefined, bookValue: number | null | undefined): number | null {
  if (raw != null && raw < 100) return raw;
  if (price != null && bookValue != null && bookValue > 0) return price / bookValue;
  return null;
}

/**
 * Yahoo v8 chart-meta quote — fallback for tickers the TradingView scanner
 * doesn't cover (indices like ^JKSE return totalCount 0 there). Uncached:
 * rare path, and callers already cache their own results. The last daily bar
 * of the same response also enriches the quote with OHLC — bar values are
 * authoritative over the meta day ranges when present. Indices report bar
 * volume 0, which is left absent on purpose so downstream no-volume guards
 * see "missing", not junk.
 */
async function fetchQuoteV8(ticker: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=2d&interval=1d`,
      {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      chart?: { result?: Array<{ meta?: Record<string, unknown>; indicators?: { quote?: Array<Record<string, unknown>> } }> };
    };
    const result = body.chart?.result?.[0];
    const meta = result?.meta;
    if (!meta) return null;

    const price = typeof meta.regularMarketPrice === "number" ? meta.regularMarketPrice : null;
    const prevClose =
      typeof meta.chartPreviousClose === "number" ? meta.chartPreviousClose :
      typeof meta.previousClose === "number" ? meta.previousClose : null;
    const changePercent =
      typeof meta.regularMarketChangePercent === "number" ? meta.regularMarketChangePercent :
      price != null && prevClose != null && prevClose !== 0 ? ((price - prevClose) / prevClose) * 100 : null;
    const change = price != null && prevClose != null ? price - prevClose : null;
    const shortName =
      typeof meta.shortName === "string" ? meta.shortName :
      typeof meta.longName === "string" ? meta.longName : null;
    const fullExchangeName = typeof meta.fullExchangeName === "string" ? meta.fullExchangeName : null;

    const symbol = typeof meta.symbol === "string" ? meta.symbol : ticker;
    const quote: Record<string, unknown> = {
      symbol,
      marketState: typeof meta.marketState === "string" ? meta.marketState : "REGULAR",
    };
    if (price != null) quote.regularMarketPrice = price;
    if (change != null) quote.regularMarketChange = change;
    if (changePercent != null) quote.regularMarketChangePercent = changePercent;
    if (prevClose != null) quote.regularMarketPreviousClose = prevClose;
    if (typeof meta.regularMarketTime === "number") quote.regularMarketTime = meta.regularMarketTime;
    if (typeof meta.currency === "string") quote.currency = meta.currency;
    if (shortName != null) quote.shortName = shortName;
    if (fullExchangeName != null) quote.longName = `${symbol} (${fullExchangeName})`;

    // Enrich with OHLCV from the last daily bar of this same response.
    const bars = result?.indicators?.quote?.[0] as
      | { open?: unknown[]; high?: unknown[]; low?: unknown[]; close?: unknown[]; volume?: unknown[] }
      | undefined;
    const closes = bars?.close;
    let lastBar = -1;
    if (Array.isArray(closes)) {
      for (let i = closes.length - 1; i >= 0; i--) {
        if (typeof closes[i] === "number" && Number.isFinite(closes[i])) {
          lastBar = i;
          break;
        }
      }
    }
    if (lastBar >= 0 && bars) {
      const finiteOrUndef = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
      const open = finiteOrUndef(bars.open?.[lastBar]);
      const high = finiteOrUndef(bars.high?.[lastBar]);
      const low = finiteOrUndef(bars.low?.[lastBar]);
      const volume = finiteOrUndef(bars.volume?.[lastBar]);
      if (open != null) quote.regularMarketOpen = open;
      if (high != null) quote.regularMarketDayHigh = high;
      if (low != null) quote.regularMarketDayLow = low;
      // Indices report volume 0 — keep absent so no-volume guards see "missing".
      if (volume != null && volume > 0) quote.regularMarketVolume = volume;
    }
    return quote;
  } catch {
    return null;
  }
}

export async function fetchQuote(ticker: string): Promise<StockQuote> {
  const cacheKey = `yf:quote:${ticker}`;
  // Yahoo v7 quote endpoint shut (~2026-09-08) — quotes come from the TradingView
  // batch scanner now; cachedFetch still handles memory+DB caching below.
  const raw = await cachedFetch(cacheKey, QUOTE_TTL_MS, QUOTE_TTL_MS, () =>
    fetchQuotesTradingView([ticker]).then((q) => q[0] as unknown as Record<string, unknown>)
  );

  const parsed = QuoteSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid quote data for ${ticker}: ${parsed.error.message}`);
  }
  let d = parsed.data;

  // TradingView scanner serves no indices (^JKSE → totalCount 0 → null price).
  // Retry those via Yahoo v8 chart meta before giving up on a price.
  if (d.regularMarketPrice == null) {
    const v8 = await fetchQuoteV8(ticker);
    const v8Parsed = v8 ? QuoteSchema.safeParse(v8) : null;
    if (v8Parsed?.success) d = v8Parsed.data;
  }

  return {
    symbol: d.symbol,
    regularMarketPrice: d.regularMarketPrice ?? null,
    regularMarketChange: d.regularMarketChange ?? null,
    regularMarketChangePercent: d.regularMarketChangePercent ?? null,
    regularMarketVolume: d.regularMarketVolume ?? null,
    regularMarketTime: d.regularMarketTime ?? null,
    regularMarketDayHigh: d.regularMarketDayHigh ?? null,
    regularMarketDayLow: d.regularMarketDayLow ?? null,
    regularMarketOpen: d.regularMarketOpen ?? null,
    regularMarketPreviousClose: d.regularMarketPreviousClose ?? null,
    currency: d.currency ?? null,
    marketState: d.marketState,
    shortName: d.shortName ?? null,
    longName: d.longName ?? null,
    fiftyTwoWeekHigh: d.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: d.fiftyTwoWeekLow ?? null,
    marketCap: d.marketCap ?? null,
    trailingPE: d.trailingPE ?? null,
    forwardPE: d.forwardPE ?? null,
    priceToBook: normalizePriceToBook(d.priceToBook, d.regularMarketPrice, d.bookValue),
    trailingEps: d.trailingEps ?? ((d.regularMarketPrice != null && d.trailingPE != null && d.trailingPE > 0) ? d.regularMarketPrice / d.trailingPE : null),
    dividendYield: (d.dividendYield != null && d.dividendYield < 1) ? d.dividendYield * 100 : (d.dividendYield ?? null),
    averageDailyVolume3Month: d.averageDailyVolume3Month ?? null,
  };
}

export async function fetchQuotesBatch(tickers: string[]) {
  // Yahoo v7 quote endpoint shut ~2026-09-08 (Unauthorized for all tickers) —
  // batch quotes come from the TradingView scanner instead (150/POST, verified
  // value-identical to Yahoo). Same return shape as before.
  const quotes = await fetchQuotesTradingView(tickers);

  const results = quotes.map((quote, i) => {
    try {
      return { ticker: tickers[i], quote: QuoteSchema.parse(quote) };
    } catch {
      console.error(`[MarketQuotes] Batch quote parse failed for ${tickers[i]}`);
      return { ticker: tickers[i], quote: null };
    }
  });

  // Patch null/priceless entries (indices the scanner misses) via Yahoo v8.
  for (const entry of results) {
    if (entry.quote != null && entry.quote.regularMarketPrice != null) continue;
    const v8 = await fetchQuoteV8(entry.ticker);
    if (!v8) continue;
    const v8Parsed = QuoteSchema.safeParse(v8);
    if (v8Parsed.success) {
      entry.quote = v8Parsed.data;
      console.info(`[MarketQuotes] v8 chart fallback used for ${entry.ticker}`);
    }
  }

  return results;
}

export async function fetchHistorical(
  ticker: string,
  period1: Date,
  period2?: Date
): Promise<OHLCV[]> {
  const p1 = toDateKey(period1);
  const p2 = toDateKey(period2 ?? new Date());
  const cacheKey = `yf:hist:${ticker}:${p1}:${p2}`;

  const raw = await cachedFetch(cacheKey, HISTORICAL_TTL_MS, HISTORICAL_DB_TTL_MS, () =>
    yahooFinance.historical(ticker, { period1, period2 })
  );

  const parsed = z.array(HistoricalRowSchema).safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid historical data for ${ticker}: ${parsed.error.message}`);
  }

  return parsed.data.map((row) => ({
    date: typeof row.date === "string" ? new Date(row.date) : row.date,
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    volume: row.volume,
    adjClose: row.adjClose,
  }));
}

export async function fetchChart(
  ticker: string,
  options: { period1: Date | string; period2?: Date | string; interval?: "1d" | "1wk" | "1mo" | "1m" | "5m" | "15m" | "30m" | "60m" | "1h" | "5d" | "3mo" }
): Promise<OHLCV[]> {
  const interval = options.interval ?? "1d";
  const p1 = toDateKey(new Date(options.period1));
  const p2 = toDateKey(options.period2 ? new Date(options.period2) : new Date());
  const cacheKey = `yf:chart:${ticker}:${interval}:${p1}:${p2}`;

  const raw = await cachedFetch(cacheKey, HISTORICAL_TTL_MS, HISTORICAL_DB_TTL_MS, () =>
    yahooFinance.chart(ticker, {
      period1: options.period1,
      period2: options.period2,
      interval,
    })
  );

  const result = raw as { quotes: unknown[] };
  const quotes = z.array(ChartQuoteSchema).parse(result.quotes ?? []);

  return quotes
    .filter((q) => q.close !== null)
    .map((q) => ({
      date: typeof q.date === "string" ? new Date(q.date) : q.date,
      open: q.open ?? 0,
      high: q.high ?? 0,
      low: q.low ?? 0,
      close: q.close!,
      volume: q.volume ?? 0,
      adjClose: q.adjclose ?? undefined,
    }));
}
