import YahooFinance from "yahoo-finance2";
import pLimit from "p-limit";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { toDateKey } from "@/lib/utils";
import type { StockQuote, OHLCV } from "@/types/stock";

const yahooFinance = new YahooFinance({ suppressNotices: ["ripHistorical", "yahooSurvey"] });
const limit = pLimit(1);

const memoryCache = new Map<string, { data: unknown; expiresAt: number }>();

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

function getMemoryCache<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.data as T;
  if (entry) memoryCache.delete(key);
  return null;
}

function setMemoryCache(key: string, data: unknown, ttlMs: number): void {
  if (memoryCache.size >= 200) {
    const now = Date.now();
    for (const [k, v] of memoryCache) {
      if (v.expiresAt <= now) memoryCache.delete(k);
    }
    if (memoryCache.size >= 200) {
      const oldest = [...memoryCache.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt)[0];
      if (oldest) memoryCache.delete(oldest[0]);
    }
  }
  memoryCache.set(key, { data, expiresAt: Date.now() + ttlMs });
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
  const memResult = getMemoryCache<T>(cacheKey);
  if (memResult !== null) return memResult;

  const dbResult = await getDbCache<T>(cacheKey);
  if (dbResult !== null) {
    setMemoryCache(cacheKey, dbResult, ttlMs);
    return dbResult;
  }

  const result = await limit(() => fetchWithRetry(fetcher));
  setMemoryCache(cacheKey, result, ttlMs);
  await setDbCache(cacheKey, result, dbTtlMs);
  return result;
}

function normalizePriceToBook(raw: number | null | undefined, price: number | null | undefined, bookValue: number | null | undefined): number | null {
  if (raw != null && raw < 100) return raw;
  if (price != null && bookValue != null && bookValue > 0) return price / bookValue;
  return null;
}

export async function fetchQuote(ticker: string): Promise<StockQuote> {
  const cacheKey = `yf:quote:${ticker}`;
  const raw = await cachedFetch(cacheKey, QUOTE_TTL_MS, QUOTE_TTL_MS, () =>
    yahooFinance.quote(ticker)
  );

  const parsed = QuoteSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid quote data for ${ticker}: ${parsed.error.message}`);
  }
  const d = parsed.data;

  return {
    symbol: d.symbol,
    regularMarketPrice: d.regularMarketPrice ?? null,
    regularMarketChange: d.regularMarketChange ?? null,
    regularMarketChangePercent: d.regularMarketChangePercent ?? null,
    regularMarketVolume: d.regularMarketVolume ?? null,
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
  const BATCH_SIZE = 50;
  const allResults: unknown[] = [];

  for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
    const batch = tickers.slice(i, i + BATCH_SIZE);
    const batchResults = await limit(() => fetchWithRetry(() => yahooFinance.quote(batch)));
    allResults.push(...batchResults);
  }

  return allResults.map((raw: unknown, i: number) => {
    try {
      return { ticker: tickers[i], quote: QuoteSchema.parse(raw) };
    } catch {
      console.error(`[YahooFinance] Batch quote parse failed for ${tickers[i]}`);
      return { ticker: tickers[i], quote: null };
    }
  });
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
