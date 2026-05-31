import "dotenv/config";
import { chromium, type Browser, type Page } from "playwright";
import { prisma } from "../src/lib/prisma";
import { stockSyncService } from "../src/domains/stock/stock-sync.service";
import type { IDXProfileResponse, IDXTradingInfoResponse } from "../src/lib/idx-api";

// ── Backoff config ──
const BASE_DELAY = 2000;
const MAX_DELAY = 60_000;
const MAX_RETRIES = 5;
const BACKOFF_BASE = 2;

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function jitteredDelay(attempt: number): number {
  const delay = Math.min(BASE_DELAY * Math.pow(BACKOFF_BASE, attempt), MAX_DELAY);
  const jitter = delay * 0.3 * Math.random();
  return Math.round(delay + jitter);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── IDX fetch via browser ──

async function fetchFromBrowser<T>(page: Page, url: string): Promise<T | null> {
  try {
    const result = await page.evaluate(async (fetchUrl: string) => {
      try {
        const res = await fetch(fetchUrl);
        if (!res.ok) return { error: `HTTP ${res.status}` };
        const data = await res.json();
        return data;
      } catch (e: unknown) {
        return { error: e instanceof Error ? e.message : String(e) };
      }
    }, url);

    if (!result) return null;
    if ("error" in result) {
      throw new Error(result.error);
    }
    return result as T;
  } catch {
    return null;
  }
}

async function refreshCookies(page: Page): Promise<void> {
  console.log("  → Re-navigating to refresh Cloudflare cookies...");
  await page.goto("https://www.idx.co.id/", { waitUntil: "networkidle", timeout: 30000 });
  await sleep(3000);
}

// ── Main ──

async function main() {
  console.log("=== IDX Data Backfill (Playwright + Exponential Backoff) ===\n");

  const stocks = await prisma.stock.findMany({
    where: { isActive: true },
    select: { id: true, ticker: true },
    orderBy: { ticker: "asc" },
  });

  console.log(`Found ${stocks.length} active stocks\n`);

  console.log("Launching browser (system Chrome)...");
  const browser: Browser = await chromium.launch({
    headless: false,
    channel: "chrome",
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const page: Page = await browser.newPage();

  console.log("Navigating to idx.co.id to bypass Cloudflare...");
  await page.goto("https://www.idx.co.id/", { waitUntil: "networkidle", timeout: 30000 });
  await sleep(5000);

  const title = await page.title();
  console.log(`Page title: ${title}`);
  if (title.toLowerCase().includes("cloudflare") || title.toLowerCase().includes("attention")) {
    console.error("Still on Cloudflare challenge page. Waiting longer...");
    await sleep(10000);
    const title2 = await page.title();
    console.log(`Page title after wait: ${title2}`);
  }
  console.log("Cloudflare bypass complete.\n");

  // ── Stats ──
  let profiledCount = 0;
  let tradingInfoCount = 0;
  let totalCommissioners = 0;
  let totalDirectors = 0;
  let totalShareholders = 0;
  let totalSubsidiaries = 0;
  let totalDividends = 0;
  let skippedCount = 0;
  const failedTickers: string[] = [];

  console.log("--- Syncing all IDX data ---");

  for (let i = 0; i < stocks.length; i++) {
    const stock = stocks[i];
    const code = stock.ticker.replace(".JK", "");
    let profiled = false;

    // ── Fetch profile with retries ──
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const detail = await fetchFromBrowser<IDXProfileResponse>(
          page,
          `https://www.idx.co.id/primary/ListedCompany/GetCompanyProfilesDetail?KodeEmiten=${encodeURIComponent(code)}&language=id-id`
        );

        if (detail && detail.Profiles && detail.Profiles.length > 0) {
          const result = await stockSyncService.processCompanyProfile(stock.ticker, detail);
          if (result.profile) {
            profiled = true;
            profiledCount++;
            totalCommissioners += result.commissioners;
            totalDirectors += result.directors;
            totalShareholders += result.shareholders;
            totalSubsidiaries += result.subsidiaries;
            totalDividends += result.dividends;
            console.log(
              `  [${i + 1}/${stocks.length}] ${stock.ticker}: ${result.commissioners} kom, ${result.directors} dir, ${result.shareholders} sh, ${result.subsidiaries} subs, ${result.dividends} div`
            );
          }
        }

        break; // success, no retry
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        const isBlocked = msg.includes("403") || msg.includes("401");

        if (attempt < MAX_RETRIES && isBlocked) {
          const delay = jitteredDelay(attempt);
          console.log(`  [${i + 1}/${stocks.length}] ${stock.ticker}: ${msg} → retry ${attempt + 1}/${MAX_RETRIES} in ${Math.round(delay / 1000)}s`);
          await refreshCookies(page);
          await sleep(delay);
        } else {
          console.error(`  [${i + 1}/${stocks.length}] ${stock.ticker}: FAILED after ${attempt} retries — ${msg}`);
          if (!failedTickers.includes(stock.ticker)) failedTickers.push(stock.ticker);
          break;
        }
      }
    }

    if (!profiled) {
      skippedCount++;
    }

    // ── Fetch trading info (best-effort, no retries) ──
    try {
      let tradingData = await fetchFromBrowser<IDXTradingInfoResponse>(
        page,
        `https://www.idx.co.id/primary/ListedCompany/GetTradingInfo?KodeEmiten=${encodeURIComponent(code)}`
      );

      // Fallback endpoint
      if (!tradingData) {
        tradingData = await fetchFromBrowser<IDXTradingInfoResponse>(
          page,
          `https://www.idx.co.id/primary/ListedCompany/GetShareholderTotal?KodeEmiten=${encodeURIComponent(code)}`
        );
      }

      if (tradingData) {
        const saved = await stockSyncService.processTradingInfo(stock.ticker, tradingData);
        if (saved) tradingInfoCount++;
      }
    } catch {
      // Trading info is best-effort, don't fail the whole run
    }

    // ── Rate limit: random 1-3s between requests ──
    await sleep(randomBetween(1000, 3000));
  }

  // ── Summary ──
  console.log("\n=== Backfill Complete ===");
  console.log(`Stocks processed:  ${stocks.length}`);
  console.log(`Profiles synced:   ${profiledCount}`);
  console.log(`Trading info:      ${tradingInfoCount}`);
  console.log(`Skipped:           ${skippedCount}`);
  console.log(`Failed:            ${failedTickers.length}`);
  console.log(`Total commissioners: ${totalCommissioners}`);
  console.log(`Total directors:     ${totalDirectors}`);
  console.log(`Total shareholders:  ${totalShareholders}`);
  console.log(`Total subsidiaries:  ${totalSubsidiaries}`);
  console.log(`Total dividends:     ${totalDividends}`);
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
