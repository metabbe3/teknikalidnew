import { runScript } from "./lib/run";
import { prisma } from "../src/lib/prisma";
import { IDX40_TICKERS } from "../src/lib/constants";
import { subDays } from "date-fns";

/**
 * Phase 3 SEO — rank the unpromoted stocks and stage a wave for the staged rollout.
 *
 * Ranks every active EQUITY stock by 60-day liquidity (avg close×volume) weighted by
 * return variance, drops IDX40 + the top-150 (already in the sitemap shortlist), and
 * writes the next `WAVE_SIZE` tickers as a PENDING WaveAssignment with a data-profile
 * archetype. Idempotent: never overwrites a ticker already GENERATED/PROMOTED.
 *
 * Usage: npx tsx --tsconfig tsconfig.json scripts/rank-wave.ts [--size 30] [--wave 1]
 */

type RankRow = { ticker: string; avgValue: number; retVar: number };

const args = Object.fromEntries(
  process.argv.slice(2).reduce<[string, string][]>((acc, a, i, arr) => {
    if (a.startsWith("--")) acc.push([a.slice(2), arr[i + 1] ?? ""]);
    return acc;
  }, []),
);
const WAVE_SIZE = Number(args.size ?? 30);
const WAVE_NUMBER = Number(args.wave ?? 1);

runScript("rank-wave", async () => {
  const since = subDays(new Date(), 70);
  const rows = await prisma.$queryRaw<RankRow[]>`
    WITH px AS (
      SELECT s.ticker, sp.close, sp.volume,
             LAG(sp.close) OVER (PARTITION BY s.ticker ORDER BY sp.date) AS prev_close
      FROM "Stock" s
      JOIN "StockPrice" sp ON sp."stockId" = s.id
      WHERE s."isActive" = true AND s."assetClass" = 'EQUITY'
        AND sp.date >= ${since} AND sp.volume > 0
    )
    SELECT ticker,
           AVG(close * volume)::float AS "avgValue",
           VARIANCE(((close - prev_close) / NULLIF(prev_close, 0)) * 100)::float AS "retVar"
    FROM px
    WHERE prev_close IS NOT NULL
    GROUP BY ticker
    HAVING COUNT(*) >= 30
  `;

  const idx40 = new Set(IDX40_TICKERS);
  const scored = rows
    .filter((r) => r.ticker && !idx40.has(r.ticker) && Number.isFinite(r.avgValue) && Number.isFinite(r.retVar))
    .sort((a, b) => b.avgValue * (1 + b.retVar) - a.avgValue * (1 + a.retVar));

  // Exclude the sitemap shortlist: top-150 by liquidity (already promoted).
  const promoted = new Set([...scored].sort((a, b) => b.avgValue - a.avgValue).slice(0, 150).map((r) => r.ticker));
  const wave = scored.filter((r) => !promoted.has(r.ticker)).slice(0, WAVE_SIZE);

  if (wave.length === 0) {
    console.log("No candidates — all active stocks already promoted?");
    return;
  }

  // Archetype tiers within the wave (data profile → future title/angle variation).
  const liqVals = wave.map((w) => w.avgValue).sort((a, b) => a - b);
  const varVals = wave.map((w) => w.retVar).sort((a, b) => a - b);
  const p67 = (arr: number[]) => arr[Math.floor(arr.length * 0.67)] ?? Infinity;
  const highLiq = p67(liqVals);
  const highVar = p67(varVals);

  let created = 0;
  for (const w of wave) {
    const archetype = w.avgValue >= highLiq ? "jangka-panjang" : w.retVar >= highVar ? "gorengan" : "analisa";
    const before = await prisma.waveAssignment.count({ where: { ticker: w.ticker } });
    // Upsert, but never clobber progress on an existing row (GENERATED/PROMOTED).
    await prisma.waveAssignment.upsert({
      where: { ticker: w.ticker },
      create: { ticker: w.ticker, waveNumber: WAVE_NUMBER, archetype, status: "PENDING" },
      update: {},
    });
    if (before === 0) created++;
    console.log(`  ${w.ticker.padEnd(10)} val=${Math.round(w.avgValue).toString().padStart(12)}  var=${w.retVar.toFixed(2).padStart(7)}  → ${archetype}`);
  }
  console.log(`\nWave ${WAVE_NUMBER}: ${wave.length} tickers (${created} new PENDING, ${wave.length - created} already tracked).`);
});
