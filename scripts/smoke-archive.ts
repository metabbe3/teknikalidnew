/**
 * Real-data smoke test for the dated-archive data path.
 * Run: DATABASE_URL=postgresql://...@127.0.0.1:5433/teknikalid \
 *      npx tsx --tsconfig tsconfig.json scripts/smoke-archive.ts
 */
import { stockRepository } from "../src/domains/stock/stock.repository";
import { stockMarketService } from "../src/domains/stock/stock-market.service";
import { summarizeVerdict, computeOutlook, explainMove, toSnapshot } from "../src/lib/verdict-prose";
import { decimalToNumber } from "../src/lib/serialize";

const TICKER = process.argv[2] ?? "BBRI";

async function main() {
  const stock = await stockRepository.findStockByTicker(`${TICKER}.JK`);
  if (!stock) { console.error(`stock ${TICKER} not found`); process.exit(1); }
  console.log(`stock: ${stock.ticker} (id=${stock.id}) — ${stock.name}`);

  const latest = await stockRepository.findLatestIndicator(stock.id, "1d");
  if (!latest) { console.error("no indicator row"); process.exit(1); }
  const dateKey = latest.date.toISOString().slice(0, 10);
  console.log(`latest indicator date: ${dateKey}`);

  // Range-query lookup by date (the archive route's fetch)
  const byDate = await stockRepository.findIndicatorByStockAndDate(stock.id, latest.date);
  console.log(`findIndicatorByStockAndDate -> ${byDate ? "ROW FOUND" : "MISS (tz bug!)"}`);

  const price = await stockRepository.findPriceByStockAndDate(stock.id, latest.date);
  const close = price ? decimalToNumber(price.close) : null;
  console.log(`close on that date: ${close}`);

  // Sparkline series
  const series = await stockRepository.findIndicatorSeries(stock.id, new Date(latest.date.getTime() - 60 * 86400000));
  console.log(`series rows (last 60d window): ${series.length}`);

  // Prose
  const snap = toSnapshot(latest);
  const outlook = computeOutlook(snap, close);
  console.log(`\n outlook: ${outlook}`);
  console.log(` summarizeVerdict: ${summarizeVerdict(snap, outlook, close)}`);

  // explainMove via getStockDetailForPage (real latest+prev)
  const detail = await stockMarketService.getStockDetailForPage(`${TICKER}.JK`);
  const ex = explainMove({
    ticker: `${TICKER}.JK`,
    latest: detail.indicator,
    prev: detail.prevIndicator,
    changePercent: detail.changePercent,
  });
  console.log(`\n explainMove (latest day, change ${detail.changePercent?.toFixed(2)}%):`);
  console.log(`   headline: ${ex?.headline}`);
  console.log(`   bullets : ${ex?.bullets.join(" | ")}`);

  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
