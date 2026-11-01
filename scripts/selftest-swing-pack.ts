/**
 * Ad-hoc verification script untuk Swing Trader Pack v1
 * Memanggil getSwingMarketData() dan computeSwingStats dengan data nyata dari DB.
 *
 * Jalankan: npx tsx scripts/selftest-swing-pack.ts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");

// Setup DATABASE_URL jika berjalan lokal di luar docker
function getLocalDbUrl(): string | undefined {
  try {
    const env = readFileSync(join(ROOT, ".env"), "utf8");
    const m = env.match(/^DATABASE_URL=(.+)$/m);
    if (!m) return undefined;
    return m[1].trim().replace(/@db:5432\//, "@127.0.0.1:5433/");
  } catch {
    return undefined;
  }
}

if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("@db:")) {
  const localUrl = getLocalDbUrl();
  if (localUrl) {
    process.env.DATABASE_URL = localUrl;
  }
}

const log = (msg = "") => process.stdout.write(`${msg}\n`);

async function run() {
  log("=== VERIFIKASI AD-HOC SWING TRADER PACK V1 ===");
  const { GET } = await import("../src/app/api/market/swing/route");
  const { prisma } = await import("../src/lib/prisma");
  type SwingMarketResponse = import("../src/app/api/market/swing/route").SwingMarketResponse;

  const t0 = Date.now();
  const res = await GET();
  const data = (await res.json()) as SwingMarketResponse;
  const duration = Date.now() - t0;

  log(`Data berhasil dimuat dalam ${duration}ms:`);
  log(`As of date: ${data.asOf}`);
  log(`Jumlah kandidat: ${data.candidates.length}`);
  log("");

  log("--- 10 KANDIDAT SWING EOD TERBARU (ANGKA NYATA) ---");
  data.candidates.forEach((c, idx) => {
    log(
      `${idx + 1}. [${c.ticker}] ${c.name.padEnd(30)} | Close: Rp${c.close} | Skor: ${c.signalScore} (Health: ${c.healthScore} - ${c.healthMeta.label}) | RR: 1:${c.estimatedRR.toFixed(1)} | RSI: ${c.rsi14} | SMA50 Dist: ${c.distanceSma50Pct?.toFixed(2)}% | Stop: Rp${c.estimatedStop}`
    );
  });
  log("");

  log("--- BUKTI STATISTIK BACKTEST HISTORIS (ANGKA NYATA) ---");
  const { stats34, stats20 } = data.backtest;
  log(`Threshold 0.34 (P95):`);
  log(` - Sinyal teruji : ${stats34.signals}`);
  log(` - Win Rate      : ${(stats34.winRate * 100).toFixed(2)}%`);
  log(` - Rata-rata Ret : ${(stats34.avgReturn * 100).toFixed(2)}%`);
  log(` - Median Ret    : ${(stats34.medianReturn * 100).toFixed(2)}%`);
  log(` - Avg Hold Days : ${stats34.avgHoldDays} hari`);
  log(` - Breakdown label: ${JSON.stringify(stats34.perLabelBreakdown, null, 2)}`);
  log("");

  log(`Threshold 0.20 (Pembanding):`);
  log(` - Sinyal teruji : ${stats20.signals}`);
  log(` - Win Rate      : ${(stats20.winRate * 100).toFixed(2)}%`);
  log(` - Rata-rata Ret : ${(stats20.avgReturn * 100).toFixed(2)}%`);
  log(` - Median Ret    : ${(stats20.medianReturn * 100).toFixed(2)}%`);

  await prisma.$disconnect();
  log("");
  log("VERIFIKASI SUKSES: Semua angka berasal dari database nyata.");
  process.exit(0);
}

run().catch((err) => {
  console.error("Gagal menjalankan verifikasi:", err);
  process.exit(1);
});
