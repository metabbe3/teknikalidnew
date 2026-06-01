"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
