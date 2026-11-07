/**
 * Selftest: InfoTip Click & Tap Mobile Verification
 *
 * Verifies:
 * 1. InfoTip renders proper accessible TooltipTrigger button with aria-label & 'ⓘ' icon on SSR.
 * 2. Interactive behavior: desktop click, mobile tap, and keyboard focus open tooltip popup with expected text.
 * 3. Page integration: src/app/(public)/stocks/[ticker]/page.tsx imports and uses InfoTip
 *    for both Hero business profile and Signal card.
 * 4. SEO protection: <span className="sr-only"> · {desc}</span> preserved in H2.
 * 5. Native browser hover-only title attrs are eliminated from both locations.
 *
 * Run: npx tsx scripts/selftest/infotip-click.selftest.tsx
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import * as esbuild from "esbuild";
import { chromium, devices } from "@playwright/test";
import { InfoTip } from "@/components/stock/info-tip";

let failed = 0;
function check(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) {
    failed++;
    if (detail) console.log(`      ${detail}`);
  }
}

async function main() {
  console.log("=== SELFTEST: INFOTIP CLICK & MOBILE TAP (STOCKS PAGE) ===");

  // 1. SSR Static Markup Verification
  {
    const label = "Profil bisnis";
    const text = "Perbankan dan jasa keuangan terintegrasi";
    const ssrHtml = renderToStaticMarkup(
      React.createElement(InfoTip, { label, text })
    );

    check(
      "1a. InfoTip SSR menghasilkan elemen button focusable (TooltipTrigger)",
      ssrHtml.includes("<button") && ssrHtml.includes('type="button"')
    );
    check(
      "1b. Atribut aria-label terisi format '${label}: ${text}'",
      ssrHtml.includes(`aria-label="${label}: ${text}"`)
    );
    check(
      "1c. Icon visual 'ⓘ' dirender dalam trigger",
      ssrHtml.includes("ⓘ")
    );
    check(
      "1d. Styling ukuran visual w-4 h-4 rounded-full tersemat",
      ssrHtml.includes("w-4") && ssrHtml.includes("h-4") && ssrHtml.includes("rounded-full")
    );
  }

  // 2. Interactive Verification via Playwright (Desktop Click, Mobile Tap, Keyboard Focus)
  {
    // Bundle lightweight test bundle mounting InfoTip with TooltipProvider
    const bundle = await esbuild.build({
      stdin: {
        contents: `
          import React from "react";
          import { createRoot } from "react-dom/client";
          import { TooltipProvider } from "./src/components/ui/tooltip";
          import { InfoTip } from "./src/components/stock/info-tip";

          const root = createRoot(document.getElementById("root"));
          root.render(
            React.createElement(TooltipProvider, { delay: 0 },
              React.createElement("div", { style: { padding: "40px" } },
                React.createElement(InfoTip, {
                  label: "Sinyal",
                  text: "Gabungan 9 indikator teknikal — RSI, MACD, tren, momentum, volume"
                })
              )
            )
          );
        `,
        resolveDir: process.cwd(),
        loader: "tsx",
      },
      bundle: true,
      write: false,
      format: "iife",
      define: {
        "process.env.NODE_ENV": JSON.stringify("development"),
      },
    });

    const js = bundle.outputFiles[0].text;
    const testHtml = `<!DOCTYPE html><html><body><div id="root"></div><script>${js}<\/script></body></html>`;

    const browser = await chromium.launch({ headless: true });

    // Desktop Click Test
    {
      const page = await browser.newPage();
      await page.setContent(testHtml);

      const trigger = page.locator("[data-slot=\"tooltip-trigger\"]");
      await trigger.waitFor({ state: "visible" });

      await trigger.click();
      const popup = page.locator("[data-slot=\"tooltip-content\"]");
      const isVisible = await popup.isVisible();
      const popupText = isVisible ? await popup.innerText() : "";

      check(
        "2a. Desktop click membuka popup tooltip",
        isVisible && popupText.includes("Gabungan 9 indikator teknikal")
      );
      await page.close();
    }

    // Mobile Tap Test (iPhone 14 Emulation)
    {
      const mobileContext = await browser.newContext({
        ...devices["iPhone 14"],
      });
      const page = await mobileContext.newPage();
      await page.setContent(testHtml);

      const trigger = page.locator("[data-slot=\"tooltip-trigger\"]");
      await trigger.waitFor({ state: "visible" });

      // Tap / Touch click on mobile
      await trigger.click();
      const popup = page.locator("[data-slot=\"tooltip-content\"]");
      const isVisible = await popup.isVisible();
      const popupText = isVisible ? await popup.innerText() : "";

      check(
        "2b. Mobile tap membuka popup tooltip pada layar sentuh (iPhone 14)",
        isVisible && popupText.includes("Gabungan 9 indikator teknikal")
      );
      await mobileContext.close();
    }

    // Keyboard Focus Test
    {
      const page = await browser.newPage();
      await page.setContent(testHtml);

      const trigger = page.locator("[data-slot=\"tooltip-trigger\"]");
      await trigger.waitFor({ state: "visible" });

      await trigger.focus();
      const popup = page.locator("[data-slot=\"tooltip-content\"]");
      const isVisible = await popup.isVisible();

      check(
        "2c. Keyboard focus membuka tooltip untuk aksesibilitas keyboard",
        isVisible
      );
      await page.close();
    }

    await browser.close();
  }

  // 3. Source Code Contract in src/app/(public)/stocks/[ticker]/page.tsx
  {
    const pagePath = path.join(
      process.cwd(),
      "src/app/(public)/stocks/[ticker]/page.tsx"
    );
    const content = fs.readFileSync(pagePath, "utf-8");

    check(
      "3a. File page.tsx mengimpor InfoTip dari @/components/stock/info-tip",
      content.includes('import { InfoTip } from "@/components/stock/info-tip"')
    );
    check(
      "3b. Hero subtitle H2 memakai <InfoTip label=\"Profil bisnis\" text={desc} />",
      content.includes('<InfoTip label="Profil bisnis" text={desc} />')
    );
    check(
      "3c. Kartu sinyal memakai <InfoTip label=\"Sinyal\" text=\"Gabungan 9 indikator teknikal — RSI, MACD, tren, momentum, volume\" />",
      content.includes('<InfoTip label="Sinyal" text="Gabungan 9 indikator teknikal — RSI, MACD, tren, momentum, volume" />')
    );
    check(
      "3d. Elemen SEO <span className=\"sr-only\"> · {desc}</span> tetap dipertahankan di H2",
      content.includes('<span className="sr-only"> · {desc}</span>')
    );
    check(
      "3e. Atribut title={desc} SUDAH DIHAPUS dari hero subtitle",
      !content.includes("title={desc}")
    );
    check(
      "3f. Atribut title=\"Gabungan 9 indikator...\" SUDAH DIHAPUS dari kartu sinyal",
      !content.includes('title="Gabungan 9 indikator teknikal')
    );
  }

  console.log("\n" + (failed === 0 ? "RESULT: ALL PASS" : `RESULT: ${failed} FAILED`));
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
