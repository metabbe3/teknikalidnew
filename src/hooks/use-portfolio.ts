"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface HoldingAdvice {
  action: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
  confidence: number;
  score: number;
  reasons: string[];
  warnings: string[];
  stopLoss: number | null;
  takeProfit1: number | null;
  takeProfit2: number | null;
  riskRewardRatio: number | null;
  trend: "uptrend" | "downtrend" | "sideways";
  isGorengan: boolean;
}

export interface HoldingItem {
  ticker: string;
  name: string;
  sector: string;
  buyPrice: number;
  quantity: number;
  buyDate: string;
  notes: string | null;
  currentPrice: number | null;
  pnl: number | null;
  pnlPercent: number | null;
  marketValue: number | null;
  rsi14: number | null;
  macdSignal: string | null;
  sma50: number | null;
  sma200: number | null;
  signalScore: number | null;
  isGorengan: boolean;
  advice: HoldingAdvice;
}

export interface PortfolioAdviceSummary {
  overallAction: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  averageScore: number;
  topOpportunities: string[];
  riskWarnings: string[];
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  totalPnlPercent: number;
  bullishCount: number;
  bearishCount: number;
  sectorBreakdown: Record<string, number>;
}

export interface PortfolioData {
  holdings: HoldingItem[];
  summary: PortfolioSummary;
  adviceSummary: PortfolioAdviceSummary;
  isPublic: boolean;
}

export function usePortfolio() {
  return useQuery<PortfolioData>({
    queryKey: ["portfolio"],
    queryFn: async () => {
      const res = await fetch("/api/portfolio");
      if (!res.ok) throw new Error("Gagal memuat portofolio");
      const json = await res.json();
      return json.data;
    },
  });
}

export function usePublicPortfolio(username: string | undefined) {
  return useQuery({
    queryKey: ["portfolio-public", username],
    queryFn: async () => {
      const res = await fetch(`/api/portfolio/public/${encodeURIComponent(username!)}`);
      if (!res.ok) throw new Error("Gagal memuat portofolio");
      const json = await res.json();
      return json.data;
    },
    enabled: !!username,
  });
}

export function useAddHolding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      ticker: string;
      buyPrice: number;
      quantity: number;
      buyDate: string;
      notes?: string;
    }) => {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Gagal menambah holding");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });
}

export function useUpdateHolding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ticker,
      ...data
    }: {
      ticker: string;
      buyPrice?: number;
      quantity?: number;
      buyDate?: string;
      notes?: string | null;
    }) => {
      const res = await fetch(`/api/portfolio/${encodeURIComponent(ticker)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Gagal mengupdate holding");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });
}

export function useDeleteHolding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ticker: string) => {
      const res = await fetch(`/api/portfolio/${encodeURIComponent(ticker)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Gagal menghapus holding");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });
}

export function usePortfolioSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (isPublic: boolean) => {
      const res = await fetch("/api/portfolio/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic }),
      });
      if (!res.ok) throw new Error("Gagal mengubah pengaturan");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });
}
