import { subDays } from "date-fns";
import { fetchHistorical, fetchQuote, fetchChart } from "@/lib/yahoo-finance";
import { computeChange, bigIntToNumber, decimalToNumber, serializePriceRow, serializeIndicator } from "@/lib/serialize";
import { INTERVAL, RANGE_DAYS, type DateRange, type IntradayInterval, INTRADAY_CONFIG } from "@/lib/constants";
import { toDateKey } from "@/lib/utils";
import { getCompareColor } from "@/lib/compare-colors";
import { stockRepository } from "./stock.repository";
import { technicalAnalysisService } from "./technical-analysis.service";
import { StockNotFoundError } from "./stock.errors";
import { stockCache } from "@/lib/cache";
import { getMarketStatusWithFallback, type MarketStatusResult } from "@/lib/market-hours";
import pLimit from "p-limit";
import type { Prisma } from "@/generated/prisma/client";

type PriceRow = { close: Prisma.Decimal; volume: bigint };

function dedupeStalePrices<T extends PriceRow>(prices: T[]): T[] {
  if (prices.length <= 1) return prices;
  const result = [prices[0]];
  for (let i = 1; i < prices.length; i++) {
    const prev = result[result.length - 1];
    if (prices[i].close.equals(prev.close) && prices[i].volume === prev.volume) continue;
    result.push(prices[i]);
  }
  return result;
}

export interface StockListRow {
  ticker: string;
  name: string;
  sector: string;
  listingBoard: string | null;
  close: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  rsi14: number | null;
  sma20: number | null;
}

function serializeIndicatorOrNull(indicator: Awaited<ReturnType<typeof stockRepository.findLatestIndicator>>) {
  if (!indicator) return null;
  return serializeIndicator(indicator);
}

async function fetchStockBase(ticker: string, priceTake: number) {
  const stock = await stockRepository.findStockByTicker(ticker);
  if (!stock) throw new StockNotFoundError(ticker);

  const [rawPrices, week52, indicator, prevIndicator] = await Promise.all([
    stockRepository.findLatestTradingPrices(stock.id, priceTake),
    stockRepository.getWeek52HighLow(stock.id),
    stockRepository.findLatestIndicator(stock.id, INTERVAL.DAY),
    stockRepository.findPrevIndicator(stock.id, INTERVAL.DAY),
  ]);

  const prices = dedupeStalePrices(rawPrices).slice(0, priceTake);

  const latest = prices[0];
  const prev = prices[1];
  const { close, prevClose, change, changePercent } = computeChange(latest, prev);

  return { stock, prices, latest, prev, prevClose, close, change, changePercent, week52, indicator, prevIndicator };
}

export interface StockOgData {
  ticker: string;
  name: string;
  sector: string;
  close: number | null;
  change: number | null;
  changePercent: number | null;
  signalLabel: string | null;
  rsi14: number | null;
  macdHist: number | null;
  smaStatus: string;
  isGorengan: boolean;
  volume: number | null;
  sparkline: number[];
  // Extra indicators (for Story card)
  stochK: number | null;
  stochD: number | null;
  adx: number | null;
  atr: number | null;
  supertrend: number | null;
  bbUpper: number | null;
  bbLower: number | null;
  obvTrend: string | null;
  // Trading plan
  tradingStrategy: string | null;
  entryPrice: number | null;
  tp1: number | null;
  tp1Source: string;
  tp2: number | null;
  sl: number | null;
  slSource: string;
  riskReward: number | null;
  confidence: string | null;
  tradingWarning: string | null;
}

export interface StockDetailBatchItem {
  stock: { id: number; ticker: string; name: string; sector: string };
  close: number | null;
  change: number | null;
  changePercent: number | null;
  week52High: number | null;
  week52Low: number | null;
  volume: number | null;
}

