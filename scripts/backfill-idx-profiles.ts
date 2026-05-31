import "dotenv/config";
import { chromium, type Browser, type Page } from "playwright";
import { prisma } from "../src/lib/prisma";
import { stockSyncService } from "../src/domains/stock/stock-sync.service";
import type { IDXProfileResponse } from "../src/lib/idx-api";

async function fetchProfileFromBrowser(
  page: Page,
  code: string
): Promise<IDXProfileResponse | null> {
  try {
    const result = await page.evaluate(async (ticker: string) => {
      try {
        const res = await fetch(
          `https://www.idx.co.id/primary/ListedCompany/GetCompanyProfilesDetail?KodeEmiten=${encodeURIComponent(ticker)}&language=id-id`
        );
        if (!res.ok) return { error: `HTTP ${res.status}` };
        const data = await res.json();
        return data;
      } catch (e: unknown) {
        return { error: e instanceof Error ? e.message : String(e) };
      }
    }, code);
    if (!result) return null;
    if ("error" in result) {
      console.log(`    API error for ${code}: ${result.error}`);
      return null;
    }
    return result as IDXProfileResponse;
  } catch {
    return null;
  }
}

async function main() {
  console.log("=== IDX Data Backfill (Playwright) ===\n");

  // Get all active stocks
  const stocks = await prisma.stock.findMany({
    where: { isActive: true },
    select: { id: true, ticker: true },
    orderBy: { ticker: "asc" },
  });

  console.log(`Found ${stocks.length} active stocks\n`);

  // Launch browser using system Chrome (not Chromium) to avoid Cloudflare bot detection
  console.log("Launching browser (system Chrome)...");
  const browser: Browser = await chromium.launch({
    headless: false,
    channel: "chrome",
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const page: Page = await browser.newPage();

  // Navigate to IDX to get past Cloudflare challenge and acquire cookies
  console.log("Navigating to idx.co.id to bypass Cloudflare...");
  await page.goto("https://www.idx.co.id/", { waitUntil: "networkidle", timeout: 30000 });
  // Wait for Cloudflare challenge to resolve
  await page.waitForTimeout(5000);

  // Verify we got past Cloudflare by checking page title
  const title = await page.title();
  console.log(`Page title: ${title}`);
  if (title.toLowerCase().includes("cloudflare") || title.toLowerCase().includes("attention")) {
    console.error("Still on Cloudflare challenge page. Waiting longer...");
    await page.waitForTimeout(10000);
    const title2 = await page.title();
    console.log(`Page title after wait: ${title2}`);
  }
  console.log("Cloudflare bypass complete.\n");

  // Single pass: fetch profile + commissioners + subsidiaries + dividends per stock
  console.log("--- Syncing all IDX profile data ---");
  let profiledCount = 0;
  let totalCommissioners = 0;
  let totalSubsidiaries = 0;
  let totalDividends = 0;
  let failedCount = 0;
  const failedTickers: string[] = [];

  for (let i = 0; i < stocks.length; i++) {
    const stock = stocks[i];
    const code = stock.ticker.replace(".JK", "");

    try {
      const detail = await fetchProfileFromBrowser(page, code);

      if (!detail || !detail.Profiles || detail.Profiles.length === 0) {
        console.log(`  [${i + 1}/${stocks.length}] ${stock.ticker}: No profile data from IDX`);
        continue;
      }

      const result = await stockSyncService.processCompanyProfile(stock.ticker, detail);
      if (result.profile) {
        profiledCount++;
        totalCommissioners += result.commissioners;
        totalSubsidiaries += result.subsidiaries;
        totalDividends += result.dividends;
        console.log(
          `  [${i + 1}/${stocks.length}] ${stock.ticker}: ${result.commissioners} commissioners, ${result.subsidiaries} subs, ${result.dividends} dividends`
        );
      } else {
        console.log(`  [${i + 1}/${stocks.length}] ${stock.ticker}: No profile data from IDX`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`  [${i + 1}/${stocks.length}] ${stock.ticker}: ${msg}`);
      failedCount++;
      failedTickers.push(stock.ticker);

      // If Cloudflare blocked us, re-navigate to refresh cookies
      if (msg.includes("403") || msg.includes("401")) {
        console.log("  → Re-navigating to refresh Cloudflare cookies...");
        await page.goto("https://www.idx.co.id/", { waitUntil: "networkidle", timeout: 30000 });
        await page.waitForTimeout(3000);
      }
    }

    // Rate limit: 300ms between requests
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  // ── Summary ──
  console.log("\n=== Backfill Complete ===");
  console.log(`Stocks processed: ${stocks.length}`);
  console.log(`Profiles synced:   ${profiledCount}`);
  console.log(`Failed:            ${failedCount}`);
  console.log(`Total commissioners: ${totalCommissioners}`);
  console.log(`Total subsidiaries:   ${totalSubsidiaries}`);
  console.log(`Total dividend records: ${totalDividends}`);
  if (failedTickers.length > 0 && failedTickers.length <= 20) {
    console.log(`Failed tickers: ${failedTickers.join(", ")}`);
  } else if (failedTickers.length > 20) {
    console.log(`Failed tickers (first 20): ${failedTickers.slice(0, 20).join(", ")}...`);
  }

  await browser.close();
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
