import { stripJk } from "@/lib/utils";
import { tgDeepLink } from "@/lib/tg-deeplink";
import { StockAiChip } from "@/components/stock/stock-ai-chip";

export interface StockAiPromptChipsProps {
  ticker: string;
  rsi14: number | null;
  signalScore: number | null;
}

export interface AdaptiveChipItem {
  key: string;
  intent: string;
  engagement: string;
  text: string;
}

/**
 * Pure function: memilih 1 chip adaptif berdasarkan nilai RSI dan skor sinyal.
 * Aturan (maksimal 1 chip adaptif tambahan):
 *  - rsi14 < 35  → "Kenapa RSI rendah?"
 *  - rsi14 > 65  → "RSI tinggi, waktunya take profit?"
 *  - signalScore > 0.6 → "Sinyal beli kuat?"
 * Jika tidak ada kondisi terpenuhi → return null.
 */
export function pickAdaptiveChip(
  rsi: number | null | undefined,
  score: number | null | undefined
): AdaptiveChipItem | null {
  if (typeof rsi === "number" && Number.isFinite(rsi)) {
    if (rsi < 35) {
      return {
        key: "rsi_low",
        intent: "rsi_low",
        engagement: "chip_aiPromptRsiLow",
        text: "Kenapa RSI rendah?",
      };
    }
    if (rsi > 65) {
      return {
        key: "rsi_high",
        intent: "rsi_high",
        engagement: "chip_aiPromptRsiHigh",
        text: "RSI tinggi, waktunya take profit?",
      };
    }
  }

  if (typeof score === "number" && Number.isFinite(score) && score > 0.6) {
    return {
      key: "signal_strong",
      intent: "sinyal",
      engagement: "chip_aiPromptSignalStrong",
      text: "Sinyal beli kuat?",
    };
  }

  return null;
}

export function StockAiPromptChips({
  ticker,
  rsi14,
  signalScore,
}: StockAiPromptChipsProps) {
  const clean = stripJk(ticker);

  const riskText = (() => {
    if (rsi14 !== null && rsi14 >= 65) return `⚠️ ${clean} rawan koreksi atau lanjut?`;
    if (rsi14 !== null && rsi14 <= 35) return `🔄 ${clean} sudah siap pantul belum?`;
    return `🛡️ Cek risiko & aliran asing ${clean}`;
  })();

  const baseChips = [
    {
      key: "entry",
      intent: "entry",
      engagement: "chip_aiPromptEntry",
      text: `🎯 Analisa ${clean} buat entry hari ini?`,
    },
    {
      key: "level",
      intent: "level",
      engagement: "chip_aiPromptLevel",
      text: `📐 Berapa support & target ${clean}?`,
    },
    {
      key: "risk",
      intent: "risiko",
      engagement: "chip_aiPromptRisk",
      text: riskText,
    },
  ];

  const adaptive = pickAdaptiveChip(rsi14, signalScore);
  const chips = adaptive ? [...baseChips, adaptive] : baseChips;

  return (
    <div
      className="mt-2.5 flex flex-wrap items-center gap-1.5"
      aria-label={`Pilihan tanya AI untuk saham ${clean}`}
    >
      {chips.map((chip) => (
        <StockAiChip
          key={chip.key}
          baseHref={tgDeepLink([clean], chip.intent)}
          chipKey={chip.key}
          engagement={chip.engagement}
          className="inline-flex min-h-9 items-center rounded-lg border border-border/80 bg-bg/80 px-2.5 py-1 text-xs font-medium text-text-secondary hover:border-accent/40 hover:bg-bg-hover hover:text-text-primary transition-colors"
        >
          {chip.text}
        </StockAiChip>
      ))}
    </div>
  );
}

export default StockAiPromptChips;
