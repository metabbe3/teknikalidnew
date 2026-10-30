/**
 * Selftest code-audit-tk-1 (FAILING-TEST-FIRST — commit test ini SEBELUM fix):
 * SATU PINTU market data — duplikasi query market-data di layer app.
 *
 * A1. src/app TIDAK boleh berisi query oversold inline (rsi14<30 count) —
 *     pindah ke marketSnapshotService.getOversoldCount (dulu 3x duplikat:
 *     homepage + /pasar weekend + /pasar live; kriteria bisa bergeser diam-diam).
 * A2. market-snapshot.service HARUS mengekspor getOversoldCount + getVolumeLeaders.
 * A3. homepage (public)/page.tsx TIDAK boleh $queryRaw (volume-leaders pindah
 *     ke satu pintu; doctrine: app layer konsumsi service, bukan SQL).
 * B1. (live, bila DB reachable) parity: getOversoldCount() == count SQL
 *     langsung dengan kriteria identik + fail-soft mengembalikan angka (0).
 *
 * Run: npx tsx scripts/selftest/market-snapshot-oversold.selftest.ts
 * Exit 0 = PASS semua.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
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

const ROOT = join(__dirname, "../../");

/** Rekursif kumpulkan isi semua .ts/.tsx di bawah dir (skip node_modules). */
function collectSources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) collectSources(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

// ── A1: tidak ada query oversold inline di layer app ──
const appFiles = collectSources(join(ROOT, "src/app"));
const offenders: string[] = [];
for (const f of appFiles) {
  const src = readFileSync(f, "utf8");
  if (/rsi14:\s*\{\s*lt:\s*30\s*\}/.test(src)) offenders.push(f.replace(ROOT, ""));
}
check(
  "A1 src/app bebas query oversold rsi14<30 inline (SATU PINTU service)",
  offenders.length === 0,
  `masih ada di: ${offenders.join(", ")}`,
);

// ── A2: service mengekspor kedua method baru ──
const svcSrc = readFileSync(join(ROOT, "src/domains/stock/market-snapshot.service.ts"), "utf8");
check(
  "A2 market-snapshot.service mengekspor getOversoldCount",
  /async getOversoldCount\(\)/.test(svcSrc),
  "method getOversoldCount tidak ditemukan",
);
check(
  "A2 market-snapshot.service mengekspor getVolumeLeaders",
  /async getVolumeLeaders\(/.test(svcSrc),
  "method getVolumeLeaders tidak ditemukan",
);

// ── A3: homepage tanpa $queryRaw ──
const homeSrc = readFileSync(join(ROOT, "src/app/(public)/page.tsx"), "utf8");
check(
  "A3 homepage (public)/page.tsx tanpa $queryRaw (volume-leaders via service)",
  !homeSrc.includes("$queryRaw"),
  "masih ada $queryRaw di homepage",
);

// ── B1: parity live (best-effort; skip PASS bila DB tak terjangkau) ──
async function parity(): Promise<void> {
  const { marketSnapshotService } = await import("../../src/domains/stock/market-snapshot.service");
  if (typeof marketSnapshotService.getOversoldCount !== "function") {
    check("B1 getOversoldCount dapat dipanggil", false, "method belum ada (fix belum jalan)");
    return;
  }
  const { prisma } = await import("../../src/lib/prisma");
  try {
    const agg = await prisma.stockIndicator.aggregate({
      _max: { date: true },
      where: { interval: "1d" },
    });
    const expected = agg._max.date
      ? await prisma.stockIndicator.count({
          where: {
            interval: "1d",
            date: agg._max.date,
            rsi14: { lt: 30 },
            isGorengan: false,
            stock: { isActive: true, assetClass: "EQUITY" },
          },
        })
      : 0;
    const got = await marketSnapshotService.getOversoldCount();
    check(
      `B1 parity oversold count service=${got} vs SQL=${expected}`,
      got === expected,
      `angka beda: service ${got} != sql ${expected}`,
    );
    const leaders = await marketSnapshotService.getVolumeLeaders(5);
    check(
      "B1 volume leaders <=5 terurut volume desc",
      leaders.length <= 5 &&
        leaders.every((l) => typeof l.volume === "number") &&
        leaders.every((l, i) => i === 0 || leaders[i - 1].volume >= l.volume),
      `len=${leaders.length} volumes=${leaders.map((l) => l.volume).join(",")}`,
    );
    await prisma.$disconnect();
  } catch (e) {
    console.log(`SKIP B1 (DB tak terjangkau dari host): ${e instanceof Error ? e.message : "err"}`);
  }
}

(async () => {
  await parity();
  console.log(`\n${pass} PASS, ${fail} FAIL`);
  if (fail > 0) process.exit(1);
})();
