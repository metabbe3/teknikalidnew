"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useFollowStatus(userId: string | undefined, placeholder?: boolean) {
  return useQuery({
    queryKey: ["follow-status", userId],
    queryFn: async () => {
      const res = await fetch(`/api/follow?userId=${userId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ following: boolean }>;
    },
    enabled: !!userId,
    placeholderData: placeholder ? { following: false } : undefined,
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
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: ["follow-status", userId] });
      const previous = queryClient.getQueryData<{ following: boolean }>(["follow-status", userId]);
      if (previous) {
        queryClient.setQueryData(["follow-status", userId], { following: !previous.following });
      }
      return { previous, userId };
    },
    onError: (_err, userId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["follow-status", userId], context.previous);
      }
    },
    onSuccess: (data, userId) => {
      queryClient.setQueryData(["follow-status", userId], data);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
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
