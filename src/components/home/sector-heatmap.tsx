interface SectorData {
  avgChange: number;
  count: number;
}

export function SectorHeatmap({ sectors }: { sectors: Record<string, SectorData> }) {
  const entries = Object.entries(sectors);

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Performa Sektor</h2>
        <span className="text-[10px] text-text-tertiary uppercase tracking-wider font-medium">{entries.length} sektor</span>
      </div>
      <div className="flex flex-wrap gap-3 stagger-grid">
        {entries.map(([sector, { count, avgChange }], i) => {
          const isPositive = avgChange >= 0;
          const magnitude = Math.min(Math.abs(avgChange) / 3, 1);
          const opacity = 0.06 + magnitude * 0.18;
          const bgTint = isPositive
            ? `rgba(13, 148, 136, ${opacity})`
            : `rgba(220, 38, 38, ${opacity})`;

          return (
            <div
              key={sector}
              style={{
                "--stagger-i": i,
                background: `linear-gradient(145deg, ${bgTint}, var(--color-bg-card))`,
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
