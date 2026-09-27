import Link from "next/link";
import { MiniSparkline } from "@/components/chart/mini-sparkline";
import { formatPrice, stripJk, signalToHealthScore, healthScoreMeta } from "@/lib/utils";

/**
 * SnapshotCard — a "Saham Hari Ini" signal tile.
 * Surfaces the DAILY_SNAPSHOT's live stock data (price, change, sparkline,
 * signal, RSI) instead of a generic article cover-image card.
 * Server component — no client interactivity (whole card is a Link).
 */
export interface SnapshotCardData {
  ticker: string; // "BBCA.JK"
  name: string;
  sector: string | null;
  slug: string;
  close: number | null;
  changePercent: number | null;
  sparkline: number[];
  signalScore: number | null;
  signalLabel: string | null;
  rsi14: number | null;
  isGorengan?: boolean;
}

function rsiTone(rsi: number | null): { color: string; label: string } | null {
  if (rsi === null) return null;
  if (rsi >= 70) return { color: "text-bearish", label: "Overbought" };
  if (rsi <= 30) return { color: "text-bullish", label: "Oversold" };
  return { color: "text-text-tertiary", label: "Netral" };
}

export function SnapshotCard({
  ticker,
  name,
  sector,
  slug,
  close,
  changePercent,
  sparkline,
  signalScore,
  rsi14,
  isGorengan,
}: SnapshotCardData) {
  const up = (changePercent ?? 0) >= 0;
  const changeColor = up ? "text-bullish" : "text-bearish";
  const score = signalToHealthScore(signalScore);
  const meta = score !== null ? healthScoreMeta(score) : null;
  const rsi = rsiTone(rsi14);
  const chgPct = changePercent !== null ? `${up ? "+" : ""}${changePercent.toFixed(2)}%` : null;

  return (
    <Link
      href={`/berita/${slug}`}
      className="group relative flex flex-col bg-bg-card rounded-xl p-4 border border-border/60 hover:border-accent/30 hover:depth-shadow-hover transition-all duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      aria-label={`${stripJk(ticker)} ${name}${close !== null ? `, harga ${formatPrice(close)}` : ""}${chgPct ? `, ${chgPct}` : ""}`}
    >
      {/* Top: ticker + signal pill */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="font-mono text-sm font-bold text-text-primary tabular-nums">
            {stripJk(ticker)}
          </span>
          <p className="text-[11px] text-text-tertiary leading-tight line-clamp-2 mt-0.5">
            {name}
          </p>
        </div>
        {meta && (
          <span
            className="inline-flex items-center gap-1 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ color: meta.color, backgroundColor: meta.bg }}
            title={`Sinyal: ${meta.label} (${score}/100)`}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
            {meta.label}
          </span>
        )}
      </div>

      {/* Middle: price + change | sparkline */}
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <span className="font-mono text-lg font-bold tabular-nums text-text-primary">
            {close !== null ? formatPrice(close) : "—"}
          </span>
          {changePercent !== null && (
            <div className={`flex items-center gap-1 font-mono text-xs font-semibold tabular-nums ${changeColor}`}>
              <span aria-hidden>{up ? "▲" : "▼"}</span>
              <span>{chgPct}</span>
            </div>
          )}
        </div>
        {sparkline.length >= 2 && (
          <div className="shrink-0" aria-hidden>
            <MiniSparkline data={sparkline} width={72} height={34} />
          </div>
        )}
      </div>

      {/* Bottom: RSI tone + sector / gorengan */}
      <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between gap-2 text-[10px] font-mono">
        {rsi ? (
          <span className={`font-semibold ${rsi.color}`} title={`RSI ${rsi14} — ${rsi.label}`}>
            RSI {Math.round(rsi14 as number)}
          </span>
        ) : (
          <span className="text-text-tertiary">RSI —</span>
        )}
        <div className="flex items-center gap-1.5 min-w-0">
          {isGorengan && (
            <span
              className="rounded-full bg-warning-bg px-1.5 py-0.5 text-warning font-semibold"
              title="Saham gorengan — volatilitas tinggi, hati-hati"
            >
              Gorengan
            </span>
          )}
          {sector && (
            <span className="text-text-tertiary truncate" title={sector}>
              {sector}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
