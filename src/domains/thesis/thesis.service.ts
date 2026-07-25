import { thesisRepository } from "./thesis.repository";
import { stockRepository } from "@/domains/stock/stock.repository";
import { ValidationError } from "@/lib/common-errors";
import { decimalToNumber } from "@/lib/serialize";
import { eventBus } from "@/lib/event-bus";
import { ThesisNotFoundError } from "./thesis.errors";

export type ThesisBias = "BULLISH" | "BEARISH" | "NEUTRAL";
// Breach is computed on-demand vs latest price/signal — a review-prompt, NOT a live signal.
export type ThesisBreach = "target_hit" | "stop_hit" | "verdict_flipped" | null;

export interface ThesisView {
  id: string;
  ticker: string;
  bias: ThesisBias;
  targetPrice: number | null;
  stopLoss: number | null;
  rationale: string | null;
  close: number | null;
  signalLabel: string | null;
  breach: ThesisBreach;
  updatedAt: string;
}

const BIASES: ThesisBias[] = ["BULLISH", "BEARISH", "NEUTRAL"];

function labelTone(label: string | null): "bullish" | "bearish" | "neutral" {
  if (!label) return "neutral";
  const l = label.toLowerCase();
  if (l.includes("bullish")) return "bullish";
  if (l.includes("bearish")) return "bearish";
  return "neutral";
}

function computeBreach(
  bias: ThesisBias,
  targetPrice: number | null,
  stopLoss: number | null,
  close: number | null,
  signalLabel: string | null,
): ThesisBreach {
  if (close !== null) {
    if (targetPrice !== null && close >= targetPrice) return "target_hit";
    if (stopLoss !== null && close <= stopLoss) return "stop_hit";
  }
  const tone = labelTone(signalLabel);
  if (bias === "BULLISH" && tone === "bearish") return "verdict_flipped";
  if (bias === "BEARISH" && tone === "bullish") return "verdict_flipped";
  return null;
}

export const thesisService = {
  async upsertThesis(
    userId: string,
    ticker: string,
    input: { bias: string; targetPrice?: number | null; stopLoss?: number | null; rationale?: string },
  ) {
    const t = ticker.trim().toUpperCase();
    if (!t.endsWith(".JK")) throw new ValidationError("Ticker tidak valid");

    const existing = await stockRepository.findStockByTicker(t);
    if (!existing) throw new ValidationError("Saham tidak ditemukan");

    const bias = input.bias.toUpperCase();
    if (!BIASES.includes(bias as ThesisBias)) {
      throw new ValidationError("Bias harus BULLISH, BEARISH, atau NEUTRAL");
    }

    const targetPrice =
      input.targetPrice != null && input.targetPrice > 0 ? input.targetPrice : null;
    const stopLoss =
      input.stopLoss != null && input.stopLoss > 0 ? input.stopLoss : null;
    const rationale = input.rationale?.trim();
    if (rationale && rationale.length > 280) {
      throw new ValidationError("Rationale maksimal 280 karakter");
    }

    return thesisRepository.upsertThesis(userId, t, {
      bias,
      targetPrice,
      stopLoss,
      rationale: rationale || null,
    });
  },

  async getTheses(userId: string): Promise<ThesisView[]> {
    const theses = await thesisRepository.findUserTheses(userId);
    if (theses.length === 0) return [];

    const stocks = await stockRepository.findStocksByTickersWithIndicators(
      theses.map((t) => t.ticker),
    );
    const byTicker = new Map(stocks.map((s) => [s.ticker, s]));

    return theses.map((t) => {
      const stock = byTicker.get(t.ticker);
      const signalLabel = stock?.indicators[0]?.signalLabel ?? null;
      const close = stock?.prices[0] ? decimalToNumber(stock.prices[0].close) : null;
      const targetPrice = decimalToNumber(t.targetPrice);
      const stopLoss = decimalToNumber(t.stopLoss);
      return {
        id: t.id,
        ticker: t.ticker,
        bias: t.bias as ThesisBias,
        targetPrice,
        stopLoss,
        rationale: t.rationale,
        close,
        signalLabel,
        breach: computeBreach(t.bias as ThesisBias, targetPrice, stopLoss, close, signalLabel),
        updatedAt: t.updatedAt.toISOString(),
      };
    });
  },

  // Scheduled scan: detect theses whose breach state changed since last pass.
  // Emits thesis:breach only on NEW breaches (dedup via lastNotifiedBreach);
  // recovery clears the flag so a re-breach re-notifies. Review-prompt, not live signal.
  async scanAndNotifyBreaches(): Promise<{ scanned: number; notified: number }> {
    const theses = await thesisRepository.findAll();
    if (theses.length === 0) return { scanned: 0, notified: 0 };

    const tickers = Array.from(new Set(theses.map((t) => t.ticker)));
    const stocks = await stockRepository.findStocksByTickersWithIndicators(tickers);
    const byTicker = new Map(stocks.map((s) => [s.ticker, s]));

    let notified = 0;
    for (const t of theses) {
      const stock = byTicker.get(t.ticker);
      const signalLabel = stock?.indicators[0]?.signalLabel ?? null;
      const close = stock?.prices[0] ? decimalToNumber(stock.prices[0].close) : null;
      const breach = computeBreach(
        t.bias as ThesisBias,
        decimalToNumber(t.targetPrice),
        decimalToNumber(t.stopLoss),
        close,
        signalLabel,
      );

      if (breach !== null && breach !== t.lastNotifiedBreach) {
        eventBus.emit("thesis:breach", {
          userId: t.userId,
          ticker: t.ticker,
          breachKind: breach,
        });
        await thesisRepository.updateLastNotifiedBreach(t.id, breach);
        notified++;
      } else if (breach === null && t.lastNotifiedBreach !== null) {
        await thesisRepository.updateLastNotifiedBreach(t.id, null);
      }
    }
    return { scanned: theses.length, notified };
  },

  async deleteThesis(userId: string, ticker: string) {
    const existing = await thesisRepository.findUserThesis(userId, ticker);
    if (!existing) throw new ThesisNotFoundError();
    return thesisRepository.deleteThesis(userId, ticker);
  },
};
