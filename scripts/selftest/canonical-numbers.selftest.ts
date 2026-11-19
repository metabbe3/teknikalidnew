/**
 * Selftest qa-2026-11-19-01 (OPS_A satu-pintu angka kanonik generator).
 *
 * Latar (P1 3 hari beruntun): brief/analis menyebut breadth dari konvensi lain
 * (333 vs 296 — tanpa filter non-gorengan) dan tanggal event indikator yang
 * bukan kolom DB (PTBA "GC 17/11" padahal smaCrossDate 23 Sep). Akar: market
 * context TIDAK memuat breadth/tanggal event sama sekali → LLM mengarang;
 * replay gate hanya menangkap pasca-publish.
 *
 * Fix Opsi-A (CEO approve 19 Nov): angka breadth + tanggal event wajib dari
 * query satu-pintu kanonik (konvensi ops-11-05-03 non-gorengan lag-prev INNER);
 * assert pre-publish — mismatch = generate GAGAL, bukan patch besok.
 *
 * Lapisan A (fisik, RED-capable): assertCanonicalNumbers + getBreadthCounts
 *   BELUM ada → import/gagal assert = merah.
 * Lapisan B (two-way): fixture angka = kanonik → lolos; diperturbukan (+160 /
 *   +20) → THROW; tanggal event salah → THROW, tanggal DB → lolos.
 * Lapisan C (parity DB, optional-on-DB): getBreadthCounts == SQL independen.
 *
 * Run: npx tsx scripts/selftest/canonical-numbers.selftest.ts
 * Exit 0 = PASS semua.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../..");

// Env rewrite sebelum import service (pola signal-window-pinning.selftest.ts)
function dbUrlHost(): string | undefined {
  try {
    const env = readFileSync(join(ROOT, ".env"), "utf8");
    const m = env.match(/^DATABASE_URL=(.+)$/m);
    if (!m) return undefined;
    return m[1].trim().replace(/@db:5432\//, "@127.0.0.1:5433/");
  } catch {
    return undefined;
  }
}

type Ctx = {
  breadth: { sessionDate: string; advancers: number; decliners: number; unchanged: number; total: number } | null;
  eventDates: string[];
};

const CTX: Ctx = {
  breadth: { sessionDate: "2026-11-18", advancers: 173, decliners: 426, unchanged: 125, total: 724 },
  eventDates: ["2026-09-23", "2026-11-16"],
};

async function loadAssert(): Promise<(content: string, ctx: Ctx | null | undefined) => void> {
  const mod = (await import("../../src/domains/article/article-fact-check")) as {
    assertCanonicalNumbers?: (content: string, ctx: Ctx | null | undefined) => void;
  };
  assert.equal(typeof mod.assertCanonicalNumbers, "function", "assertCanonicalNumbers belum ada — fix qa-2026-11-19-01 belum diterapkan");
  return mod.assertCanonicalNumbers!;
}

test("[A] assertCanonicalNumbers eksis (RED saat fix belum ada)", async () => {
  await loadAssert();
});

test("[B1] two-way PASS: breadth persis kanonik → tidak throw", async () => {
  const f = await loadAssert();
  f("Sesi terakhir ditutup dengan 173 saham naik, 426 saham turun, dan 125 saham stagnan.", CTX);
  f("Breadth negatif: hanya 173 saham naik berbanding 426 turun.", CTX);
});

test("[B2] two-way FAIL: breadth konvensi lain (+160) → THROW", async () => {
  const f = await loadAssert();
  assert.throws(() => f("Pasar melebar: 333 saham naik, 426 saham turun.", CTX), /breadth/i);
});

test("[B3] two-way FAIL: perturb kecil di luar toleransi ±2 → THROW", async () => {
  const f = await loadAssert();
  assert.throws(() => f("Tercatat 200 saham naik dan 426 saham turun.", CTX), /breadth/i);
});

test("[C1] two-way FAIL: tanggal event bukan kolom DB → THROW", async () => {
  const f = await loadAssert();
  assert.throws(() => f("PTBA mencetak golden cross 17 November dan berpotensi berlanjut.", CTX), /tanggal|event/i);
});

test("[C2] two-way PASS: tanggal event = kolom DB → tidak throw", async () => {
  const f = await loadAssert();
  f("PTBA golden cross aktif sejak 23 September; EMA cross bullish 16 November.", CTX);
  f("Sinyal golden cross baru minggu ini menambah daftar pantauan.", CTX); // tanpa tanggal → skip
});

test("[D] breadth null → no-op fail-soft (log saja)", async () => {
  const f = await loadAssert();
  f("333 saham naik hari ini.", { breadth: null, eventDates: [] });
  f("apapun", null);
});

test("[E] parity: getBreadthCounts() == SQL independen (butuh DB; skip bila unreachable)", async () => {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("@db:")) {
    const u = dbUrlHost();
    if (u) process.env.DATABASE_URL = u;
  }
  const mod = (await import("../../src/domains/stock/market-snapshot.service")) as {
    marketSnapshotService: { getBreadthCounts?: () => Promise<{ advancers: number; decliners: number; unchanged: number; total: number; sessionDate: string }> };
  };
  assert.equal(typeof mod.marketSnapshotService.getBreadthCounts, "function", "getBreadthCounts belum ada");
  let counts: Awaited<ReturnType<NonNullable<typeof mod.marketSnapshotService.getBreadthCounts>>>;
  try {
    counts = await mod.marketSnapshotService.getBreadthCounts!();
  } catch (err) {
    console.info("[E] DB unreachable — SKIP parity:", err instanceof Error ? err.message : err);
    return;
  }
  const { prisma } = await import("../../src/lib/prisma");
  const rows = await prisma.$queryRaw<Array<{ naik: bigint; turun: bigint; stag: bigint; tot: bigint }>>`
    SELECT COUNT(*) FILTER (WHERE t.close > y.close)::bigint AS naik,
           COUNT(*) FILTER (WHERE t.close < y.close)::bigint AS turun,
           COUNT(*) FILTER (WHERE t.close = y.close)::bigint AS stag,
           COUNT(*)::bigint AS tot
    FROM "StockPrice" t
    JOIN "Stock" s ON s.id = t."stockId"
    JOIN LATERAL (SELECT close FROM "StockPrice" WHERE "stockId" = t."stockId" AND date < t.date ORDER BY date DESC LIMIT 1) y ON true
    JOIN "StockIndicator" si ON si."stockId" = t."stockId" AND si.date = t.date AND si.interval = '1d'
    WHERE t.date = (SELECT MAX(date) FROM "StockPrice" WHERE volume > 0)
      AND s."isActive" = true AND s."assetClass" = 'EQUITY' AND s.ticker NOT LIKE '^%'
      AND COALESCE(si."isGorengan", false) = false`;
  const r = rows[0];
  assert.equal(counts.advancers, Number(r.naik), "advancers parity");
  assert.equal(counts.decliners, Number(r.turun), "decliners parity");
  assert.equal(counts.unchanged, Number(r.stag), "unchanged parity");
  assert.equal(counts.total, Number(r.tot), "total parity");
  console.info(`[E] parity OK sesi ${counts.sessionDate}: ${counts.advancers}/${counts.decliners}/${counts.unchanged} tot ${counts.total}`);
});
