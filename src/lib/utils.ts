import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const priceFormatter = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

export function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return "Rp0";
  return `Rp${priceFormatter.format(value)}`;
}

export function formatRp(value: number): string {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0.00%";
  return `${percentFormatter.format(value)}%`;
}

export function formatVolume(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "0";
  if (value >= 1e9) return `${trimDecimal(value / 1e9)}B`;
  if (value >= 1e6) return `${trimDecimal(value / 1e6)}M`;
  if (value >= 1e3) return `${trimDecimal(value / 1e3)}K`;
  return Math.round(value).toString();
}

export function formatMarketCap(v: number): string {
  if (v >= 1e12) return `${trimDecimal(v / 1e12)}T`;
  if (v >= 1e9) return `${trimDecimal(v / 1e9)}B`;
  if (v >= 1e6) return `${trimDecimal(v / 1e6)}M`;
  return v.toLocaleString("id-ID");
}

function trimDecimal(n: number): string {
  return n.toFixed(1).replace(/\.0$/, "");
}

export function toDateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function stripJk(ticker: string): string {
  return ticker.replace(/\.JK$/, "");
}

export function normalizeTicker(input: string): string {
  return stripJk(input.trim().toUpperCase()) + ".JK";
}

export function getUserInitials(user: { username?: string | null; name?: string | null } | null | undefined): string {
  return user?.username?.[0]?.toUpperCase() ?? user?.name?.[0]?.toUpperCase() ?? "U";
}

export function getRoleLabel(role?: string | null): string {
  return role === "ADMIN" ? "Admin" : "Free Tier";
}

export function changeColor(value: number | null): string {
  if (value === null) return "";
  return value >= 0 ? "text-bullish" : "text-bearish";
}

export function rsiColor(value: number | null): string {
  if (value === null) return "";
  if (value > 70) return "text-bearish";
  if (value < 30) return "text-bullish";
  return "";
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export function rsiBgColor(value: number | null): string {
  if (value === null) return "bg-text-secondary/20";
  if (value > 70) return "bg-bearish";
  if (value < 30) return "bg-bullish";
  return "bg-accent/40";
}

export function rsiStatus(value: number | null): string {
  if (value === null) return "Neutral";
  if (value > 70) return "Overbought";
  if (value < 30) return "Oversold";
  return "Neutral";
}

export function aggregateDaily(
  groups: { createdAt: Date; _count: number }[],
  since: Date,
): { date: string; count: number }[] {
  const days: Record<string, number> = {};
  for (let i = 0; i < 14; i++) {
    const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
    days[d.toISOString().slice(0, 10)] = 0;
  }
  for (const entry of groups) {
    const date = new Date(entry.createdAt).toISOString().slice(0, 10);
    if (date in days) days[date] += entry._count;
  }
  return Object.entries(days)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}
