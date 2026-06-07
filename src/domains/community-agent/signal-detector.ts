import { decimalToNumber, bigIntToNumber } from "@/lib/serialize";
import { BOT_CONFIG, POST_TYPE, type PostType } from "./constants";
import { differenceInDays } from "date-fns";

export interface DetectedSignal {
  type: PostType;
  ticker: string;
  stockName: string;
  sector: string;
  priority: number;
  data: Record<string, unknown>;
}

interface StockWithIndicators {
  id: number;
  ticker: string;
  name: string;
  sector: string;
  prices: { close: { toNumber(): number }; volume: bigint; high: { toNumber(): number }; low: { toNumber(): number }; date: Date }[];
  indicators: {
    rsi14: { toNumber(): number } | null;
    macdHist: { toNumber(): number } | null;
    macdLine: { toNumber(): number } | null;
    macdSignal: { toNumber(): number } | null;
    sma20: { toNumber(): number } | null;
    sma50: { toNumber(): number } | null;
    sma200: { toNumber(): number } | null;
    ema12: { toNumber(): number } | null;
    ema26: { toNumber(): number } | null;
    bbUpper: { toNumber(): number } | null;
    bbLower: { toNumber(): number } | null;
    bbMiddle: { toNumber(): number } | null;
    stochK: { toNumber(): number } | null;
    stochD: { toNumber(): number } | null;
    adx: { toNumber(): number } | null;
    supertrend: { toNumber(): number } | null;
    obvTrend: string | null;
    signalScore: { toNumber(): number } | null;
    signalLabel: string | null;
    smaCrossSignal: string | null;
    smaCrossDate: Date | null;
    emaCrossSignal: string | null;
    emaCrossDate: Date | null;
    isGorengan: boolean | null;
  }[];
}

interface MarketMover {
  ticker: string;
  name: string;
  close: number | null;
  changePercent: number | null;
}

function num(v: { toNumber(): number } | null | undefined): number | null {
  return v != null ? v.toNumber() : null;
}

function isRecent(date: Date | null, maxDays: number): boolean {
  if (!date) return false;
  return differenceInDays(new Date(), date) <= maxDays;
}

// ── Detectors ──

function detectRSIExtreme(stock: StockWithIndicators): DetectedSignal | null {
  const ind = stock.indicators[0];
  if (!ind) return null;
  const rsi = num(ind.rsi14);
  if (rsi === null) return null;

  const price = stock.prices[0]?.close.toNumber() ?? null;

  if (rsi <= BOT_CONFIG.RSI_EXTREME_LOW) {
    return {
      type: POST_TYPE.RSI_EXTREME,
      ticker: stock.ticker,
      stockName: stock.name,
      sector: stock.sector,
      priority: rsi <= 20 ? 9 : 7,
      data: { rsi, direction: "oversold", price },
    };
  }
  if (rsi >= BOT_CONFIG.RSI_EXTREME_HIGH) {
    return {
      type: POST_TYPE.RSI_EXTREME,
      ticker: stock.ticker,
      stockName: stock.name,
      sector: stock.sector,
      priority: rsi >= 85 ? 9 : 7,
      data: { rsi, direction: "overbought", price },
    };
  }
  return null;
}

function detectCrossover(stock: StockWithIndicators): DetectedSignal | null {
  const ind = stock.indicators[0];
  if (!ind) return null;
  const price = stock.prices[0]?.close.toNumber() ?? null;

  if (ind.smaCrossSignal && ind.smaCrossDate && isRecent(ind.smaCrossDate, 3)) {
    return {
      type: POST_TYPE.CROSSOVER,
      ticker: stock.ticker,
      stockName: stock.name,
      sector: stock.sector,
      priority: 8,
      data: { signal: ind.smaCrossSignal, date: ind.smaCrossDate, sma50: num(ind.sma50), sma200: num(ind.sma200), price },
    };
  }

  if (ind.emaCrossSignal && ind.emaCrossDate && isRecent(ind.emaCrossDate, 3)) {
    return {
      type: POST_TYPE.CROSSOVER,
      ticker: stock.ticker,
      stockName: stock.name,
      sector: stock.sector,
      priority: 7,
      data: { signal: ind.emaCrossSignal, date: ind.emaCrossDate, ema12: num(ind.ema12), ema26: num(ind.ema26), price },
    };
  }

  return null;
}

