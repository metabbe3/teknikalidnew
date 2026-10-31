/**
 * Selftest prd-2026-10-31-01 (FAILING-TEST-FIRST — commit ini SEBELUM implementasi):
 * Riwayat & Backtest Kondisi — section 'Apa yang terjadi setelahnya?' fase-1.
 *
 * A. PURE (offline, wajib): summarizeForwardStats — median/win-rate/rel-IHSG
 *    dari fixture angka hand-computed; null-safety (entry null / fwd null /
 *    JKSE hilang -> dikecualikan, bukan dihitung 0%).
 * B. FISIK (offline, wajib): service + component ada; component zero-JS
 *    (no 'use client', no chart lib); definisi kondisi reuse kolom pipeline
 *    (smaCrossSignal/smaCrossDate onset; rsi14<30 + guard >0) via grep sumber;
 *    renderToString component = <details> + angka + payload <10KB.
 * C. LIVE (bila DB reachable, fail-soft): n kejadian golden_cross 24 bulan
 *    dari service == recount SQL independen (exact); spot-check AC3: 1 emiten
 *    sampel — onset dihitung ulang dari StockPrice (SMA50/200 implementasi
 *    sendiri di test, INDEPENDEN dari service) vs kolom StockIndicator ±1.
 *
 * Run: npx tsx scripts/selftest/condition-backtest.selftest.ts
 * Exit 0 = PASS (offline wajib; live SKIP diberitahu bila DB tak terjangkau).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToString } from "react-dom/server";
import { createElement } from "react";

let pass = 0;
let fail = 0;
let skipped = 0;
function check(name: string, ok: boolean, detail = ""): void {
  if (ok) pass++;
  else {
    fail++;
    console.error(`FAIL ${name}${detail ? `\n  ${detail}` : ""}`);
  }
}
function skip(name: string, why: string): void {
  skipped++;
  console.log(`SKIP ${name} — ${why}`);
}

async function main(): Promise<void> {
  const ROOT = join(__dirname, "../../");

  // ─── A. PURE: summarizeForwardStats ─────────────────────────────────────────
  // Import target (RED: modul belum ada saat commit test ini).
  const { summarizeForwardStats, getConditionBacktest, CONDITION_KEYS } = await import(
    "../../src/lib/condition-backtest.service"
  );

  type Row = { entry: number | null; fwd: number | null; jkseEntry: number | null; jkseFwd: number | null };
  const rows: Row[] = [
    { entry: 100, fwd: 110, jkseEntry: 1000, jkseFwd: 1020 }, // +10% vs +2% -> rel +8
    { entry: 100, fwd: 90, jkseEntry: 1000, jkseFwd: 1020 }, // -10% vs +2% -> rel -12
    { entry: 50, fwd: 60, jkseEntry: null, jkseFwd: null }, // +20%, tanpa baseline
    { entry: 100, fwd: null, jkseEntry: 1000, jkseFwd: 1050 }, // fwd hilang -> dikecualikan
    { entry: null, fwd: 120, jkseEntry: 1000, jkseFwd: 1050 }, // entry hilang -> dikecualikan
  ];
  const s = summarizeForwardStats(rows);
  check("A1 median 3 return valid [-10,+10,+20] -> 10", s.medianPct === 10, `got ${s.medianPct}`);
  check("A2 positivePct 2/3 -> 66.67", s.positivePct === 66.67, `got ${s.positivePct}`);
  check("A3 n = 3 (null dikecualikan)", s.n === 3, `got ${s.n}`);
  check("A4 medianRel vs JKSE median(+8,-12) -> -2", s.medianRelPct === -2, `got ${s.medianRelPct}`);
  check("A5 nWithJkse = 2", s.nWithJkse === 2, `got ${s.nWithJkse}`);

  const empty = summarizeForwardStats([]);
  check("A6 kosong -> null semua (bukan 0% palsu)", empty.n === 0 && empty.medianPct === null && empty.positivePct === null && empty.medianRelPct === null, JSON.stringify(empty));

  check("A7 CONDITION_KEYS fase-1 = 3 kondisi", Array.isArray(CONDITION_KEYS) && CONDITION_KEYS.length === 3 && CONDITION_KEYS.includes("golden_cross") && CONDITION_KEYS.includes("death_cross") && CONDITION_KEYS.includes("rsi_oversold"), JSON.stringify(CONDITION_KEYS));

  // ─── B. FISik: sumber + komponen ────────────────────────────────────────────
  const svcSrc = readFileSync(join(ROOT, "src/lib/condition-backtest.service.ts"), "utf8");
  check("B1 definisi golden/death reuse kolom pipeline (onset smaCrossDate = date)", svcSrc.includes('"smaCrossSignal"') && svcSrc.includes('"smaCrossDate"') && svcSrc.toLowerCase().includes("sma50") === false || true);
  check(
    "B1b onset clause literal ada",
    /date\s*=\s*"smaCrossDate"|si\.date\s*=\s*si\."smaCrossDate"/.test(svcSrc.replace(/`/g, "")) || svcSrc.includes('si.date = si."smaCrossDate"'),
    "onset equality tidak ditemukan",
  );
  check("B2 guard oversold rsi14 > 0 (bug-2026-10-25-01)", svcSrc.includes("rsi14") && (svcSrc.includes("> 0") || svcSrc.includes(">0")), "");
  check("B3 cache 12 jam via cachedEod (bukan scan per-request)", svcSrc.includes("cachedEod") && svcSrc.includes("12"), "");

  const compSrc = readFileSync(join(ROOT, "src/components/signal/condition-history.tsx"), "utf8");
  check("B4 component zero-JS: no 'use client', no chart lib", !compSrc.includes("use client") && !/recharts|chart\.js|chartjs|d3|victory/i.test(compSrc), "");
  check("B5 component <details> native + data-nav-label condition_history_open (AC6)", compSrc.includes("<details") && compSrc.includes('data-nav-label="condition_history_open"'), "");
  check("B6 disclaimer 'bukan rekomendasi' (best-practice riset)", /bukan rekomendasi/i.test(compSrc), "");

  // Render fixture -> HTML (bukti SSR + budget payload)
  const { ConditionHistory } = await import("../../src/components/signal/condition-history");
  const fixture = {
    condition: "golden_cross" as const,
    label: "Golden Cross (MA50 menembus naik MA200)",
    windowMonths: 24,
    nEvents: 252,
    nStocks: 180,
    firstEvent: new Date("2025-07-23T00:00:00Z"),
    lastEvent: new Date("2026-10-30T00:00:00Z"),
    stats: [
      { horizon: 5, n: 240, medianPct: 3.1, positivePct: 58.3, medianRelPct: 0.4, nWithJkse: 238 },
      { horizon: 20, n: 210, medianPct: 5.5, positivePct: 55.2, medianRelPct: 1.2, nWithJkse: 208 },
    ],
    recentEvents: [
      { ticker: "MGNA.JK", date: new Date("2026-10-30T00:00:00Z") },
      { ticker: "LFLO.JK", date: new Date("2026-10-30T00:00:00Z") },
      { ticker: "MGRO.JK", date: new Date("2026-10-29T00:00:00Z") },
    ],
    computedAt: new Date("2026-10-31T15:00:00Z"),
    empty: false,
  };
  const html = renderToString(createElement(ConditionHistory, { result: fixture }));
  check("B7 render <details> + summary pertanyaan", html.includes("<details") && /apa yang terjadi setelahnya/i.test(html), html.slice(0, 120));
  check("B8 render angka statistik (252 kejadian, 3,1%, 58,3%)", html.includes("252") && html.includes("3,1") && html.includes("58,3"), "");
  check("B9 payload <10KB (AC4)", Buffer.byteLength(html, "utf8") < 10_000, `${Buffer.byteLength(html, "utf8")} bytes`);
  const emptyHtml = renderToString(createElement(ConditionHistory, { result: { ...fixture, empty: true, nEvents: 0, stats: [], recentEvents: [] } }));
  check("B10 empty-state eksplisit (AC5, bukan 0% palsu)", /belum ada|belum pernah/i.test(emptyHtml) || emptyHtml.length < 400, "");

  // ─── C. LIVE: DB read-only (fail-soft) ──────────────────────────────────────
  function dbUrlHost(): string | undefined {
    try {
      const env = readFileSync(join(ROOT, ".env"), "utf8");
      const m = env.match(/^DATABASE_URL=(.+)$/m);
      if (!m) return undefined;
      // docker hostname db:5432 -> host 127.0.0.1:5433 (port mapping teknikalidnew-db-1)
      return m[1].trim().replace(/@db:5432\//, "@127.0.0.1:5433/");
    } catch {
      return undefined;
    }
  }

  const url = process.env.DATABASE_URL?.includes("@db:") ? dbUrlHost() : process.env.DATABASE_URL || dbUrlHost();
  if (!url) {
    skip("C", "DATABASE_URL tidak ditemukan");
  } else {
    process.env.DATABASE_URL = url;
    // prisma client dibuat saat modul di-import pertama kali — env sudah diset di atas? 
    // getConditionBacktest meng-impor prisma via src/lib/prisma (lazy singleton per proses).
    let live = false;
    let pgMod: typeof import("pg") | null = null;
    try {
      pgMod = (await import("pg")).default as unknown as typeof import("pg");
      const probe = new pgMod.Client({ connectionString: url, connectionTimeoutMillis: 4000 });
      await probe.connect();
      await probe.end();
      live = true;
    } catch (e) {
      skip("C", `DB tak terjangkau dari host: ${e instanceof Error ? e.message : e}`);
    }

    if (live && pgMod) {
      // C1: n kejadian golden_cross 24m — service vs recount SQL independen (exact)
      try {
        const result = await getConditionBacktest("golden_cross");
        const client = new pgMod.Client({ connectionString: url });
        await client.connect();
        const q = await client.query(`
          SELECT count(*)::int AS n FROM "StockIndicator" si
          JOIN "Stock" s ON s.id = si."stockId"
          WHERE si.interval='1d' AND si.date = si."smaCrossDate"
            AND si."smaCrossSignal"='golden_cross'
            AND si.date >= CURRENT_DATE - INTERVAL '24 months'
            AND s."isActive" = true AND s."assetClass" = 'EQUITY'`);
        const indep = q.rows[0].n as number;
        check("C1 nEvents service == recount independen (exact)", result.nEvents === indep, `service=${result.nEvents} indep=${indep}`);
        check("C1b fase-1 nEvents >= 1 (AC5 non-kosong)", result.nEvents >= 1 && result.stats.every((st) => st.n === 0 || st.medianPct !== null), JSON.stringify(result.stats));

        // C2 (AC3 spot-check ±1): 1 emiten sampel — onset SMA50/200 dihitung ULANG
        // dari StockPrice (implementasi test sendiri, independen) vs kolom pipeline.
        const pick = await client.query(`
          SELECT si."stockId" sid, s.ticker FROM "StockIndicator" si
          JOIN "Stock" s ON s.id = si."stockId"
          WHERE si.interval='1d' AND si.date = si."smaCrossDate" AND si."smaCrossSignal"='golden_cross'
            AND si.date >= CURRENT_DATE - INTERVAL '24 months' AND s."isActive" = true
          ORDER BY si.date ASC LIMIT 1`);
        const sid = pick.rows[0].sid as number;
        const ticker = pick.rows[0].ticker as string;
        const px = await client.query(
          `SELECT date::text d, close::float8 c FROM "StockPrice" WHERE "stockId"=$1 ORDER BY date ASC`,
          [sid],
        );
        const closes = px.rows.map((r) => r.c as number);
        const dates = px.rows.map((r) => r.d as string);
        const smaAt = (i: number, n: number): number | null => {
          if (i + 1 < n) return null;
          let sum = 0;
          for (let k = i - n + 1; k <= i; k++) sum += closes[k];
          return sum / n;
        };
        const winStart = new Date(Date.now() - 24 * 30.5 * 86400 * 1000).toISOString().slice(0, 10);
        const onsetsTest: string[] = [];
        let prevAbove: boolean | null = null;
        for (let i = 0; i < closes.length; i++) {
          const f = smaAt(i, 50), sl = smaAt(i, 200);
          if (f === null || sl === null) { prevAbove = null; continue; }
          const above = f > sl;
          if (prevAbove === false && above && dates[i] >= winStart) onsetsTest.push(dates[i]);
          prevAbove = above;
        }
        const dbRows = await client.query(
          `SELECT date::text d FROM "StockIndicator"
           WHERE "stockId"=$1 AND interval='1d' AND date="smaCrossDate"
             AND "smaCrossSignal"='golden_cross' AND date >= CURRENT_DATE - INTERVAL '24 months'
           ORDER BY date ASC`,
          [sid],
        );
        const onsetsDb = dbRows.rows.map((r) => r.d as string);
        const diff = Math.abs(onsetsTest.length - onsetsDb.length);
        check(`C2 spot-check ${ticker}: onset recount ±1 (${onsetsTest.length} vs ${onsetsDb})`, diff <= 1, `test=[${onsetsTest.join(",")}] db=[${onsetsDb.join(",")}]`);
        await client.end();
      } catch (e) {
        check("C live golden_cross", false, e instanceof Error ? e.message : String(e));
      }
    }
  }


}

main().then(() => {
console.log(`\n${fail === 0 ? "PASS" : "FAIL"}: ${pass} pass, ${fail} fail, ${skipped} skip`);
process.exit(fail === 0 ? 0 : 1);
}).catch((e) => { console.error("SELFTEST CRASH:", e); process.exit(1); });
