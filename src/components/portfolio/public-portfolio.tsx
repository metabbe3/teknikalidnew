interface PublicHolding {
  ticker: string;
  name: string;
  sector: string;
  allocation: number;
  buyDateMonth: string;
  rsi14: number | null;
  macdSignal: string | null;
}

interface PublicPortfolioProps {
  holdings: PublicHolding[];
  sectorBreakdown: Record<string, number>;
}

export function PublicPortfolio({ holdings, sectorBreakdown }: PublicPortfolioProps) {
  if (holdings.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-gray-400">Portofolio masih kosong.</p>
      </div>
    );
  }

  const sectors = Object.entries(sectorBreakdown)
    .sort(([, a], [, b]) => b - a)
    .map(([sector, pct]) => ({ sector, pct }));

  const upCount = holdings.filter((h) => h.macdSignal === "Bullish").length;
  const downCount = holdings.filter((h) => h.macdSignal === "Bearish").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="health-card-signal health-card-signal-bullish">
          <p className="text-[10px] font-mono text-teal-600/70 uppercase tracking-widest font-semibold mb-1">Jumlah Saham</p>
          <p className="text-lg font-bold text-gray-900 font-mono tabular-nums">{holdings.length}</p>
        </div>
        <div className="health-card-signal" style={{ background: "rgba(0,0,0,0.02)" }}>
          <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-semibold mb-1">Sinyal</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-semibold text-teal-600">{upCount} Bull</span>
            <span className="text-gray-300 text-xs">/</span>
            <span className="text-sm font-mono font-semibold text-red-500">{downCount} Bear</span>
          </div>
        </div>
      </div>

      {sectors.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-semibold">Distribusi Sektor</p>
          {sectors.map((s) => (
            <div key={s.sector} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">{s.sector}</span>
                <span className="font-mono text-gray-400 font-semibold tabular-nums">{s.pct.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500/50 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(s.pct, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1 stagger-grid">
        {holdings.map((h, i) => (
          <a
            key={h.ticker}
            href={`/stocks/${h.ticker}`}
            className="flex items-center justify-between py-2.5 px-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors fade-in"
            style={{ "--stagger-i": i } as React.CSSProperties}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
                <span className="text-[9px] font-mono font-bold text-teal-600">{h.ticker.slice(0, 2)}</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-semibold text-gray-900">{h.ticker}</span>
                  {h.macdSignal && (
                    <span
                      className={`text-[9px] font-mono font-semibold px-1 py-0.5 rounded-md ${
                        h.macdSignal === "Bullish"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {h.macdSignal === "Bullish" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-400">{h.name}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-semibold text-gray-500 tabular-nums">{h.allocation.toFixed(1)}%</span>
              <p className="text-[10px] text-gray-300">{h.buyDateMonth}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