function detectVolumeSpike(stock: StockWithIndicators, avgVolume: number | null): DetectedSignal | null {
  if (!stock.prices[0] || !avgVolume || avgVolume === 0) return null;
  const volume = bigIntToNumber(stock.prices[0].volume);
  if (!volume) return null;

  const ratio = volume / avgVolume;
  if (ratio >= BOT_CONFIG.VOLUME_SPIKE_MULTIPLIER) {
    return {
      type: POST_TYPE.VOLUME_SPIKE,
      ticker: stock.ticker,
      stockName: stock.name,
      sector: stock.sector,
      priority: Math.min(10, Math.floor(ratio)),
      data: { volume, avgVolume: Math.round(avgVolume), ratio: Math.round(ratio * 10) / 10, price: stock.prices[0].close.toNumber() },
    };
  }
  return null;
}

function detectGorengan(stock: StockWithIndicators): DetectedSignal | null {
  const ind = stock.indicators[0];
  if (!ind?.isGorengan) return null;

  const price = stock.prices[0]?.close.toNumber() ?? null;
  const volume = stock.prices[0] ? bigIntToNumber(stock.prices[0].volume) : null;

  return {
    type: POST_TYPE.GORENGAN,
    ticker: stock.ticker,
    stockName: stock.name,
    sector: stock.sector,
    priority: 8,
    data: { price, volume },
  };
}

function detectStrongSignal(stock: StockWithIndicators): DetectedSignal | null {
  const ind = stock.indicators[0];
  if (!ind) return null;
  const score = num(ind.signalScore);
  if (score === null) return null;

  if (Math.abs(score) >= BOT_CONFIG.SIGNAL_SCORE_THRESHOLD) {
    return {
      type: POST_TYPE.SIGNAL_SCORE,
      ticker: stock.ticker,
      stockName: stock.name,
      sector: stock.sector,
      priority: Math.abs(score) >= 0.7 ? 8 : 5,
      data: { score, label: ind.signalLabel, price: stock.prices[0]?.close.toNumber() ?? null },
    };
  }
  return null;
}

// ── Market Pulse ──

export function selectRandomStock(
  stocks: StockWithIndicators[],
  alreadyPostedTickers: Set<string>,
): StockWithIndicators | null {
  const candidates = stocks.filter(
    (s) => s.indicators[0] && !alreadyPostedTickers.has(s.ticker),
  );
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function buildMarketPulseData(gainers: MarketMover[], losers: MarketMover[]): DetectedSignal | null {
  if (gainers.length === 0 && losers.length === 0) return null;

  return {
    type: POST_TYPE.MARKET_PULSE,
    ticker: "IDX",
    stockName: "IDX Composite",
    sector: "Market",
    priority: 6,
    data: {
      gainers: gainers.slice(0, 5).map(g => ({ ticker: g.ticker, name: g.name, close: g.close, changePercent: g.changePercent })),
      losers: losers.slice(0, 5).map(l => ({ ticker: l.ticker, name: l.name, close: l.close, changePercent: l.changePercent })),
    },
  };
}

// ── Main scanner ──

export function scanSignals(
  stocks: StockWithIndicators[],
  avgVolumes: Map<number, number>,
): DetectedSignal[] {
  const signals: DetectedSignal[] = [];

  for (const stock of stocks) {
    if (!stock.indicators[0]) continue;

    // Run all detectors, keep highest-priority signal per stock
    const candidates: DetectedSignal[] = [
      detectRSIExtreme(stock),
      detectCrossover(stock),
      detectVolumeSpike(stock, null), // volume spike handled separately with avgVolume
      detectGorengan(stock),
      detectStrongSignal(stock),
    ].filter((s): s is DetectedSignal => s !== null);

    if (candidates.length > 0) {
      // Pick highest priority
      candidates.sort((a, b) => b.priority - a.priority);
      signals.push(candidates[0]);
    }
  }

  // Sort all signals by priority descending
  signals.sort((a, b) => b.priority - a.priority);

  return signals;
}
