"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface FAQItem {
  id: string;
  question: string;
  shortAnswer: string;
  slug: string;
  category: string;
  tickerTag: string | null;
  helpfulVotes: number;
}

interface FAQListOptions {
  category?: string;
  ticker?: string;
  q?: string;
}

export function useFAQList(opts: FAQListOptions) {
  return useQuery<{ data: FAQItem[] }>({
    queryKey: ["faq", opts],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (opts.category) params.set("category", opts.category);
      if (opts.ticker) params.set("ticker", opts.ticker);
      if (opts.q) params.set("q", opts.q);

      const res = await fetch(`/api/faq?${params}`);
      if (!res.ok) throw new Error("Gagal memuat FAQ");
      return res.json();
    },
    enabled: !opts.q || opts.q.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFAQByTicker(ticker: string) {
  return useQuery<{ data: FAQItem[] }>({
    queryKey: ["faq", "ticker", ticker],
    queryFn: async () => {
      const res = await fetch(
        `/api/faq?ticker=${encodeURIComponent(ticker)}`
      );
      if (!res.ok) throw new Error("Gagal memuat FAQ");
      return res.json();
    },
    enabled: !!ticker,
    staleTime: 5 * 60 * 1000,
  });
}

export function useQuestionSubmit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      question,
      category,
    }: {
      question: string;
      category?: string;
    }) => {
      const res = await fetch("/api/faq/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, category }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error ?? "Gagal mengirim pertanyaan. Silakan coba lagi."
        );
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faq"] });
    },
  });
}

export function useFAQVote(questionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/faq/${encodeURIComponent(questionId)}/vote`, {
        method: "POST",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error ?? "Gagal memberikan vote. Silakan coba lagi."
        );
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faq"] });
    },
  });
}
