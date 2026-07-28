import { AlertTriangle, Flame } from "lucide-react";
import { HealthScoreBadge } from "@/components/stock/health-score-badge";
import { stripJk } from "@/lib/utils";

export interface SignalVerdictProps {
  ticker: string;
  signalLabel: string | null;
  signalScore: number | null;
  outlook: "Bullish" | "Bearish" | "Neutral";
  rsi14: number | null;
  isGorengan?: boolean | null;
  showHypeAlert?: boolean;
  /** Dynamic per-stock prose (summarizeVerdict). Falls back to static tone summary. */
  summary?: string;
}

const TONE: Record<SignalVerdictProps["outlook"], { color: string; summary: string }> = {
  Bullish: { color: "#0d9488", summary: "Indikator teknikal condong bullish — momentum beli sedang kuat. Tetap kelola risiko dengan stop loss." },
  Bearish: { color: "#dc2626", summary: "Hati-hati — indikator menunjukkan tekanan jual dominan. Pertimbangkan menunggu konfirmasi." },
  Neutral: { color: "#78716c", summary: "Sinyal masih netral — belum ada arah yang jelas. Tunggu konfirmasi sebelum mengambil posisi." },
};

/**
 * SignalVerdict — the bold, plain-language verdict that leads the stock page.
 * Answers the beginner's "should I buy/hold/sell?" before the data dump.
 */
export function SignalVerdict({ ticker, signalLabel, signalScore, outlook, rsi14, isGorengan, showHypeAlert, summary }: SignalVerdictProps) {
  const tone = TONE[outlook];
  const verdictLabel = signalLabel ?? outlook;
  const verdictSummary = summary ?? tone.summary;
  const rsiHint =
    rsi14 !== null ? (rsi14 >= 70 ? "RSI overbought" : rsi14 <= 30 ? "RSI oversold" : null) : null;

  return (
    <section className="border-b border-border bg-bg-card" aria-label="Verdik sinyal teknikal">
      <div className="max-w-7xl mx-auto px-4 py-5 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          {/* Verdict */}
          <div className="flex items-center gap-3 sm:min-w-[230px]">
            <span className="h-11 w-1.5 rounded-full shrink-0" style={{ backgroundColor: tone.color }} aria-hidden />
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary">Verdik Sinyal</p>
              <p className="font-serif text-2xl sm:text-3xl font-semibold leading-tight" style={{ color: tone.color }}>
                {verdictLabel}
              </p>
            </div>
          </div>

          {/* Plain-language summary */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-secondary leading-relaxed">{verdictSummary}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
              <span className="text-text-tertiary">{stripJk(ticker)}</span>
              {rsiHint && (
                <span className={`px-1.5 py-0.5 rounded ${rsi14! >= 70 ? "text-bearish bg-bearish/10" : "text-bullish bg-bullish/10"}`}>
                  {rsiHint}
                </span>
              )}
              {isGorengan && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-amber-600 bg-amber-500/10">
                  <Flame className="h-3 w-3" aria-hidden /> Gorengan
                </span>
              )}
              {showHypeAlert && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-bearish bg-bearish/10">
                  <AlertTriangle className="h-3 w-3" aria-hidden /> Hype/FOMO
                </span>
              )}
            </div>
          </div>

          {/* Score gauge */}
          <div className="self-start sm:self-auto">
            <HealthScoreBadge signalScore={signalScore} size="lg" />
          </div>
        </div>
      </div>
    </section>
  );
}
