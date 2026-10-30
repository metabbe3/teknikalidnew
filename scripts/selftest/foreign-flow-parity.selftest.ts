/**
 * Selftest code-audit-tk-2: N+1 foreignFlow stock page \u2014 PARITY CONTRACT.
 *
 * Bug (failing-first): page.tsx lama melakukan prisma.stockPrice.findUnique
 * PER BARIS ForeignFlow (\u22645 query sekuensial) padahal harga bisa diambil
 * SATU batch findMany composite-key IN. Helper buildForeignRows yang
 * menggantikannya HARUS bit-identik dengan rumus lama:
 *   netValue = (buy - sell) * close   | close null/0 -> netValue null
 *   urutan baris = urutan input rows (sudah date desc dari query)
 *   foreignLatest = baris PERTAMA dengan netValue !== null
 *
 * Run: npx tsx scripts/selftest/foreign-flow-parity.selftest.ts
 * Exit 0 = PASS semua. (RED dulu: helper belum ada.)
 */
import { buildForeignRows } from "../../src/domains/stock/foreign-flow.util";

let pass = 0;
let fail = 0;
function check(name: string, got: unknown, want: unknown): void {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++;
  else {
    fail++;
    console.error(`FAIL ${name}\n  got : ${JSON.stringify(got)}\n  want: ${JSON.stringify(want)}`);
  }
}

type FFRow = { stockId: number; date: Date; foreignBuy: number; foreignSell: number };
type PxRow = { stockId: number; date: Date; close: number | null };

const d = (s: string) => new Date(s + "T00:00:00.000Z");
const STOCK = 1;

// Fixture: 5 sesi FF + edge case (harga null, close=0, tanggal tanpa harga batch,
// net=0 tetap netValue 0 bukan null, row asing stockId lain tak tertukar).
const ff: FFRow[] = [
  { stockId: STOCK, date: d("2026-10-30"), foreignBuy: 1_000_000, foreignSell: 400_000 },
  { stockId: STOCK, date: d("2026-10-29"), foreignBuy: 100, foreignSell: 100 },
  { stockId: STOCK, date: d("2026-10-28"), foreignBuy: 50, foreignSell: 150 },
  { stockId: STOCK, date: d("2026-10-27"), foreignBuy: 1_000, foreignSell: 0 },
  { stockId: STOCK, date: d("2026-10-24"), foreignBuy: 2_000, foreignSell: 500 },
];

const px: PxRow[] = [
  { stockId: STOCK, date: d("2026-10-30"), close: 5000 },
  { stockId: STOCK, date: d("2026-10-29"), close: 4000 },
  { stockId: STOCK, date: d("2026-10-28"), close: null },
  { stockId: STOCK, date: d("2026-10-27"), close: 0 },
  // 2026-10-24 sengaja TIDAK ada di batch -> null
  // row stock lain: tidak boleh bocor match ke STOCK
  { stockId: 99, date: d("2026-10-30"), close: 999_999 },
];

const rows = buildForeignRows(ff, px);

// 1) Bentuk baris: hanya field date + netValue (kontrak lama page.tsx)
check("row keys", rows.map((r) => Object.keys(r).sort()), [
  ["date", "netValue"], ["date", "netValue"], ["date", "netValue"],
  ["date", "netValue"], ["date", "netValue"],
]);

// 2) Paritas netValue rumus lama per baris
check("netValue 10/30 (600k*5000)", rows[0].netValue, 600_000 * 5000);
check("netValue 10/29 net=0 -> 0 (bukan null)", rows[1].netValue, 0);
check("netValue 10/28 close null -> null", rows[2].netValue, null);
check("netValue 10/27 close=0 -> null (guard falsy lama)", rows[3].netValue, null);
check("netValue 10/24 tanpa harga -> null", rows[4].netValue, null);

// 3) Urutan date desc dipertahankan dari input (tidak diurut ulang helper)
check("urutan tanggal", rows.map((r) => r.date.toISOString().slice(0, 10)),
  ["2026-10-30", "2026-10-29", "2026-10-28", "2026-10-27", "2026-10-24"]);

// 4) foreignLatest = baris pertama netValue !== null
const latest = rows.find((r) => r.netValue !== null) ?? null;
check("foreignLatest = baris pertama non-null", latest !== null && latest.date.getTime() === d("2026-10-30").getTime(), true);

// 5) Semua netValue null -> section hidden (graceful lama)
check("semua null", buildForeignRows(
  [{ stockId: STOCK, date: d("2026-10-30"), foreignBuy: 1, foreignSell: 1 }],
  [{ stockId: STOCK, date: d("2026-10-30"), close: null }],
)[0].netValue, null);

// 6) Input kosong -> [] (foreignFlow catch(() => []) lama)
check("input kosong", buildForeignRows([], px), []);

if (fail > 0) {
  console.error(`\n${fail} FAIL / ${pass} pass`);
  process.exit(1);
}
console.log(`selftest foreign-flow-parity: ${pass}/${pass} PASS`);
