import { subDays } from "date-fns";
import { toDateKey, formatRp } from "@/lib/utils";
import { decimalToNumber, bigIntToNumber, computeChange } from "@/lib/serialize";
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateStochastic,
  calculateATR,
  calculateADX,
  calculateVWAP,
  calculatePivotPoints,
  resolveMacdLine,
  calculateOBV,
  classifyObvTrend,
  calculateSupertrend,
  detectSwingPoints,
  classifyMarketStructure,
} from "@/lib/indicators";
import type { TradingPlan } from "@/lib/trading-plan";
import type { SwingPoint, MarketStructure } from "@/lib/indicators";
import {
  translateRSI,
  translateMACD,
  translateStochastic,
  translateSMA,
  translateEMA,
  translateADX,
  translateSupertrend,
  translateOBV,
  translateVWAP,
} from "@/lib/indicator-translations";
import type { Prisma } from "@/generated/prisma/client";
import { INTERVAL } from "@/lib/constants";
import { stockRepository } from "./stock.repository";
import { StockNotFoundError } from "./stock.errors";
import { roundToIdxFraction, getAraArbLimits } from "./idx-rules";
import pLimit from "p-limit";

const VOLUME_SPIKE_MULTIPLIER = 3;

const VALID_PRESETS = new Set([
  "rsi_oversold", "rsi_overbought", "volume_spike",
  "golden_cross", "death_cross", "macd_bullish",
  "above_sma200", "below_sma200", "bb_squeeze",
  "hype_alert",
  "obv_accumulation", "obv_distribution",
  "supertrend_bullish", "supertrend_bearish",
  "stoch_oversold", "stoch_overbought",
  "adx_trending", "adx_weak",
  "undervalued", "high_dividend", "blue_chip", "value_growth",
  "bb_lower_touch", "volume_spike_low", "pullback_sma20",
  "ema_cross", "stoch_overbought_breakout",
]);

type PresetKey = typeof VALID_PRESETS extends Set<infer T> ? T : never;

function detectCrossover(
  fast: (number | null)[],
  slow: (number | null)[],
  prices: { date: Date }[],
  bullishSignal: string,
  bearishSignal: string,
) {
  const len = fast.length;
  for (let i = len - 1; i >= 1; i--) {
    const currFast = fast[i], currSlow = slow[i], prevFast = fast[i - 1], prevSlow = slow[i - 1];
    if (currFast === null || currSlow === null || prevFast === null || prevSlow === null) continue;
    if (prevFast < prevSlow && currFast >= currSlow) return { signal: bullishSignal, date: prices[i].date };
    if (prevFast > prevSlow && currFast <= currSlow) return { signal: bearishSignal, date: prices[i].date };
  }
  return { signal: null as string | null, date: null as Date | null };
}

function buildIndicatorWhere(preset: PresetKey, date: Date) {
  const base = { interval: "1d" as const, date, stock: { isActive: true } };
  switch (preset) {
    case "rsi_oversold": return { ...base, rsi14: { lt: 30 } };
    case "rsi_overbought": return { ...base, rsi14: { gt: 70 } };
    case "golden_cross": return { ...base, smaCrossSignal: "golden_cross" };
    case "death_cross": return { ...base, smaCrossSignal: "death_cross" };
    case "macd_bullish": return { ...base, macdHist: { gt: 0 } };
    case "above_sma200": return { ...base, sma200: { not: null } };
    case "below_sma200": return { ...base, sma200: { not: null } };
    case "bb_squeeze": return { ...base, bbUpper: { not: null }, bbMiddle: { not: null }, bbLower: { not: null } };
    case "obv_accumulation": return { ...base, obvTrend: "Accumulation" };
    case "obv_distribution": return { ...base, obvTrend: "Distribution" };
    case "supertrend_bullish": return { ...base, supertrend: { not: null } };
    case "supertrend_bearish": return { ...base, supertrend: { not: null } };
    case "stoch_oversold": return { ...base, stochK: { lt: 20 } };
    case "stoch_overbought": return { ...base, stochK: { gt: 80 } };
    case "adx_trending": return { ...base, adx: { gt: 25 } };
    case "adx_weak": return { ...base, adx: { lt: 20 } };
    case "bb_lower_touch": return { ...base, bbLower: { not: null }, bbMiddle: { not: null } };
    case "pullback_sma20": return { ...base, sma20: { not: null }, sma50: { not: null } };
    case "ema_cross": return { ...base, emaCrossSignal: "bullish" };
    case "stoch_overbought_breakout": return { ...base, stochK: { gt: 80 }, adx: { gt: 20 } };
    default: return base;
  }
}

const EMPTY_INDICATOR_RESULT = {
  dates: [] as string[], sma20: [] as (number | null)[], sma50: [] as (number | null)[],
  rsi14: [] as (number | null)[], macd: { line: [] as (number | null)[], signal: [] as (number | null)[], histogram: [] as (number | null)[] },
  bb: { upper: [] as (number | null)[], middle: [] as (number | null)[], lower: [] as (number | null)[] },
  stochK: [] as (number | null)[], stochD: [] as (number | null)[], adx: [] as (number | null)[],
  vwap: [] as (number | null)[], atr: [] as (number | null)[], sma200: [] as (number | null)[],
  ema12: [] as (number | null)[], ema26: [] as (number | null)[],
  obv: [] as (number | null)[], supertrend: [] as (number | null)[],
  swingPoints: [] as { type: "HIGH" | "LOW"; price: number; date: string }[],
  marketStructure: "CONSOLIDATION" as const,
  unconfirmedLeg: null as null,
};

