import Link from "next/link";
import { ArrowUpRight, AlertTriangle } from "lucide-react";
import { MiniSparkline } from "@/components/chart/mini-sparkline";
import { HealthScoreBadge } from "@/components/stock/health-score-badge";
import { KeyStatistics } from "@/components/stock/key-statistics";
import { formatPrice, stripJk } from "@/lib/utils";

/**
 * SnapshotBriefing — the data dashboard rendered above the analysis prose on
 * a DAILY_SNAPSHOT article page. Hydrated live by ticker (see berita/[slug] page).
 * Receives already-serialized plain numbers.
 */
export interface BriefingIndicator {
  signalScore: number | null;
  signalLabel: string | null;
  rsi14: number | null;
  macdHist: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  stochK: number | null;
  stochD: number | null;
  adx: number | null;
  bbUpper: number | null;
  bbLower: number | null;
  supertrend: number | null;
  obvTrend: string | null;
  isGorengan: boolean | null;
}

export interface SnapshotBriefingData {
  ticker: string;
  name: string;
  sector: string | null;
  close: number | null;
  change: number | null;
  changePercent: number | null;
  sparkline: number[];
  latest: { open: number | null; high: number | null; low: number | null; volume: number | null } | null;
  week52High: number | null;
  week52Low: number | null;
  indicator: BriefingIndicator | null;
}

function toneFor(value: number | null, bullAbove: number, bearBelow: number): "bull" | "bear" | "neutral" | null {
  if (value === null) return null;
  if (value >= bullAbove) return "bull";
  if (value <= bearBelow) return "bear";
  return "neutral";
}

const TONE_CLASS: Record<string, string> = {
  bull: "text-bullish",
  bear: "text-bearish",
  neutral: "text-text-secondary",
};

function IndicatorChip({ label, value, tone, hint }: { label: string; value: string; tone: "bull" | "bear" | "neutral" | null; hint?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
      <span className="text-xs text-text-tertiary">{label}</span>
      <span
        className={`font-mono text-xs font-semibold tabular-nums ${tone ? TONE_CLASS[tone] : "text-text-secondary"}`}
        title={hint}
      >
        {value}
      </span>
    </div>
  );
}

