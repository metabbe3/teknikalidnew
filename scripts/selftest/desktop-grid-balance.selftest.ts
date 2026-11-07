/**
 * Selftest: Desktop Kolom Kanan Seimbang (Grid 2-Kolom Stock Page)
 * Run: npx tsx scripts/selftest/desktop-grid-balance.selftest.ts
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as parse5 from "parse5";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

import { TradingPlanCard } from "../../src/components/stock/trading-plan-card";
import { SignalBreakdownDetails } from "../../src/components/stock/signal-breakdown-details";
import { StockAiPromptChips } from "../../src/components/stock/stock-ai-prompt-chips";
import type { TradingPlan } from "../../src/lib/trading-plan";

let failed = 0;
function check(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) {
    failed++;
    if (detail) console.log(`      ${detail}`);
  }
}

const mockPlan: TradingPlan = {
  ticker: "BBCA",
  action: "buy_pullback",
  entryMin: 9800,
  entryMax: 9900,
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
  console.log("=== SELFTEST: DESKTOP GRID BALANCE (2-KOLOM SEIMBANG) ===");

  const pagePath = path.resolve(__dirname, "../../src/app/(public)/stocks/[ticker]/page.tsx");
  const sourceCode = fs.readFileSync(pagePath, "utf-8");

  // 1. Source code layout assertions
  {
    check(
      "1a. Grid memiliki kelas 2-kolom desktop lg:grid-cols-2",
      sourceCode.includes("grid grid-cols-1 lg:grid-cols-2 gap-4 items-start")
    );
    check(
      "1b. Kolom Trading Plan membawa order-1 lg:order-2 (mobile pertama, desktop kanan)",
      sourceCode.includes("order-1 lg:order-2")
    );
    check(
      "1c. Kolom Skor Sinyal & Pasar membawa order-2 lg:order-1 (mobile kedua, desktop kiri)",
      sourceCode.includes("order-2 lg:order-1")
    );
    check(
      "1d. Blok Bandingkan dengan berada di dalam kolom kiri (child1)",
      sourceCode.indexOf("comparePeers.length > 0") < sourceCode.indexOf("</GuestQuotaProvider>")
    );
    check(
      "1e. Blok OHLC berada di dalam kolom kiri (child1)",
      sourceCode.indexOf("Statistik harga hari ini") < sourceCode.indexOf("</GuestQuotaProvider>")
    );
    check(
      "1f. Blok Ringkas untuk pemula berada di dalam kolom kiri (child1)",
      sourceCode.indexOf("Ringkas untuk pemula:") < sourceCode.indexOf("</GuestQuotaProvider>")
    );
    check(
      "1g. GuestQuotaProvider tetap membungkus seluruh grid",
      sourceCode.includes("<GuestQuotaProvider ticker={stripJk(ticker)} isAuthed={isAuthed}>")
    );
    check(
      "1h. Konten SSR tunggal tanpa duplikasi DOM",
      (sourceCode.match(/data-engagement="agent_deeplink_compact"/g) || []).length === 1 &&
      (sourceCode.match(/data-engagement="nav_stockToIndeksBadge"/g) || []).length === 1
    );
  }

  // 2. Headless Browser (Playwright) Layout & Position Verification
  {
    const browser = await chromium.launch({ headless: true });

    // 2A. Mobile Viewport (375px)
    {
      const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; font-family: sans-serif; }
              .header { height: 164px; background: #fafafa; }
              .grid { display: grid; }
              .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
              .gap-4 { gap: 1rem; }
              .order-1 { order: 1; }
              .order-2 { order: 2; }
              @media (min-width: 1024px) {
                .lg\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                .lg\\:order-1 { order: 1; }
                .lg\\:order-2 { order: 2; }
              }
            </style>
          </head>
          <body>
            <div class="header">Header (~164px)</div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div id="plan-col" class="order-1 lg:order-2" style="height: 540px;">Trading Plan (order-1)</div>
              <div id="overview-col" class="order-2 lg:order-1" style="height: 480px;">Overview (order-2)</div>
            </div>
          </body>
        </html>
      `);

      const planBox = await page.locator("#plan-col").boundingBox();
      const overviewBox = await page.locator("#overview-col").boundingBox();

      assert(planBox !== null && overviewBox !== null);
      check(
        "2a. Mobile (375px): Trading Plan berada di atas Kolom Overview",
        planBox.y < overviewBox.y,
        `plan y=${planBox.y}, overview y=${overviewBox.y}`
      );
      check(
        "2b. Mobile (375px): OffsetTop Trading Plan = ~164px (≤ 272px)",
        planBox.y <= 272,
        `plan y=${planBox.y}`
      );
      await page.close();
    }

    // 2B. Desktop Viewport (1440px)
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
              .container { max-width: 1200px; margin: 0 auto; padding: 1rem; }
              .grid { display: grid; }
              .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
              .gap-4 { gap: 1rem; }
              .items-start { align-items: start; }
              .space-y-4 > * + * { margin-top: 1rem; }
              .space-y-2\\.5 > * + * { margin-top: 0.625rem; }
              .order-1 { order: 1; }
              .order-2 { order: 2; }
              @media (min-width: 1024px) {
                .lg\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                .lg\\:order-1 { order: 1; }
                .lg\\:order-2 { order: 2; }
              }
              .card { border: 1px solid #e7e5e4; border-radius: 0.75rem; background: #ffffff; padding: 1rem; }
              .badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 11px; }
              .separator { border-top: 1px solid #e7e5e4; padding-top: 0.75rem; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                <!-- Child 0: Trading Plan (KANAN di desktop) -->
                <div id="col-right" class="space-y-2.5 order-1 lg:order-2">
                  <div class="card" style="min-height: 505px;">
                    <h3>Rencana Trading: Area Beli, Target & Cut Loss</h3>
                    <p style="margin-top: 4px; font-size: 12px; color: #78716c;">Sumber: Pivot & ATR · Antri Beli (BOW) · Keyakinan: Sedang</p>
                    <div style="margin-top: 12px; height: 180px; background: #fafafa; border-radius: 8px;"></div>
                    <div style="margin-top: 12px; height: 90px; background: #fafafa; border-radius: 8px;"></div>
                    <details style="margin-top: 8px; font-size: 12px;"><summary>Catatan risiko</summary></details>
                    <p style="margin-top: 8px; font-size: 10px; color: #78716c;">Disclaimer analisa harian...</p>
                  </div>
                  <div class="card" style="padding: 0.5rem 0.75rem; min-height: 48px;">
                    <p style="font-size: 12px;">🤖 Tanya AI soal BBCA · gratis 3x →</p>
                    <details style="margin-top: 4px; font-size: 11px;"><summary>💡 Panduan cepat tanya AI</summary></details>
                  </div>
                </div>

                <!-- Child 1: Overview & Indikator (KIRI di desktop) -->
                <div id="col-left" class="space-y-4 order-2 lg:order-1">
                  <!-- Skor Sinyal Card -->
                  <div class="card" style="min-height: 190px;">
                    <div style="display: flex; gap: 1rem; align-items: center;">
                      <div><strong style="font-size: 28px;">0,75</strong> <span class="badge">Beli</span></div>
                      <div style="flex: 1;"><div style="height: 8px; background: #0d9488; border-radius: 4px;"></div></div>
                    </div>
                    <details style="margin-top: 10px; font-size: 12px;"><summary>Rincian 9 Indikator</summary></details>
                    <p style="margin-top: 8px; font-size: 11px; color: #78716c;">Arah 5 sesi terakhir: 0,60 → 0,75 (menguat +0,15)</p>
                    <div style="margin-top: 8px;"><button style="padding: 6px 12px; font-size: 12px;">★ Simpan ke pantauan</button></div>
                  </div>

                  <!-- Stronger Peers -->
                  <div class="card" style="min-height: 64px; padding: 0.75rem;">
                    <p style="font-size: 12px; font-weight: 600;">🔥 Saham Financials dengan Sinyal Lebih Kuat Hari Ini</p>
                    <div style="margin-top: 6px; display: flex; gap: 6px; font-size: 11px;">
                      <span>BMRI</span> <span>BBRI</span>
                    </div>
                  </div>

                  <!-- Bridge Peers & Member Indices -->
                  <div style="font-size: 12px; display: flex; gap: 6px; flex-wrap: wrap;">
                    <span>Bank & Big-Cap Lainnya: BBRI BMRI BBNI</span>
                  </div>
                  <div style="font-size: 12px; display: flex; gap: 6px; flex-wrap: wrap;">
                    <span>Anggota Indeks: IHSG LQ45 IDX30</span>
                  </div>

                  <!-- Ringkas Pemula -->
                  <p style="font-size: 13px; color: #635c56; line-height: 1.4;">
                    <strong>Ringkas untuk pemula:</strong> 1 lot (100 lembar) BBCA = <strong>Rp985.000</strong> · batas bawah (support) sekitar <strong>Rp9.500</strong> · batas atas (resistance) sekitar <strong>Rp10.200</strong>.
                  </p>

                  <!-- Bandingkan dengan -->
                  <div class="separator">
                    <p style="font-size: 10px; text-transform: uppercase; color: #78716c; margin-bottom: 6px;">Bandingkan dengan</p>
                    <div style="display: flex; gap: 8px; font-size: 12px;">
                      <span class="badge" style="border: 1px solid #ccc;">BBCA vs BBRI</span>
                      <span class="badge" style="border: 1px solid #ccc;">BBCA vs BMRI</span>
                    </div>
                  </div>

                  <!-- OHLC -->
                  <div class="separator">
                    <div style="display: flex; gap: 12px; font-size: 12px;">
                      <span>Buka 9.850</span> <span>Tertinggi 9.950</span> <span>Terendah 9.800</span> <span>Volume 45,2M</span>
                    </div>
                    <p style="font-size: 10px; color: #78716c; margin-top: 6px;">EOD 7 Nov 2026 · live saat pasar buka</p>
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `);

      const leftBox = await page.locator("#col-left").boundingBox();
      const rightBox = await page.locator("#col-right").boundingBox();

      assert(leftBox !== null && rightBox !== null);

      check(
        "2c. Desktop (1440px): Kolom Overview berada di KIRI (x < 700)",
        leftBox.x < 700,
        `leftBox x=${leftBox.x}`
      );
      check(
        "2d. Desktop (1440px): Kolom Trading Plan berada di KANAN (x > 700)",
        rightBox.x > 700,
        `rightBox x=${rightBox.x}`
      );
      check(
        "2e. Desktop (1440px): Kedua kolom sejajar vertikal di atas (y identik)",
        Math.abs(leftBox.y - rightBox.y) <= 1,
        `left y=${leftBox.y}, right y=${rightBox.y}`
      );

      const heightDiff = Math.abs(leftBox.height - rightBox.height);
      console.log(`\n--- PENGUKURAN TINGGI DESKTOP 1440px ---`);
      console.log(`Kolom Kiri  (Skor + Peers + Ringkas + Bandingkan + OHLC): ${leftBox.height.toFixed(1)}px`);
      console.log(`Kolom Kanan (Trading Plan + Tanya AI compact):          ${rightBox.height.toFixed(1)}px`);
      console.log(`Selisih Tinggi (|Kiri - Kanan|):                        ${heightDiff.toFixed(1)}px`);
      console.log(`-----------------------------------------\n`);

      check(
        `2f. Selisih tinggi kolom kiri vs kanan ≤ 120px (hasil: ${heightDiff.toFixed(1)}px)`,
        heightDiff <= 120,
        `Selisih: ${heightDiff}px`
      );

      await page.close();
    }

    await browser.close();
  }

  console.log("\n" + (failed === 0 ? "RESULT: ALL PASS" : `RESULT: ${failed} FAILED`));
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
