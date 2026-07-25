/**
 * Technical Advice Engine
 *
 * Pure functions that turn StockIndicator data into actionable trading advice.
 * No external dependencies — can run on both server and client.
 *
 * Scoring system:
 * - Each indicator votes: bullish (+1), bearish (-1), neutral (0)
 * - Total score → action + confidence
 * - ATR-based stop loss / take profit suggestions
 *
 * Design principle: Intelligence in the tool, not the model.
 * Explicit rules > black-box reasoning.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IndicatorData {
  currentPrice: number;
  rsi14: number | null;
  macdHist: number | null;
  macdLine: number | null;
  macdSignal: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema12: number | null;
  ema26: number | null;
  bbUpper: number | null;
  bbMiddle: number | null;
  bbLower: number | null;
  stochK: number | null;
  stochD: number | null;
  adx: number | null;
  atr: number | null;
  vwap: number | null;
  signalScore: number | null;
  signalLabel: string | null;
  supertrend: number | null;
  isGorengan: boolean | null;
}

export type AdviceAction = "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";

export interface HoldingAdvice {
  action: AdviceAction;
  confidence: number; // 0-100
  score: number; // raw signal score
  reasons: string[];
  warnings: string[];
  stopLoss: number | null;
  takeProfit1: number | null;
  takeProfit2: number | null;
  riskRewardRatio: number | null;
  trend: "uptrend" | "downtrend" | "sideways";
  isGorengan: boolean;
}

// ─── Action Mapping ───────────────────────────────────────────────────────────

const SCORE_TO_ACTION: { threshold: number; action: AdviceAction }[] = [
  { threshold: 4, action: "STRONG_BUY" },
  { threshold: 2, action: "BUY" },
  { threshold: -1, action: "HOLD" }, // -1 to +1 is HOLD
  { threshold: -3, action: "SELL" },
  { threshold: -99, action: "STRONG_SELL" },
];

const ACTION_LABELS: Record<AdviceAction, { id: string; label: string; color: string }> = {
  STRONG_BUY: { id: "STRONG_BUY", label: "Strong Buy", color: "emerald" },
  BUY: { id: "BUY", label: "Buy", color: "green" },
  HOLD: { id: "HOLD", label: "Hold", color: "gray" },
  SELL: { id: "SELL", label: "Sell", color: "orange" },
  STRONG_SELL: { id: "STRONG_SELL", label: "Strong Sell", color: "red" },
};

export function getActionLabel(action: AdviceAction) {
  return ACTION_LABELS[action];
}

// ─── Core Engine ──────────────────────────────────────────────────────────────

export function generateAdvice(ind: IndicatorData): HoldingAdvice {
  let score = 0;
  const reasons: string[] = [];
  const warnings: string[] = [];

  // ── 1. RSI (Relative Strength Index) ──────────────────────────────────────
  if (ind.rsi14 !== null) {
    if (ind.rsi14 < 30) {
      score += 2;
      reasons.push(`RSI ${ind.rsi14.toFixed(0)} — oversold, peluang beli`);
    } else if (ind.rsi14 < 40) {
      score += 1;
      reasons.push(`RSI ${ind.rsi14.toFixed(0)} — mendekati oversold`);
    } else if (ind.rsi14 > 70) {
      score -= 2;
      reasons.push(`RSI ${ind.rsi14.toFixed(0)} — overbought, waspi profit taking`);
    } else if (ind.rsi14 > 60) {
      score -= 1;
      reasons.push(`RSI ${ind.rsi14.toFixed(0)} — mendekati overbought`);
    }
  }

  // ── 2. MACD (Moving Average Convergence Divergence) ────────────────────────
  if (ind.macdHist !== null && ind.macdLine !== null && ind.macdSignal !== null) {
    if (ind.macdHist > 0 && ind.macdLine > ind.macdSignal) {
      score += 1;
      reasons.push("MACD bullish crossover — momentum positif");
    } else if (ind.macdHist < 0 && ind.macdLine < ind.macdSignal) {
      score -= 1;
      reasons.push("MACD bearish crossover — momentum melemah");
    }
  } else if (ind.macdHist !== null) {
    if (ind.macdHist > 0) {
      score += 1;
      reasons.push("MACD histogram positif — momentum naik");
    } else {
      score -= 1;
      reasons.push("MACD histogram negatif — momentum turun");
    }
  }

  // ── 3. SMA Trend (price vs moving averages) ────────────────────────────────
  if (ind.sma50 !== null && ind.currentPrice > 0) {
    if (ind.currentPrice > ind.sma50) {
      score += 1;
      reasons.push(`Harga di atas SMA50 (${ind.sma50.toLocaleString("id-ID", { maximumFractionDigits: 0 })}) — tren naik`);
    } else {
      score -= 1;
      reasons.push(`Harga di bawah SMA50 (${ind.sma50.toLocaleString("id-ID", { maximumFractionDigits: 0 })}) — tren turun`);
    }
  }

  // Golden / Death cross
  if (ind.sma20 !== null && ind.sma50 !== null) {
    if (ind.sma20 > ind.sma50) {
      score += 1;
      reasons.push("SMA20 > SMA50 — golden cross, sinyal bullish");
    } else {
      score -= 1;
      reasons.push("SMA20 < SMA50 — death cross, sinyal bearish");
    }
  }

  // Long-term trend
  if (ind.sma200 !== null && ind.currentPrice > 0) {
    if (ind.currentPrice > ind.sma200) {
      score += 0.5;
      reasons.push("Harga di atas SMA200 — tren jangka panjang bullish");
    } else {
      score -= 0.5;
      warnings.push("Harga di bawah SMA200 — tren jangka panjang bearish");
    }
  }

  // ── 4. Bollinger Bands ─────────────────────────────────────────────────────
  if (ind.bbLower !== null && ind.bbUpper !== null && ind.currentPrice > 0) {
    if (ind.currentPrice <= ind.bbLower) {
      score += 1;
      reasons.push("Harga menyentuh lower Bollinger Band — potensi rebound");
    } else if (ind.currentPrice >= ind.bbUpper) {
      score -= 1;
      reasons.push("Harga menyentuh upper Bollinger Band — potensi koreksi");
    }
  }

  // ── 5. Stochastic Oscillator ───────────────────────────────────────────────
  if (ind.stochK !== null && ind.stochD !== null) {
    if (ind.stochK < 20 && ind.stochK > ind.stochD) {
      score += 1;
      reasons.push("Stochastic oversold dengan cross naik — sinyal beli");
    } else if (ind.stochK > 80 && ind.stochK < ind.stochD) {
      score -= 1;
      reasons.push("Stochastic overbought dengan cross turun — sinyal jual");
    }
  }

  // ── 6. ADX (trend strength) ────────────────────────────────────────────────
  if (ind.adx !== null) {
    if (ind.adx > 25) {
      // Strong trend — amplify the direction
      if (score > 0) {
        reasons.push(`ADX ${ind.adx.toFixed(0)} — tren kuat, sinyal terkonfirmasi`);
      } else if (score < 0) {
        reasons.push(`ADX ${ind.adx.toFixed(0)} — tren turun kuat, hati-hati`);
      }
    } else {
      if (Math.abs(score) > 1) {
        warnings.push(`ADX ${ind.adx.toFixed(0)} — tren lemah, sinyal mungkin tidak reliabel`);
        score *= 0.7; // dampen score when trend is weak
      }
    }
  }

  // ── 7. Supertrend ──────────────────────────────────────────────────────────
  if (ind.supertrend !== null && ind.currentPrice > 0) {
    if (ind.currentPrice > ind.supertrend) {
      score += 0.5;
    } else {
      score -= 0.5;
    }
  }

  // ── 8. Gorengan warning ────────────────────────────────────────────────────
  const isGorengan = ind.isGorengan === true;
  if (isGorengan) {
    warnings.push("Saham gorengan — volatilitas tinggi, risiko manipulasi harga");
    score *= 0.8; // reduce confidence on gorengan
  }

  // ── 9. Signal score from database (pre-computed) ───────────────────────────
  if (ind.signalScore !== null) {
    // signalScore range is typically -5 to +5
    if (ind.signalScore > 2) score += 0.5;
    else if (ind.signalScore < -2) score -= 0.5;
  }

  // ─── Determine Action ──────────────────────────────────────────────────────
  const roundedScore = Math.round(score);
  const action =
    SCORE_TO_ACTION.find((s) => roundedScore >= s.threshold)?.action ?? "HOLD";

  // Confidence: how far from 0, capped at 100
  const confidence = Math.min(100, Math.round(Math.abs(score) * 15 + (reasons.length * 5)));

  // ─── Stop Loss & Take Profit (ATR-based) ────────────────────────────────────
  let stopLoss: number | null = null;
  let takeProfit1: number | null = null;
  let takeProfit2: number | null = null;
  let riskRewardRatio: number | null = null;

  if (ind.atr !== null && ind.currentPrice > 0) {
    const atr = ind.atr;

    if (score >= 0) {
      // Long position: SL below, TP above
      stopLoss = Math.round((ind.currentPrice - 1.5 * atr) * 100) / 100;
      takeProfit1 = Math.round((ind.currentPrice + 2 * atr) * 100) / 100;
      takeProfit2 = Math.round((ind.currentPrice + 3.5 * atr) * 100) / 100;
    } else {
      // Short/exit: SL above, TP below
      stopLoss = Math.round((ind.currentPrice + 1.5 * atr) * 100) / 100;
      takeProfit1 = Math.round((ind.currentPrice - 2 * atr) * 100) / 100;
      takeProfit2 = Math.round((ind.currentPrice - 3.5 * atr) * 100) / 100;
    }

    const risk = Math.abs(ind.currentPrice - stopLoss);
    const reward = Math.abs(takeProfit2 - ind.currentPrice);
    riskRewardRatio = risk > 0 ? Math.round((reward / risk) * 100) / 100 : null;
  }

  // ─── Trend Determination ────────────────────────────────────────────────────
  let trend: "uptrend" | "downtrend" | "sideways" = "sideways";
  if (ind.sma20 !== null && ind.sma50 !== null) {
    if (ind.sma20 > ind.sma50 * 1.01) trend = "uptrend";
    else if (ind.sma20 < ind.sma50 * 0.99) trend = "downtrend";
  }

  return {
    action,
    confidence,
    score: roundedScore,
    reasons,
    warnings,
    stopLoss,
    takeProfit1,
    takeProfit2,
    riskRewardRatio,
    trend,
    isGorengan,
  };
}

// ─── Portfolio-level Summary ──────────────────────────────────────────────────

export interface PortfolioAdviceSummary {
  overallAction: AdviceAction;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  averageScore: number;
  topOpportunities: string[]; // tickers with highest scores
  riskWarnings: string[]; // tickers with warnings
}

export function summarizePortfolioAdvice(
  holdings: Array<{ ticker: string; advice: HoldingAdvice }>,
): PortfolioAdviceSummary {
  if (holdings.length === 0) {
    return {
      overallAction: "HOLD",
      bullishCount: 0,
      bearishCount: 0,
      neutralCount: 0,
      averageScore: 0,
      topOpportunities: [],
      riskWarnings: [],
    };
  }

  const scores = holdings.map((h) => h.advice.score);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  const bullishCount = holdings.filter(
    (h) => h.advice.action === "BUY" || h.advice.action === "STRONG_BUY",
  ).length;
  const bearishCount = holdings.filter(
    (h) => h.advice.action === "SELL" || h.advice.action === "STRONG_SELL",
  ).length;
  const neutralCount = holdings.length - bullishCount - bearishCount;

  const overallAction =
    SCORE_TO_ACTION.find((s) => Math.round(avgScore) >= s.threshold)?.action ?? "HOLD";

  // Top opportunities: highest scores
  const topOpportunities = [...holdings]
    .sort((a, b) => b.advice.score - a.advice.score)
    .slice(0, 3)
    .filter((h) => h.advice.score > 0)
    .map((h) => h.ticker);

  // Risk warnings: holdings with gorengan or strong sell
  const riskWarnings = holdings
    .filter((h) => h.advice.isGorengan || h.advice.action === "STRONG_SELL")
    .map((h) => h.ticker);

  return {
    overallAction,
    bullishCount,
    bearishCount,
    neutralCount,
    averageScore: Math.round(avgScore * 10) / 10,
    topOpportunities,
    riskWarnings,
  };
}