export const technicalAnalysisService = {
  async getIndicatorSeries(ticker: string, days: number) {
    const stock = await stockRepository.findStockByTicker(ticker);
    if (!stock) throw new StockNotFoundError(ticker);

    const startDate = subDays(new Date(), days);
    const prices = await stockRepository.findPricesByTicker(ticker, { date: { gte: startDate } });

    if (prices.length === 0) throw new StockNotFoundError(ticker);
    if (prices.length < 20) {
      return { ...EMPTY_INDICATOR_RESULT };
    }

    const dates = prices.map((p) => toDateKey(p.date));
    const closes = prices.map((p) => Number(p.close));
    const highs = prices.map((p) => Number(p.high));
    const lows = prices.map((p) => Number(p.low));
    const volumes = prices.map((p) => Number(p.volume));

    const sma20 = calculateSMA(closes, 20);
    const sma50 = calculateSMA(closes, 50);
    const sma200 = calculateSMA(closes, 200);
    const ema12 = calculateEMA(closes, 12);
    const ema26 = calculateEMA(closes, 26);
    const rsi14 = calculateRSI(closes, 14);
    const macdResult = calculateMACD(closes);
    const bbResult = calculateBollingerBands(closes, 20, 2);
    const stochResult = calculateStochastic(closes, highs, lows, 14, 3);
    const atrResult = calculateATR(highs, lows, closes, 14);
    const adxResult = calculateADX(highs, lows, closes, 14);
    const vwapResult = calculateVWAP(closes, volumes, highs, lows);
    const obvResult = calculateOBV(closes, volumes);
    const supertrendResult = calculateSupertrend(closes, highs, lows);

    const smaCross = detectCrossover(sma50, sma200, prices, "golden_cross", "death_cross");
    const emaCross = detectCrossover(ema12, ema26, prices, "bullish", "bearish");

    const swings = detectSwingPoints({ highs, lows, atr: atrResult });
    const marketStructure = classifyMarketStructure(swings);
    const swingPoints = swings
      .map((sw) => ({ type: sw.type, price: sw.price, date: dates[sw.index] }))
      .filter((sp, i, arr) => i === 0 || sp.date !== arr[i - 1].date);

    const lastSwing = swings.length > 0 ? swings[swings.length - 1] : null;
    const unconfirmedLeg = lastSwing
      ? { type: lastSwing.type === "HIGH" ? "LOW" as const : "HIGH" as const, price: closes[closes.length - 1], date: dates[dates.length - 1] }
      : null;

    return {
      dates,
      sma20,
      sma50,
      sma200,
      ema12,
      ema26,
      rsi14,
      macd: {
        line: macdResult.map((m) => m ? resolveMacdLine(m) : null),
        signal: macdResult.map((m) => m?.signal ?? null),
        histogram: macdResult.map((m) => m?.histogram ?? null),
      },
      bb: {
        upper: bbResult.map((b) => b?.upper ?? null),
        middle: bbResult.map((b) => b?.middle ?? null),
        lower: bbResult.map((b) => b?.lower ?? null),
      },
      stochK: stochResult.map((s) => s?.k ?? null),
      stochD: stochResult.map((s) => s?.d ?? null),
      adx: adxResult,
      vwap: vwapResult,
      atr: atrResult,
      obv: obvResult,
      obvTrend: classifyObvTrend(obvResult),
      supertrend: supertrendResult,
      smaCrossSignal: smaCross.signal,
      smaCrossDate: smaCross.date,
      emaCrossSignal: emaCross.signal,
      emaCrossDate: emaCross.date,
      swingPoints,
      marketStructure,
      unconfirmedLeg,
    };
  },

  async calculateIndicators(ticker: string, stockId?: number): Promise<{
    stockId: number;
    date: Date;
    interval: string;
    data: Record<string, unknown>;
  } | null> {
    let resolvedStockId = stockId;
    if (!resolvedStockId) {
      const stock = await stockRepository.findStockByTicker(ticker);
      if (!stock) throw new StockNotFoundError(ticker);
      resolvedStockId = stock.id;
    }

    const prices = await stockRepository.findPrices(resolvedStockId, { orderBy: "asc", take: -250 });
    if (prices.length < 20) {
      console.warn(`Not enough data for ${ticker} (${prices.length} rows, need 20+)`);
      return null;
    }

    const closes = prices.map((p) => p.close.toNumber());
    const highs = prices.map((p) => p.high.toNumber());
    const lows = prices.map((p) => p.low.toNumber());
    const volumes = prices.map((p) => Number(p.volume));

    const sma20 = calculateSMA(closes, 20);
    const sma50 = calculateSMA(closes, 50);
    const sma200 = calculateSMA(closes, 200);
    const ema12 = calculateEMA(closes, 12);
    const ema26 = calculateEMA(closes, 26);
    const rsi14 = calculateRSI(closes, 14);
    const macdResult = calculateMACD(closes);
    const bbResult = calculateBollingerBands(closes, 20, 2);
    const stochResult = calculateStochastic(closes, highs, lows, 14, 3);
    const atrResult = calculateATR(highs, lows, closes, 14);
    const adxResult = calculateADX(highs, lows, closes, 14);
    const vwapResult = calculateVWAP(closes, volumes, highs, lows);
    const obvResult = calculateOBV(closes, volumes);
    const supertrendResult = calculateSupertrend(closes, highs, lows);

    const last = closes.length - 1;
    const date = prices[last].date;

    const lastMacd = macdResult[last];
    const lastBb = bbResult[last];
    const lastStoch = stochResult[last];

    const smaCross = detectCrossover(sma50, sma200, prices, "golden_cross", "death_cross");
    const emaCross = detectCrossover(ema12, ema26, prices, "bullish", "bearish");

    return {
      stockId: resolvedStockId,
      date,
      interval: INTERVAL.DAY,
      data: {
        sma20: sma20[last],
        sma50: sma50[last],
        sma200: sma200[last],
        ema12: ema12[last],
        ema26: ema26[last],
        rsi14: rsi14[last],
        macdLine: resolveMacdLine(lastMacd),
        macdSignal: lastMacd?.signal ?? null,
        macdHist: lastMacd?.histogram ?? null,
        bbUpper: lastBb?.upper ?? null,
        bbMiddle: lastBb?.middle ?? null,
        bbLower: lastBb?.lower ?? null,
        stochK: lastStoch?.k ?? null,
        stochD: lastStoch?.d ?? null,
        adx: adxResult[last],
        vwap: vwapResult[last],
        atr: atrResult[last],
        obv: obvResult[last],
        obvTrend: classifyObvTrend(obvResult),
        supertrend: supertrendResult[last],
        smaCrossSignal: smaCross.signal,
        smaCrossDate: smaCross.date,
        emaCrossSignal: emaCross.signal,
        emaCrossDate: emaCross.date,
      },
    };
  },

  async calculateAndSaveIndicators(ticker: string): Promise<void> {
    const result = await this.calculateIndicators(ticker);
    if (!result) return;

    const data = { ...result.data };

    // Compute signal score
    const signal = computeSignalScore({
      price: data.sma20 as number | null ? (data.sma20 as number) : null,
      sma20: data.sma20 as number | null,
      sma50: data.sma50 as number | null,
      sma200: data.sma200 as number | null,
      ema12: data.ema12 as number | null,
      ema26: data.ema26 as number | null,
      rsi14: data.rsi14 as number | null,
      macdHist: data.macdHist as number | null,
      stochK: data.stochK as number | null,
      stochD: data.stochD as number | null,
      adx: data.adx as number | null,
      supertrend: data.supertrend as number | null,
      obvTrend: data.obvTrend as string | null,
      vwap: data.vwap as number | null,
    });
    data.signalScore = signal.score;
    data.signalLabel = signal.label;

    await stockRepository.upsertStockIndicator(result.stockId, result.date, result.interval, data);

    // Compute gorengan flag separately (needs price + volume data)
    const latestPrice = await stockRepository.findLatestPrice(result.stockId);
    if (latestPrice) {
      const price = Number(latestPrice.close);
      const high = Number(latestPrice.high);
      const low = Number(latestPrice.low);
      const volume = Number(latestPrice.volume);
      const sma200 = data.sma200 as number | null;

      const avgVolRows = await stockRepository.findAvgVolumeByStockIds([result.stockId]);
      const avgVolume = avgVolRows.get(result.stockId) ?? null;

      const fund = await stockRepository.findLatestMarketCap(result.stockId);
      const marketCap = fund?.marketCap ? Number(fund.marketCap) : null;

      const isGorengan = detectGorengan({
        price, high, low, sma200, volume, avgVolume20d: avgVolume, marketCap,
      });

      await stockRepository.updateIndicatorGorengan(
        result.stockId,
        result.date,
        result.interval,
        isGorengan
      );
    }
  },

  async calculateAllIndicators(): Promise<void> {
    const stocks = await stockRepository.findActiveStocks();
    console.log(`Calculating indicators for ${stocks.length} stocks...`);

    const limit = pLimit(5);
    let done = 0;
    const results = await Promise.allSettled(
      stocks.map((stock) => limit(async () => {
        console.log(`[${++done}/${stocks.length}] ${stock.ticker}`);
        await this.calculateAndSaveIndicators(stock.ticker);
      }))
    );

    const failures = results.filter((r) => r.status === "rejected").length;
    if (failures > 0) console.error(`${failures} stocks failed indicator calculation`);
  },

  async screenerQuery(preset: string) {
    if (!VALID_PRESETS.has(preset)) return { error: "Invalid preset" };

    const latestDateRow = await stockRepository.getLatestIndicatorDate();
    if (!latestDateRow) return [];
    const latestDate = latestDateRow.date;

    if (preset === "volume_spike") {
      const rows = await stockRepository.findVolumeSpikes(latestDate, VOLUME_SPIKE_MULTIPLIER);
      return rows.map((r) => ({
        ticker: r.ticker, name: r.name, sector: r.sector,
        close: Number(r.close),
        changePercent: r.prev_close ? ((Number(r.close) - Number(r.prev_close)) / Number(r.prev_close)) * 100 : null,
        volume: Number(r.volume),
        rsi14: r.rsi14 ? Number(r.rsi14) : null,
        sma20: r.sma20 ? Number(r.sma20) : null,
      }));
    }

    if (preset === "volume_spike_low") {
      const rows = await stockRepository.findVolumeSpikes(latestDate, VOLUME_SPIKE_MULTIPLIER);
      return rows
        .filter((r) => {
          const changePct = r.prev_close ? ((Number(r.close) - Number(r.prev_close)) / Number(r.prev_close)) : 0;
          return changePct < 0;
        })
        .map((r) => ({
          ticker: r.ticker, name: r.name, sector: r.sector,
          close: Number(r.close),
          changePercent: r.prev_close ? ((Number(r.close) - Number(r.prev_close)) / Number(r.prev_close)) * 100 : null,
          volume: Number(r.volume),
          rsi14: r.rsi14 ? Number(r.rsi14) : null,
          sma20: r.sma20 ? Number(r.sma20) : null,
        }));
    }

    if (preset === "hype_alert") {
      const rows = await stockRepository.findHypeAlerts(latestDate);
      return rows
        .filter((r) => {
          const vol = Number(r.volume);
          const avgVol = Number(r.avg_volume);
          const volRatio = avgVol > 0 ? vol / avgVol : 0;
          const changePct = r.prev_close ? ((Number(r.close) - Number(r.prev_close)) / Number(r.prev_close)) : 0;
          return volRatio >= 2 && changePct > 0.05;
        })
        .map((r) => ({
          ticker: r.ticker, name: r.name, sector: r.sector,
          close: Number(r.close),
          changePercent: r.prev_close ? ((Number(r.close) - Number(r.prev_close)) / Number(r.prev_close)) * 100 : null,
          volume: Number(r.volume),
          rsi14: r.rsi14 ? Number(r.rsi14) : null,
        }));
    }

    const FUNDAMENTAL_PRESETS = new Set(["undervalued", "high_dividend", "blue_chip", "value_growth"]);
    if (FUNDAMENTAL_PRESETS.has(preset)) {
      const queryMap: Record<string, (d: Date) => Promise<unknown[]>> = {
        undervalued: (d) => stockRepository.findUndervalued(d),
        high_dividend: (d) => stockRepository.findHighDividend(d),
        blue_chip: (d) => stockRepository.findBlueChip(d),
        value_growth: (d) => stockRepository.findValueGrowth(d),
      };
      const rows = await queryMap[preset]!(latestDate);
      return (rows as { ticker: string; name: string; sector: string; close: number; pe: number | null; pb: number | null; eps: number | null; dividendYield: number | null; marketCap: bigint }[]).map((r) => ({
        ticker: r.ticker, name: r.name, sector: r.sector,
        close: Number(r.close),
        pe: r.pe, pb: r.pb, eps: r.eps,
        dividendYield: r.dividendYield,
        marketCap: bigIntToNumber(r.marketCap),
      }));
    }

    const where = buildIndicatorWhere(preset as PresetKey, latestDate);
    const results = await stockRepository.findIndicatorsByDate(latestDate, where);

    let stocks = results.map((r) => {
      const prices = r.stock.prices;
      const { close, changePercent } = computeChange(prices[0], prices[1]);
      return {
        ticker: r.stock.ticker, name: r.stock.name, sector: r.stock.sector,
        close, changePercent,
        volume: prices[0] ? bigIntToNumber(prices[0].volume) : null,
        rsi14: decimalToNumber(r.rsi14),
        sma20: decimalToNumber(r.sma20),
        smaCrossSignal: r.smaCrossSignal,
        emaCrossSignal: r.emaCrossSignal,
        sma200: decimalToNumber(r.sma200),
      };
    });

    const indicatorMap = new Map(results.map((r) => [r.stock.ticker, r]));

    if (preset === "above_sma200") {
      stocks = stocks.filter((s) => s.close !== null && s.sma200 !== null && s.close > s.sma200);
    } else if (preset === "below_sma200") {
      stocks = stocks.filter((s) => s.close !== null && s.sma200 !== null && s.close < s.sma200);
    } else if (preset === "bb_squeeze") {
      stocks = stocks.filter((s) => {
        const si = indicatorMap.get(s.ticker);
        if (!si) return false;
        const upper = decimalToNumber(si.bbUpper);
        const lower = decimalToNumber(si.bbLower);
        const middle = decimalToNumber(si.bbMiddle);
        return upper !== null && lower !== null && middle !== null && middle > 0 && (upper - lower) / middle < 0.05;
      });
    } else if (preset === "supertrend_bullish") {
      stocks = stocks.filter((s) => {
        const si = indicatorMap.get(s.ticker);
        if (!si || s.close === null) return false;
        const st = decimalToNumber(si.supertrend);
        return st !== null && s.close > st;
      });
    } else if (preset === "supertrend_bearish") {
      stocks = stocks.filter((s) => {
        const si = indicatorMap.get(s.ticker);
        if (!si || s.close === null) return false;
        const st = decimalToNumber(si.supertrend);
        return st !== null && s.close < st;
      });
    } else if (preset === "bb_lower_touch") {
      stocks = stocks.filter((s) => {
        const si = indicatorMap.get(s.ticker);
        if (!si || s.close === null) return false;
        const lower = decimalToNumber(si.bbLower);
        return lower !== null && s.close <= lower * 1.02;
      });
    } else if (preset === "pullback_sma20") {
      stocks = stocks.filter((s) => {
        if (!s.close || !s.sma20) return false;
        const pctFromSma20 = ((s.close - s.sma20) / s.sma20) * 100;
        return pctFromSma20 >= -3 && pctFromSma20 <= 3;
      });
    } else if (preset === "ema_cross") {
      stocks = stocks.filter((s) => s.emaCrossSignal === "bullish");
    } else if (preset === "stoch_overbought_breakout") {
      stocks = stocks.filter((s) => {
        const si = indicatorMap.get(s.ticker);
        if (!si || s.close === null) return false;
        const adx = decimalToNumber(si.adx);
        return adx !== null && adx > 20;
      });
    }

    return stocks;
  },

  async getBottomFishingRadar(): Promise<{
    ticker: string;
    name: string;
    sector: string;
    close: number | null;
    changePercent: number | null;
    rsi14: number | null;
    stochK: number | null;
    stochD: number | null;
    support1: number | null;
    isDeepOversold: boolean;
    hasVolumeSpike: boolean;
    upsideToSma20: number | null;
  }[]> {
    const stocks = await stockRepository.findOversoldStocks();

    // Intermediate type carrying stockId for avg volume lookup
    type Intermediate = {
      stockId: number;
      ticker: string;
      name: string;
      sector: string;
      close: number | null;
      changePercent: number | null;
      rsi14: number | null;
      stochK: number | null;
      stochD: number | null;
      support1: number | null;
      isDeepOversold: boolean;
      currentVolume: number | null;
      sma20: number | null;
    };

    const filtered = stocks
      .map((s): Intermediate | null => {
        const prices = s.prices;
        const latest = prices[0];
        const prev = prices[1];
        const indicator = s.indicators?.[0];
        if (!latest || !indicator) return null;

        const rsi14 = decimalToNumber(indicator.rsi14);
        const stochK = decimalToNumber(indicator.stochK);
        const stochD = decimalToNumber(indicator.stochD);

        const isRsiOversold = rsi14 !== null && rsi14 <= 30;
        const isStochOversold = stochK !== null && stochD !== null && stochK <= 20 && stochD <= 20;

        if (!isRsiOversold && !isStochOversold) return null;

        const { close, changePercent } = computeChange(latest, prev);

        // Exclude gocap stocks (price ≤ 50)
        if (close !== null && close <= 50) return null;

        // Calculate S1 support
        const high = decimalToNumber(latest.high);
        const low = decimalToNumber(latest.low);
        let support1: number | null = null;
        if (close !== null && high !== null && low !== null) {
          support1 = calculatePivotPoints(high, low, close).s1;
        }

        return {
          stockId: s.id,
          ticker: s.ticker,
          name: s.name,
          sector: s.sector,
          close,
          changePercent,
          rsi14,
          stochK,
          stochD,
          support1,
          isDeepOversold: isRsiOversold && isStochOversold,
          currentVolume: bigIntToNumber(latest.volume),
          sma20: decimalToNumber(indicator.sma20),
        };
      })
      .filter((r): r is Intermediate => r !== null);

    // Fetch 20-day average volumes for filtered stocks
    const stockIds = filtered.map((r) => r.stockId);
    const avgVolMap = await stockRepository.findAvgVolumeByStockIds(stockIds);

    const results = filtered.map((r) => {
      const avgVolume = avgVolMap.get(r.stockId);
      const volumeRatio = (r.currentVolume && avgVolume && avgVolume > 0) ? r.currentVolume / avgVolume : null;
      const hasVolumeSpike = volumeRatio !== null && volumeRatio >= 1.5;

      const upsideToSma20 = (r.close && r.sma20 && r.close < r.sma20)
        ? Math.round(((r.sma20 - r.close) / r.close) * 10000) / 100
        : null;

      return {
        ticker: r.ticker,
        name: r.name,
        sector: r.sector,
        close: r.close,
        changePercent: r.changePercent,
        rsi14: r.rsi14,
        stochK: r.stochK,
        stochD: r.stochD,
        support1: r.support1,
        isDeepOversold: r.isDeepOversold,
        hasVolumeSpike,
        upsideToSma20,
      };
    });

    // Sort: deep oversold + volume spike first, then by RSI ascending
    results.sort((a, b) => {
      const aScore = (a.isDeepOversold && a.hasVolumeSpike ? 0 : 1);
      const bScore = (b.isDeepOversold && b.hasVolumeSpike ? 0 : 1);
      if (aScore !== bScore) return aScore - bScore;
      if (a.rsi14 === null && b.rsi14 === null) return 0;
      if (a.rsi14 === null) return 1;
      if (b.rsi14 === null) return -1;
      return a.rsi14 - b.rsi14;
    });

    return results;
  },

  async customScreenerQuery(filters: {
    rsiMin?: number; rsiMax?: number;
    volumeMinMultiplier?: number;
    aboveSma200?: boolean; belowSma200?: boolean;
    macdBullish?: boolean;
    stochKMin?: number; stochKMax?: number;
    adxMin?: number;
    bbSqueeze?: boolean;
  }) {
    const latestDateRow = await stockRepository.getLatestIndicatorDate();
    if (!latestDateRow) return [];

    const latestDate = latestDateRow.date;
    const base = { interval: "1d" as const, date: latestDate, stock: { isActive: true } };

    // Build dynamic where clause
    const where: Record<string, unknown> = { ...base };
    const indicatorConditions: Record<string, unknown> = {};

    if (filters.rsiMin !== undefined || filters.rsiMax !== undefined) {
      const rsi: Record<string, number> = {};
      if (filters.rsiMin !== undefined) rsi.gte = filters.rsiMin;
      if (filters.rsiMax !== undefined) rsi.lte = filters.rsiMax;
      indicatorConditions.rsi14 = Object.keys(rsi).length > 0 ? rsi : undefined;
    }
    if (filters.stochKMin !== undefined || filters.stochKMax !== undefined) {
      const stoch: Record<string, number> = {};
      if (filters.stochKMin !== undefined) stoch.gte = filters.stochKMin;
      if (filters.stochKMax !== undefined) stoch.lte = filters.stochKMax;
      indicatorConditions.stochK = Object.keys(stoch).length > 0 ? stoch : undefined;
    }
    if (filters.adxMin !== undefined) {
      indicatorConditions.adx = { gte: filters.adxMin };
    }
    if (filters.macdBullish) {
      indicatorConditions.macdHist = { gt: 0 };
    }
    if (filters.bbSqueeze) {
      indicatorConditions.bbUpper = { not: null };
      indicatorConditions.bbMiddle = { not: null };
      indicatorConditions.bbLower = { not: null };
    }
    if (filters.aboveSma200 || filters.belowSma200) {
      indicatorConditions.sma200 = { not: null };
    }

    Object.assign(where, indicatorConditions);
    const results = await stockRepository.findIndicatorsByDate(latestDate, where);

    let stocks = results.map((r) => {
      const prices = r.stock.prices;
      const { close, changePercent } = computeChange(prices[0], prices[1]);
      return {
        ticker: r.stock.ticker, name: r.stock.name, sector: r.stock.sector,
        close, changePercent,
        volume: prices[0] ? bigIntToNumber(prices[0].volume) : null,
        rsi14: decimalToNumber(r.rsi14),
        sma20: decimalToNumber(r.sma20),
        sma200: decimalToNumber(r.sma200),
      };
    });

    if (filters.aboveSma200) {
      stocks = stocks.filter((s) => s.close !== null && s.sma200 !== null && s.close > s.sma200);
    } else if (filters.belowSma200) {
      stocks = stocks.filter((s) => s.close !== null && s.sma200 !== null && s.close < s.sma200);
    }

    if (filters.bbSqueeze) {
      const indicatorMap = new Map(results.map((r) => [r.stock.ticker, r]));
      stocks = stocks.filter((s) => {
        const si = indicatorMap.get(s.ticker);
        if (!si) return false;
        const upper = decimalToNumber(si.bbUpper);
        const lower = decimalToNumber(si.bbLower);
        const middle = decimalToNumber(si.bbMiddle);
        return upper !== null && lower !== null && middle !== null && middle > 0 && (upper - lower) / middle < 0.05;
      });
    }

    return stocks;
  },

  async getMarketStructure(ticker: string): Promise<{
    structure: MarketStructure;
    swings: SwingPoint[];
  }> {
    const minDate = subDays(new Date(), 150);
    const prices = await stockRepository.findPricesByTicker(ticker, { date: { gte: minDate } });

    if (prices.length < 20) return { structure: "CONSOLIDATION", swings: [] };

    const highs = prices.map((p) => Number(p.high as Prisma.Decimal));
    const lows = prices.map((p) => Number(p.low as Prisma.Decimal));
    const closes = prices.map((p) => Number(p.close as Prisma.Decimal));

    const atr = calculateATR(highs, lows, closes, 14);

    const swings = detectSwingPoints({ highs, lows, atr });
    const structure = classifyMarketStructure(swings);

    return {
      structure,
      swings: swings.slice(-10),
    };
  },

  generateTradingPlan(params: {
    currentPrice: number;
    high: number;
    low: number;
    close: number;
    prevClose: number;
    atr: number | null;
    rsi14: number | null;
    sma20: number | null;
    sma50: number | null;
    sma200: number | null;
    macdHist: number | null;
    marketStructure?: MarketStructure;
    supertrend?: number | null;
    obvTrend?: string | null;
    stochK?: number | null;
    stochD?: number | null;
    adx?: number | null;
  }): TradingPlan | null {
    const { currentPrice, high, low, close, prevClose, atr, rsi14, sma20, macdHist, marketStructure } = params;
    if (!currentPrice || currentPrice <= 0) return null;

    const pivots = calculatePivotPoints(high, low, close);
    const warnings: string[] = [];

    // ── Market Structure Filter: confirmed downtrend ──
    if (marketStructure === "LOWER_LOWS") {
      return buildDowntrendWaitAndSee(currentPrice, prevClose, atr, pivots, warnings,
        "Market Structure menunjukkan Lower Lows (downtrend terkonfirmasi). Risiko menangkap pisau jatuh sangat tinggi. Sangat disarankan Wait & See hingga ada konfirmasi reversal.");
    }

    // ── Trend Filter: confirmed short-term downtrend (skip if HIGHER_HIGHS) ──
    if (marketStructure !== "HIGHER_HIGHS" && sma20 !== null && macdHist !== null && close < sma20 && macdHist < 0) {
      return buildDowntrendWaitAndSee(currentPrice, prevClose, atr, pivots, warnings,
        "Saham sedang dalam fase Downtrend kuat (berada di bawah MA20 dan MACD Bearish). Risiko menangkap pisau jatuh sangat tinggi. Sangat disarankan Wait & See hingga ada konfirmasi reversal.");
    }

    // ── Market Entry ──
    let entry: number;
    let entryZone: string;
    if (rsi14 !== null && rsi14 > 70) {
      entry = sma20 ?? currentPrice;
      entryZone = `Tunggu pullback ke ${formatRp(entry)}`;
      warnings.push("RSI menunjukkan kondisi jenuh beli (overbought). Tunggu koreksi sebelum masuk.");
    } else if (rsi14 !== null && rsi14 < 30) {
      entry = currentPrice;
      entryZone = "Potensi bottom, monitor konfirmasi";
      warnings.push("RSI menunjukkan kondisi jenuh jual (oversold) — bisa rebound atau turun lebih lanjut.");
    } else {
      entry = currentPrice;
      entryZone = `Sekitar ${formatRp(currentPrice)}`;
    }

    // ── TP ──
    let tp1: number;
    let tp1Source: string;
    let tp2: number | null = null;
    let tp2Source = "";

    if (currentPrice >= pivots.r1) {
      tp1 = pivots.r2;
      tp1Source = "R2";
    } else {
      tp1 = pivots.r1;
      tp1Source = "R1";
      tp2 = pivots.r2;
      tp2Source = "R2";
    }

    // ── SL ──
    let sl: number;
    let slSource: string;

    if (currentPrice >= pivots.pivot) {
      sl = pivots.s1;
      slSource = "S1";
    } else {
      sl = pivots.s2;
      slSource = "S2";
    }

    // ATR cross-check: cap SL width
    if (atr !== null && atr > 0) {
      const maxSl = entry - 2 * atr;
      if (sl > maxSl) {
        sl = Math.round(maxSl);
        slSource = "ATR (2x)";
      }
    }

    // Ensure SL < entry and TP > entry
    if (sl >= entry) sl = Math.round(entry * 0.97);
    if (tp1 <= entry) tp1 = Math.round(entry * 1.03);

    // ── IDX Fraksi Harga & ARA/ARB ──
    entry = roundToIdxFraction(entry, "ENTRY");
    sl = roundToIdxFraction(sl, "STOP_LOSS");
    tp1 = roundToIdxFraction(tp1, "TAKE_PROFIT");
    if (tp2) tp2 = roundToIdxFraction(tp2, "TAKE_PROFIT");

    const { ara, arb } = getAraArbLimits(prevClose);
    if (tp1 > ara) { tp1 = ara; tp1Source = "ARA"; }
    if (tp2 && tp2 > ara) { tp2 = ara; tp2Source = "ARA"; }
    if (sl < arb) { sl = arb; slSource = "ARB"; }

    // ── Risk/Reward ──
    const risk = entry - sl;
    const reward = tp1 - entry;
    const riskReward = risk > 0 ? Math.round((reward / risk) * 10) / 10 : 0;

    // ── Good enough? Return MARKET_ENTRY ──
    if (riskReward >= 1.5) {
      const baseConfidence = calcConfidence(rsi14, riskReward);
      const confidence = adjustConfidence(baseConfidence, { currentPrice, supertrend: params.supertrend, obvTrend: params.obvTrend, stochK: params.stochK, adx: params.adx });
      return {
        strategy: "MARKET_ENTRY",
        status: "TRADEABLE",
        entry,
        entryZone,
        tp1,
        tp1Source,
        tp2,
        tp2Source,
        sl,
        slSource,
        riskReward,
        confidence,
        warnings,
        suggestion: `Risk:reward 1:${riskReward.toFixed(1)} memenuhi kriteria. Entry market di sekitar ${formatRp(entry)} dapat dipertimbangkan.`,
      };
    }

    // ── BOW: progressively try lower entries ──
    if (atr === null || atr <= 0) {
      warnings.push("Rasio risk/reward kurang ideal (di bawah 1:1.5). ATR tidak tersedia untuk kalkulasi alternatif.");
      const confidence = calcConfidence(rsi14, riskReward);
      return {
        strategy: "WAIT_AND_SEE",
        status: "NOT_IDEAL",
        entry,
        entryZone,
        tp1,
        tp1Source,
        tp2,
        tp2Source,
        sl,
        slSource,
        riskReward,
        confidence,
        warnings,
        suggestion: "Rasio risk/reward kurang ideal dan ATR tidak tersedia. Sebaiknya Wait & See atau cari saham lain.",
      };
    }

    // BOW Attempt 1 — Pivot
    let bowEntry = Math.min(currentPrice, pivots.pivot);
    let bowSl = Math.round(bowEntry - 1.5 * atr);
    let bowEntryZone = `Antri di Pivot`;
    const bowSlSource = "ATR (1.5x)";

    const bowRisk = bowEntry - bowSl;
    const bowReward = tp1 - bowEntry;
    let bowRR = bowRisk > 0 ? Math.round((bowReward / bowRisk) * 10) / 10 : 0;

    // BOW Attempt 2 — S1 (if pivot attempt still < 1.5)
    let bowLevel: "Pivot" | "S1" = "Pivot";
    if (bowRR < 1.5) {
      const s1Entry = pivots.s1;
      const s1Sl = Math.round(s1Entry - 1.5 * atr);
      const s1Risk = s1Entry - s1Sl;
      const s1Reward = tp1 - s1Entry;
      const s1RR = s1Risk > 0 ? Math.round((s1Reward / s1Risk) * 10) / 10 : 0;

      if (s1RR > bowRR) {
        bowEntry = s1Entry;
        bowSl = s1Sl;
        bowRR = s1RR;
        bowEntryZone = `Antri di S1`;
        bowLevel = "S1";
      }
    }

    // Ensure SL < entry for BOW
    if (bowSl >= bowEntry) bowSl = Math.round(bowEntry * 0.97);

    // Apply IDX fractions for BOW
    bowEntry = roundToIdxFraction(bowEntry, "ENTRY");
    bowSl = roundToIdxFraction(bowSl, "STOP_LOSS");
    // Recalculate RR with fraction-adjusted prices
    const bowRiskAdj = bowEntry - bowSl;
    const bowRewardAdj = tp1 - bowEntry;
    bowRR = bowRiskAdj > 0 ? Math.round((bowRewardAdj / bowRiskAdj) * 10) / 10 : 0;

    // ── Still terrible? Wait & See ──
    if (bowRR < 1.0) {
      return {
        strategy: "WAIT_AND_SEE",
        status: "NOT_IDEAL",
        entry: bowEntry,
        entryZone: bowEntryZone,
        tp1,
        tp1Source,
        tp2,
        tp2Source,
        sl: bowSl,
        slSource: bowSlSource,
        riskReward: bowRR,
        confidence: "low",
        warnings,
        suggestion: `Bahkan dengan antri di ${bowLevel}, rasio Risk:Reward (1:${bowRR.toFixed(1)}) masih terlalu berisiko. Sebaiknya Wait & See atau cari saham lain dengan volatilitas arah yang lebih jelas.`,
        marketEntryPrice: currentPrice,
      };
    }

    // ── BOW is viable ──
    const bowBaseConfidence = calcConfidence(rsi14, bowRR);
    const bowConfidence = adjustConfidence(bowBaseConfidence, { currentPrice, supertrend: params.supertrend, obvTrend: params.obvTrend, stochK: params.stochK, adx: params.adx });

    const suggestion = bowLevel === "S1"
      ? `Entry market kurang ideal (RR 1:${riskReward.toFixed(1)}). Pertimbangkan antri beli di ${formatRp(bowEntry)} (S1) — risk:reward 1:${bowRR.toFixed(1)}.`
      : `Harga terlalu dekat Resistance. Pasang antri beli (limit order) di ${formatRp(bowEntry)} (Pivot) untuk risk:reward 1:${bowRR.toFixed(1)} yang lebih baik.`;

    return {
      strategy: "BUY_ON_WEAKNESS",
      status: "TRADEABLE",
      entry: bowEntry,
      entryZone: bowEntryZone,
      tp1,
      tp1Source,
      tp2,
      tp2Source,
      sl: bowSl,
      slSource: bowSlSource,
      riskReward: bowRR,
      confidence: bowConfidence,
      warnings,
      suggestion,
      marketEntryPrice: currentPrice,
    };
  },
};

