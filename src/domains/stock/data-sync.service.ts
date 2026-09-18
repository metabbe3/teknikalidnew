import { fetchQuote, fetchQuotesBatch } from "@/lib/yahoo-finance";
import { SITE_URL } from "@/lib/constants";
import { qstash } from "@/lib/queue";
import { stockRepository } from "./stock.repository";
import { technicalAnalysisService } from "./technical-analysis.service";
import { pushActivity } from "@/lib/activity-log";
import { stockAlertService } from "./stock-alert.service";
import { prisma } from "@/lib/prisma";

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** The TradingView scanner (market-quotes.ts) carries no trade timestamp
 * (regularMarketTime is always null, marketState is hardcoded 'REGULAR'), and it
 * re-serves the last session's data with full volume outside exchange hours. The
 * old POSTPOST filter + quote-time stamping therefore never fire, and the
 * 5-minute intraday cron mints fantasy rows stamped with the wall-clock date —
 * 865 rows dated Sunday 2026-09-13 (from 17:02) and Monday 14 Sep pre-market
 * (00:00–08:59). So writing is only allowed Mon–Fri 09:00–18:00 WIB (session
 * 09:00–16:15 plus the EOD sync buffer at 16:30/17:00); outside that window the
 * data would be re-served last-session quotes. Holidays are NOT covered — see
 * TODO in the filter below. */
function isWibWriteWindow(): boolean {
  const wib = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const day = wib.getUTCDay();
  if (day === 0 || day === 6) return false;
  const mins = wib.getUTCHours() * 60 + wib.getUTCMinutes();
  return mins >= 9 * 60 && mins <= 18 * 60;
}

