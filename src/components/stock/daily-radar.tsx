import Link from "next/link";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";
import type { DailyRadarItem } from "@/domains/stock/screener-analysis.service";

/**
 * DailyRadar — "Radar 5 Emiten Hari Ini" (SSR, guest-visible).
 * Retention Loop v1 — PRD idea-2026-10-09-1 AC4. Konten baru tiap hari otomatis dari
 * signal engine existing (golden cross fresh, signalScore desc). Server component — 0 JS tambahan.
 * Fallback jujur: pool < 5 → render n item + label jumlah asli, DILARANG fabricate.
 */
export function DailyRadar({ date, items }: { date: Date | null; items: DailyRadarItem[] }) {
  if (items.length === 0) return null;

  const dateStr = date ? format(date, "d MMM yyyy", { locale: idLocale }) : null;

  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          <h3 className="text-sm font-semibold tracking-tight">Radar {items.length} Emiten Hari Ini</h3>
        </div>
        {dateStr && (
          <span className="font-mono text-[10px] text-text-tertiary">data {dateStr} WIB</span>
        )}
      </div>
      <ul className="divide-y divide-border/60">
        {items.map((it) => (
          <li key={it.ticker}>
            <Link
              href={`/stocks/${it.ticker}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent/[0.04] transition-colors"
            >
              <div className="min-w-0">
                <span className="font-bold text-accent text-sm">{it.ticker.replace(".JK", "")}</span>
                <p className="text-[11px] text-text-secondary truncate max-w-[220px]">{it.name}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {it.signalLabel && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                    {it.signalLabel}
                  </span>
                )}
                <div className="text-right">
                  <p className="font-mono text-xs tabular-nums">
                    {it.close !== null ? `Rp${it.close.toLocaleString("id-ID", { maximumFractionDigits: 0 })}` : "\u2014"}
                  </p>
                  {it.changePercent !== null && (
                    <p className={`font-mono text-[11px] tabular-nums ${it.changePercent >= 0 ? "text-bullish" : "text-bearish"}`}>
                      {it.changePercent >= 0 ? "+" : ""}
                      {it.changePercent.toFixed(2)}%
                    </p>
                  )}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <div className="px-4 py-2 border-t border-border/60">
        <Link
          href="/stocks?view=screener&tab=swing-trade&preset=golden_cross"
          className="text-[11px] text-text-tertiary hover:text-accent transition-colors"
        >
          Lihat semua golden cross hari ini →
        </Link>
      </div>
    </div>
  );
}
