import { formatPrice, formatVolume } from "@/lib/utils";

interface KeyStatisticsProps {
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  week52High: number | null;
  week52Low: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
}

export function KeyStatistics({ open, high, low, close, volume, week52High, week52Low, sma20, sma50, sma200 }: KeyStatisticsProps) {
  const dailyRange = (() => {
    if (high === null || low === null || high === 0) return null;
    return ((high - low) / high) * 100;
  })();

  const week52Position = (() => {
    if (close === null || week52High === null || week52Low === null || week52High === week52Low) return null;
    return ((close - week52Low) / (week52High - week52Low)) * 100;
  })();

  return (
    <div className="indicator-card depth-shadow p-4">
      <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">Key Statistics</h3>

      {/* 52-week range - prominent at top */}
      {week52Position !== null && week52High !== null && week52Low !== null && (
        <div className="mb-4 pb-4 border-b border-border/40">
          <div className="flex justify-between text-[11px] text-text-tertiary mb-1.5">
            <span className="font-mono tabular-nums">{formatPrice(week52Low)}</span>
            <span className="font-medium">52W Range</span>
            <span className="font-mono tabular-nums">{formatPrice(week52High)}</span>
          </div>
          <div className="w-full h-1.5 bg-bg-hover rounded-full overflow-hidden relative">
            {/* Gradient from bearish to neutral to bullish */}
            <div className="absolute inset-0 bg-gradient-to-r from-bearish/20 via-bg-hover to-bullish/20 rounded-full" />
            <div
              className="absolute top-0 h-full w-2.5 bg-accent rounded-full shadow-[0_0_4px_rgba(37,99,235,0.3)]"
              style={{ left: `${Math.min(Math.max(week52Position, 1), 95)}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats rows */}
      <div className="space-y-0" role="list">
        {([
          ["Open", open !== null ? formatPrice(open) : null],
          ["Day High", high !== null ? formatPrice(high) : null],
          ["Day Low", low !== null ? formatPrice(low) : null],
          ["Range", dailyRange !== null ? `${dailyRange.toFixed(2)}%` : null],
          ["Volume", volume !== null ? formatVolume(volume) : null],
        ] as [string, string | null][]).map(([label, value]) => (
          <div key={label} className="flex justify-between py-2 text-[13px] border-b border-border/30 last:border-0" role="listitem">
            <span className="text-text-secondary">{label}</span>
            <span className="font-mono tabular-nums font-medium">{value ?? "—"}</span>
          </div>
        ))}
      </div>

      {/* Moving averages section */}
      {([sma20, sma50, sma200].some(v => v !== null)) && (
        <div className="mt-3 pt-3 border-t border-border/40">
          <p className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider mb-2">Moving Averages</p>
          <div className="space-y-0">
            {([
              ["SMA 20", sma20],
              ["SMA 50", sma50],
              ["SMA 200", sma200],
            ] as [string, number | null][]).map(([label, value]) => (
              <div key={label} className="flex justify-between py-1.5 text-[13px]">
                <span className="text-text-secondary">{label}</span>
                <div className="flex items-center gap-2">
                  {value !== null && close !== null && (
                    <span className={`text-[10px] font-medium ${close > value ? "text-bullish" : "text-bearish"}`}>
                      {close > value ? "Above" : "Below"}
                    </span>
                  )}
                  <span className="font-mono tabular-nums font-medium">{value !== null ? formatPrice(value) : "—"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
