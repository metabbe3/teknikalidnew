import { SMA, EMA, RSI, MACD, BollingerBands, Stochastic, ATR, ADX, OBV } from "technicalindicators";
import type { MACDResult, BollingerBandsResult, StochasticResult } from "@/types/stock";

function padResults<T>(closes: number[], rawResults: T[]): (T | null)[] {
  const padLength = closes.length - rawResults.length;
  return Array(padLength).fill(null).concat(rawResults);
}

export function calculateSMA(closes: number[], period: number): (number | null)[] {
  const results = SMA.calculate({ period, values: closes });
  return padResults(closes, results);
}

export function calculateEMA(closes: number[], period: number): (number | null)[] {
  const results = EMA.calculate({ period, values: closes });
  return padResults(closes, results);
}

export function calculateRSI(closes: number[], period = 14): (number | null)[] {
  const results = RSI.calculate({ period, values: closes });
  return padResults(closes, results);
}

export function resolveMacdLine(m: MACDResult | null): number | null {
  if (m?.macd != null) return m.macd;
  if (m?.signal != null && m?.histogram != null) return m.signal + m.histogram;
  return null;
}

export function calculateOBV(closes: number[], volumes: number[]): (number | null)[] {
  const results = OBV.calculate({ close: closes, volume: volumes });
  return padResults(closes, results);
}

export function classifyObvTrend(obvSeries: (number | null)[]): string | null {
  const last = obvSeries.length - 1;
  const lookback = 20;
  const recent = obvSeries.slice(Math.max(0, last - lookback + 1), last + 1).filter((v): v is number => v !== null);
  if (recent.length < 5) return null;
  return recent[recent.length - 1] > recent[0] ? "Accumulation" : "Distribution";
}

export function calculateSupertrend(
  closes: number[],
  highs: number[],
  lows: number[],
  atrPeriod = 10,
  multiplier = 3,
): (number | null)[] {
  const atr = calculateATR(highs, lows, closes, atrPeriod);
  const result: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (atr[i] === null) { result.push(null); continue; }
    const hl2 = (highs[i] + lows[i]) / 2;
    const upperBand = hl2 + multiplier * atr[i]!;
    const lowerBand = hl2 - multiplier * atr[i]!;
    const prev = i > 0 ? result[i - 1] : null;
    if (prev === null) { result.push(closes[i] > upperBand ? lowerBand : upperBand); continue; }
    result.push(closes[i] > prev ? lowerBand : upperBand);
  }
  return result;
}

export function calculateMACD(closes: number[]): (MACDResult | null)[] {
  const results = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  return padResults(closes, results);
}

export function calculateBollingerBands(
  closes: number[],
  period = 20,
  stdDev = 2
): (BollingerBandsResult | null)[] {
  const results = BollingerBands.calculate({ period, stdDev, values: closes });
  return padResults(closes, results);
}

export function calculateStochastic(
  closes: number[],
  highs: number[],
  lows: number[],
  period = 14,
  signalPeriod = 3
): (StochasticResult | null)[] {
  const results = Stochastic.calculate({
    period,
    signalPeriod,
    high: highs,
    low: lows,
    close: closes,
  });
  return padResults(closes, results);
}

export function calculateATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14
): (number | null)[] {
  const results = ATR.calculate({ period, high: highs, low: lows, close: closes });
  return padResults(closes, results);
}

export function calculateADX(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14
): (number | null)[] {
  const results = ADX.calculate({ period, high: highs, low: lows, close: closes });
  return padResults(closes, results.map((r) => r.adx));
}

export function calculateVWAP(
  closes: number[],
  volumes: number[],
  highs: number[],
  lows: number[]
): (number | null)[] {
  const result: (number | null)[] = [];
  let cumVolume = 0;
  let cumTP = 0;

  for (let i = 0; i < closes.length; i++) {
    const tp = (highs[i] + lows[i] + closes[i]) / 3;
    cumVolume += volumes[i];
    cumTP += tp * volumes[i];
    result.push(cumVolume > 0 ? cumTP / cumVolume : null);
  }
  return result;
}

export function calculatePivotPoints(
  high: number,
  low: number,
  close: number
): { pivot: number; s1: number; s2: number; r1: number; r2: number } {
  const pivot = (high + low + close) / 3;
  return {
    pivot,
    s1: 2 * pivot - high,
    s2: pivot - (high - low),
    r1: 2 * pivot - low,
    r2: pivot + (high - low),
  };
}

