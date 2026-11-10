import { signalLabelId } from "@/lib/signal-label-id";
import { AlertTriangle, Flame } from "lucide-react";
import { HealthScoreBadge } from "@/components/stock/health-score-badge";
import { stripJk } from "@/lib/utils";
import { VerdictFeedback } from "@/components/stock/verdict-feedback";

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
  const verdictLabel = signalLabelId(signalLabel ?? outlook);
  const verdictSummary = summary ?? tone.summary;
  const rsiHint =
    rsi14 !== null ? (rsi14 >= 70 ? "RSI overbought" : rsi14 <= 30 ? "RSI oversold" : null) : null;

  return (
    <section className="border-b border-border bg-bg-card" aria-label="Skor sinyal teknikal">
      <div className="max-w-7xl mx-auto px-4 py-5 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          {/* Verdict */}
          <div className="flex items-center gap-3 sm:min-w-[230px]">
            <span className="h-11 w-1.5 rounded-full shrink-0" style={{ backgroundColor: tone.color }} aria-hidden />
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary">Skor Sinyal</p>
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

        {/* Micro-feedback pasif: Akurat? (owner 27 Okt) */}
        <div className="mt-3 sm:hidden">
          <VerdictFeedback ticker={ticker} />
        </div>
      </div>
    </section>
  );
}

export interface QuickVerdictProps {
  close: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  rsi14: number | null;
  macdHist: number | null;
}

export function deriveQuickVerdict({
  close,
  sma20,
  sma50,
  sma200,
  rsi14,
  macdHist,
}: QuickVerdictProps): {
  icon: "▲" | "▼" | "→";
  label: "Tren Naik" | "Tren Turun" | "Sideways";
  badgeCls: string;
  reason: string;
} {
  if (close === null || (sma20 === null && sma50 === null && sma200 === null && rsi14 === null)) {
    return {
      icon: "→",
      label: "Sideways",
      badgeCls: "badge-neutral",
      reason: "Indikator harian sedang diperbarui — tren belum terkonfirmasi.",
    };
  }

  const refMa = sma50 ?? sma20 ?? sma200;
  const refMaName = sma50 !== null ? "SMA50" : sma20 !== null ? "SMA20" : "SMA200";

  const aboveRef = refMa !== null && close > refMa;
  const belowRef = refMa !== null && close < refMa;

  const bullMomentum =
    (rsi14 === null || rsi14 >= 48) &&
    (macdHist === null || macdHist >= 0 || (sma20 !== null && close > sma20));
  const bearMomentum =
    (rsi14 === null || rsi14 <= 52) &&
    (macdHist === null || macdHist <= 0 || (sma20 !== null && close < sma20));

  let icon: "▲" | "▼" | "→" = "→";
  let label: "Tren Naik" | "Tren Turun" | "Sideways" = "Sideways";
  let badgeCls = "badge-neutral";
  let conclusion = "tren mendatar, tunggu konfirmasi arah";

  if (aboveRef && bullMomentum) {
    icon = "▲";
    label = "Tren Naik";
    badgeCls = "badge-strong";
    conclusion =
      rsi14 !== null && rsi14 >= 70
        ? "tren naik, waspadai area jenuh beli"
        : "tren naik, momentum cukup";
  } else if (belowRef && bearMomentum) {
    icon = "▼";
    label = "Tren Turun";
    badgeCls = "badge-risk";
    conclusion =
      rsi14 !== null && rsi14 <= 30
        ? "tren turun, mendekati area jenuh jual"
        : "tren turun, tekanan jual masih aktif";
  }

  const maPart =
    refMa !== null
      ? close > refMa
        ? `Harga di atas ${refMaName}`
        : close < refMa
          ? `Harga di bawah ${refMaName}`
          : `Harga sejajar ${refMaName}`
      : null;
  const rsiPart = rsi14 !== null ? `RSI ${Math.round(rsi14)}` : null;
  const prefix = [maPart, rsiPart].filter(Boolean).join(", ");

  return {
    icon,
    label,
    badgeCls,
    reason: prefix ? `${prefix} — ${conclusion}` : conclusion,
  };
}

/**
 * QuickVerdictBox — kotak verdict 1-baris langsung di bawah harga (di atas Trading Plan).
 * Menyederhanakan indikator existing (SMA20/50/200, RSI, MACD) ke bahasa manusia.
 */
export function QuickVerdictBox(props: QuickVerdictProps) {
  const verdict = deriveQuickVerdict(props);

  return (
    <div
      data-verdict="quick"
      aria-label="Ringkasan cepat arah tren"
      className="mt-3 rounded-xl border border-border bg-bg-card px-3.5 py-2.5 min-h-[44px] flex flex-col justify-center gap-1"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
        <span className="text-[11px] font-semibold text-text-tertiary">Tren:</span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold shrink-0 ${verdict.badgeCls}`}
        >
          <span aria-hidden="true">{verdict.icon}</span>
          <span>{verdict.label}</span>
        </span>
        <span className="text-text-secondary leading-snug">{verdict.reason}</span>
      </div>
      <p className="text-[10px] text-text-tertiary leading-snug">
        Bukan rekomendasi beli/jual.
      </p>
    </div>
  );
}