type Sentiment = "positif" | "negatif" | "netral";

interface SignalInput {
  price: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema12: number | null;
  ema26: number | null;
  rsi14: number | null;
  macdHist: number | null;
  stochK: number | null;
  stochD: number | null;
  adx: number | null;
  supertrend: number | null;
  obvTrend: string | null;
  vwap: number | null;
}

const SIGNAL_LABELS = [
  { max: -0.6, label: "Strong Bearish" },
  { max: -0.2, label: "Bearish" },
  { max: 0.2, label: "Netral" },
  { max: 0.6, label: "Bullish" },
  { max: 1.01, label: "Strong Bullish" },
] as const;

function sentimentToValue(s: Sentiment): number {
  return s === "positif" ? 1 : s === "negatif" ? -1 : 0;
}

export function computeSignalScore(input: SignalInput): {
  score: number;
  label: string;
  breakdown: { name: string; sentiment: Sentiment; weight: number }[];
} {
  const breakdown: { name: string; sentiment: Sentiment; weight: number }[] = [];

  // Trend indicators (40% total, ~10% each)
  const sma = translateSMA(input.sma20, input.sma50, input.sma200, input.price);
  breakdown.push({ name: "SMA", sentiment: sma.sentiment, weight: 0.10 });

  const ema = translateEMA(input.ema12, input.ema26, input.price);
  breakdown.push({ name: "EMA", sentiment: ema.sentiment, weight: 0.10 });

  const st = translateSupertrend(input.price, input.supertrend);
  breakdown.push({ name: "Supertrend", sentiment: st.sentiment, weight: 0.10 });

  const adx = translateADX(input.adx);
  breakdown.push({ name: "ADX", sentiment: adx.sentiment, weight: 0.10 });

  // Momentum indicators (35% total, ~12% each)
  const rsi = translateRSI(input.rsi14);
  breakdown.push({ name: "RSI", sentiment: rsi.sentiment, weight: 0.12 });

  const macd = translateMACD(input.macdHist);
  breakdown.push({ name: "MACD", sentiment: macd.sentiment, weight: 0.12 });

  const stoch = translateStochastic(input.stochK, input.stochD);
  breakdown.push({ name: "Stochastic", sentiment: stoch.sentiment, weight: 0.11 });

  // Volume indicators (25% total, ~12.5% each)
  const obv = translateOBV(input.obvTrend);
  breakdown.push({ name: "OBV", sentiment: obv.sentiment, weight: 0.125 });

  const vwap = translateVWAP(input.price, input.vwap);
  breakdown.push({ name: "VWAP", sentiment: vwap.sentiment, weight: 0.125 });

  const rawScore = breakdown.reduce(
    (sum, b) => sum + sentimentToValue(b.sentiment) * b.weight,
    0
  );

  const score = Math.round(rawScore * 100) / 100;
  const label = SIGNAL_LABELS.find((l) => score < l.max)?.label ?? "Strong Bullish";

  return { score, label, breakdown };
}

