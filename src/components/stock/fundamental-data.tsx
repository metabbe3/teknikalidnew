import { formatVolume, formatMarketCap, formatPrice } from "@/lib/utils";

interface FundamentalDataProps {
  data: {
    pe: number | null;
    forwardPe: number | null;
    pb: number | null;
    eps: number | null;
    dividendYield: number | null;
    marketCap: number | null;
  } | null;
}

export function FundamentalData({ data }: FundamentalDataProps) {
  if (!data) return null;

  const rows: [string, string | null][] = [
    ["Market Cap", data.marketCap !== null ? formatMarketCap(data.marketCap) : null],
    ["P/E (TTM)", data.pe !== null ? data.pe.toFixed(2) : null],
    ["Forward P/E", data.forwardPe !== null ? data.forwardPe.toFixed(2) : null],
    ["P/B Ratio", data.pb !== null ? data.pb.toFixed(2) : null],
    ["EPS", data.eps !== null ? formatPrice(data.eps) : null],
    ["Div Yield", data.dividendYield !== null ? `${data.dividendYield.toFixed(2)}%` : null],
  ];

  const hasAnyData = rows.some(([, v]) => v !== null);
  if (!hasAnyData) return null;

  return (
    <div className="indicator-card depth-shadow p-4">
      <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">Fundamentals</h3>
      <div className="space-y-0" role="list">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between py-2 text-[13px] border-b border-border/30 last:border-0" role="listitem">
            <span className="text-text-secondary">{label}</span>
            <span className="font-mono tabular-nums font-medium">{value ?? "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
