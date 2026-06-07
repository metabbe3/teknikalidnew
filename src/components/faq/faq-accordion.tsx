"use client";

import { useState } from "react";
import Link from "next/link";

const CATEGORY_COLORS: Record<string, string> = {
  indikator: "bg-blue-500/15 text-blue-400",
  saham: "bg-emerald-500/15 text-emerald-400",
  trading: "bg-purple-500/15 text-purple-400",
  umum: "bg-gray-500/15 text-gray-400",
};

interface FAQAccordionProps {
  question: string;
  shortAnswer: string;
  slug: string;
  category: string;
  helpfulVotes?: number;
}

export function FAQAccordion({
  question,
  shortAnswer,
  slug,
  category,
  helpfulVotes = 0,
}: FAQAccordionProps) {
  const [open, setOpen] = useState(false);

  const categoryColor =
    CATEGORY_COLORS[category] ?? CATEGORY_COLORS.umum;

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-bg-card">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-bg-hover transition-colors"
      >
        <svg
          className={`w-4 h-4 mt-0.5 flex-shrink-0 text-text-tertiary transition-transform ${
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

        <span className="flex-1">
          <span className="font-semibold text-text-primary text-sm leading-snug">
            {question}
          </span>
        </span>

        <span
          className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0 ${categoryColor}`}
        >
          {category}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-0">
          <div className="pl-7 space-y-3">
            <p className="text-sm text-text-secondary leading-relaxed">
              {shortAnswer}
            </p>

            <div className="flex items-center gap-4">
              <Link
                href={`/akademi/tanya/${slug}`}
                className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
              >
                Baca selengkapnya &rarr;
              </Link>

              {helpfulVotes > 0 && (
                <span className="flex items-center gap-1 text-xs text-text-tertiary">
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                  </svg>
                  {helpfulVotes}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
