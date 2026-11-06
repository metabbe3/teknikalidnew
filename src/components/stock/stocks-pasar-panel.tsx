"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StockLogo } from "@/components/stock/stock-logo";
import { formatPrice, formatPercentPlain, stripJk, normalizeTicker } from "@/lib/utils";
import { ArrowUpRight, Minus, TrendingDown, TrendingUp, Zap } from "lucide-react";

export interface MarketOverviewMover {
  ticker: string;
  name: string;
  sector: string;
  close: number | null;
  changePercent: number;
}

export interface MarketOverviewResponse {
  gainers: MarketOverviewMover[];
  losers: MarketOverviewMover[];
  sectors: Record<string, { avgChange: number; count: number }>;
  advancersCount: number;
  declinersCount: number;
  unchangedCount: number;
}

export function computeBreadthRatios(advancers: number, decliners: number, unchanged: number) {
  const total = Math.max(advancers + decliners + unchanged, 1);
  return {
    advPct: Math.round((advancers / total) * 100),
    decPct: Math.round((decliners / total) * 100),
    unchPct: Math.max(0, 100 - Math.round((advancers / total) * 100) - Math.round((decliners / total) * 100)),
  };
}

export function StocksPasarPanel({ linkBase = "/stocks" }: { linkBase?: string }) {
  const [data, setData] = useState<MarketOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/market")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json: MarketOverviewResponse) => {
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

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-8 text-center text-sm text-text-secondary" role="status">
        Memuat ringkasan Koran Pasar…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-8 text-center space-y-2">
        <Zap className="h-8 w-8 text-text-tertiary mx-auto" />
        <p className="text-sm font-medium text-text-primary">Gagal memuat data ringkasan pasar.</p>
        <Link
          href="/pasar"
          className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
        >
          Buka Koran Saham Live penuh (/pasar) →
        </Link>
      </div>
    );
  }

  const gainers = (data.gainers ?? []).slice(0, 5);
  const losers = (data.losers ?? []).slice(0, 5);
  const ratios = computeBreadthRatios(
    data.advancersCount ?? 0,
    data.declinersCount ?? 0,
    data.unchangedCount ?? 0
  );

  return (
    <div className="space-y-4">
      {/* Market Breadth Bar */}
      <div className="rounded-xl border border-border bg-bg-card p-4 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold uppercase tracking-wider text-text-tertiary">
            Market Breadth BEI Hari Ini
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1 font-semibold text-bullish">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden />
              <span className="font-mono tabular-nums">{data.advancersCount}</span> naik
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-bearish">
              <TrendingDown className="h-3.5 w-3.5" aria-hidden />
              <span className="font-mono tabular-nums">{data.declinersCount}</span> turun
            </span>
            <span className="inline-flex items-center gap-1 text-text-tertiary">
              <Minus className="h-3.5 w-3.5" aria-hidden />
              <span className="font-mono tabular-nums">{data.unchangedCount}</span> stagnan
            </span>
          </div>
        </div>
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-bg-hover" aria-hidden="true">
          <div className="bg-bullish transition-all" style={{ width: `${ratios.advPct}%` }} />
          <div className="bg-text-tertiary/30 transition-all" style={{ width: `${ratios.unchPct}%` }} />
          <div className="bg-bearish transition-all" style={{ width: `${ratios.decPct}%` }} />
        </div>
      </div>

      {/* Top 5 Gainers & Top 5 Losers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top 5 Gainers */}
        <div className="rounded-xl border border-border bg-bg-card p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-bullish uppercase tracking-wider">
            <TrendingUp className="h-4 w-4" aria-hidden />
            <span>Top 5 Gainers</span>
          </div>
          <div className="divide-y divide-border/70">
            {gainers.map((m) => {
              const tickerJk = normalizeTicker(m.ticker);
              const clean = stripJk(tickerJk);
              return (
                <Link
                  key={tickerJk}
                  href={`${linkBase}/${tickerJk}`}
                  className="group flex items-center justify-between gap-2 py-2.5 min-h-11 transition-colors hover:bg-bg-hover/60 px-1.5 rounded-lg"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <StockLogo name={m.name} ticker={tickerJk} size={28} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs font-bold text-text-primary group-hover:text-accent transition-colors">
                          {clean}
                        </span>
                        <ArrowUpRight className="h-3 w-3 text-text-tertiary opacity-0 group-hover:opacity-100 group-hover:text-accent transition-opacity" aria-hidden />
                      </div>
                      <p className="text-[11px] text-text-tertiary truncate max-w-[150px] sm:max-w-[200px]">
                        {m.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs font-semibold tabular-nums text-text-primary">
                      {m.close !== null ? formatPrice(m.close) : "—"}
                    </div>
                    <div className="font-mono text-[11px] font-bold tabular-nums text-bullish">
                      +{formatPercentPlain(m.changePercent)}%
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Top 5 Losers */}
        <div className="rounded-xl border border-border bg-bg-card p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-bearish uppercase tracking-wider">
            <TrendingDown className="h-4 w-4" aria-hidden />
            <span>Top 5 Losers</span>
          </div>
          <div className="divide-y divide-border/70">
            {losers.map((m) => {
              const tickerJk = normalizeTicker(m.ticker);
              const clean = stripJk(tickerJk);
              return (
                <Link
                  key={tickerJk}
                  href={`${linkBase}/${tickerJk}`}
                  className="group flex items-center justify-between gap-2 py-2.5 min-h-11 transition-colors hover:bg-bg-hover/60 px-1.5 rounded-lg"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <StockLogo name={m.name} ticker={tickerJk} size={28} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs font-bold text-text-primary group-hover:text-accent transition-colors">
                          {clean}
                        </span>
                        <ArrowUpRight className="h-3 w-3 text-text-tertiary opacity-0 group-hover:opacity-100 group-hover:text-accent transition-opacity" aria-hidden />
                      </div>
                      <p className="text-[11px] text-text-tertiary truncate max-w-[150px] sm:max-w-[200px]">
                        {m.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs font-semibold tabular-nums text-text-primary">
                      {m.close !== null ? formatPrice(m.close) : "—"}
                    </div>
                    <div className="font-mono text-[11px] font-bold tabular-nums text-bearish">
                      -{formatPercentPlain(m.changePercent)}%
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer CTA Bot + Link ke /pasar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-accent/25 bg-accent/5 p-3.5 sm:p-4">
        <a
          href="https://t.me/TeknikalidAgentBot?start=kopi_pasar"
          target="_blank"
          rel="noopener noreferrer"
          data-engagement="funnel_pasarPanelBotCta"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-xs font-bold text-white hover:bg-accent/90 transition-colors"
        >
          ☕ Tanya arah IHSG &amp; aliran asing hari ini di Bot — gratis 3x
        </a>
        <Link
          href="/pasar"
          data-engagement="nav_hubTabPasar_click"
          data-nav-label="nav_hubTabPasar_click"
          className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-accent hover:underline shrink-0"
        >
          Buka Koran Saham Live penuh (/pasar) →
        </Link>
      </div>
    </div>
  );
}

export default StocksPasarPanel;
