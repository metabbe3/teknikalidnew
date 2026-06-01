export const STRATEGY_TAGS = [
  "Breakout", "Support Bounce", "Resistance Rejection",
  "Trend Following", "Mean Reversion", "Scalping", "Swing",
  "FOMO", "Earnings Play", "Dividend Play",
  "Technical Signal", "Fundamental", "News Driven",
] as const;

export const VALID_TOPUP_AMOUNTS = [10_000_000, 50_000_000, 100_000_000];

/**
 * Calculate simulated bid/ask spread in basis points based on liquidity.
 * Gorengan stocks get 1%, illiquid 0.5%, medium 0.25%, liquid 0.1%.
 */
export function getSpreadBps(
  avgDailyVolume: number | null | undefined,
  isGorengan: boolean | null | undefined,
): number {
  if (isGorengan) return 100; // 1.00%
  if (!avgDailyVolume || avgDailyVolume <= 0) return 25; // default 0.25%
  if (avgDailyVolume < 1_000_000) return 50;  // 0.50%
  if (avgDailyVolume < 5_000_000) return 25;  // 0.25%
  return 10; // 0.10%
}

export function applySpread(price: number, spreadBps: number, side: "BUY" | "SELL"): number {
  if (side === "BUY") return price * (1 + spreadBps / 10000);
  return price * (1 - spreadBps / 10000);
}
