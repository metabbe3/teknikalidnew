import { prisma } from "@/lib/prisma";
import { stockCache } from "@/lib/cache";
import { bigIntToNumber } from "@/lib/serialize";

/**
 * market-snapshot.service — SATU PINTU data pasar (ref-2026-10-17-01).
 *
 * Single source of truth for IHSG EOD, top movers, sector averages and market
 * breadth. Every surface (home, /stocks, /pasar, /berita, /api/market,
 * community-agent) consumes this snapshot — nobody recomputes change/breadth
 * on their own. Incident background: "PTMR +55,83%" vs "BSWD +25%" and the
 * 592-vs-593 breadth drift came from four parallel computation paths.
 *
 * DOCTRINES (hard rules — do not weaken):
 *  1. prev-close = per-stock last close STRICTLY BEFORE the session bar
 *     (JOIN LATERAL) — never "the second row of an array" (carry-forward
 *     vol=0 rows make that silently wrong).
 *  2. session = latest date that has volume > 0 equity rows. A date with only
 *     carry-forward (vol=0) rows is a frozen non-session — skip it.
 *  3. Equities only: assetClass EQUITY, isActive=true, ticker NOT LIKE '^%'
 *     (indices never join movers/breadth/sectors).
 *  4. IHSG = ^JKSE row of the session date, prev per doctrine 1.
 *  5. One cache: stockCache 'market-snapshot-v1' TTL 60s — the ONLY place
 *     these numbers are cached. Consumers must not add their own layer.
 *  6. Movers liquidity floor: volume ≥ 1,000,000 shares (pasar-live rule).
 *     Breadth/sectors count ALL equities with a valid prev-close (no floor).
 */

export interface Mover {
  ticker: string; // with .JK
  name: string;
  sector: string;
  close: number;
  changePercent: number;
  volumeShares: number;
}

export interface MarketSnapshot {
  /** ISO yyyy-mm-dd of the session (latest volume>0 equity date). */
  sessionDate: string | null;
  /** ISO timestamp when this snapshot was computed (cache fill time). */
  dataAsOf: string;
  ihsg: { close: number; changePercent: number } | null;
  gainers: Mover[];
  losers: Mover[];
  sectors: Record<string, { avgChange: number; count: number }>;
  breadth: { advancers: number; decliners: number; unchanged: number; total: number };
}

const SNAPSHOT_CACHE_KEY = "market-snapshot-v1";
const SNAPSHOT_TTL_MS = 60_000;
const MOVER_VOLUME_FLOOR = 1_000_000;

type SessionRow = { ticker: string; name: string; sector: string; close: number; prev: number; volume: bigint };

