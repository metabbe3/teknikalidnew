import { subDays } from "date-fns";
import { toDateKey } from "@/lib/utils";
import { bigIntToNumber, computeChange } from "@/lib/serialize";
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
  resolveMacdLine,
  calculateOBV,
  classifyObvTrend,
  calculateSupertrend,
  detectSwingPoints,
  classifyMarketStructure,
} from "@/lib/indicators";
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
import type { SwingPoint, MarketStructure } from "@/lib/indicators";
import { INTERVAL } from "@/lib/constants";
import { stockRepository } from "./stock.repository";
import { StockNotFoundError } from "./stock.errors";
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

export const indicatorService = {
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

    const limit = pLimit(5);
    let done = 0;
    const results = await Promise.allSettled(
      stocks.map((stock) => limit(async () => {
        await this.calculateAndSaveIndicators(stock.ticker);
      }))
    );

    const failures = results.filter((r) => r.status === "rejected").length;
    if (failures > 0) console.error(`${failures} stocks failed indicator calculation`);
  },
};

// Re-export helpers for use in other services
export { detectCrossover, buildIndicatorWhere, EMPTY_INDICATOR_RESULT, VOLUME_SPIKE_MULTIPLIER, VALID_PRESETS };
export type { PresetKey };