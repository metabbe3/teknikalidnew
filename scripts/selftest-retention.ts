/**
 * Self-test untuk src/lib/retention.service.ts (PRD idea-2026-10-01-1).
 * Run: npx tsx --tsconfig tsconfig.json scripts/selftest-retention.ts
 *
 * Pure-function TZ/WIB guard + struktur kontrak — assert-based, exit non-zero saat gagal.
 * Query parity vs SQL live diverifikasi terpisah (lihat result cto-queue).
 */
import { wibWeekStart, wibShifted, pct2, RETURNING_GUARD_PCT } from "../src/lib/retention.service";

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (cond) console.log("  ✓ " + msg);
  else { failures++; console.error("  ✗ " + msg); }
}

console.log("\n[1] wibWeekStart — Senin 00:00 WIB (UTC container)");
{
  const thu = new Date("2026-10-01T16:10:00Z"); // Kamis 23:10 WIB
  const ws = wibWeekStart(thu);
  // Senin 28 Sep 2026 00:00 WIB = 28 Sep 17:00 UTC
  assert(ws.toISOString() === "2026-09-27T17:00:00.000Z", `Kamis 23:10 WIB -> Senin 28 Sep 00:00 WIB = 27 Sep 17:00 UTC (got ${ws.toISOString()})`);
}
{
  const mon = new Date("2026-09-27T17:00:00.000Z"); // Senin 28 Sep 00:00 WIB persis
  const ws = wibWeekStart(mon);
  assert(ws.toISOString() === "2026-09-27T17:00:00.000Z", "Senin 00:00 WIB -> dirinya sendiri");
}
{
  const sun = new Date("2026-09-27T16:59:59.000Z"); // Minggu 27 Sep 23:59:59 WIB
  const ws = wibWeekStart(sun);
  assert(ws.toISOString() === "2026-09-20T17:00:00.000Z", "Minggu 23:59:59 WIB -> Senin 21 Sep 00:00 WIB");
}
{
  const mon000 = new Date("2026-09-27T17:00:01.000Z"); // Senin 28 Sep 00:00:01 WIB
  const ws = wibWeekStart(mon000);
  assert(ws.toISOString() === "2026-09-27T17:00:00.000Z", "Senin 00:00:01 WIB -> pekan baru (dirinya)");
}

console.log("\n[2] wibShifted + paritas hari SQL + interval '7 hours'");
{
  const inst = new Date("2026-10-01T16:10:00Z");
  const shifted = wibShifted(inst);
  assert(shifted.toISOString().slice(0, 10) === "2026-10-01", "23:10 WIB masih 1 Okt (bukan 2 Okt)");
  assert(shifted.getUTCHours() === 23, "jam WIB = 23");
  // Ambang hari: 17:00 UTC = 00:00 WIB besok
  const edge = new Date("2026-10-01T17:00:00.000Z");
  assert(wibShifted(edge).toISOString().slice(0, 10) === "2026-10-02", "17:00 UTC tepat = ganti hari WIB");
}

console.log("\n[3] Konstanta guard");
assert(RETURNING_GUARD_PCT === 12, "guard = 12%");

console.log("\n[4] pct2 pembulatan 1 desimal");
assert(pct2(4, 38) === 10.5, "4/38 = 10.5");
assert(pct2(1, 3) === 33.3, "1/3 = 33.3");
assert(pct2(0, 0) === null, "0/0 = null");

process.exit(failures ? 1 : 0);
