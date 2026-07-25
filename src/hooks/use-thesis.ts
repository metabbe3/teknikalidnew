"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

export type ThesisBias = "BULLISH" | "BEARISH" | "NEUTRAL";
export type ThesisBreach = "target_hit" | "stop_hit" | "verdict_flipped" | null;

export interface ThesisView {
  id: string;
  ticker: string;
  bias: ThesisBias;
  targetPrice: number | null;
  stopLoss: number | null;
  rationale: string | null;
  close: number | null;
  signalLabel: string | null;
  breach: ThesisBreach;
  updatedAt: string;
}

export function useTheses() {
  const { status } = useSession();
  return useQuery<ThesisView[]>({
    queryKey: ["theses"],
    queryFn: async () => {
      const res = await fetch("/api/thesis");
      if (!res.ok) throw new Error("Gagal memuat tesis");
      const json = await res.json();
      return json.data;
    },
    enabled: status === "authenticated",
    staleTime: 60_000,
  });
}

export function useUpsertThesis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      ticker: string;
      bias: ThesisBias;
      targetPrice?: number | null;
      stopLoss?: number | null;
      rationale?: string;
    }) => {
      const res = await fetch("/api/thesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Gagal menyimpan tesis");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["theses"] });
    },
  });
}

export function useDeleteThesis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ticker: string) => {
      const res = await fetch(`/api/thesis/${encodeURIComponent(ticker)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus tesis");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["theses"] });
    },
  });
}
