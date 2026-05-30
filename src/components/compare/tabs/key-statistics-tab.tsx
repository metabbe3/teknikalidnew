"use client";

import type { CompareStock } from "@/hooks/use-compare-data";
import { formatPrice, formatPercent, formatVolume, stripJk, formatMarketCap } from "@/lib/utils";

interface Props {
  stocks: CompareStock[];
}

function Row({ label, values, fmt, highlight }: { label: string; values: (number | null)[]; fmt: (v: number) => string; highlight?: "max" | "min" }) {
  const nonNull = values.filter((v): v is number => v !== null);
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

function SignedRow({ label, values, fmt }: { label: string; values: (number | null)[]; fmt: (v: number) => string }) {
  return (
    <tr className="border-b border-border/40 last:border-0">
      <td className="py-2 pr-3 text-xs text-text-secondary whitespace-nowrap sticky left-0 bg-bg-primary">{label}</td>
      {values.map((v, i) => {
        const color = v !== null && v > 0 ? "text-green-600 font-semibold" : v !== null && v < 0 ? "text-red-600 font-semibold" : "text-text-primary";
        return (
          <td key={i} className={`py-2 px-3 text-xs font-mono tabular-nums text-right whitespace-nowrap ${color}`}>
            {v !== null ? fmt(v) : "—"}
          </td>
        );
      })}
    </tr>
  );
}

function Range52WRow({ stocks }: { stocks: CompareStock[] }) {
  return (
    <tr className="border-b border-border/40 last:border-0">
      <td className="py-2 pr-3 text-xs text-text-secondary whitespace-nowrap sticky left-0 bg-bg-primary">52W Range</td>
      {stocks.map((s) => {
        const low = s.week52Low;
        const high = s.week52High;
        const close = s.close;
        if (low === null || high === null || close === null || high === low) {
          return <td key={s.ticker} className="py-2 px-3 text-xs text-text-primary text-right">—</td>;
        }
        const pct = Math.min(100, Math.max(0, ((close - low) / (high - low)) * 100));
        return (
          <td key={s.ticker} className="py-2 px-3 text-right">
            <div className="text-[10px] font-mono text-text-tertiary mb-1">{formatPrice(low)} — {formatPrice(high)}</div>
            <div className="h-1.5 rounded-full bg-bg-hover overflow-hidden">
              <div className="h-full rounded-full bg-accent/40" style={{ width: `${pct}%` }} />
            </div>
          </td>
        );
      })}
    </tr>
  );
}

export function KeyStatisticsTab({ stocks }: Props) {
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
        <Row label="Close" values={stocks.map((s) => s.close)} fmt={formatPrice} />
        <SignedRow label="Change" values={stocks.map((s) => s.change)} fmt={(v) => (v >= 0 ? "+" : "") + formatPrice(v)} />
        <SignedRow label="Change (%)" values={stocks.map((s) => s.changePercent)} fmt={formatPercent} />
        <Row label="Open" values={stocks.map((s) => s.open)} fmt={formatPrice} />
        <Row label="Day High" values={stocks.map((s) => s.high)} fmt={formatPrice} highlight="max" />
        <Row label="Day Low" values={stocks.map((s) => s.low)} fmt={formatPrice} highlight="min" />
        <Row label="Prev Close" values={stocks.map((s) => s.prevClose)} fmt={formatPrice} />
        <Row label="Volume" values={stocks.map((s) => s.volume)} fmt={formatVolume} />
        <Row label="Avg Volume (30D)" values={stocks.map((s) => s.avgVolume)} fmt={formatVolume} />
        <Range52WRow stocks={stocks} />
        <Row label="Market Cap" values={stocks.map((s) => s.fundamentals?.marketCap ?? null)} fmt={formatMarketCap} highlight="max" />
        <Row label="SMA 20" values={stocks.map((s) => (s.indicators as Record<string, number | null> | null)?.sma20 ?? null)} fmt={formatPrice} />
        <Row label="SMA 50" values={stocks.map((s) => (s.indicators as Record<string, number | null> | null)?.sma50 ?? null)} fmt={formatPrice} />
        <Row label="SMA 200" values={stocks.map((s) => (s.indicators as Record<string, number | null> | null)?.sma200 ?? null)} fmt={formatPrice} />
        <SignedRow label="YTD Return" values={stocks.map((s) => s.ytdReturn)} fmt={formatPercent} />
      </tbody>
    </table>
  );
}
