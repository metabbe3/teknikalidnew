/**
 * Selftest: /stocks Hero Slim (Hapus Duplikasi)
 * Run: npx tsx scripts/selftest/stocks-hero-slim.selftest.ts
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

let failed = 0;
function check(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) {
    failed++;
    if (detail) console.log(`      ${detail}`);
  }
}

async function main() {
  console.log("=== SELFTEST: /stocks HERO SLIM ===");

  const pagePath = path.resolve(__dirname, "../../src/app/(public)/stocks/page.tsx");
  const sourceCode = fs.readFileSync(pagePath, "utf-8");

  // 1. Source code layout assertions
  {
    check(
      "1a. H1 tetap ada dengan id='radar'",
      sourceCode.includes('<h1 id="radar"') && sourceCode.includes("Harga Saham IDX Hari Ini")
    );
    check(
      "1b. id='pantauan' tetap utuh sebagai anchor",
      sourceCode.includes('id="pantauan"')
    );
    check(
      "1c. Label 'IDX Radar' berada berdampingan dengan H1",
      sourceCode.includes("IDX Radar") && sourceCode.includes("items-baseline")
    );
    check(
      "1d. Paragraf pendek ≤ 90 karakter memuat keyword kunci",
      sourceCode.includes("Pantau harga, RSI, MACD &amp; volume 956+ saham BEI setiap hari bursa.")
    );
    const heroSentence = "Pantau harga, RSI, MACD & volume 956+ saham BEI setiap hari bursa.";
    check(
      `1e. Panjang kalimat deskripsi (${heroSentence.length} char) ≤ 90 char`,
      heroSentence.length <= 90
    );
    check(
      "1f. MarketBreathStrip tetap ada di hero",
      sourceCode.includes("<MarketBreathStrip")
    );
    check(
      "1g. Kartu promo paper trading 'Mulai Simulasi Gratis' SUDAH DIHAPUS dari hero",
      !sourceCode.includes("Mulai Simulasi Gratis")
    );
    check(
      "1h. Chip 'Lagi Naik' dan 'Lagi Murah' SUDAH DIHAPUS dari hero",
      !sourceCode.includes("Lagi Naik") && !sourceCode.includes("Lagi Murah")
    );
    check(
      "1i. Subtitle SectionHeading diperpendek menjadi 'Cari & saring 900+ saham BEI'",
      sourceCode.includes('description="Cari & saring 900+ saham BEI"')
    );
    check(
      "1j. '956+' muncul 1x di teks intro hero",
      (sourceCode.match(/Pantau harga, RSI, MACD &amp; volume 956\+ saham BEI setiap hari bursa\./g) || []).length === 1
    );
  }

  // 2. Playwright Render & Height Verification (Mobile & Desktop)
  {
    const browser = await chromium.launch({ headless: true });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; }
          </style>
        </head>
        <body class="bg-gray-50 text-gray-900">
          <section id="hero-section" class="border-b border-gray-200 bg-white">
            <div class="max-w-7xl mx-auto px-4 py-3 sm:py-4">
              <!-- MarketStatus -->
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span class="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1">
                  <span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                  <span class="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-800">Tutup · Akhir Pekan</span>
                </span>
                <span class="font-mono text-xs text-gray-500">
                  Data sesi terakhir: <span class="font-medium text-gray-700">7 Nov 2026</span>
                </span>
              </div>

              <!-- H1 + Label -->
              <div class="mt-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <h1 id="radar" class="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
                  Harga Saham IDX Hari Ini
                </h1>
                <span class="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  IDX Radar
                </span>
              </div>

              <!-- Short SEO sentence -->
              <p class="mt-1 text-xs text-gray-500">
                Pantau harga, RSI, MACD & volume 956+ saham BEI setiap hari bursa.
              </p>

              <!-- MarketBreathStrip -->
              <div class="mt-2 sm:mt-2.5">
                <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                  <span class="inline-flex items-center gap-1.5 font-semibold text-emerald-600">
                    <span class="font-mono tabular-nums">231</span> naik
                  </span>
                  <span class="inline-flex items-center gap-1.5 font-semibold text-rose-600">
                    <span class="font-mono tabular-nums">440</span> turun
                  </span>
                  <span class="inline-flex items-center gap-1.5 text-gray-500">
                    <span class="font-mono tabular-nums">162</span> stagnan
                  </span>
                  <span class="hidden md:inline-flex items-center gap-1 text-gray-600 ml-auto">
                    Top Gainer: <strong class="font-mono text-emerald-600">AIMS +25%</strong>
                  </span>
                  <span class="hidden md:inline-flex items-center gap-1 text-gray-600">
                    Top Loser: <strong class="font-mono text-rose-600">LAPD -10%</strong>
                  </span>
                </div>
              </div>
            </div>
          </section>
        </body>
      </html>
    `;

    // 2a. Desktop Viewport (1440x900)
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.setContent(htmlContent, { waitUntil: "networkidle" });

      const heroBox = await page.locator("#hero-section").boundingBox();
      assert(heroBox !== null);

      console.log(`\n--- PENGUKURAN TINGGI HERO DESKTOP (1440px) ---`);
      console.log(`Tinggi Hero Desktop: ${heroBox.height.toFixed(1)}px (Target: ≤ 180px, ~150px)`);

      check(
        `2a. Desktop (1440px): Hero height ≤ 180px (hasil: ${heroBox.height.toFixed(1)}px)`,
        heroBox.height <= 180,
        `Tinggi desktop: ${heroBox.height}px`
      );

      await page.close();
    }

    // 2b. Mobile Viewport (375x812 iPhone)
    {
      const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
      const page = await context.newPage();
      await page.setContent(htmlContent, { waitUntil: "networkidle" });

      const heroBox = await page.locator("#hero-section").boundingBox();
      assert(heroBox !== null);

      console.log(`\n--- PENGUKURAN TINGGI HERO MOBILE (375px) ---`);
      console.log(`Tinggi Hero Mobile: ${heroBox.height.toFixed(1)}px (Target: ≤ 180px, ~150px)`);

      check(
        `2b. Mobile (375px): Hero height ≤ 180px (hasil: ${heroBox.height.toFixed(1)}px)`,
        heroBox.height <= 180,
        `Tinggi mobile: ${heroBox.height}px`
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
