"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SwingMarketResponse, SwingCandidateItem } from "@/app/api/market/swing/route";
import { StockLogo } from "@/components/stock/stock-logo";
import { signalBadge } from "@/lib/seo/signal-badge";
import { formatPrice, stripJk } from "@/lib/utils";
import { formatDecimalId } from "@/lib/format-number";
import { ArrowUpRight, Target, TrendingUp } from "lucide-react";

export function filterSwingCandidates(candidates: SwingCandidateItem[] | null | undefined, max = 12): SwingCandidateItem[] {
  if (!Array.isArray(candidates)) return [];
  return candidates.slice(0, max);
}

export function StocksSwingPanel({ linkBase = "/stocks" }: { linkBase?: string }) {
  const [data, setData] = useState<SwingMarketResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/market/swing")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json: SwingMarketResponse) => {
        if (cancelled) return;
        setData(json);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const candidates = filterSwingCandidates(data?.candidates, 12);

  return (
    <div className="space-y-4">
      {/* Top CTA Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-accent/25 bg-accent/5 p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="https://t.me/TeknikalidAgentBot?start=web_swing"
            target="_blank"
            rel="noopener noreferrer"
            data-engagement="funnel_swingPanelBotCta"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-xs font-bold text-white hover:bg-accent/90 transition-colors"
          >
            💬 Minta AI pilihkan 1 setup swing terbaik sore ini — gratis 3x
          </a>
        </div>
        <Link
          href="/swing"
          data-engagement="nav_hubTabSwing_click"
          data-nav-label="nav_hubTabSwing_click"
          className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-accent hover:underline shrink-0"
        >
          <span>Buka katalog lengkap &amp; backtest (/swing)</span>
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-bg-card p-8 text-center text-sm text-text-secondary" role="status">
          Memuat kandidat setup swing…
        </div>
      ) : error || candidates.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-card p-8 text-center space-y-2">
          <Target className="h-8 w-8 text-text-tertiary mx-auto" />
          <p className="text-sm font-medium text-text-primary">
            {error ? "Gagal memuat data setup swing." : "Belum ada kandidat setup swing untuk sesi ini."}
          </p>
          <Link
            href="/swing"
            className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
          >
            Lihat halaman /swing <ArrowUpRight className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
              <TrendingUp className="h-4 w-4 text-accent" aria-hidden />
              <span>Top {candidates.length} Kandidat Swing (Sinyal Terkuat · EOD {data?.asOf})</span>
            </div>
            <span className="text-[11px] text-text-tertiary hidden sm:inline">
              Estimasi SL &amp; TP berbasis ATR (1,5x)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {candidates.map((item) => {
              const clean = stripJk(item.ticker);
              const badge = signalBadge(item.signalScore);
              const scoreStr = `${item.signalScore > 0 ? "+" : ""}${formatDecimalId(item.signalScore, 2)}`;

              return (
                <Link
                  key={item.ticker}
                  href={`${linkBase}/${item.ticker}`}
                  data-engagement="chip_swingSetupTicker"
                  className="group flex flex-col justify-between rounded-xl border border-border bg-bg-card p-3.5 transition-all hover:border-accent/40 hover:bg-bg-hover"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <StockLogo name={item.name} ticker={item.ticker} size={32} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-sm font-bold text-text-primary group-hover:text-accent transition-colors">
                            {clean}
                          </span>
                          <ArrowUpRight className="h-3.5 w-3.5 text-text-tertiary opacity-0 group-hover:opacity-100 group-hover:text-accent transition-opacity" aria-hidden />
                        </div>
                        <p className="text-xs text-text-tertiary truncate max-w-[160px]">
                          {item.name}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums shrink-0 ${badge.cls}`}
                    >
                      {scoreStr} · {badge.label}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-1.5 rounded-lg border border-border/70 bg-bg/60 p-2 text-center">
                    <div>
                      <div className="text-[10px] text-text-tertiary">Entry</div>
                      <div className="font-mono text-xs font-semibold tabular-nums text-text-primary">
                        {formatPrice(item.close)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-text-tertiary">Stop (SL)</div>
                      <div className="font-mono text-xs font-semibold tabular-nums text-bearish">
                        {formatPrice(item.estimatedStop)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-text-tertiary">Target (TP)</div>
                      <div className="font-mono text-xs font-semibold tabular-nums text-bullish">
                        {formatPrice(item.estimatedTarget)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-text-tertiary">R:R</div>
                      <div className="font-mono text-xs font-bold tabular-nums text-accent">
                        1:{formatDecimalId(item.estimatedRR, 1)}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default StocksSwingPanel;