export function detectGorengan(params: {
  price: number;
  high: number;
  low: number;
  sma200: number | null;
  volume: number;
  avgVolume20d: number | null;
  marketCap: number | null;
}): boolean {
  let flags = 0;

  // Volume > 5x 20-day average
  if (params.avgVolume20d && params.avgVolume20d > 0 && params.volume > params.avgVolume20d * 5) {
    flags++;
  }

  // Daily price swing > 15%
  const swing = params.price > 0 ? (params.high - params.low) / params.price : 0;
  if (swing > 0.15) {
    flags++;
  }

  // Market cap < 1T IDR
  if (params.marketCap !== null && params.marketCap < 1_000_000_000_000) {
    flags++;
  }

  // Price deviates > 40% from SMA200
  if (params.sma200 && params.sma200 > 0) {
    const deviation = Math.abs(params.price - params.sma200) / params.sma200;
    if (deviation > 0.4) {
      flags++;
    }
  }

  return flags >= 2;
}

function calcConfidence(rsi14: number | null, riskReward: number): "high" | "medium" | "low" {
  if (rsi14 !== null && rsi14 >= 30 && rsi14 <= 70 && riskReward >= 2) return "high";
  if (riskReward >= 1.5) return "medium";
  return "low";
}

function adjustConfidence(base: "high" | "medium" | "low", params: {
  currentPrice: number;
  supertrend?: number | null;
  obvTrend?: string | null;
  stochK?: number | null;
  adx?: number | null;
}): "high" | "medium" | "low" {
  let score = 0;
  if (params.supertrend !== null && params.supertrend !== undefined) {
    score += params.currentPrice > params.supertrend ? 1 : -1;
  }
  if (params.obvTrend) {
    score += params.obvTrend === "Accumulation" ? 1 : -1;
  }
  if (params.stochK != null) {
    score += params.stochK < 20 ? 1 : params.stochK > 80 ? -1 : 0;
  }
  if (params.adx != null) {
    score += params.adx > 25 ? 1 : params.adx < 20 ? -1 : 0;
  }

  const levels: Array<"high" | "medium" | "low"> = ["high", "medium", "low"];
  const idx = levels.indexOf(base);
  const shift = score >= 2 ? -1 : score <= -2 ? 1 : 0;
  return levels[Math.max(0, Math.min(2, idx + shift))];
}

