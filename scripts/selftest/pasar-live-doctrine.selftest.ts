/**
 * Selftest fix-2026-10-26-12 (FAILING-TEST-FIRST — commit test ini SEBELUM fix):
 * N+1 berat getWatchlist + bypass repository di pasar-live.service.
 *
 * Lapisan A (statis, gagal hari ini):
 *  A1. pasar-live.service TIDAK boleh import prisma langsung (SATU PINTU:
 *      semua akses DB via stockRepository — acceptance "prisma langsung = 0").
 *  A2. TIDAK boleh ada loop `for (const r of rows)` berisi await prisma/findMany
 *      di dalam getWatchlist (pola N+1 ≤120 query sekuensial).
 *
 * Lapisan B (perilaku pure-picker — diimplementasi bersama fix):
 *  B1. reason dipilih: golden cross > EMA bullish > RSI oversold (kuat dulu).
 *  B2. liquidity floor close*volume < 1e9 → item di-skip.
 *  B3. prevClose null/0 → skip (changePercent tak terdefinisi).
 *  B4. urutan output = urutan skor (deterministik), max WATCH_MAX.
 *
 * Run: npx tsx scripts/selftest/pasar-live-doctrine.selftest.ts
 * Exit 0 = PASS semua.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = ""): void {
  if (ok) pass++;
  else {
    fail++;
    console.error(`FAIL ${name}${detail ? `\n  ${detail}` : ""}`);
  }
}

const src = readFileSync(join(__dirname, "../../src/domains/stock/pasar-live.service.ts"), "utf8");

// ── A1: larangan import prisma langsung ──
check(
  "A1 pasar-live.service tidak import prisma langsung (SATU PINTU repository)",
  !/from\s+"@\/lib\/prisma"/.test(src) && !/\bprisma\.\$queryRaw/.test(src),
  "masih ada import prisma / $queryRaw langsung di pasar-live.service.ts",
);

// ── A2: larangan await-query di dalam for-loop (N+1) ──
const nPlusOne = /for\s*\(const\s+\w+\s+of\s+\w+\)\s*\{[^}]*await\s+(?:prisma\.|stockRepository\.)/s.test(src);
check(
  "A2 tidak ada await-query di dalam for-loop (N+1) di pasar-live.service",
  !nPlusOne,
  "ditemukan pola for..of + await query = N+1 sekuensial",
);

// ── B: pure-picker (ekspor baru tersedia setelah fix) ──
type PickerRow = {
  stockId: number;
  ticker: string;
  name: string;
  rsi14: number | null;
  signalLabel: string | null;
  smaCrossSignal: string | null;
  smaCrossDate: Date | null;
  emaCrossSignal: string | null;
  emaCrossDate: Date | null;
  close: number | null;
  prevClose: number | null;
  volume: number | null;
};

async function loadPicker() {
  const mod = await import("../../src/domains/stock/pasar-live.service");
  const fn = (mod as unknown as { pickWatchlistFromRows?: (rows: PickerRow[], freshSince: Date, max: number) => unknown[] }).pickWatchlistFromRows;
  return fn;
}

async function behaviorTests() {
  const pick = await loadPicker();
  check("B0 pickWatchlistFromRows diekspor (pure picker)", typeof pick === "function",
    "ekspor pickWatchlistFromRows tidak ditemukan — ekstrak logika seleksi ke pure fn");
  if (typeof pick !== "function") return;

  const freshSince = new Date("2026-10-24T00:00:00Z");
  const row = (o: Partial<PickerRow> & { stockId: number; ticker: string }): PickerRow => ({
    name: o.ticker, rsi14: 50, signalLabel: null, smaCrossSignal: null, smaCrossDate: null,
    emaCrossSignal: null, emaCrossDate: null, close: 1000, prevClose: 1000, volume: 1_000_000,
    ...o,
  });

  // B1 reason precedence
  const b1 = pick([
    row({ stockId: 1, ticker: "RSI.JK", rsi14: 25, smaCrossSignal: "golden_cross", smaCrossDate: new Date("2026-10-27T00:00:00Z"), emaCrossSignal: "bullish", emaCrossDate: new Date("2026-10-27T00:00:00Z") }),
    row({ stockId: 2, ticker: "EMA.JK", emaCrossSignal: "bullish", emaCrossDate: new Date("2026-10-27T00:00:00Z") }),
    row({ stockId: 3, ticker: "NEUT.JK" }),
  ], freshSince, 8) as Array<{ ticker: string; reason: string }>;
  check("B1a reason golden cross menang", b1[0]?.ticker === "RSI.JK" && b1[0]?.reason === "Golden cross baru", JSON.stringify(b1));
  check("B1b reason EMA bullish utk kandidat EMA-only", b1[1]?.ticker === "EMA.JK" && b1[1]?.reason === "EMA bullish cross", JSON.stringify(b1));
  check("B1c kandidat tanpa sinyal segar di-skip", b1.length === 2, JSON.stringify(b1.map((x) => x.ticker)));

  // B2 liquidity floor
  const b2 = pick([
    row({ stockId: 10, ticker: "LIQ.JK", close: 5000, volume: 1_000_000, rsi14: 20 }),
    row({ stockId: 11, ticker: "ILLIQ.JK", close: 500, volume: 100_000, rsi14: 20 }),
  ], freshSince, 8) as Array<{ ticker: string }>;
  check("B2 liquidity floor < Rp1B di-skip", b2.length === 1 && b2[0]?.ticker === "LIQ.JK", JSON.stringify(b2));

  // B3 prevClose invalid
  const b3 = pick([
    row({ stockId: 20, ticker: "NOPREV.JK", prevClose: null, rsi14: 20 }),
    row({ stockId: 21, ticker: "ZEROPREV.JK", prevClose: 0, rsi14: 20 }),
    row({ stockId: 22, ticker: "OK.JK", rsi14: 20 }),
  ], freshSince, 8) as Array<{ ticker: string }>;
  check("B3 prevClose null/0 di-skip", b3.length === 1 && b3[0]?.ticker === "OK.JK", JSON.stringify(b3));

  // B4 max cap
  const many = Array.from({ length: 12 }, (_, i) => row({ stockId: 100 + i, ticker: `M${i}.JK`, rsi14: 20 }));
  const b4 = pick(many, freshSince, 8) as unknown[];
  check("B4 output dibatasi WATCH_MAX=8", b4.length === 8, `got ${b4.length}`);
}

behaviorTests()
  .then(() => {
    if (fail > 0) {
      console.error(`\npasar-live-doctrine selftest: ${pass} pass, ${fail} FAIL`);
      process.exit(1);
    }
    console.log(`\npasar-live-doctrine selftest: ${pass} pass, 0 fail`);
  })
  .catch((e) => {
    console.error("SELFTEST CRASH:", e);
    process.exit(1);
  });
