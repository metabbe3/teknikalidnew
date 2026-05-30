interface SectorData {
  avgChange: number;
  count: number;
}

export function SectorHeatmap({ sectors }: { sectors: Record<string, SectorData> }) {
  const entries = Object.entries(sectors);

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-1 h-6 bg-accent rounded-full" aria-hidden="true" />
        <h2 className="text-lg font-semibold tracking-tight">Performa Sektor</h2>
      </div>
      <div className="flex flex-wrap gap-3 stagger-grid">
        {entries.map(([sector, { count, avgChange }], i) => {
          const isPositive = avgChange >= 0;
          const magnitude = Math.min(Math.abs(avgChange) / 3, 1);
          const opacity = 0.08 + magnitude * 0.22;
          const color = isPositive
            ? `rgba(13, 148, 136, ${opacity})`
            : `rgba(220, 38, 38, ${opacity})`;
          const borderLeft = isPositive
            ? `3px solid rgba(13, 148, 136, ${0.4 + magnitude * 0.6})`
            : `3px solid rgba(220, 38, 38, ${0.4 + magnitude * 0.6})`;

          return (
            <div
              key={sector}
              style={{
                "--stagger-i": i,
                background: `linear-gradient(135deg, ${color}, var(--color-bg-card))`,
                borderLeft,
              } as React.CSSProperties}
              className="sector-heatmap-cell depth-shadow min-w-[140px]"
            >
              <p className="text-xs font-bold text-text-primary uppercase tracking-wider truncate max-w-[160px]">
                {sector}
              </p>
              <p
                className={`text-xl font-bold font-mono tabular-nums mt-1.5 ${
                  isPositive ? "text-bullish" : "text-bearish"
                }`}
              >
                {isPositive ? "+" : ""}
                {avgChange.toFixed(2)}%
              </p>
              <p className="text-[10px] text-text-tertiary mt-1">{count} saham</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