export function SnapshotBriefing({ data }: { data: SnapshotBriefingData }) {
  const { ticker, name, sector, close, change, changePercent, sparkline, latest, week52High, week52Low, indicator } = data;
  const up = (changePercent ?? 0) >= 0;
  const changeColor = up ? "text-bullish" : "text-bearish";
  const isGorengan = indicator?.isGorengan === true;

  const rsi = indicator?.rsi14 ?? null;
  const macd = indicator?.macdHist ?? null;
  const stochK = indicator?.stochK ?? null;
  const adx = indicator?.adx ?? null;

  return (
    <section className="mb-8" aria-label="Ringkasan teknikal saham">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl depth-shadow-strong border border-border/60 bg-bg-card">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" aria-hidden
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #1c1917 1px, transparent 0)", backgroundSize: "18px 18px" }} />
        <div className="relative p-5 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
            {/* Identity + price */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href={`/stocks/${ticker}`}
                  className="font-mono text-sm font-bold text-accent bg-accent/10 px-2 py-0.5 rounded hover:bg-accent/20 transition-colors"
                >
                  {stripJk(ticker)}
                </Link>
                {sector && <span className="text-[11px] text-text-tertiary">{sector}</span>}
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-text-primary leading-tight">
                {name}
              </h2>
              <div className="mt-3 flex items-baseline gap-3">
                <span className="font-mono text-3xl sm:text-4xl font-bold tabular-nums text-text-primary">
                  {close !== null ? formatPrice(close) : "—"}
                </span>
                {changePercent !== null && (
                  <span className={`flex items-center gap-1 font-mono text-sm font-semibold tabular-nums ${changeColor}`}>
                        <span aria-hidden>{up ? "▲" : "▼"}</span>
                    {up ? "+" : ""}{changePercent.toFixed(2)}%
                    {change !== null && (
                      <span className="hidden sm:inline opacity-70">({up ? "+" : ""}{change.toFixed(0)})</span>
                    )}
                  </span>
                )}
              </div>
            </div>

            {/* Signal gauge */}
            <div className="flex items-center gap-4 self-start">
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Sinyal</p>
                <p className="font-mono text-sm font-bold text-text-primary">
                  {indicator?.signalLabel ?? "—"}
                </p>
              </div>
              <HealthScoreBadge signalScore={indicator?.signalScore ?? null} size="lg" />
            </div>
          </div>

          {/* Sparkline strip */}
          {sparkline.length >= 2 && (
            <div className="mt-5 pt-5 border-t border-border/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Pergerakan Terakhir</span>
                <span className="text-[10px] text-text-tertiary font-mono">{sparkline.length} hari</span>
              </div>
              <div className="w-full" aria-hidden>
                <MiniSparkline data={sparkline} width={640} height={64} responsive />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Gorengan warning */}
      {isGorengan && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-300/50 bg-amber-50 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-amber-800">Saham Gorengan — Hati-hati</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Volatilitas tinggi &amp; rentan manipulasi pasar. Hanya untuk trader berpengalaman dengan manajemen risiko ketat.
            </p>
          </div>
        </div>
      )}

      {/* Stats + indicators */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <KeyStatistics
          open={latest?.open ?? null}
          high={latest?.high ?? null}
          low={latest?.low ?? null}
          close={close}
          volume={latest?.volume ?? null}
          week52High={week52High}
          week52Low={week52Low}
          sma20={indicator?.sma20 ?? null}
          sma50={indicator?.sma50 ?? null}
          sma200={indicator?.sma200 ?? null}
        />

        <div className="indicator-card depth-shadow p-4">
          <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">Indikator Teknikal</h3>
          <IndicatorChip label="RSI (14)" value={rsi !== null ? rsi.toFixed(1) : "—"} tone={toneFor(rsi, 0, 0) === null ? null : (rsi! >= 70 ? "bear" : rsi! <= 30 ? "bull" : "neutral")} hint=">70 overbought, <30 oversold" />
          <IndicatorChip label="MACD Histogram" value={macd !== null ? macd.toFixed(2) : "—"} tone={macd === null ? null : macd >= 0 ? "bull" : "bear"} />
          <IndicatorChip label="Stochastic %K" value={stochK !== null ? stochK.toFixed(1) : "—"} tone={stochK === null ? null : stochK >= 80 ? "bear" : stochK <= 20 ? "bull" : "neutral"} />
          <IndicatorChip label="ADX (trend strength)" value={adx !== null ? adx.toFixed(1) : "—"} tone={adx === null ? null : adx >= 25 ? "bull" : "neutral"} hint=">25 = tren kuat" />
          <IndicatorChip label="Bollinger Atas" value={indicator?.bbUpper !== null && indicator?.bbUpper !== undefined ? formatPrice(indicator.bbUpper) : "—"} tone={null} />
          <IndicatorChip label="Bollinger Bawah" value={indicator?.bbLower !== null && indicator?.bbLower !== undefined ? formatPrice(indicator.bbLower) : "—"} tone={null} />
          <IndicatorChip label="Supertrend" value={indicator?.supertrend !== null && indicator?.supertrend !== undefined ? formatPrice(indicator.supertrend) : "—"} tone={null} />
          <IndicatorChip label="OBV Trend" value={indicator?.obvTrend ?? "—"} tone={indicator?.obvTrend === "Rising" ? "bull" : indicator?.obvTrend === "Falling" ? "bear" : "neutral"} />
        </div>
      </div>

      {/* CTA to full stock page */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl depth-shadow border border-border/60 bg-bg-card p-4">
        <div>
          <p className="text-sm font-semibold text-text-primary">Lihat chart lengkap &amp; rencana trading</p>
          <p className="text-xs text-text-tertiary mt-0.5">TradingView, indikator interaktif, support/resistance, dan trading plan untuk {stripJk(ticker)}.</p>
        </div>
        <Link
          href={`/stocks/${ticker}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 transition-colors press-scale"
        >
          Buka {stripJk(ticker)}
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
