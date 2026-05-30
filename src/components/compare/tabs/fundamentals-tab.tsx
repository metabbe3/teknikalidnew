"use client";

import type { CompareStock } from "@/hooks/use-compare-data";
import { formatPrice, formatPercent, formatVolume, stripJk } from "@/lib/utils";

interface Props {
  stocks: CompareStock[];
}

function Row({ label, values, fmt, highlight }: { label: string; values: (number | null)[]; fmt: (v: number) => string; highlight?: "max" | "min" }) {
  const nonNull = values.filter((v): v is number => v !== null);
  if (nonNull.length === 0) return null;
  const best = highlight === "min" ? Math.min(...nonNull) : Math.max(...nonNull);
  const worst = highlight === "min" ? Math.max(...nonNull) : Math.min(...nonNull);

  return (
    <tr className="border-b border-border/40 last:border-0">
      <td className="py-2 pr-3 text-xs text-text-secondary whitespace-nowrap sticky left-0 bg-bg-primary">{label}</td>
      {values.map((v, i) => {
        const isBest = v !== null && nonNull.length > 1 && v === best;
        const isWorst = v !== null && nonNull.length > 1 && v === worst;
        return (
          <td key={i} className={`py-2 px-3 text-xs font-mono tabular-nums text-right whitespace-nowrap ${isBest ? "text-bullish font-semibold" : isWorst ? "text-bearish font-semibold" : "text-text-primary"}`}>
            {v !== null ? fmt(v) : "—"}
          </td>
        );
      })}
    </tr>
  );
}

export function FundamentalsTab({ stocks }: Props) {
  const f2 = (v: number) => v.toFixed(2);

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-border">
          <th className="py-2 pr-3 text-left text-[10px] text-text-tertiary font-medium sticky left-0 bg-bg-primary">Metric</th>
          {stocks.map((s) => (
            <th key={s.ticker} className={`py-2 px-3 text-right text-[11px] font-semibold ${s.color.text} whitespace-nowrap`}>
              {stripJk(s.ticker)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <Row label="Market Cap" values={stocks.map((s) => s.fundamentals?.marketCap ?? null)} fmt={formatVolume} highlight="max" />
        <Row label="P/E (TTM)" values={stocks.map((s) => s.fundamentals?.pe ?? null)} fmt={f2} highlight="min" />
        <Row label="Forward P/E" values={stocks.map((s) => s.fundamentals?.forwardPe ?? null)} fmt={f2} highlight="min" />
        <Row label="P/B Ratio" values={stocks.map((s) => s.fundamentals?.pb ?? null)} fmt={f2} highlight="min" />
        <Row label="EPS" values={stocks.map((s) => s.fundamentals?.eps ?? null)} fmt={formatPrice} highlight="max" />
        <Row label="Div. Yield" values={stocks.map((s) => s.fundamentals?.dividendYield ?? null)} fmt={(v) => `${v.toFixed(2)}%`} highlight="max" />
      </tbody>
    </table>
  );
}
