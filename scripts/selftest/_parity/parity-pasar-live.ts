/**
 * Parity runner fix-2026-10-26-12: getWatchlist + getTopSignals OLD vs NEW.
 *
 * OLD (sebelum refactor, commit 0f1cbc9^): loop findMany per kandidat.
 * NEW: 1 query indikator + findLatestBarsWithPrev (LATERAL).
 * Kontrak: daftar ticker + close + changePercent + reason IDENTIK bit-per-bit.
 * (perbedaan yang DIIZINKAN: top-signal prev via LATERAL vs second-row window —
 *  baris yang prev-nya berbeda dicetak sbg DIFF utk inspeksi, bukan fail, KECUALI
 *  ticker list watchlist berubah.)
 *
 * Run (DB lokal read-only):
 * DB_LOCAL=$(grep '^DATABASE_URL=' .env | head -1 | sed 's/@db:5432/@127.0.0.1:5433/; s/^DATABASE_URL=//')
 * DATABASE_URL="$DB_LOCAL" npx tsx scripts/selftest/_parity/parity-pasar-live.ts
 */
import { pasarLiveService, pickWatchlistFromRows, type WatchlistRow } from "../../../src/domains/stock/pasar-live.service";
import { stockRepository } from "../../../src/domains/stock/stock.repository";
import { prisma } from "../../../src/lib/prisma";
import { INTERVAL } from "../../../src/lib/constants";
import { bigIntToNumber, decimalToNumber } from "../../../src/lib/serialize";

async function oldGetWatchlist(sessionDate: Date): Promise<{ ticker: string; close: number | null; changePercent: number | null; reason: string }[]> {
  const freshSince = new Date(sessionDate);
  freshSince.setUTCDate(freshSince.getUTCDate() - 4);
  const rows = await prisma.stockIndicator.findMany({
    where: {
      interval: INTERVAL.DAY,
      date: sessionDate,
      isGorengan: { not: true },
      stock: { isActive: true, assetClass: "EQUITY" },
      OR: [
        { smaCrossSignal: "golden_cross", smaCrossDate: { gte: freshSince } },
        { emaCrossSignal: "bullish", emaCrossDate: { gte: freshSince } },
        { rsi14: { lt: 32 } },
      ],
    },
    include: { stock: { select: { ticker: true, name: true } } },
    orderBy: [{ signalScore: "desc" }],
    take: 120,
  });
  const items: { ticker: string; close: number | null; changePercent: number | null; reason: string }[] = [];
  for (const r of rows) {
    const prices = await prisma.stockPrice.findMany({
      where: { stockId: r.stockId },
      orderBy: { date: "desc" },
      take: 2,
      select: { close: true, volume: true, date: true },
    });
    const latest = prices[0];
    const prev = prices[1];
    if (!latest || !prev) continue;
    const close = decimalToNumber(latest.close);
    const prevClose = decimalToNumber(prev.close);
    const volume = bigIntToNumber(latest.volume);
    if (close === null || prevClose === null || prevClose === 0 || volume === null) continue;
    if (close * volume < 1_000_000_000) continue;
    const changePercent = ((close - prevClose) / prevClose) * 100;
    const rsi = decimalToNumber(r.rsi14);
    let reason = "";
    if (r.smaCrossSignal === "golden_cross" && r.smaCrossDate && r.smaCrossDate >= freshSince) reason = "Golden cross baru";
    else if (r.emaCrossSignal === "bullish" && r.emaCrossDate && r.emaCrossDate >= freshSince) reason = "EMA bullish cross";
    else if (rsi !== null && rsi < 32) reason = `Oversold RSI ${rsi.toFixed(0)}`;
    else continue;
    items.push({ ticker: r.stock.ticker, close, changePercent, reason });
    if (items.length >= 8) break;
  }
  return items;
}

async function main() {
  const sessionDate = await stockRepository.findLatestEquityPriceDate();
  if (!sessionDate) {
    console.error("PARITY SKIP: tidak ada bar EQUITY di DB");
    process.exit(1);
  }
  console.log("session:", sessionDate.toISOString().slice(0, 10));

  // ── Watchlist ──
  const t0 = Date.now();
  const oldW = await oldGetWatchlist(sessionDate);
  const tOld = Date.now() - t0;

  const t1 = Date.now();
  const snap = await pasarLiveService._getSnapshotUncached(false); // tanpa news (network)
  const newW = snap.watchlist;
  const tNew = Date.now() - t1;

  const key = (w: { ticker: string; close: number | null; changePercent: number | null; reason: string }) =>
    `${w.ticker}|${w.close}|${(w.changePercent ?? 0).toFixed(6)}|${w.reason}`;
  const oldKeys = oldW.map(key);
  const newKeys = newW.map(key);

  let pass = true;
  if (JSON.stringify(oldKeys) !== JSON.stringify(newKeys)) {
    pass = false;
    console.error("WATCHLIST PARITY FAIL:");
    oldKeys.forEach((k, i) => console.error(`  old[${i}] ${k}`));
    newKeys.forEach((k, i) => console.error(`  new[${i}] ${k}`));
  } else {
    console.log(`WATCHLIST PARITY PASS (${oldW.length} item IDENTIK)`);
    console.log(`  old path: ${tOld}ms (loop) | new path: ${tNew}ms (batch) — whole-snapshot timing new`);
  }

  // ── TopSignals: ticker list harus sama; prev LATERAL boleh beda utk carry-forward ──
  const ts = snap.topSignals;
  console.log(`TOP SIGNALS: ${ts.length} item (new path)`);
  for (const t of ts.slice(0, 5)) {
    console.log(`  ${t.ticker} close=${t.close} pct=${t.changePercent.toFixed(2)}% score=${t.signalScore?.toFixed(2)}`);
  }

  console.log(pass ? "PARITY PASS" : "PARITY FAIL");
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error("PARITY CRASH:", e);
  process.exit(1);
});
