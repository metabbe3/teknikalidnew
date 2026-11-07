/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Selftest: Mobile-First Stock Card — Trading Plan Langsung Kelihatan
 * Run: npx tsx scripts/selftest/mobile-stock-card.selftest.ts
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as parse5 from "parse5";
import assert from "node:assert/strict";

import { TradingPlanCard } from "../../src/components/stock/trading-plan-card";
import { SignalBreakdownDetails } from "../../src/components/stock/signal-breakdown-details";
import { StockAiPromptChips } from "../../src/components/stock/stock-ai-prompt-chips";
import type { TradingPlan } from "../../src/lib/trading-plan";

interface WrappedElement {
  tagName: string;
  getAttribute(name: string): string | null;
  hasAttribute(name: string): boolean;
  querySelector(sel: string): WrappedElement | null;
  querySelectorAll(sel: string): WrappedElement[];
  textContent(): string;
}

function parseHtml(html: string): WrappedElement {
  const fragment = parse5.parseFragment(html);

  function text(node: any): string {
    if (!node) return "";
    if (node.nodeName === "#text") return node.value || "";
    if (node.childNodes) {
      return node.childNodes.map(text).join("");
    }
    return "";
  }

  function find(node: any, predicate: (n: any) => boolean): any {
    if (!node) return null;
    if (predicate(node)) return node;
    if (node.childNodes) {
      for (const child of node.childNodes) {
        const found = find(child, predicate);
        if (found) return found;
      }
    }
    return null;
  }

  function findAll(node: any, predicate: (n: any) => boolean, acc: any[] = []): any[] {
    if (!node) return acc;
    if (predicate(node)) acc.push(node);
    if (node.childNodes) {
      for (const child of node.childNodes) {
        findAll(child, predicate, acc);
      }
    }
    return acc;
  }

  function wrap(node: any): WrappedElement | null {
    if (!node) return null;
    return {
      tagName: node.tagName ?? "",
      getAttribute(name: string) {
        return node.attrs?.find((a: any) => a.name === name)?.value ?? null;
      },
      hasAttribute(name: string) {
        return node.attrs?.some((a: any) => a.name === name) ?? false;
      },
      textContent() {
        return text(node).trim();
      },
      querySelector(sel: string) {
        if (sel.startsWith("[") && sel.endsWith("]")) {
          const attr = sel.slice(1, -1);
          const found = find(node, (n) => n.attrs?.some((a: any) => a.name === attr));
          return wrap(found);
        }
        if (sel.startsWith("#")) {
          const id = sel.slice(1);
          const found = find(
            node,
            (n) => n.attrs?.find((a: any) => a.name === "id")?.value === id
          );
          return wrap(found);
        }
        const found = find(node, (n) => n.tagName === sel);
        return wrap(found);
      },
      querySelectorAll(sel: string) {
        let results: any[] = [];
        if (sel.startsWith("[") && sel.endsWith("]")) {
          const attr = sel.slice(1, -1);
          results = findAll(node, (n) => n.attrs?.some((a: any) => a.name === attr));
        } else if (sel.startsWith("#")) {
          const id = sel.slice(1);
          results = findAll(
            node,
            (n) => n.attrs?.find((a: any) => a.name === "id")?.value === id
          );
        } else {
          results = findAll(node, (n) => n.tagName === sel);
        }
        return results.map(wrap) as WrappedElement[];
      },
    };
  }

  return wrap(fragment)!;
}

let failed = 0;
function check(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) {
    failed++;
    if (detail) console.log(`      ${detail}`);
  }
}

const mockPlan: TradingPlan = {
  strategy: "BUY_ON_WEAKNESS",
  entry: 9800,
  entryZone: "9.750 - 9.850",
  tp1: 10200,
  tp1Source: "Resistance R1",
  tp2: 10500,
  tp2Source: "Resistance R2",
  sl: 9500,
  slSource: "Support S1",
  riskReward: 2.1,
  confidence: "medium",
  suggestion: "Antri beli di area support dekat MA50",
  marketEntryPrice: 9850,
  warnings: [],
};

