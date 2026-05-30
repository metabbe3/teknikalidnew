"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useFollowStatus(userId: string | undefined) {
  return useQuery({
    queryKey: ["follow-status", userId],
    queryFn: async () => {
      const res = await fetch(`/api/follow?userId=${userId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ following: boolean }>;
    },
    enabled: !!userId,
  });
}

export function useToggleFollow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ following: boolean }>;
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["follow-status", userId] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useStockFollowStatus(ticker: string | undefined) {
  return useQuery({
    queryKey: ["stock-follow-status", ticker],
    queryFn: async () => {
      const res = await fetch(`/api/stock-follow?ticker=${ticker}`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ following: boolean }>;
    },
    enabled: !!ticker,
  });
}

export function useToggleStockFollow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ticker: string) => {
      const res = await fetch("/api/stock-follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ following: boolean }>;
    },
    onSuccess: (_, ticker) => {
      queryClient.invalidateQueries({ queryKey: ["stock-follow-status", ticker] });
    },
  });
}
