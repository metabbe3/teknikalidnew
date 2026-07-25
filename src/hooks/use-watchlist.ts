"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

export interface WatchlistItem {
  ticker: string;
  name: string;
  sector: string;
  addedAt: string;
  latestPrice: { close: number; date: string; volume: bigint } | null;
}

export function useWatchlist() {
  const { status } = useSession();
  return useQuery<WatchlistItem[]>({
    queryKey: ["watchlist"],
    queryFn: async () => {
      const res = await fetch("/api/watchlist");
      if (!res.ok) throw new Error("Gagal memuat watchlist");
      const json = await res.json();
      return json.data;
    },
    enabled: status === "authenticated",
  });
}

export function useWatchlistStatus(ticker: string | undefined) {
  const { status } = useSession();
  return useQuery<{ inWatchlist: boolean }>({
    queryKey: ["watchlist-status", ticker],
    queryFn: async () => {
      const res = await fetch(`/api/watchlist?ticker=${encodeURIComponent(ticker!)}`);
      if (!res.ok) throw new Error("Gagal memuat status watchlist");
      return res.json();
    },
    enabled: !!ticker && status === "authenticated",
  });
}

export function useToggleWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticker,
      action,
    }: {
      ticker: string;
      action: "add" | "remove";
    }) => {
      const url = action === "add" ? "/api/watchlist" : `/api/watchlist/${encodeURIComponent(ticker)}`;
      const res = await fetch(url, {
        method: action === "add" ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        ...(action === "add" ? { body: JSON.stringify({ ticker }) } : {}),
      });
      if (!res.ok) throw new Error("Gagal mengubah watchlist");
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      queryClient.invalidateQueries({
        queryKey: ["watchlist-status", variables.ticker],
      });
    },
  });
}

export function useBatchAddToWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tickers: string[]) => {
      const res = await fetch("/api/watchlist/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickers }),
      });
      if (!res.ok) throw new Error("Gagal menambahkan ke watchlist");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    },
  });
}

export function useBatchRemoveFromWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tickers: string[]) => {
      const res = await fetch("/api/watchlist/batch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickers }),
      });
      if (!res.ok) throw new Error("Gagal menghapus dari watchlist");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    },
  });
}
