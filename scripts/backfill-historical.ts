import "dotenv/config";
import { ALL_TICKERS, IDX_STOCKS } from "../src/lib/idx-stocks";
import { stockMarketService } from "../src/domains/stock/stock-market.service";
import { prisma } from "../src/lib/prisma";

const DAYS = 500;
const startIndex = parseInt(process.argv[2] || "0", 10);

async function main() {
  const tickers = ALL_TICKERS;
  const total = tickers.length;
  const start = Math.max(0, Math.min(startIndex, total - 1));

  console.log(`Starting backfill for ${total} stocks (${DAYS} days), starting from index ${start}...\n`);

  let success = 0;
  let failed = 0;

  for (let i = start; i < total; i++) {
    const ticker = tickers[i];
    const stock = IDX_STOCKS.find((s) => s.ticker === ticker);
    const name = stock?.name ?? ticker;
    try {
      console.log(`[${i + 1}/${total}] Fetching ${ticker} (${name})...`);
      const rows = await stockMarketService.backfillStock(ticker, DAYS);
      console.log(`  -> ${rows} rows upserted`);
      success++;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`  -> FAILED: ${msg}`);
      failed++;
    }
  }

  console.log(`\nBackfill complete: ${success} succeeded, ${failed} failed`);
  if (failed > 0) {
    console.log(`Some stocks failed. Re-run to retry (upsert is idempotent):`);
    console.log(`  npx tsx scripts/backfill-historical.ts ${start}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
