import "dotenv/config";
import { chromium } from "playwright";
import * as xlsx from "xlsx";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const API_URL = process.env.SYNC_API_URL || "http://localhost:3000/api/cron/sync-stocks";
const CRON_SECRET = process.env.CRON_SECRET || "";

interface ParsedStock {
  code: string;
  name: string;
  board: string;
}

async function downloadIDXXlsx(): Promise<string> {
  console.log("Launching browser to download IDX stock list...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    await page.goto("https://www.idx.co.id/id/data-pasar/data-saham/daftar-saham/", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Wait for the table or download button to appear (page is Nuxt SSR + dynamic)
    try {
      await page.waitForSelector("table, button.btn-download", { timeout: 30000 });
    } catch {
      // Debug: take screenshot to see what's on the page
      await page.screenshot({ path: "/tmp/idx-debug.png" });
      const title = await page.title();
      const url = page.url();
      throw new Error(`Timed out waiting for table/button. Title: "${title}", URL: ${url}. Screenshot saved to /tmp/idx-debug.png`);
    }

    // Extra wait for dynamic content to fully render
    await page.waitForTimeout(3000);

    // Find the download button - may need to scroll into view
    const downloadBtn = page.locator("button.btn-download");
    await downloadBtn.waitFor({ state: "visible", timeout: 10000 }).catch(async () => {
      // Fallback: try text-based selector
      const altBtn = page.locator('button:has-text("Unduh")');
      await altBtn.waitFor({ state: "visible", timeout: 5000 });
    });

    console.log("Clicking 'Unduh' button...");
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 30000 }),
      downloadBtn.isVisible().then(() => downloadBtn.click()).catch(() =>
        page.locator('button:has-text("Unduh")').click()
      ),
    ]);

    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "idx-stocks-"));
    const savePath = path.join(tmpDir, "daftar-saham.xlsx");
    await download.saveAs(savePath);
    console.log(`Downloaded to: ${savePath}`);

    return savePath;
  } finally {
    await browser.close();
  }
}

function parseXlsx(filePath: string): ParsedStock[] {
  console.log(`Parsing xlsx: ${filePath}`);
  const wb = xlsx.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json<Record<string, string>>(sheet);

  const stocks: ParsedStock[] = [];
  for (const row of rows) {
    const code = String(row["Kode"] || "").trim();
    const name = String(row["Nama Perusahaan"] || "").trim();
    const board = String(row["Papan Pencatatan"] || "").trim();
    if (code && name && board) {
      stocks.push({ code, name, board });
    }
  }

  console.log(`Parsed ${stocks.length} stocks from xlsx`);
  return stocks;
}

async function syncToAPI(stocks: ParsedStock[]): Promise<unknown> {
  console.log(`Syncing ${stocks.length} stocks to API at ${API_URL}...`);

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CRON_SECRET}`,
    },
    body: JSON.stringify({ stocks }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API returned ${res.status}: ${text}`);
  }

  return res.json();
}

async function main() {
  const xlsxPath = await downloadIDXXlsx();

  try {
    const stocks = parseXlsx(xlsxPath);
    if (stocks.length === 0) {
      throw new Error("No stocks parsed from xlsx");
    }

    const result = await syncToAPI(stocks);
    const data = (result as { data: Record<string, unknown> }).data;

    console.log("\n=== IDX Stock Sync Report ===");
    console.log(`Added:   ${(data.added as string[]).length}`, (data.added as string[]).length > 0 ? data.added : "");
    console.log(`Removed: ${(data.removed as string[]).length}`, (data.removed as string[]).length > 0 ? data.removed : "");
    console.log(`Updated: ${(data.updated as unknown[]).length}`);
    for (const u of data.updated as Array<{ ticker: string; changes: string[] }>) {
      console.log(`  ${u.ticker}: ${u.changes.join(", ")}`);
    }
    console.log(`Unchanged: ${data.unchanged}`);
  } finally {
    // Cleanup temp file
    await fs.promises.unlink(xlsxPath).catch(() => {});
    await fs.promises.rmdir(path.dirname(xlsxPath)).catch(() => {});
  }
}

main().catch((e) => {
  console.error("Sync failed:", e);
  process.exit(1);
});
