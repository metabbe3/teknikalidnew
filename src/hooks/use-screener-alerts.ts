"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface ScreenerAlertItem {
  id: string;
  savedScreenerId: string;
  isEnabled: boolean;
  frequency: string;
  lastTriggeredAt: string | null;
  lastMatchCount: number | null;
}

export function useScreenerAlerts() {
  return useQuery<ScreenerAlertItem[]>({
    queryKey: ["screener-alerts"],
    queryFn: async () => {
      const res = await fetch("/api/screener/alerts");
      if (!res.ok) return [];
      const data = await res.json();
      return data.data ?? data;
    },
    staleTime: 60_000,
  });
}

export function useCreateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { savedScreenerId: string; frequency?: string }) => {
      const res = await fetch("/api/screener/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create alert");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["screener-alerts"] });
      qc.invalidateQueries({ queryKey: ["saved-screeners"] });
    },
  });
}

export function useToggleAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isEnabled }: { id: string; isEnabled: boolean }) => {
      const res = await fetch(`/api/screener/alerts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled }),
      });
      if (!res.ok) throw new Error("Failed to toggle alert");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["screener-alerts"] }),
  });
}

export function useDeleteAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/screener/alerts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete alert");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["screener-alerts"] });
      qc.invalidateQueries({ queryKey: ["saved-screeners"] });
    },
  });
}
