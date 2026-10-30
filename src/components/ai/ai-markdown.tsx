"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { isPlausibleTicker } from "@/lib/ai-ticker-guard";

/**
 * AiMarkdown (owner 30 Okt: "kita beautify md formatnya"):
 * Renderer jawaban AI — glfm (tabel/bold/bullet), link ticker otomatis, styling token teknikal.id.
 * Dipakai: stock-ai-modal (summarize + ask), screener-ai-modal, ask-ai-fab.
 * MD mentah (## / ** / tabel) TIDAK lagi dirender whitespace-pre-line polos.
 */

const ID_TICKER_RE = /^[A-Z]{4}$/;

export function AiMarkdown({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div className={compact ? "text-[13px] leading-relaxed" : "text-sm leading-relaxed"}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <p className="font-bold text-text-primary mt-2 first:mt-0">{children}</p>
          ),
          h2: ({ children }) => (
            <p className="font-bold text-text-primary mt-3 first:mt-0">{children}</p>
          ),
          h3: ({ children }) => (
            <p className="font-semibold text-text-primary mt-2 first:mt-0">{children}</p>
          ),
          p: ({ children }) => <p className="text-text-secondary mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="space-y-1 mb-2 last:mb-0 pl-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 mb-2 last:mb-0 pl-5">{children}</ol>,
          li: ({ children }) => <li className="text-text-secondary marker:text-text-tertiary">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-text-primary">{children}</strong>,
          hr: () => <hr className="my-3 border-border" />,
          a: ({ href, children }) => {
            // [TICKER](/stocks/TICKER.JK) → Link internal styled
            const label = String(children ?? "");
            if (href?.startsWith("/stocks/")) {
              return (
                <Link
                  href={href}
                  className="font-mono text-xs font-bold text-accent bg-accent/10 rounded px-1.5 py-0.5 hover:bg-accent/20 transition-colors"
                >
                  {label}
                </Link>
              );
            }
            return (
              <a href={href} className="text-accent hover:underline" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
          table: ({ children }) => (
            <div className="overflow-x-auto mb-2 last:mb-0 rounded-lg border border-border">
              <table className="w-full text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-bg-tertiary/60">{children}</thead>,
          th: ({ children }) => (
            <th className="text-left font-semibold text-text-primary px-2.5 py-1.5 whitespace-nowrap">{children}</th>
          ),
          td: ({ children }) => <td className="px-2.5 py-1.5 text-text-secondary border-t border-border">{children}</td>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-accent/40 pl-3 text-text-tertiary italic">{children}</blockquote>
          ),
        }}
      >
        {text}
      </Markdown>
    </div>
  );
}

/** Ekstrak ticker ID 4-huruf dari teks jawaban (utk tombol deep-link di FAB) — exclude kata umum. */
export function extractTickers(text: string, max = 4): string[] {
  const found = text.match(/\b[A-Z]{4}\b/g) ?? [];
  return [...new Set(found)].filter((t) => t !== "IHSG" && isPlausibleTicker(t)).slice(0, max);
}