export function calculateNearestSR(
  prices: { high: number; low: number; close: number }[],
  currentPrice: number
): { support: number; resistance: number } {
  if (prices.length === 0) return { support: currentPrice, resistance: currentPrice };
  const last = prices[prices.length - 1];
  const pivots = calculatePivotPoints(last.high, last.low, last.close);

  let support = pivots.s1;
  let resistance = pivots.r1;

  if (currentPrice < pivots.pivot) {
    support = pivots.s2;
    resistance = pivots.pivot;
  }

  return { support, resistance };
}

export interface SwingPoint {
  type: "HIGH" | "LOW";
  price: number;
  index: number;
}

export type MarketStructure = "HIGHER_HIGHS" | "LOWER_LOWS" | "CONSOLIDATION";

export function detectSwingPoints(params: {
  highs: number[];
  lows: number[];
  atr: (number | null)[];
  threshold?: number;
}): SwingPoint[] {
  const { highs, lows, atr, threshold = 1.5 } = params;
  const len = highs.length;
  if (len < 5) return [];

  const rawSwings: SwingPoint[] = [];

  // Identify potential swings with 1-bar confirmation on each side
  for (let i = 2; i < len - 1; i++) {
    // Swing High: high[i] is higher than both neighbors
    if (highs[i] > highs[i - 1] && highs[i] > highs[i + 1]) {
      rawSwings.push({ type: "HIGH", price: highs[i], index: i });
    }
    // Swing Low: low[i] is lower than both neighbors
    if (lows[i] < lows[i - 1] && lows[i] < lows[i + 1]) {
      rawSwings.push({ type: "LOW", price: lows[i], index: i });
    }
  }

  // Sort by index (chronological)
  rawSwings.sort((a, b) => a.index - b.index);

  // Filter by ATR threshold: swing must be at least threshold * ATR from last opposite swing
  const filtered: SwingPoint[] = [];
  for (const swing of rawSwings) {
    const atrVal = atr[swing.index];
    if (atrVal === null || atrVal <= 0) {
      // No ATR data — keep the swing (no threshold to apply)
      filtered.push(swing);
      continue;
    }

    // Find last opposite swing in filtered list
    const lastOpposite = [...filtered].reverse().find((s) => s.type !== swing.type);
    if (!lastOpposite) {
      filtered.push(swing);
      continue;
    }

    const distance = Math.abs(swing.price - lastOpposite.price);
    if (distance >= threshold * atrVal) {
      filtered.push(swing);
    }
  }

  // Ensure alternating: merge consecutive same-type swings (keep the more extreme one)
  const result: SwingPoint[] = [];
  for (const swing of filtered) {
    const last = result[result.length - 1];
    if (last && last.type === swing.type) {
      // Same type: keep the more extreme one
      if (swing.type === "HIGH" && swing.price > last.price) {
        result[result.length - 1] = swing;
      } else if (swing.type === "LOW" && swing.price < last.price) {
        result[result.length - 1] = swing;
      }
    } else {
      result.push(swing);
    }
  }

  return result;
}

export function classifyMarketStructure(swings: SwingPoint[]): MarketStructure {
  if (swings.length < 4) return "CONSOLIDATION";

  // Get last 4 swings
  const recent = swings.slice(-4);
  const highs = recent.filter((s) => s.type === "HIGH");
  const lows = recent.filter((s) => s.type === "LOW");

  // Need at least 2 of each to determine structure
  if (highs.length < 2 || lows.length < 2) return "CONSOLIDATION";

  const lastTwoHighs = highs.slice(-2);
  const lastTwoLows = lows.slice(-2);

  const highsAscending = lastTwoHighs[1].price > lastTwoHighs[0].price;
  const lowsAscending = lastTwoLows[1].price > lastTwoLows[0].price;
  const highsDescending = lastTwoHighs[1].price < lastTwoHighs[0].price;
  const lowsDescending = lastTwoLows[1].price < lastTwoLows[0].price;

  if (highsAscending && lowsAscending) return "HIGHER_HIGHS";
  if (highsDescending && lowsDescending) return "LOWER_LOWS";
  return "CONSOLIDATION";
}
