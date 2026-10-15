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

// ─── Sinyal v2 (owner 15 Okt "tambahkan semua") — 5 indikator baru dari riset TradingView ───

/** Choppiness Index (CHOP) — 0..100+. >61.8 = sideways (sinyal lain tahan), <38.2 = trending kuat. */
export function calculateChoppiness(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14
): (number | null)[] {
  const result: (number | null)[] = [];
  const trs: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    const prevClose = i > 0 ? closes[i - 1] : closes[i];
    trs.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - prevClose), Math.abs(lows[i] - prevClose)));
    if (i < period - 1) { result.push(null); continue; }
    const window = trs.slice(i - period + 1, i + 1);
    const sumTR = window.reduce((a, b) => a + b, 0);
    const hh = Math.max(...highs.slice(i - period + 1, i + 1));
    const ll = Math.min(...lows.slice(i - period + 1, i + 1));
    const range = hh - ll;
    if (sumTR <= 0 || range <= 0) { result.push(null); continue; }
    result.push((100 * Math.log10(sumTR / range)) / Math.log10(period));
  }
  return result;
}

export interface IchimokuResult {
  tenkan: number | null;
  kijun: number | null;
  senkouA: number | null;
  senkouB: number | null;
  chikou: number | null;
}

/** Ichimoku Kinko Hyo (9/26/52) — kumo via senkouA/B. */
export function calculateIchimoku(highs: number[], lows: number[], closes: number[]): (IchimokuResult | null)[] {
  const mid = (p: number, i: number) => {
    if (i < p - 1) return null;
    const hh = Math.max(...highs.slice(i - p + 1, i + 1));
    const ll = Math.min(...lows.slice(i - p + 1, i + 1));
    return (hh + ll) / 2;
  };
  const tenkanSeries: (number | null)[] = [];
  const kijunSeries: (number | null)[] = [];
  const senkouBSeries: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    tenkanSeries.push(mid(9, i));
    kijunSeries.push(mid(26, i));
    senkouBSeries.push(mid(52, i));
  }
  const senkouASeries: (number | null)[] = tenkanSeries.map((t, i) =>
    t !== null && kijunSeries[i] !== null ? (t + kijunSeries[i]!) / 2 : null
  );
  const displ = 26;
  return closes.map((_, i) => {
    const a = i - displ >= 0 ? senkouASeries[i - displ] : null;
    const b = i - displ >= 0 ? senkouBSeries[i - displ] : null;
    const chikou = i + displ < closes.length ? closes[i + displ] : null;
    if (tenkanSeries[i] === null && kijunSeries[i] === null && a === null && b === null) return null;
    return { tenkan: tenkanSeries[i], kijun: kijunSeries[i], senkouA: a, senkouB: b, chikou };
  });
}

/** Williams %R — 0..-100. >-20 overbought, <-80 oversold. */
export function calculateWilliamsR(
  closes: number[],
  highs: number[],
  lows: number[],
  period = 14
): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    const hh = Math.max(...highs.slice(i - period + 1, i + 1));
    const ll = Math.min(...lows.slice(i - period + 1, i + 1));
    if (hh === ll) { result.push(null); continue; }
    result.push(((hh - closes[i]) / (hh - ll)) * -100);
  }
  return result;
}

export interface KSTResult { kst: number | null; signal: number | null; }

/** Know Sure Thing (KST) — momentum smoothed multi-period, ROC 10/15/20/30 × SMA 10/10/10/15, signal 9. */
export function calculateKST(closes: number[]): (KSTResult | null)[] {
  const roc = (p: number, i: number) => (i >= p ? (closes[i] - closes[i - p]) / closes[i - p] : null);
  const smaOf = (arr: (number | null)[], p: number, i: number) => {
    const win = arr.slice(Math.max(0, i - p + 1), i + 1).filter((v): v is number => v !== null);
    return win.length === p ? win.reduce((a, b) => a + b, 0) / p : null;
  };
  const r1: (number | null)[] = [], r2: (number | null)[] = [], r3: (number | null)[] = [], r4: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) { r1.push(roc(10, i)); r2.push(roc(15, i)); r3.push(roc(20, i)); r4.push(roc(30, i)); }
  const kstRaw: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    const s1 = smaOf(r1, 10, i), s2 = smaOf(r2, 10, i), s3 = smaOf(r3, 10, i), s4 = smaOf(r4, 15, i);
    kstRaw.push(s1 !== null && s2 !== null && s3 !== null && s4 !== null ? s1 + 2 * s2 + 3 * s3 + 4 * s4 : null);
  }
  const signal = (i: number) => smaOf(kstRaw, 9, i);
  return closes.map((_, i) => {
    if (kstRaw[i] === null) return null;
    return { kst: kstRaw[i], signal: signal(i) };
  });
}

export interface VortexResult { plus: number | null; minus: number | null; }

/** Vortex Indicator (VI+/VI-, period 14) — tren naik saat plus > minus. */
export function calculateVortex(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14
): (VortexResult | null)[] {
  const result: (VortexResult | null)[] = [];
  const vmPlus: number[] = [0], vmMinus: number[] = [0], trs: number[] = [highs[0] - lows[0]];
  for (let i = 1; i < closes.length; i++) {
    vmPlus.push(Math.abs(highs[i] - lows[i - 1]));
    vmMinus.push(Math.abs(lows[i] - highs[i - 1]));
    const prevClose = closes[i - 1];
    trs.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - prevClose), Math.abs(lows[i] - prevClose)));
  }
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    const sp = vmPlus.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    const sm = vmMinus.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    const st = trs.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    if (st <= 0) { result.push(null); continue; }
    result.push({ plus: sp / st, minus: sm / st });
  }
  return result;
}
