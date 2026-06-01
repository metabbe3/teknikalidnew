"use client";

import type { PortfolioSummary } from "@/hooks/use-portfolio";

interface PortfolioSummaryBarProps {
  summary: PortfolioSummary;
  isPublic: boolean;
  onTogglePrivacy: () => void;
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

export function PortfolioSummaryBar({
  summary,
  isPublic,
  onTogglePrivacy,
}: PortfolioSummaryBarProps) {
  const { totalValue, totalPnl, totalPnlPercent, bullishCount, bearishCount } = summary;
  const isPositive = totalPnl >= 0;

  return (
    <div className="portfolio-hero">
      <div className="relative z-10 p-5 space-y-4">
        {/* Top row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5eead4" strokeWidth="2" strokeLinecap="round">
                <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
                <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
                <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Portofolio Saya</span>
              <div className="pulse-dot mt-1" />
            </div>
          </div>
          <button
            onClick={onTogglePrivacy}
            className="press-scale flex items-center gap-1.5 text-[10px] font-mono tracking-wider px-3 py-1.5 rounded-lg transition-all duration-200"
            style={{
              backgroundColor: isPublic ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
              color: isPublic ? "white" : "rgba(255,255,255,0.4)",
              border: isPublic ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {isPublic ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            )}
            {isPublic ? "PUBLIK" : "PRIVAT"}
          </button>
        </div>

        {/* Total value */}
        <div>
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Nilai Total</p>
          <p className="text-2xl font-bold text-white font-mono tabular-nums tracking-tight">
            {totalValue === 0 ? "Rp 0" : formatRupiah(totalValue)}
          </p>
        </div>

        {/* P&L + Signal */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">P&L Total</p>
            <div className="flex items-baseline gap-2">
              <p className={`text-lg font-bold font-mono tabular-nums ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                {isPositive ? "+" : ""}{formatRupiah(totalPnl)}
              </p>
              <span
                className={`text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded-md ${
                  isPositive
                    ? "bg-emerald-400/15 text-emerald-300"
                    : "bg-red-400/15 text-red-300"
                }`}
              >
                {isPositive ? "+" : ""}{totalPnlPercent.toFixed(2)}%
              </span>
            </div>
          </div>

          {(bullishCount > 0 || bearishCount > 0) && (
            <div className="flex items-center gap-2">
              {bullishCount > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-mono font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-400/10 text-emerald-400">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                  {bullishCount} Bull
                </span>
              )}
              {bearishCount > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-mono font-semibold px-2.5 py-1.5 rounded-lg bg-red-400/10 text-red-400">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                  {bearishCount} Bear
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
