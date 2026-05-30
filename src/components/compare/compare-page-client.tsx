"use client";

import { Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { RANGE_KEYS, type DateRange } from "@/lib/constants";
import { useCompareData } from "@/hooks/use-compare-data";
import { StockSelector } from "./stock-selector";
import { ComparisonTable } from "./comparison-table";
import { stripJk, formatPercent } from "@/lib/utils";

const NormalizedOverlayChart = dynamic(
  () => import("@/components/compare/normalized-overlay-chart").then((mod) => mod.NormalizedOverlayChart),
  { ssr: false, loading: () => <div className="w-full h-[320px] sm:h-[420px] bg-bg-card rounded-xl animate-pulse" /> }
);

const PRESETS = [
  { label: "Big 4 Banks", tickers: ["BBCA.JK", "BBRI.JK", "BMRI.JK", "BBNI.JK"], emoji: "🏦" },
  { label: "Telco", tickers: ["TLKM.JK", "ISAT.JK", "EXCL.JK", "TOWR.JK"], emoji: "📡" },
  { label: "Mining", tickers: ["AMMN.JK", "ADRO.JK", "MDKA.JK", "ANTM.JK"], emoji: "⛏️" },
  { label: "Consumer", tickers: ["ICBP.JK", "INDF.JK", "UNVR.JK", "CPIN.JK"], emoji: "🛒" },
  { label: "Blue Chips", tickers: ["BBCA.JK", "BBRI.JK", "TLKM.JK", "ASII.JK"], emoji: "💎" },
  { label: "Syariah Banks", tickers: ["BRIS.JK", "ARTO.JK", "BBCA.JK", "BBRI.JK"], emoji: "🕌" },
];

function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tickers = searchParams.getAll("s");
  const range = (searchParams.get("range") ?? "6mo") as DateRange;
  const { data, isLoading, error, refetch } = useCompareData(tickers, range);

  const navigate = useCallback((newTickers: string[], newRange: DateRange) => {
    const params = new URLSearchParams();
    newTickers.forEach((t) => params.append("s", t));
    params.set("range", newRange);
    router.push(`/compare?${params.toString()}`);
  }, [router]);

  const setRange = useCallback((r: DateRange) => {
    navigate(tickers, r);
  }, [tickers, navigate]);

  const addStock = useCallback((ticker: string) => {
    navigate([...tickers, ticker], range);
  }, [tickers, range, navigate]);

  const removeStock = useCallback((ticker: string) => {
    const next = tickers.filter((t) => t !== ticker);
    if (next.length === 0) {
      router.push("/compare");
      return;
    }
    navigate(next, range);
  }, [tickers, range, navigate, router]);

  const loadPreset = useCallback((presetTickers: string[]) => {
    navigate(presetTickers, range);
  }, [range, navigate]);

  const stocks = data?.stocks ?? [];
  const isPresetActive = (presetTickers: string[]) =>
    tickers.length === presetTickers.length && tickers.every((t) => presetTickers.includes(t));

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Presets + Selector */}
      <div className="space-y-4">
        {/* Preset pills */}
        <div className="flex flex-wrap gap-2">
          <span className="text-[10px] text-text-tertiary font-semibold tracking-widest uppercase self-center mr-1">Cepat</span>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => loadPreset(p.tickers)}
              className={`px-3 py-1.5 text-[11px] font-semibold rounded-full border transition-all duration-200 cursor-pointer ${
                isPresetActive(p.tickers)
                  ? "bg-cyan-500 text-white border-cyan-500 shadow-sm shadow-cyan-500/20"
                  : "bg-bg-card text-text-secondary border-border hover:border-cyan-400/40 hover:text-cyan-600 depth-shadow"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <StockSelector selected={tickers} onAdd={addStock} onRemove={removeStock} stocks={stocks} />
      </div>

      {tickers.length >= 2 && (
        <>
          {/* Error state */}
          {error && (
            <div className="bg-bearish/5 border border-bearish/20 rounded-xl p-4 flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-bearish shrink-0" aria-hidden="true">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-bearish font-medium">Gagal memuat data perbandingan</p>
                <p className="text-xs text-text-tertiary mt-0.5">Periksa koneksi internet dan coba lagi</p>
              </div>
              <button onClick={() => refetch()} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-bg-card border border-border hover:bg-bg-hover transition-colors">
                Coba Lagi
              </button>
            </div>
          )}

          {/* Range selector + legend */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex bg-bg-card depth-shadow rounded-lg p-0.5">
              {RANGE_KEYS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  aria-pressed={range === r}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-150 ${
                    range === r
                      ? "bg-text-primary text-white shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>

            {stocks.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-text-tertiary font-semibold tracking-widest uppercase">{stocks.length} Saham</span>
                <div className="w-px h-4 bg-border" />
                {stocks.map((s) => {
                  const lastValue = s.history.length > 0 ? s.history[s.history.length - 1]?.value ?? 0 : 0;
                  return (
                    <div key={s.ticker} className="flex items-center gap-1.5 bg-bg-card rounded-lg px-2 py-1 depth-shadow">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color.line }} />
                      <span className="text-xs font-bold text-text-primary">{stripJk(s.ticker)}</span>
                      {s.history.length > 0 && (
                        <span className={`text-[10px] font-mono font-bold tabular-nums ${lastValue >= 0 ? "text-bullish" : "text-bearish"}`}>
                          {formatPercent(lastValue)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Chart */}
          {isLoading ? (
            <div className="w-full h-[320px] sm:h-[420px] bg-bg-card rounded-xl animate-pulse" />
          ) : stocks.length > 0 && !error ? (
            <NormalizedOverlayChart series={stocks.map((s) => ({ ticker: s.ticker, color: s.color.line, data: s.history }))} />
          ) : null}

          {/* Comparison table */}
          {isLoading ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-7 flex-1 bg-bg-card rounded-md animate-pulse" />
                ))}
              </div>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-8 bg-bg-card rounded animate-pulse" />
              ))}
            </div>
          ) : stocks.length > 0 && !error ? (
            <ComparisonTable stocks={stocks} />
          ) : null}
        </>
      )}

      {tickers.length < 2 && (
        <div className="depth-shadow rounded-2xl bg-bg-card border border-border overflow-hidden">
          <div className="relative px-6 py-12 sm:py-16 text-center space-y-5">
            {/* Decorative gradient blob */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-gradient-to-b from-cyan-100/40 to-transparent rounded-full blur-2xl pointer-events-none" aria-hidden="true" />

            <div className="relative space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-50 border border-cyan-200/60 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-cyan-600" aria-hidden="true">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-bold text-text-primary">Pilih Saham untuk Membandingkan</p>
                <p className="text-sm text-text-secondary mt-1">Pilih minimal 2 saham atau gunakan preset di atas</p>
              </div>

              {/* Quick-start presets */}
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {PRESETS.slice(0, 4).map((p) => (
                  <button
                    key={p.label}
                    onClick={() => loadPreset(p.tickers)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-full bg-bg-hover border border-border text-text-secondary hover:text-cyan-600 hover:border-cyan-400/40 transition-all duration-200 press-scale cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ComparePageClient() {
  return (
    <div className="fade-in">
      <section className="compare-hero border-b border-slate-700/50">
        <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 sm:py-10 space-y-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
              <span className="bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">Bandingkan</span>{" "}
              Saham
            </h1>
            <p className="text-slate-400 text-sm sm:text-base max-w-lg">
              Bandingkan performa hingga 4 saham IDX dengan grafik overlay dan tabel perbandingan indikator.
            </p>
          </div>

          {/* Terminal stat pills */}
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/50 text-[10px] font-mono font-semibold text-cyan-300 tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" aria-hidden="true" />
              900+ SAHAM
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/50 text-[10px] font-mono font-semibold text-teal-300 tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400" aria-hidden="true" />
              OVERLAY CHART
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/50 text-[10px] font-mono font-semibold text-slate-400 tracking-wider">
              MAX 4 SAHAM
            </span>
          </div>
        </div>
      </section>
      <Suspense fallback={null}>
        <CompareContent />
      </Suspense>
    </div>
  );
}
