"use client";

import type { PortfolioSummary } from "@/hooks/use-portfolio";

const SECTOR_COLORS: Record<string, string> = {
  "Financials": "#0d9488",
  "Consumer Cyclicals": "#6366f1",
  "Consumer Non-Cyclicals": "#f59e0b",
  "Basic Materials": "#ef4444",
  "Energy": "#f97316",
  "Industrials": "#8b5cf6",
  "Infrastructures": "#06b6d4",
  "Properties & Real Estate": "#ec4899",
  "Technology": "#3b82f6",
  "Healthcare": "#14b8a6",
  "Transportation & Logistics": "#84cc16",
};

interface PortfolioHealthProps {
  summary: PortfolioSummary;
}

export function PortfolioHealth({ summary }: PortfolioHealthProps) {
  const { sectorBreakdown, bullishCount, bearishCount } = summary;
  const total = Object.values(sectorBreakdown).reduce((a, b) => a + b, 0);

  const sectors = Object.entries(sectorBreakdown)
    .sort(([, a], [, b]) => b - a)
    .map(([sector, value]) => ({
      sector,
      value,
      percent: total > 0 ? (value / total) * 100 : 0,
      color: SECTOR_COLORS[sector] || "#6b7280",
    }));

  return (
    <div className="health-card">
      {/* Dark header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-slate-800" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "linear-gradient(rgba(13,148,136,1) 1px, transparent 1px), linear-gradient(90deg, rgba(13,148,136,1) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative z-10 px-4 pt-4 pb-3 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5eead4" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <h3 className="text-xs font-bold text-white">
            Kesehatan Portofolio
          </h3>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Signal overview */}
        <div className="grid grid-cols-2 gap-2">
          <div className="health-card-signal health-card-signal-bullish">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="3">
                <polyline points="18 15 12 9 6 15" />
              </svg>
              <span className="text-lg font-bold text-teal-600 font-mono tabular-nums">{bullishCount}</span>
            </div>
            <p className="text-[10px] text-teal-600/70 font-mono uppercase tracking-wider font-semibold">Bullish</p>
          </div>
          <div className="health-card-signal health-card-signal-bearish">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="3">
                <polyline points="6 9 12 15 18 9" />
              </svg>
              <span className="text-lg font-bold text-red-600 font-mono tabular-nums">{bearishCount}</span>
            </div>
            <p className="text-[10px] text-red-600/70 font-mono uppercase tracking-wider font-semibold">Bearish</p>
          </div>
        </div>

        {/* Sector allocation */}
        {sectors.length > 0 && (
          <div className="space-y-3">
            <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-semibold">
              Distribusi Sektor
            </p>

            {/* Stacked bar */}
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
              {sectors.map((s) => (
                <div
                  key={s.sector}
                  className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-300"
                  style={{
                    width: `${s.percent}%`,
                    backgroundColor: s.color,
                    opacity: 0.7,
                  }}
                  title={`${s.sector}: ${s.percent.toFixed(1)}%`}
                />
              ))}
            </div>

            {/* Legend */}
            <div className="space-y-1.5">
              {sectors.map((s) => (
                <div key={s.sector} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-[11px] text-gray-500 flex-1 truncate">{s.sector}</span>
                  <span className="text-[10px] font-mono text-gray-400 font-semibold tabular-nums">{s.percent.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
