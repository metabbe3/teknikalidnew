import { stripJk } from "@/lib/utils";
import { tgDeepLink } from "@/lib/tg-deeplink";

interface StockAiPromptChipsProps {
  ticker: string;
  rsi14: number | null;
  signalScore: number | null;
}

export function StockAiPromptChips({
  ticker,
  rsi14,
}: StockAiPromptChipsProps) {
  const clean = stripJk(ticker);

  const riskText = (() => {
    if (rsi14 !== null && rsi14 >= 65) return `⚠️ ${clean} rawan koreksi atau lanjut?`;
    if (rsi14 !== null && rsi14 <= 35) return `🔄 ${clean} sudah siap pantul belum?`;
    return `🛡️ Cek risiko & aliran asing ${clean}`;
  })();

  const chips = [
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

  return (
    <div
      className="mt-2.5 flex flex-wrap items-center gap-1.5"
      aria-label={`Pilihan tanya AI untuk saham ${clean}`}
    >
      {chips.map((chip) => (
        <a
          key={chip.key}
          href={tgDeepLink([clean], chip.intent)}
          data-engagement={chip.engagement}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-9 items-center rounded-lg border border-border/80 bg-bg/80 px-2.5 py-1 text-xs font-medium text-text-secondary hover:border-accent/40 hover:bg-bg-hover hover:text-text-primary transition-colors"
        >
          {chip.text}
        </a>
      ))}
    </div>
  );
}

export default StockAiPromptChips;
