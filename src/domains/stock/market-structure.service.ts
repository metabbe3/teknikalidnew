import { subDays } from "date-fns";
import type { Prisma } from "@/generated/prisma/client";
import {
  calculateATR,
  detectSwingPoints,
  classifyMarketStructure,
  calculatePivotPoints,
} from "@/lib/indicators";
import type { MarketStructure, SwingPoint } from "@/lib/indicators";
import type { TradingPlan } from "@/lib/trading-plan";
import { formatRp } from "@/lib/utils";
import { stockRepository } from "./stock.repository";
import { roundToIdxFraction, getAraArbLimits } from "./idx-rules";

export const marketStructureService = {
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