"use client";

import { useQuery } from "@tanstack/react-query";

export interface DashboardSummary {
  paperTrading: {
    balance: number;
    initialBalance: number;
    totalValue: number;
    totalPnl: number;
    totalPnlPct: number;
    positionCount: number;
  } | null;
  watchlistMovers: {
    ticker: string;
    name: string;
    change: number | null;
    changePercent: number | null;
  }[];
  reputation: {
    score: number;
    badge: string;
    badgeColor: string;
  };
  recentPosts: {
    id: string;
    content: string;
    createdAt: string;
    tickerTag: string | null;
    author: {
      username: string | null;
      name: string | null;
      image: string | null;
    };
  }[];
}

export function useDashboardSummary() {
  return useQuery<DashboardSummary>({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/summary");
      if (!res.ok) throw new Error("Gagal memuat dashboard");
      const json = await res.json();
      return json.data;
    },
    staleTime: 60_000,
  });
}