function buildDowntrendWaitAndSee(
  currentPrice: number,
  prevClose: number,
  atr: number | null,
  pivots: { pivot: number; s1: number; s2: number; r1: number; r2: number },
  warnings: string[],
  suggestion: string,
): TradingPlan {
  // Calculate entry/SL/TP using same pivot logic as normal flow
  const entry = roundToIdxFraction(currentPrice, "ENTRY");

  let sl: number;
  let slSource: string;
  if (currentPrice >= pivots.pivot) {
    sl = pivots.s1;
    slSource = "S1";
  } else {
    sl = pivots.s2;
    slSource = "S2";
  }

  // ATR cross-check
  if (atr !== null && atr > 0) {
    const maxSl = entry - 2 * atr;
    if (sl > maxSl) {
      sl = Math.round(maxSl);
      slSource = "ATR (2x)";
    }
  }

  let tp1: number;
  let tp1Source: string;
  if (currentPrice >= pivots.r1) {
    tp1 = pivots.r2;
    tp1Source = "R2";
  } else {
    tp1 = pivots.r1;
    tp1Source = "R1";
  }

  // Apply IDX fractions
  sl = roundToIdxFraction(sl, "STOP_LOSS");
  tp1 = roundToIdxFraction(tp1, "TAKE_PROFIT");

  // Apply ARA/ARB caps
  const { ara, arb } = getAraArbLimits(prevClose);
  if (tp1 > ara) { tp1 = ara; tp1Source = "ARA"; }
  if (sl < arb) { sl = arb; slSource = "ARB"; }

  // Calculate real RR
  if (sl >= entry) sl = roundToIdxFraction(Math.round(entry * 0.97), "STOP_LOSS");
  const risk = entry - sl;
  const reward = tp1 - entry;
  const riskReward = risk > 0 ? Math.round((reward / risk) * 10) / 10 : 0;

  return {
    strategy: "WAIT_AND_SEE",
    status: "NOT_IDEAL",
    entry,
    entryZone: `Sekitar ${formatRp(entry)}`,
    tp1,
    tp1Source,
    tp2: null,
    tp2Source: "",
    sl,
    slSource,
    riskReward,
    confidence: "low",
    warnings,
    suggestion,
  };
}
