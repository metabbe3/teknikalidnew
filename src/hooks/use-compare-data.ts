"use client";

import { useQuery } from "@tanstack/react-query";
import type { DateRange } from "@/lib/constants";
import type { TradingPlan } from "@/lib/trading-plan";

export interface CompareStock {
  stockId: number;
  ticker: string;
  name: string;
  sector: string;
  color: { line: string; bg: string; text: string; dot: string; border: string };
  close: number | null;
  avgVolume: number | null;
  ytdReturn: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  prevClose: number | null;
  week52High: number | null;
  week52Low: number | null;
  history: { time: string; value: number }[];
  indicators: Record<string, unknown> | null;
  fundamentals: { pe: number | null; forwardPe: number | null; pb: number | null; eps: number | null; dividendYield: number | null; marketCap: number | null } | null;
  tradingPlan: TradingPlan | null;
}

export function useCompareData(tickers: string[], range: DateRange) {
  const params = tickers.map((t) => `s=${encodeURIComponent(t)}`).join("&");
  return useQuery<{ stocks: CompareStock[] }>({
    queryKey: ["compare", tickers.sort(), range],
    queryFn: () => fetch(`/api/stocks/compare?${params}&range=${range}`).then((r) => {
      if (!r.ok) throw new Error("Failed to fetch comparison data");
      return r.json();
    }),
    enabled: tickers.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
}
