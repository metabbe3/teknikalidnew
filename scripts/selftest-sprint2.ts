/**
 * Self-test script untuk Sprint 2 SEO: Heading Per-Indikator × Ticker
 * Memverifikasi ketersediaan data DB nyata, render komponen IndicatorSeoSection,
 * format desimal id-ID (formatDecimalId), heading H2 SEO, dan integrasi page ticker.
 *
 * Jalankan: npx tsx scripts/selftest-sprint2.ts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const ROOT = join(__dirname, "..");

// Setup DATABASE_URL jika berjalan lokal di luar docker (port 5433 host -> 5432 container)
function getLocalDbUrl(): string | undefined {
  try {
    const env = readFileSync(join(ROOT, ".env"), "utf8");
    const m = env.match(/^DATABASE_URL=(.+)$/m);
    if (!m) return undefined;
    return m[1].trim().replace(/@db:5432\//, "@127.0.0.1:5433/");
  } catch {
    return undefined;
  }
}

if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("@db:")) {
  const localUrl = getLocalDbUrl();
  if (localUrl) {
    process.env.DATABASE_URL = localUrl;
  }
}

const log = (msg = "") => process.stdout.write(`${msg}\n`);

async function run() {
  log("=========================================================");
  log("=== SELF-TEST SPRINT 2 SEO: HEADING PER-INDIKATOR × TICKER ===");
  log("=========================================================");

  let hasError = false;
  const assert = (condition: boolean, label: string) => {
    if (condition) {
      log(`  ✓ [PASS] ${label}`);
    } else {
      log(`  ✗ [FAIL] ${label}`);
      hasError = true;
    }
  };

  // 1. Static Code Analysis Gates
  log("\n--- 1. STATIC CODE AUDIT & CONSTRAINTS ---");
  const componentPath = join(ROOT, "src/components/stock/indicator-seo-section.tsx");
  const pagePath = join(ROOT, "src/app/(public)/stocks/[ticker]/page.tsx");

  const componentSource = readFileSync(componentPath, "utf8");
  const pageSource = readFileSync(pagePath, "utf8");

  const componentLines = componentSource.split("\n").length;
  log(`  Line count indicator-seo-section.tsx: ${componentLines} baris (batas < 200)`);
  assert(componentLines < 200, "Komponen di bawah batas 200 baris (<200 lines)");

  assert(
    componentSource.includes("formatDecimalId") && !componentSource.includes(".toFixed("),
    "formatDecimalId dipakai konsisten (0 toFixed)"
  );

  assert(
    !componentSource.includes('"use client"') && !componentSource.includes("'use client'"),
    "Komponen adalah pure Server Component (nol client JS)"
  );

  assert(
    pageSource.includes("import { IndicatorSeoSection }") &&
    pageSource.includes("<IndicatorSeoSection"),
    "IndicatorSeoSection diintegrasikan dan dipanggil di src/app/(public)/stocks/[ticker]/page.tsx"
  );

  assert(
    pageSource.includes("RSI ${name}") && pageSource.includes("MACD ${name}"),
    "generateMetadata memuat keywords indikator tambahan tanpa mengubah title utama"
  );

  // 2. Database Fetch & Real Indicator Data
  log("\n--- 2. REAL DATA VERIFICATION (BBCA.JK) ---");
  const { stockMarketService } = await import("../src/domains/stock/stock-market.service");
  const { prisma } = await import("../src/lib/prisma");

  const t0 = Date.now();
  const detail = await stockMarketService.getStockDetailForPage("BBCA.JK");
  const duration = Date.now() - t0;

  log(`Data BBCA.JK dimuat dalam ${duration}ms:`);
  log(`  Ticker      : ${detail.stock.ticker}`);
  log(`  Nama        : ${detail.stock.name}`);
  log(`  Close Price : Rp${detail.close}`);
  log(`  RSI (14)    : ${detail.indicator?.rsi14}`);
  log(`  MACD Line   : ${detail.indicator?.macdLine}`);
  log(`  MACD Signal : ${detail.indicator?.macdSignal}`);
  log(`  SMA 20      : ${detail.indicator?.sma20}`);
  log(`  SMA 50      : ${detail.indicator?.sma50}`);
  log(`  BB Upper    : ${detail.indicator?.bbUpper}`);
  log(`  BB Lower    : ${detail.indicator?.bbLower}`);
  log(`  Stoch %K    : ${detail.indicator?.stochK}`);
  log(`  ADX         : ${detail.indicator?.adx}`);
  log(`  ATR         : ${detail.indicator?.atr}`);

  assert(detail.indicator?.rsi14 !== null && detail.indicator?.rsi14 !== undefined, "Data nyata rsi14 terisi");
  assert(detail.indicator?.macdLine !== null, "Data nyata macdLine terisi");
  assert(detail.indicator?.sma20 !== null, "Data nyata sma20 terisi");
  assert(detail.indicator?.bbUpper !== null, "Data nyata bbUpper terisi");

  // 3. Component Rendering with Real Data
  log("\n--- 3. SERVER COMPONENT RENDER (REAL DATA) ---");
  const { IndicatorSeoSection } = await import("../src/components/stock/indicator-seo-section");
  const { formatDecimalId } = await import("../src/lib/format-number");

  const realHtml = renderToStaticMarkup(
    React.createElement(IndicatorSeoSection, {
      ticker: detail.stock.ticker,
      name: detail.stock.name,
      close: detail.close,
      indicators: detail.indicator,
    })
  );

  log(`Rendered HTML length: ${realHtml.length} characters`);

  // Assert H2 headings
  assert(realHtml.includes("<h2"), "Heading H2 ada dalam render");
  assert(realHtml.includes("RSI BBCA Hari Ini"), 'Heading "RSI BBCA Hari Ini" ADA');
  assert(realHtml.includes("MACD BBCA Hari Ini"), 'Heading "MACD BBCA Hari Ini" ADA');
  assert(realHtml.includes("Moving Average BBCA Hari Ini"), 'Heading "Moving Average BBCA Hari Ini" ADA');
  assert(realHtml.includes("Bollinger Bands BBCA Hari Ini"), 'Heading "Bollinger Bands BBCA Hari Ini" ADA');
  assert(realHtml.includes("Stochastic BBCA Hari Ini"), 'Heading "Stochastic BBCA Hari Ini" ADA');
  assert(realHtml.includes("ADX BBCA Hari Ini"), 'Heading "ADX BBCA Hari Ini" ADA');
  assert(realHtml.includes("ATR BBCA Hari Ini"), 'Heading "ATR BBCA Hari Ini" ADA');

  // Assert real formatted indicator numbers in the rendered HTML
  const expectedRsiStr = formatDecimalId(detail.indicator?.rsi14, 2);
  log(`Grep check: Angka RSI nyata ${expectedRsiStr} di dalam konten HTML...`);
  assert(realHtml.includes(expectedRsiStr), `Angka RSI nyata (${expectedRsiStr}) muncul di teks derivasi`);

  const expectedSma20Str = formatDecimalId(detail.indicator?.sma20, 2);
  assert(realHtml.includes(expectedSma20Str), `Angka SMA 20 nyata (${expectedSma20Str}) muncul di teks derivasi`);

  // 4. Graceful Degradation Test (Null Safety)
  log("\n--- 4. NULL SAFETY & GRACEFUL DEGRADATION ---");
  const nullHtml = renderToStaticMarkup(
    React.createElement(IndicatorSeoSection, {
      ticker: "BBCA.JK",
      name: "Bank Central Asia",
      close: 5500,
      indicators: {
        rsi14: null,
        macdLine: null,
        macdSignal: null,
        sma20: null,
        sma50: null,
        bbUpper: null,
        bbLower: null,
        stochK: null,
        stochD: null,
        adx: null,
        atr: null,
      },
    })
  );
  assert(nullHtml === "", "Indikator semua null menghasilkan output kosong (0 heading kosong)");

  const partialHtml = renderToStaticMarkup(
    React.createElement(IndicatorSeoSection, {
      ticker: "TLKM.JK",
      name: "Telkom Indonesia",
      close: 2800,
      indicators: {
        rsi14: 65.4,
        macdLine: null, // missing MACD
        sma20: 2750,
      },
    })
  );
  assert(partialHtml.includes("RSI TLKM Hari Ini"), "Partial: RSI TLKM Hari Ini dirender");
  assert(!partialHtml.includes("MACD TLKM Hari Ini"), "Partial: MACD TLKM Hari Ini tidak dirender karena null");

  await prisma.$disconnect();

  log("\n=========================================================");
  if (hasError) {
    log("=== STATUS: FAILED (Lihat rincian error di atas) ===");
    process.exit(1);
  } else {
    log("=== STATUS: SUCCESS — SEMUA GATES PASS (EXIT 0) ===");
    process.exit(0);
  }
}

run().catch((err) => {
  console.error("Gagal menjalankan self-test:", err);
  process.exit(1);
});
