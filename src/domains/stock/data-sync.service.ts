import { fetchQuotesBatch } from "@/lib/yahoo-finance";
import { SITE_URL } from "@/lib/constants";
import { qstash } from "@/lib/queue";
import { stockRepository } from "./stock.repository";
import { technicalAnalysisService } from "./technical-analysis.service";
import { pushActivity } from "@/lib/activity-log";
import { stockAlertService } from "./stock-alert.service";

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPriceItems(
  quoteResults: { ticker: string; quote: { regularMarketPrice?: number | null; regularMarketOpen?: number | null; regularMarketPreviousClose?: number | null; regularMarketDayHigh?: number | null; regularMarketDayLow?: number | null; regularMarketVolume?: number | null } | null }[],
  stockLookup: Map<string, { id: number }>,
) {
  return quoteResults
    .filter((r): r is { ticker: string; quote: NonNullable<typeof r.quote> } => {
      if (!r.quote) return false;
      if (r.quote.regularMarketPrice === null) return false;
      // Skip stale data on weekends/holidays — no real trading
      if (!r.quote.regularMarketVolume || r.quote.regularMarketVolume < 100) return false;
      // Only skip truly post-market data; volume filter handles weekends/holidays
      const ms = (r.quote as Record<string, unknown>).marketState;
      if (ms === "POSTPOST") return false;
      return true;
    })
    .map((r) => {
      const stock = stockLookup.get(r.ticker);
      if (!stock) return null;
      const price = r.quote.regularMarketPrice!;
      return {
        stockId: stock.id,
        date: new Date(),
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
    const allTickers = tickers ?? (await stockRepository.findActiveStocks()).map((s) => s.ticker);
    console.log(`[DataSync] Starting EOD sync for ${allTickers.length} tickers...`);
    const startTime = Date.now();

    const stocks = await stockRepository.findStocksByTickers(allTickers);
    const stockLookup = new Map(stocks.map((s) => [s.ticker, s]));

    const indicatorAccumulator: { stockId: number; date: Date; interval: string; data: Record<string, unknown> }[] = [];
    let pricesWritten = 0;
    let failures = 0;

    for (let i = 0; i < allTickers.length; i += BATCH_SIZE) {
      const batch = allTickers.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(allTickers.length / BATCH_SIZE);
      console.log(`[DataSync] Batch ${batchNum}/${totalBatches}: ${batch.join(", ")}`);

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
    console.log(`[DataSync] Complete in ${elapsed}s — ${pricesWritten} prices, ${indicatorsWritten} indicators, ${failures} failures`);

    pushActivity({
      action: `EOD Sync — ${allTickers.length} tickers, ${pricesWritten} prices, ${indicatorsWritten} indicators`,
      timestamp: new Date().toISOString(),
      duration: Number(elapsed),
      status: failures === 0 ? "success" : "failed",
      metadata: { tickers: allTickers.length, pricesWritten, indicatorsWritten, failures },
    });
  },

  async processBatch(tickers: string[]) {
    console.log(`[DataSync] Processing batch of ${tickers.length}: ${tickers.join(", ")}`);
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
    console.log(`[DataSync] Batch complete in ${elapsed}s — ${result.prices} prices, ${result.indicators} indicators`);

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
    console.log(`[DataSync] Intraday sync for ${tickers.length} tickers...`);
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
    console.log(`[DataSync] Intraday complete in ${elapsed}s — ${written} prices, ${indicatorsUpdated} indicators updated`);

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
    const allStocks = (await stockRepository.findActiveStocks()).map((s) => s.ticker);

    const written = await this.syncIntradayPrices(allStocks);
    return { tickers: allStocks.length, prices: written };
  },

  async dispatchEndOfDaySync(tickers: string[]) {
    let dispatched = 0;

    console.log(`[DataSync] Dispatching ${tickers.length} tickers in batches of ${BATCH_SIZE}...`);

    for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
      const batch = tickers.slice(i, i + BATCH_SIZE);

      await qstash.publishJSON({
        url: `${SITE_URL}/api/queue/process-batch`,
        body: { batch },
      });

      dispatched++;
      console.log(`[DataSync] Dispatched batch ${dispatched}: ${batch.join(", ")}`);

      if (i + BATCH_SIZE < tickers.length) await sleep(200);
    }

    console.log(`[DataSync] Dispatched ${dispatched} batches for ${tickers.length} tickers`);
    return dispatched;
  },
};