async function computeSnapshot(): Promise<MarketSnapshot> {
  // Doctrine 2: latest date with real trading (volume > 0) among active equities.
  const sessionRows = await prisma.$queryRaw<Array<{ date: Date }>>`
    SELECT sp.date
    FROM "StockPrice" sp
    JOIN "Stock" s ON s.id = sp."stockId"
    WHERE s."assetClass" = 'EQUITY' AND s."isActive" = true AND sp.volume > 0
    ORDER BY sp.date DESC
    LIMIT 1
  `;
  const sessionDate = sessionRows[0]?.date ?? null;
  if (!sessionDate) {
    return {
      sessionDate: null,
      dataAsOf: new Date().toISOString(),
      ihsg: null,
      gainers: [],
      losers: [],
      sectors: {},
      breadth: { advancers: 0, decliners: 0, unchanged: 0, total: 0 },
    };
  }

  // Doctrines 1+3: session rows with per-stock prev-close via JOIN LATERAL
  // (same shape pasar-live used — the most correct of the old paths).
  const rows = await prisma.$queryRaw<SessionRow[]>`
    SELECT s.ticker, s.name, s.sector, sp.close::float8 AS close, p.close::float8 AS prev, sp.volume
    FROM "StockPrice" sp
    JOIN "Stock" s ON s.id = sp."stockId"
    JOIN LATERAL (
      SELECT close FROM "StockPrice"
      WHERE "stockId" = sp."stockId" AND date < sp.date
      ORDER BY date DESC LIMIT 1
    ) p ON true
    WHERE sp.date = ${sessionDate}
      AND s."isActive" = true
      AND s."assetClass" = 'EQUITY'
      AND s.ticker NOT LIKE '^%'
  `;

  const computed: Mover[] = [];
  for (const r of rows) {
    if (!Number.isFinite(r.close) || !Number.isFinite(r.prev) || r.prev === 0) continue;
    const pct = ((r.close - r.prev) / r.prev) * 100;
    if (!Number.isFinite(pct)) continue;
    computed.push({
      ticker: r.ticker,
      name: r.name,
      sector: r.sector,
      close: r.close,
      changePercent: pct,
      volumeShares: bigIntToNumber(r.volume) ?? 0,
    });
  }

  // Doctrine 6: movers need the liquidity floor; breadth/sectors do not.
  const liquid = computed.filter((c) => c.volumeShares >= MOVER_VOLUME_FLOOR);
  const gainers = [...liquid].sort((a, b) => b.changePercent - a.changePercent).slice(0, 5);
  const gainerSet = new Set(gainers.map((g) => g.ticker));
  const losers = liquid
    .filter((c) => !gainerSet.has(c.ticker))
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 5);

  // ponytail: simple arithmetic mean (not market-cap-weighted) — kept from the
  // old overview so sector numbers stay comparable across releases.
  const sectorMap = new Map<string, { total: number; sum: number }>();
  let advancers = 0;
  let decliners = 0;
  let unchanged = 0;
  for (const c of computed) {
    const ex = sectorMap.get(c.sector) ?? { total: 0, sum: 0 };
    ex.total++;
    ex.sum += c.changePercent;
    sectorMap.set(c.sector, ex);
    if (c.changePercent > 0) advancers++;
    else if (c.changePercent < 0) decliners++;
    else unchanged++;
  }
  const sectors: Record<string, { avgChange: number; count: number }> = {};
  for (const [sector, { total, sum }] of sectorMap) {
    sectors[sector] = { avgChange: Number((sum / total).toFixed(2)), count: total };
  }

  // Doctrine 4: IHSG = ^JKSE session close vs its own prev bar (rule 1).
  const ihsgRows = await prisma.$queryRaw<Array<{ close: number; prev: number }>>`
    SELECT sp.close::float8 AS close, p.close::float8 AS prev
    FROM "StockPrice" sp
    JOIN "Stock" s ON s.id = sp."stockId"
    JOIN LATERAL (
      SELECT close FROM "StockPrice"
      WHERE "stockId" = sp."stockId" AND date < sp.date
      ORDER BY date DESC LIMIT 1
    ) p ON true
    WHERE sp.date = ${sessionDate} AND s.ticker = '^JKSE'
    LIMIT 1
  `;
  const ih = ihsgRows[0];
  const ihsg =
    ih && Number.isFinite(ih.close) && Number.isFinite(ih.prev) && ih.prev !== 0
      ? { close: ih.close, changePercent: ((ih.close - ih.prev) / ih.prev) * 100 }
      : null;

  return {
    sessionDate: sessionDate.toISOString().slice(0, 10),
    dataAsOf: new Date().toISOString(),
    ihsg,
    gainers,
    losers,
    sectors,
    breadth: { advancers, decliners, unchanged, total: computed.length },
  };
}

export const marketSnapshotService = {
  /** The one market snapshot — cached 60s (doctrine 5). */
  async getSnapshot(): Promise<MarketSnapshot> {
    const cached = stockCache.get(SNAPSHOT_CACHE_KEY);
    if (cached) return cached as MarketSnapshot;
    const snap = await computeSnapshot();
    stockCache.set(SNAPSHOT_CACHE_KEY, snap, SNAPSHOT_TTL_MS);
    return snap;
  },
};
