"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface SavedScreenerItem {
  id: string;
  name: string;
  description: string | null;
  filters: Record<string, string>;
  tradingStyle: string | null;
  isDefault: boolean;
  lastRunAt: string | null;
  lastResultCount: number | null;
  createdAt: string;
  updatedAt: string;
}

export function useSavedScreeners() {
  return useQuery<SavedScreenerItem[]>({
    queryKey: ["saved-screeners"],
    queryFn: async () => {
      const res = await fetch("/api/screener/saved");
      if (!res.ok) return [];
      const data = await res.json();
      return data.data ?? data;
    },
    staleTime: 60_000,
  });
}

export function useSaveScreener() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      name: string;
      description?: string;
      filters: Record<string, string>;
      tradingStyle?: string;
    }) => {
      const res = await fetch("/api/screener/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save screener");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-screeners"] }),
  });
}

export function useUpdateScreener() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      description?: string;
      filters?: Record<string, string>;
      tradingStyle?: string;
    }) => {
      const res = await fetch(`/api/screener/saved/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update screener");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-screeners"] }),
  });
}

export function useDeleteScreener() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/screener/saved/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete screener");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-screeners"] }),
  });
}

export function useSetDefaultScreener() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      // Use PUT to update isDefault — we add a custom action via the update endpoint
      // The setDefault logic is handled by the service layer
      const res = await fetch(`/api/screener/saved/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (!res.ok) throw new Error("Failed to set default");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-screeners"] }),
  });
}
