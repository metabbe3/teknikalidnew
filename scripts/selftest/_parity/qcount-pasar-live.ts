/** Query-count proof fix-2026-10-26-12: instrumen pg.Client.query, jalankan
 * whole-snapshot (tanpa news) — total query whole pipeline vs dulu (watchlist
 * saja = 1 + ≤120). Run: DATABASE_URL=... npx tsx scripts/selftest/_parity/qcount-pasar-live.ts */
import { pasarLiveService } from "../../../src/domains/stock/pasar-live.service";
import { stockRepository } from "../../../src/domains/stock/stock.repository";
import pg from "pg";

async function main() {
  const sessionDate = await stockRepository.findLatestEquityPriceDate();
  if (!sessionDate) throw new Error("no session date");
  let queries = 0;
  const orig = pg.Client.prototype.query;
  type Q = typeof orig;
  (pg.Client.prototype as unknown as { query: Q }).query = function (this: unknown, ...args: Parameters<Q>) {
    queries++;
    return orig.apply(this as never, args as never);
  } as Q;
  const snap = await pasarLiveService._getSnapshotUncached(false);
  (pg.Client.prototype as unknown as { query: Q }).query = orig;
  console.log("TOTAL_PG_QUERIES whole-snapshot(no-news):", queries);
  console.log("watchlist:", snap.watchlist.length, "| topSignals:", snap.topSignals.length, "| foreignNetBuy:", snap.foreign.netBuy.length, "| movers:", snap.gainers.length + snap.losers.length);
  if (queries > 20) {
    console.error("FAIL: whole-snapshot > 20 query (harusnya ~10 tanpa N+1)");
    process.exit(1);
  }
  console.log("QCOUNT PASS");
  process.exit(0);
}
main().catch((e) => { console.error("QCOUNT CRASH:", e); process.exit(1); });
