"use client";

import Link from "next/link";
import { stripJk, changeColor } from "@/lib/utils";

interface TickerItem {
  ticker: string;
  changePercent: number | null;
}

export function TickerTape({ items }: { items: TickerItem[] }) {
  if (items.length === 0) return null;

  const withChange = items.filter((s) => s.changePercent !== null);
  const display = withChange.length > 0 ? withChange : items;

  return (
    <div className="ticker-tape" aria-label="Stock ticker">
      <div className="ticker-tape-inner">
        {[...display, ...display].map((s, i) => (
          <Link
            key={`${s.ticker}-${i}`}
            href={`/stocks/${s.ticker}`}
            className="ticker-item"
          >
            <span className="text-gray-400 font-semibold">{stripJk(s.ticker)}</span>
            {s.changePercent !== null && (
              <span className={changeColor(s.changePercent)}>
                {s.changePercent >= 0 ? "+" : ""}
                {s.changePercent.toFixed(2)}%
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
