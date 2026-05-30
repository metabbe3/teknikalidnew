import { formatPercent, formatPrice } from "@/lib/utils";

interface PriceBadgeProps {
  change: number | null;
  changePercent: number | null;
  price?: number | null;
  showPrice?: boolean;
}

export function PriceBadge({ change, changePercent, price, showPrice }: PriceBadgeProps) {
  if (change === null || changePercent === null) {
    return <span className="text-text-secondary">—</span>;
  }

  const isPositive = change >= 0;
  const color = isPositive ? "text-bullish" : "text-bearish";
  const arrow = isPositive ? "▲" : "▼";
  const direction = isPositive ? "up" : "down";

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${color} text-sm font-medium`}
      role="status"
      aria-label={`Price ${direction} ${formatPercent(changePercent)}`}
    >
      {showPrice && price != null && <span className="text-text-primary font-semibold">{formatPrice(price)}</span>}
      <span aria-hidden="true">
        {arrow} {formatPercent(changePercent)}
      </span>
      <span className="sr-only">{direction}</span>
    </span>
  );
}
