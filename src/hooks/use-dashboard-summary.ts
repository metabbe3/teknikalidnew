"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
  dailyReward: {
    canClaim: boolean;
    streak: number;
    lastClaimDate: string | null;
  } | null;
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

export function useClaimDailyReward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/reputation", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Gagal klaim reward");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["reputation"] });
    },
  });
}
