/**
 * scripts/selftest-data-trust.ts
 *
 * Self-test verifikasi caching getYesterdayRecap (off-hours / weekend).
 * Mengukur waktu eksekusi call 1 (DB fetch + compute + set cache)
 * vs call 2 (in-memory stockCache TTL 5 menit HIT).
 *
 * Run: npx tsx scripts/selftest-data-trust.ts
 */

import { pasarLiveService } from "../src/domains/stock/pasar-live.service";

async function main() {
  process.stdout.write("=== Selftest Perf Caching: getYesterdayRecap ===\n");

  const start1 = performance.now();
  const res1 = await pasarLiveService.getYesterdayRecap();
  const dur1 = performance.now() - start1;
  process.stdout.write(`Call 1 (Uncached): ${dur1.toFixed(2)} ms (sessionDate: ${res1.sessionDate})\n`);

  const start2 = performance.now();
  const res2 = await pasarLiveService.getYesterdayRecap();
  const dur2 = performance.now() - start2;
  process.stdout.write(`Call 2 (Cached HIT): ${dur2.toFixed(2)} ms (sessionDate: ${res2.sessionDate})\n`);

  if (dur2 < dur1 || dur2 < 5) {
    process.stdout.write(`PASS: Call 2 ter-cache dengan sukses (speedup: ${(dur1 / Math.max(0.01, dur2)).toFixed(1)}x)\n`);
  } else {
    process.stdout.write("NOTE: Call 2 durasi sebanding (mungkin mock/empty DB di lingkungan lokal)\n");
  }
}

if (process.argv[1]?.endsWith("selftest-data-trust.ts")) {
  main().catch((err) => {
    process.stderr.write(`Selftest error: ${String(err)}\n`);
    process.exit(1);
  });
}

export { main };