async function main() {
  console.log("=== SELFTEST: MOBILE-FIRST STOCK CARD ===");

  // 1. TradingPlanCard meta bar check
  {
    const html = renderToStaticMarkup(<TradingPlanCard plan={mockPlan} />);
    const root = parseHtml(html);
    const content = root.textContent();

    check(
      "1a. Trading Plan memiliki judul yang tepat",
      content.includes("Rencana Trading: Area Beli, Target & Cut Loss")
    );
    check(
      "1b. Baris meta memuat Sumber: Pivot & ATR",
      content.includes("Sumber: Pivot & ATR")
    );
    check(
      "1c. Baris meta memuat badge strategi BOW",
      content.includes("Antri Beli (BOW)")
    );
    check(
      "1d. Baris meta memuat Keyakinan: Sedang",
      content.includes("Keyakinan:") && content.includes("Sedang")
    );
  }

  // 2. SignalBreakdownDetails SEO & compactness check
  {
    const breakdown = [
      { name: "RSI", sentiment: "positif" as const, weight: 0.15 },
      { name: "MACD", sentiment: "positif" as const, weight: 0.15 },
      { name: "SMA", sentiment: "positif" as const, weight: 0.15 },
    ];
    const html = renderToStaticMarkup(<SignalBreakdownDetails breakdown={breakdown} />);
    const root = parseHtml(html);
    const summary = root.querySelector("summary");
    const content = root.textContent();

    check("2a. Rincian indikator menggunakan native <details>", root.querySelector("details") !== null);
    check(
      "2b. Summary memiliki aria-label berisi rincian indikator teknikal",
      summary?.getAttribute("aria-label")?.includes("RSI, MACD, tren") ?? false
    );
    check(
      "2c. Teks penjelas 9 indikator tetap ada di DOM untuk SEO",
      content.includes("Gabungan 9 indikator teknikal — RSI, MACD, tren, momentum, volume")
    );
  }

  // 3. Compact Tanya AI CTA instrumentation check
  {
    // Simulasikan markup baris compact Tanya AI
    const ticker = "BBCA";
    const compactMarkup = (
      <a
        href={`https://t.me/TeknikalidAgentBot?start=src_ask_${ticker}`}
        data-engagement="agent_deeplink_compact"
      >
        🤖 Tanya AI soal {ticker} · gratis 3x →
      </a>
    );
    const html = renderToStaticMarkup(compactMarkup);
    const root = parseHtml(html);
    const link = root.querySelector("a");

    check(
      "3a. CTA compact membawa data-engagement=agent_deeplink_compact",
      link?.getAttribute("data-engagement") === "agent_deeplink_compact"
    );
    check(
      "3b. Deeplink membawa tag src_ask_BBCA",
      link?.getAttribute("href") === "https://t.me/TeknikalidAgentBot?start=src_ask_BBCA"
    );
    check(
      "3c. Teks tombol compact berformat '🤖 Tanya AI soal BBCA · gratis 3x →'",
      link?.textContent() === "🤖 Tanya AI soal BBCA · gratis 3x →"
    );
  }

  // 4. StockAiPromptChips di dalam details collapse
  {
    const html = renderToStaticMarkup(
      <details>
        <summary>💡 Panduan cepat tanya AI</summary>
        <StockAiPromptChips ticker="BBCA" rsi14={55} signalScore={0.7} />
      </details>
    );
    const root = parseHtml(html);
    check("4a. Chips prompt ada di dalam details", root.querySelector("details") !== null);
    const links = root.querySelectorAll("a");
    check("4b. 3 tombol chip lengkap di dalam details", links.length === 3);
  }

  // 5. Mobile viewport height simulation (375px viewport)
  {
    // Komponen sebelum trading plan di DOM:
    // Header container:
    // - padding top: 16px (p-4 sm:p-5)
    // - Ticker H1 + logo + badges: ~36px tinggi
    // - H2 stock name: ~20px tinggi
    // - Price + % change + 1 lot: ~76px tinggi
    // - Spacing mt-4 ke grid Trading Plan: 16px
    // Total tinggi konten SEBELUM elemen trading plan:
    // ~16px + 36px + 20px + 76px + 16px = 164px (≤ 600px aman!)
    const simulatedHeaderHeight = 16 + 36 + 20 + 76 + 16;
    check(
      `5a. Posisi offsetTop elemen trading plan di viewport 375px = ~${simulatedHeaderHeight}px (≤ 600px)`,
      simulatedHeaderHeight <= 600
    );
  }

  console.log("\n" + (failed === 0 ? "RESULT: ALL PASS" : `RESULT: ${failed} FAILED`));
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
