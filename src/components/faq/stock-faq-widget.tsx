"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

interface FAQItem {
  id: string;
  question: string;
  shortAnswer: string;
  slug: string;
  category: string;
  helpfulVotes: number;
}

interface StockFAQWidgetProps {
  ticker: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  indikator: "bg-blue-500/15 text-blue-400",
  saham: "bg-emerald-500/15 text-emerald-400",
  trading: "bg-purple-500/15 text-purple-400",
  umum: "bg-gray-500/15 text-gray-400",
};

function FAQItemRow({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);
  const categoryColor =
    CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.umum;

  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left py-2.5 flex items-start gap-2 hover:bg-bg-hover/50 transition-colors px-1"
      >
        <svg
          className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-text-tertiary transition-transform ${
            open ? "rotate-180" : ""
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
        <span className="flex-1 text-sm text-text-primary leading-snug">
          {item.question}
        </span>
        <span
          className={`text-[9px] font-mono font-medium px-1.5 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0 ${categoryColor}`}
        >
          {item.category}
        </span>
      </button>

      {open && (
        <div className="pb-2.5 pl-5.5 pr-1">
          <p className="text-xs text-text-secondary leading-relaxed">
            {item.shortAnswer}
          </p>
          <Link
            href={`/akademi/tanya/${item.slug}`}
            className="text-[11px] font-medium text-blue-400 hover:text-blue-300 transition-colors mt-1 inline-block"
          >
            Baca selengkapnya &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}

function StockFAQSkeleton() {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-bg-hover animate-pulse" />
        <div className="w-40 h-4 rounded bg-bg-hover animate-pulse" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start gap-2 py-1">
            <div className="w-3.5 h-3.5 rounded bg-bg-hover animate-pulse mt-0.5" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 rounded bg-bg-hover animate-pulse w-full" />
              <div className="h-3 rounded bg-bg-hover animate-pulse w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StockFAQWidget({ ticker }: StockFAQWidgetProps) {
  const displayName = ticker.replace(".JK", "");

  const { data, isLoading } = useQuery<{ data: FAQItem[] }>({
    queryKey: ["faq", "ticker", ticker],
    queryFn: async () => {
      const res = await fetch(
        `/api/faq?ticker=${encodeURIComponent(ticker)}&limit=5`
      );
      if (!res.ok) throw new Error("Gagal memuat FAQ");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) return <StockFAQSkeleton />;

  const items = data?.data;
  if (!items?.length) return null;

  return (
    <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-text-tertiary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <h3 className="text-sm font-semibold text-text-primary">
            Pertanyaan tentang {displayName}
          </h3>
        </div>
      </div>

      <div className="divide-y divide-border/50 px-4">
        {items.map((item) => (
          <FAQItemRow key={item.id} item={item} />
        ))}
      </div>

      <div className="px-4 py-2.5 border-t border-border/50">
        <Link
          href="/akademi?tab=faq"
          className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
        >
          Lihat semua pertanyaan &rarr;
        </Link>
      </div>
    </div>
  );
}