function buildPriceItems(
  quoteResults: { ticker: string; quote: { regularMarketPrice?: number | null; regularMarketOpen?: number | null; regularMarketPreviousClose?: number | null; regularMarketDayHigh?: number | null; regularMarketDayLow?: number | null; regularMarketVolume?: number | null; regularMarketTime?: number | null } | null }[],
  stockLookup: Map<string, { id: number }>,
) {
  if (!isWibWriteWindow()) return [];
  return quoteResults
    .filter((r): r is { ticker: string; quote: NonNullable<typeof r.quote> } => {
      if (!r.quote) return false;
      if (r.quote.regularMarketPrice === null) return false;
      // Skip stale data — no real trading. ^JKSE is the exception: the index
      // comes from the v8 chart fallback, which carries no volume (indices
      // report 0), so a missing volume passes it through while everything
      // else needs a real traded volume. TODO(holidays): the scanner re-serves
      // the last session's data on IDX holidays too; weekends are caught above,
      // holidays would mint same-shape dup rows (~18 days/yr) — needs an IDX
      // holiday calendar or a cross-check against the last stored row date.
      if (!r.quote.regularMarketVolume) {
        if (r.ticker !== "^JKSE") return false;
      } else if (r.quote.regularMarketVolume < 100) return false;
      // Only skip truly post-market data; volume filter handles weekends/holidays
      const ms = (r.quote as Record<string, unknown>).marketState;
      if (ms === "POSTPOST") return false;
      return true;
    })
    .map((r) => {
      const stock = stockLookup.get(r.ticker);
      if (!stock) return null;
      const price = r.quote.regularMarketPrice!;
      // Stamp with the QUOTE's market time, not wall clock. On weekends/holidays
      // Yahoo re-serves Friday's quote; a wall-clock date minted exact-duplicate
      // Sat/Sun rows (~85k contaminated rows, compressed every indicator window).
      // With quote-time stamping a weekend cron run upserts into the real trading
      // date instead — a no-op.
      const marketTime = r.quote.regularMarketTime;
      const date = marketTime && marketTime > 0 ? new Date(marketTime * 1000) : new Date();
      return {
        stockId: stock.id,
        date,
        open: r.quote.regularMarketOpen ?? r.quote.regularMarketPreviousClose ?? price,
        high: r.quote.regularMarketDayHigh ?? price,
        low: r.quote.regularMarketDayLow ?? price,
        close: price,
        volume: BigInt(Math.round(r.quote.regularMarketVolume ?? 0)),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
}

function buildFundamentalItems(
  quoteResults: { ticker: string; quote: { trailingPE?: number | null; forwardPE?: number | null; priceToBook?: number | null; trailingEps?: number | null; dividendYield?: number | null; marketCap?: number | null } | null }[],
  stockLookup: Map<string, { id: number }>,
) {
  return quoteResults
    .filter((r): r is { ticker: string; quote: NonNullable<typeof r.quote> } => r.quote !== null)
    .map((r) => {
      const stock = stockLookup.get(r.ticker);
      if (!stock) return null;
      return {
        stockId: stock.id,
        date: new Date(),
        pe: r.quote.trailingPE ?? null,
        forwardPe: r.quote.forwardPE ?? null,
        pb: r.quote.priceToBook ?? null,
        eps: r.quote.trailingEps ?? null,
        dividendYield: r.quote.dividendYield ?? null,
        marketCap: BigInt(Math.round(r.quote.marketCap ?? 0)),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
}

export const dataSyncService = {
  async syncEndOfDayData(tickers?: string[]) {
    // IDX equities only — crypto has its own Indodax refresh path; Yahoo fetch would corrupt it.
    const allTickers = tickers ?? (await stockRepository.findActiveStocks())
      .filter((s) => s.assetClass !== "CRYPTO")
      .map((s) => s.ticker);
    const startTime = Date.now();

    const stocks = await stockRepository.findStocksByTickers(allTickers);
    const stockLookup = new Map(stocks.map((s) => [s.ticker, s]));

    const indicatorAccumulator: { stockId: number; date: Date; interval: string; data: Record<string, unknown> }[] = [];
    let pricesWritten = 0;
    let failures = 0;

    for (let i = 0; i < allTickers.length; i += BATCH_SIZE) {
      const batch = allTickers.slice(i, i + BATCH_SIZE);
      const quoteResults = await fetchQuotesBatch(batch);
      const priceItems = buildPriceItems(quoteResults, stockLookup);

      try {
        const written = await stockRepository.batchUpsertTodayPrices(priceItems);
        pricesWritten += written;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`[DataSync]   Batch price write failed — ${msg}`);
      }

      const fundamentalItems = buildFundamentalItems(quoteResults, stockLookup);
      try {
        await stockRepository.batchUpsertFundamentals(fundamentalItems);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`[DataSync]   Batch fundamental write failed — ${msg}`);
      }

      const indicatorResults = await Promise.all(
        batch.map(async (ticker) => {
          const stock = stockLookup.get(ticker);
          try {
            return await technicalAnalysisService.calculateIndicators(ticker, stock?.id);
          } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error(`[DataSync]   ${ticker}: indicator calc failed — ${msg}`);
            failures++;
            return null;
          }
        }),
      );

      for (const result of indicatorResults) {
        if (result) indicatorAccumulator.push(result);
      }

      if (i + BATCH_SIZE < allTickers.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    let indicatorsWritten = 0;
    try {
      indicatorsWritten = await stockRepository.batchUpsertIndicators(indicatorAccumulator);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[DataSync] Indicator bulk write failed — ${msg}`);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Safety net: ^JKSE is the one series the daily brief cannot lose, and it is
    // also the one quote that rides the v8 fallback (no volume). If the batch
    // still dropped it, write a minimal row from a single-quote fetch.
    try {
      const wibDateKey = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const jkse = stockLookup.get("^JKSE");
      const hasToday = jkse
        ? await prisma.stockPrice.findFirst({
            where: { stockId: jkse.id, date: new Date(`${wibDateKey}T00:00:00Z`) },
            select: { id: true },
          })
        : null;
      if (jkse && !hasToday && isWibWriteWindow()) {
        const quote = await fetchQuote("^JKSE");
        const price = quote.regularMarketPrice;
        if (price != null) {
          await stockRepository.batchUpsertTodayPrices([
            {
              stockId: jkse.id,
              date:
                quote.regularMarketTime && quote.regularMarketTime > 0
                  ? new Date(quote.regularMarketTime * 1000)
                  : new Date(),
              open: quote.regularMarketOpen ?? quote.regularMarketPreviousClose ?? price,
              high: quote.regularMarketDayHigh ?? price,
              low: quote.regularMarketDayLow ?? price,
              close: price,
              volume: BigInt(0),
            },
          ]);
          console.error(`[JKSE-SafetyNet] wrote missing ^JKSE price for ${wibDateKey}`);
        }
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[JKSE-SafetyNet] failed — ${msg}`);
    }

    pushActivity({
      action: `EOD Sync — ${allTickers.length} tickers, ${pricesWritten} prices, ${indicatorsWritten} indicators`,
      timestamp: new Date().toISOString(),
      duration: Number(elapsed),
      status: failures === 0 ? "success" : "failed",
      metadata: { tickers: allTickers.length, pricesWritten, indicatorsWritten, failures },
    });
  },

  async processBatch(tickers: string[]) {
    const startTime = Date.now();

    const stocks = await stockRepository.findStocksByTickers(tickers);
    const stockLookup = new Map(stocks.map((s) => [s.ticker, s]));

    const [quoteResults, indicatorItems] = await Promise.all([
      fetchQuotesBatch(tickers),
      Promise.all(
        tickers.map(async (ticker) => {
          const stock = stockLookup.get(ticker);
          try {
            return await technicalAnalysisService.calculateIndicators(ticker, stock?.id);
          } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error(`[DataSync]   ${ticker}: indicator calc failed — ${msg}`);
            return null;
          }
        }),
      ),
    ]);

    const priceItems = buildPriceItems(quoteResults, stockLookup);
    const validIndicators = indicatorItems.filter((r): r is NonNullable<typeof r> => r !== null);

    const result = await stockRepository.batchUpsertPricesAndIndicators(priceItems, validIndicators);

    const fundamentalItems = buildFundamentalItems(quoteResults, stockLookup);
    await stockRepository.batchUpsertFundamentals(fundamentalItems);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    pushActivity({
      action: `Queue Batch — ${tickers.join(", ")}`,
      timestamp: new Date().toISOString(),
      duration: Number(elapsed),
      status: "success",
      metadata: { prices: result.prices, indicators: result.indicators },
    });

    return result;
  },

  async syncIntradayPrices(tickers: string[]) {
    const startTime = Date.now();

    const stocks = await stockRepository.findStockIdsByTickers(tickers);
    const stockLookup = new Map(stocks.map((s) => [s.ticker, s]));

    const quoteResults = await fetchQuotesBatch(tickers);
    const priceItems = buildPriceItems(quoteResults, stockLookup);

    const written = await stockRepository.batchUpsertTodayPrices(priceItems);

    // Only recalculate indicators for stocks that had a price update (non-zero volume)
    const updatedTickers = priceItems
      .filter((p) => p.volume > BigInt(0))
      .map((p) => tickers.find((t) => stockLookup.get(t)?.id === p.stockId))
      .filter((t): t is string => !!t);

    // Recalculate indicators in parallel batches
    let indicatorsUpdated = 0;
    for (let i = 0; i < updatedTickers.length; i += BATCH_SIZE) {
      const batch = updatedTickers.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((ticker) => technicalAnalysisService.calculateAndSaveIndicators(ticker)),
      );
      for (const r of results) {
        if (r.status === "rejected") {
          console.error(`[DataSync]   indicator recalc failed — ${r.reason}`);
        } else {
          indicatorsUpdated++;
        }
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    try {
      await stockAlertService.checkAlerts(updatedTickers);
    } catch {
      console.error("[DataSync] Stock alert check failed");
    }

    pushActivity({
      action: `Intraday Sync — ${tickers.length} tickers, ${written} prices, ${indicatorsUpdated} indicators`,
      timestamp: new Date().toISOString(),
      duration: Number(elapsed),
      status: "success",
      metadata: { tickers: tickers.length, prices: written, indicators: indicatorsUpdated },
    });

    return written;
  },

  async syncIntradayHotList() {
    const allStocks = (await stockRepository.findActiveStocks())
      .filter((s) => s.assetClass !== "CRYPTO")
      .map((s) => s.ticker);

    const written = await this.syncIntradayPrices(allStocks);
    return { tickers: allStocks.length, prices: written };
  },

  async dispatchEndOfDaySync(tickers: string[]) {
    let dispatched = 0;

    for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
      const batch = tickers.slice(i, i + BATCH_SIZE);

      await qstash.publishJSON({
        url: `${SITE_URL}/api/queue/process-batch`,
        body: { batch },
      });

      dispatched++;

      if (i + BATCH_SIZE < tickers.length) await sleep(200);
    }

    return dispatched;
  },
};