export const stockMarketService = {
  async getStockDetailsBatch(tickers: string[]): Promise<Record<string, StockDetailBatchItem>> {
    if (tickers.length === 0) return {};

    const stocks = await stockRepository.findStocksByTickers(tickers);
    const week52Map = await stockRepository.batchGetWeek52HighLow(stocks.map((s) => s.id));

    const entries = stocks.map((s) => {
      const prices = dedupeStalePrices(s.prices);
      const latest = prices[0];
      const prev = prices[1];
      const { close, change, changePercent } = computeChange(latest, prev);
      const w52 = week52Map.get(s.id);

      return [s.ticker, {
        stock: { id: s.id, ticker: s.ticker, name: s.name, sector: s.sector },
        close,
        change,
        changePercent,
        week52High: w52?.high52 ?? null,
        week52Low: w52?.low52 ?? null,
        volume: latest ? bigIntToNumber(latest.volume) : null,
      }] as const;
    });

    return Object.fromEntries(entries);
  },

  async getStockBatchWithIndicators(tickers: string[]) {
    if (tickers.length === 0) return [];

    const stocks = await stockRepository.findStocksByTickersWithIndicators(tickers);

    return stocks.map((s) => {
      const prices = dedupeStalePrices(s.prices);
      const latest = prices[0];
      const prev = prices[1];
      const { close, change, changePercent } = computeChange(latest, prev);
      const indicator = s.indicators?.[0];

      return {
        ticker: s.ticker,
        name: s.name,
        sector: s.sector,
        close,
        change,
        changePercent,
        volume: latest ? bigIntToNumber(latest.volume) : null,
        rsi14: indicator ? decimalToNumber(indicator.rsi14) : null,
        sma20: indicator ? decimalToNumber(indicator.sma20) : null,
      };
    });
  },

  async getStockList(sector?: string): Promise<StockListRow[]> {
    const cacheKey = `stock-list:${sector ?? "all"}`;
    const cached = stockCache.get(cacheKey);
    if (cached) return cached as StockListRow[];

    const stocks = await stockRepository.findActiveStocksWithPrices(sector ? { sector } : undefined);

    const result = stocks.map((stock) => {
      const prices = dedupeStalePrices(stock.prices);
      const { close, change, changePercent } = computeChange(prices[0], prices[1]);
      const indicator = stock.indicators?.[0];

      return {
        ticker: stock.ticker,
        name: stock.name,
        sector: stock.sector,
        listingBoard: stock.listingBoard ?? null,
        close,
        change,
        changePercent,
        volume: prices[0] ? bigIntToNumber(prices[0].volume) : null,
        rsi14: indicator ? decimalToNumber(indicator.rsi14) : null,
        sma20: indicator ? decimalToNumber(indicator.sma20) : null,
      };
    });

    stockCache.set(cacheKey, result, 300_000);
    return result;
  },

  async getStockDetail(ticker: string) {
    const base = await fetchStockBase(ticker, 2);

    return {
      stock: { id: base.stock.id, ticker: base.stock.ticker, name: base.stock.name, sector: base.stock.sector },
      latest: {
        open: base.latest ? decimalToNumber(base.latest.open) : null,
        high: base.latest ? decimalToNumber(base.latest.high) : null,
        low: base.latest ? decimalToNumber(base.latest.low) : null,
        close: base.close,
        volume: base.latest ? bigIntToNumber(base.latest.volume) : null,
        date: base.latest?.date ?? null,
      },
      prevClose: base.prevClose,
      close: base.close,
      change: base.change,
      changePercent: base.changePercent,
      week52High: decimalToNumber(base.week52._max.high),
      week52Low: decimalToNumber(base.week52._min.low),
      indicator: serializeIndicatorOrNull(base.indicator),
    };
  },

  async getStockDetailForPage(ticker: string) {
    const base = await fetchStockBase(ticker, 21);

    return {
      stock: {
        id: base.stock.id, ticker: base.stock.ticker, name: base.stock.name, sector: base.stock.sector,
        logo: base.stock.logo, industry: base.stock.industry, subIndustry: base.stock.subIndustry,
        subSector: base.stock.subSector, listingBoard: base.stock.listingBoard,
        listingDate: base.stock.listingDate, address: base.stock.address,
        phone: base.stock.phone, email: base.stock.email, website: base.stock.website,
        businessActivity: base.stock.businessActivity,
        listedShares: base.stock.listedShares,
        foreignOwnershipPercent: base.stock.foreignOwnershipPercent,
        isinCode: base.stock.isinCode,
      },
      prices: base.prices,
      latest: base.latest,
      prevClose: base.prevClose,
      close: base.close,
      change: base.change,
      changePercent: base.changePercent,
      week52High: decimalToNumber(base.week52._max.high),
      week52Low: decimalToNumber(base.week52._min.low),
      indicator: serializeIndicatorOrNull(base.indicator),
      prevIndicator: serializeIndicatorOrNull(base.prevIndicator),
    };
  },

  async getStockOgData(ticker: string): Promise<StockOgData> {
    const base = await fetchStockBase(ticker, 31);
    const indicator = serializeIndicatorOrNull(base.indicator);

    // Serialize sparkline prices (last 30, oldest first)
    const sparkline = base.prices
      .slice(0, 30)
      .map((p) => decimalToNumber(p.close))
      .filter((v): v is number => v !== null)
      .reverse();

    // Build SMA status
    let smaStatus = "Netral";
    if (base.close !== null && indicator) {
      if (indicator.sma20 !== null && base.close > indicator.sma20) smaStatus = "Di Atas SMA20";
      else if (indicator.sma50 !== null && base.close > indicator.sma50) smaStatus = "Di Atas SMA50";
      else if (indicator.sma50 !== null && base.close < indicator.sma50) smaStatus = "Di Bawah SMA50";
      else if (indicator.sma20 !== null && base.close < indicator.sma20) smaStatus = "Di Bawah SMA20";
    }

    // Generate trading plan
    const latestHigh = base.latest ? decimalToNumber(base.latest.high) : null;
    const latestLow = base.latest ? decimalToNumber(base.latest.low) : null;
    const tradingPlan = (base.close !== null && latestHigh !== null)
      ? technicalAnalysisService.generateTradingPlan({
          currentPrice: base.close,
          high: latestHigh,
          low: latestLow ?? base.close,
          close: base.close,
          prevClose: base.prevClose ?? base.close,
          atr: indicator?.atr ?? null,
          rsi14: indicator?.rsi14 ?? null,
          sma20: indicator?.sma20 ?? null,
          sma50: indicator?.sma50 ?? null,
          sma200: indicator?.sma200 ?? null,
          macdHist: indicator?.macdHist ?? null,
          supertrend: indicator?.supertrend ?? null,
          obvTrend: indicator?.obvTrend ?? null,
          stochK: indicator?.stochK ?? null,
          stochD: indicator?.stochD ?? null,
          adx: indicator?.adx ?? null,
        })
      : null;

    const strategyMap: Record<string, string> = {
      MARKET_ENTRY: "Market Entry",
      BUY_ON_WEAKNESS: "Buy on Weakness",
      WAIT_AND_SEE: "Wait & See",
    };

    return {
      ticker: base.stock.ticker,
      name: base.stock.name,
      sector: base.stock.sector ?? "",
      close: base.close,
      change: base.change,
      changePercent: base.changePercent,
      signalLabel: indicator?.signalLabel ?? null,
      rsi14: indicator?.rsi14 ?? null,
      macdHist: indicator?.macdHist ?? null,
      smaStatus,
      isGorengan: indicator?.isGorengan ?? false,
      volume: base.latest ? bigIntToNumber(base.latest.volume) : null,
      sparkline,
      stochK: indicator?.stochK ?? null,
      stochD: indicator?.stochD ?? null,
      adx: indicator?.adx ?? null,
      atr: indicator?.atr ?? null,
      supertrend: indicator?.supertrend ?? null,
      bbUpper: indicator?.bbUpper ?? null,
      bbLower: indicator?.bbLower ?? null,
      obvTrend: indicator?.obvTrend ?? null,
      tradingStrategy: tradingPlan ? strategyMap[tradingPlan.strategy] ?? tradingPlan.strategy : null,
      entryPrice: tradingPlan?.entry ?? null,
      tp1: tradingPlan?.tp1 ?? null,
      tp1Source: tradingPlan?.tp1Source ?? "",
      tp2: tradingPlan?.tp2 ?? null,
      sl: tradingPlan?.sl ?? null,
      slSource: tradingPlan?.slSource ?? "",
      riskReward: tradingPlan?.riskReward ?? null,
      confidence: tradingPlan?.confidence ?? null,
      tradingWarning: tradingPlan?.warnings[0] ?? tradingPlan?.suggestion ?? null,
    };
  },

  async getStockHistory(ticker: string, days: number) {
    const period1 = subDays(new Date(), days);
    const prices = await stockRepository.findPricesByTicker(ticker, { date: { gte: period1 } });

    if (prices.length === 0) throw new StockNotFoundError(ticker);

    return prices.map(serializePriceRow);
  },

  async getStockIntradayHistory(ticker: string, interval: IntradayInterval, days: number) {
    const stock = await stockRepository.findStockByTicker(ticker);
    if (!stock) throw new StockNotFoundError(ticker);

    const period1 = subDays(new Date(), days);
    const raw = await fetchChart(ticker, {
      period1,
      period2: new Date(),
      interval,
    });

    return raw.map((row) => ({
      date: (() => {
        const ms = row.date instanceof Date ? row.date.getTime() : new Date(row.date).getTime();
        // Shift UTC→WIB (+7h) so TradingView (which treats all times as UTC) shows Jakarta time
        return Math.floor((ms + 7 * 3600 * 1000) / 1000);
      })(),
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
      volume: row.volume,
      adjClose: row.adjClose ?? null,
    }));
  },

  async getMarketOverview(): Promise<{
    gainers: { ticker: string; name: string; sector: string; close: number | null; changePercent: number }[];
    losers: { ticker: string; name: string; sector: string; close: number | null; changePercent: number }[];
    sectors: Record<string, { avgChange: number; count: number }>;
  }> {
    const cached = stockCache.get("market-overview");
    if (cached) return cached as Awaited<ReturnType<typeof this.getMarketOverview>>;

    const stocks = await stockRepository.findActiveStocksWithPrices(undefined, false);

    type StockChange = { ticker: string; name: string; sector: string; close: number | null; changePercent: number | null };
    const stockChanges: StockChange[] = stocks.map((stock) => {
      const prices = dedupeStalePrices(stock.prices);
      const { close, changePercent } = computeChange(prices[0], prices[1]);
      return { ticker: stock.ticker, name: stock.name, sector: stock.sector, close, changePercent };
    });

    const withChange = stockChanges.filter((s): s is StockChange & { changePercent: number } => s.changePercent !== null);

    const gainers = [...withChange].sort((a, b) => b.changePercent - a.changePercent).slice(0, 5);
    const gainerSet = new Set(gainers.map((g) => g.ticker));
    const losers = [...withChange]
      .filter((s) => !gainerSet.has(s.ticker))
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 5);

    const sectorMap = new Map<string, { total: number; sum: number }>();
    for (const s of withChange) {
      const existing = sectorMap.get(s.sector) ?? { total: 0, sum: 0 };
      existing.total++;
      existing.sum += s.changePercent;
      sectorMap.set(s.sector, existing);
    }

    const sectors: Record<string, { avgChange: number; count: number }> = {};
    for (const [sector, { total, sum }] of sectorMap) {
      sectors[sector] = { avgChange: Number((sum / total).toFixed(2)), count: total };
    }

    const result = { gainers, losers, sectors };
    stockCache.set("market-overview", result, 300_000);
    return result;
  },

  async getSparklines(): Promise<Record<string, number[]>> {
    const cached = stockCache.get("sparklines");
    if (cached) return cached as Record<string, number[]>;

    const since = new Date(Date.now() - 10 * 86400000);
    const prices = await stockRepository.getSparklineData(since);

    const grouped: Record<string, number[]> = {};
    for (const p of prices) {
      const close = decimalToNumber(p.close);
      if (close === null) continue;
      const ticker = p.stock.ticker;
      if (!grouped[ticker]) grouped[ticker] = [];
      grouped[ticker].push(close);
    }

    const sparklines: Record<string, number[]> = {};
    for (const [ticker, arr] of Object.entries(grouped)) {
      sparklines[ticker] = arr.slice(-7);
    }

    stockCache.set("sparklines", sparklines, 300_000);
    return sparklines;
  },

  async stockExists(ticker: string): Promise<boolean> {
    const stock = await stockRepository.findStockByTicker(ticker);
    return !!stock;
  },

  getLatestPriceDate() {
    return stockRepository.getLatestPriceDate();
  },

  async getMarketStatusForPage() {
    const [marketStatus, latestPrice] = await Promise.all([
      getMarketStatusWithFallback(),
      stockRepository.getLatestPriceDate(),
    ]);
    return { marketStatus, latestPrice };
  },

  async backfillStock(ticker: string, days = 500): Promise<number> {
    const stock = await stockRepository.findStockByTicker(ticker);
    if (!stock) throw new StockNotFoundError(ticker);

    const period1 = subDays(new Date(), days);
    const rows = await fetchHistorical(ticker, period1, new Date());

    if (rows.length === 0) return 0;

    return stockRepository.batchUpsertPrices(stock.id, rows);
  },

  async updateLatestPrice(ticker: string): Promise<void> {
    const stock = await stockRepository.findStockByTicker(ticker);
    if (!stock) throw new StockNotFoundError(ticker);

    const quote = await fetchQuote(ticker);
    const price = quote.regularMarketPrice;
    if (price === null) {
      console.warn(`No price data for ${ticker} (marketState: ${quote.marketState})`);
      return;
    }

    const today = new Date();
    await stockRepository.upsertStockPrice(stock.id, today, {
      open: quote.regularMarketOpen ?? quote.regularMarketPreviousClose ?? price,
      high: quote.regularMarketDayHigh ?? price,
      low: quote.regularMarketDayLow ?? price,
      close: price,
      volume: BigInt(Math.round(quote.regularMarketVolume ?? 0)),
    });
  },

  async updateAllStocks(): Promise<void> {
    const stocks = await stockRepository.findActiveStocks();
    console.log(`Updating prices for ${stocks.length} stocks...`);

    const limit = pLimit(5);
    let done = 0;
    const results = await Promise.allSettled(
      stocks.map((stock) => limit(async () => {
        console.log(`[${++done}/${stocks.length}] ${stock.ticker}`);
        await this.updateLatestPrice(stock.ticker);
      }))
    );

    const failures = results.filter((r) => r.status === "rejected").length;
    if (failures > 0) console.error(`${failures} stocks failed to update`);
  },

  async getCompareData(tickers: string[], range: DateRange) {
    const days = RANGE_DAYS[range];
    const period1 = subDays(new Date(), days);

    const stocks = await stockRepository.findStocksByTickers(tickers);
    if (stocks.length === 0) throw new StockNotFoundError(tickers.join(","));

    const stockIds = stocks.map((s) => s.id);

    // Batch queries instead of N+1
    const [week52Map, yearStartMap, avgVolumeMap] = await Promise.all([
      stockRepository.batchGetWeek52HighLow(stockIds),
      stockRepository.batchGetYearStartPrices(stockIds),
      stockRepository.findAvgVolumeByStockIds(stockIds),
    ]);

    const perStockData = await Promise.all(
      stocks.map(async (s) => {
        const [priceHistory, indicator, fundamental] = await Promise.all([
          stockRepository.findPricesByTicker(s.ticker, { date: { gte: period1 } }),
          stockRepository.findLatestIndicator(s.id, INTERVAL.DAY),
          stockRepository.findLatestFundamental(s.id),
        ]);
        return { stockId: s.id, priceHistory, indicator, fundamental };
      }),
    );

    const results = stocks.map((s, idx) => {
      const prices = dedupeStalePrices(s.prices);
      const latest = prices[0];
      const prev = prices[1];
      const { close, prevClose, change, changePercent } = computeChange(latest, prev);
      const w52 = week52Map.get(s.id);
      const perStock = perStockData[idx];

      const history = (() => {
        if (!perStock?.priceHistory.length) return [];
        const firstClose = decimalToNumber(perStock.priceHistory[0].close) ?? 0;
        return perStock.priceHistory.map((p) => {
          const pClose = decimalToNumber(p.close) ?? 0;
          return {
            time: toDateKey(p.date),
            value: firstClose !== 0 ? Number((((pClose - firstClose) / firstClose) * 100).toFixed(2)) : 0,
          };
        });
      })();

      const indicatorData = perStock?.indicator ? serializeIndicator(perStock.indicator) : null;

      const tradingPlan = latest && close
        ? technicalAnalysisService.generateTradingPlan({
            currentPrice: close,
            high: decimalToNumber(latest.high) ?? close,
            low: decimalToNumber(latest.low) ?? close,
            close,
            prevClose: prevClose ?? close,
            atr: indicatorData?.atr ?? null,
            rsi14: indicatorData?.rsi14 ?? null,
            sma20: indicatorData?.sma20 ?? null,
            sma50: indicatorData?.sma50 ?? null,
            sma200: indicatorData?.sma200 ?? null,
            macdHist: indicatorData?.macdHist ?? null,
            supertrend: indicatorData?.supertrend ?? null,
            obvTrend: indicatorData?.obvTrend ?? null,
            stochK: indicatorData?.stochK ?? null,
            stochD: indicatorData?.stochD ?? null,
            adx: indicatorData?.adx ?? null,
          })
        : null;

      const jan1Close = yearStartMap.get(s.id);
      const ytdReturn = jan1Close && close ? ((close - jan1Close) / jan1Close) * 100 : null;

      return {
        stockId: s.id,
        ticker: s.ticker,
        name: s.name,
        sector: s.sector,
        color: getCompareColor(idx),
        close,
        change,
        changePercent,
        volume: latest ? bigIntToNumber(latest.volume) : null,
        open: latest ? decimalToNumber(latest.open) : null,
        high: latest ? decimalToNumber(latest.high) : null,
        low: latest ? decimalToNumber(latest.low) : null,
        prevClose,
        week52High: w52?.high52 ?? null,
        week52Low: w52?.low52 ?? null,
        history,
        indicators: indicatorData,
        fundamentals: perStock?.fundamental
          ? {
              pe: decimalToNumber(perStock.fundamental.pe),
              forwardPe: decimalToNumber(perStock.fundamental.forwardPe),
              pb: decimalToNumber(perStock.fundamental.pb),
              eps: decimalToNumber(perStock.fundamental.eps),
              dividendYield: decimalToNumber(perStock.fundamental.dividendYield),
              marketCap: bigIntToNumber(perStock.fundamental.marketCap),
            }
          : null,
        tradingPlan,
        avgVolume: avgVolumeMap.get(s.id) ?? null,
        ytdReturn,
      };
    });

    return results;
  },
};
