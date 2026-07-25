import { stockRepository } from "./stock.repository";
import { watchlistService } from "@/domains/watchlist/watchlist.service";
import { socialGraphService } from "@/domains/social/social-graph.service";
import { decimalToNumber } from "@/lib/serialize";

export type DeltaTone = "bullish" | "bearish" | "neutral";
export type DeltaKind = "verdict" | "crossover" | "gap";

export interface DeltaBullet {
  ticker: string;
  name: string;
  kind: DeltaKind;
  text: string;
  detail: string | null;
  changePercent: number | null;
  tone: DeltaTone;
}

export interface MorningDelta {
  asOf: string | null;
  trackedCount: number;
  bullets: DeltaBullet[];
}

type StockHistory = Awaited<
  ReturnType<typeof stockRepository.findStocksWithIndicatorHistory>
>[number];

function labelTone(label: string | null | undefined): DeltaTone {
  if (!label) return "neutral";
  const l = label.toLowerCase();
  if (l.includes("bullish")) return "bullish";
  if (l.includes("bearish")) return "bearish";
  return "neutral";
}

// One bullet per ticker, ranked so the most newsworthy change wins.
// verdict flip > golden/death cross > EMA cross > MACD flip > big gap.
function buildCandidate(
  stock: StockHistory,
): { bullet: DeltaBullet; rank: number } | null {
  const latest = stock.indicators[0];
  const prev = stock.indicators[1];
  if (!latest) return null;

  const close0 = decimalToNumber(stock.prices[0]?.close);
  const close1 = decimalToNumber(stock.prices[1]?.close);
  const changePercent =
    close0 !== null && close1 !== null && close1 !== 0
      ? ((close0 - close1) / close1) * 100
      : null;

  const base = { ticker: stock.ticker, name: stock.name, changePercent };

  // 1) Verdict flip — the highest-signal change
  if (prev?.signalLabel && latest.signalLabel && latest.signalLabel !== prev.signalLabel) {
    return {
      bullet: {
        ...base,
        kind: "verdict",
        text: `Sinyal ${latest.signalLabel}`,
        detail: `dari ${prev.signalLabel}`,
        tone: labelTone(latest.signalLabel),
      },
      rank: 30,
    };
  }

  // 2) Crossovers
  if (latest.smaCrossSignal && latest.smaCrossSignal !== prev?.smaCrossSignal) {
    const golden = latest.smaCrossSignal === "golden_cross";
    return {
      bullet: {
        ...base,
        kind: "crossover",
        text: golden ? "Golden cross" : "Death cross",
        detail: "SMA50 & SMA200",
        tone: golden ? "bullish" : "bearish",
      },
      rank: 25,
    };
  }
  if (latest.emaCrossSignal && latest.emaCrossSignal !== prev?.emaCrossSignal) {
    const bull = latest.emaCrossSignal === "bullish";
    return {
      bullet: {
        ...base,
        kind: "crossover",
        text: bull ? "EMA bullish cross" : "EMA bearish cross",
        detail: "EMA12 & EMA26",
        tone: bull ? "bullish" : "bearish",
      },
      rank: 22,
    };
  }
  const macdNow = decimalToNumber(latest.macdHist);
  const macdPrev = decimalToNumber(prev?.macdHist);
  if (
    macdNow !== null &&
    macdPrev !== null &&
    macdNow !== 0 &&
    Math.sign(macdNow) !== Math.sign(macdPrev)
  ) {
    const bull = macdNow > 0;
    return {
      bullet: {
        ...base,
        kind: "crossover",
        text: bull ? "MACD bullish cross" : "MACD bearish cross",
        detail: null,
        tone: bull ? "bullish" : "bearish",
      },
      rank: 20,
    };
  }

  // 3) Gap — only meaningful single-day moves surface on their own
  if (changePercent !== null && Math.abs(changePercent) >= 3) {
    const up = changePercent > 0;
    return {
      bullet: {
        ...base,
        kind: "gap",
        text: up
          ? `Naik ${changePercent.toFixed(1)}%`
          : `Turun ${Math.abs(changePercent).toFixed(1)}%`,
        detail: null,
        tone: up ? "bullish" : "bearish",
      },
      rank: 10 + Math.min(Math.abs(changePercent), 10),
    };
  }

  return null;
}

export const morningDeltaService = {
  async getMorningDelta(userId: string): Promise<MorningDelta> {
    const [watchTickers, followedTickers] = await Promise.all([
      watchlistService.getWatchlistTickers(userId),
      socialGraphService.getFollowedTickers(userId),
    ]);
    const tickers = Array.from(new Set([...watchTickers, ...followedTickers]));
    if (tickers.length === 0) {
      return { asOf: null, trackedCount: 0, bullets: [] };
    }

    const stocks = await stockRepository.findStocksWithIndicatorHistory(tickers);

    const bullets = stocks
      .map(buildCandidate)
      .filter((c): c is { bullet: DeltaBullet; rank: number } => c !== null)
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 3)
      .map((c) => c.bullet);

    const latestDate = stocks
      .map((s) => s.indicators[0]?.date ?? null)
      .filter((d: Date | null): d is Date => d !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    return {
      asOf: latestDate ? latestDate.toISOString() : null,
      trackedCount: stocks.length,
      bullets,
    };
  },
};
