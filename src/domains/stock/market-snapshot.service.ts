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

// ── Pure market engine (fix-2026-10-26-10) ──
// SATU PINTU rumus pasar: change% / breadth / sektor / movers / mean.
// Sebelum modul ini rumus yang sama ditulis inline di weekly-report.service
// + screener-analysis.service (jalur duplikat = akar insiden drift angka,
// ref-2026-10-17-01). Konsumen hanya menyiapkan baris + window-nya
// (sesi harian vs jendela mingguan) lalu memanggil engine — DILARANG
// menulis ((close-prev)/prev)*100 di luar modul ini.
// Guard prev <= 0: harga penutupan negatif = data sampah, bukan sinyal.

export interface EngineChangeRow {
  ticker: string;
  changePercent: number;
}

export interface EngineSectorRow {
  sector: string;
  avgChange: number;
  count: number;
}

export const marketEngine = {
  /** (close - prev) / prev sebagai fraksi (0.05 = +5%). null jika prev invalid. */
  changeFraction(close: number, prev: number): number | null {
    if (!Number.isFinite(close) || !Number.isFinite(prev) || prev <= 0) return null;
    const f = (close - prev) / prev;
    return Number.isFinite(f) ? f : null;
  },

  /** ((close - prev) / prev) * 100 sebagai persen. null jika prev invalid. */
  pctChange(close: number, prev: number): number | null {
    if (!Number.isFinite(close) || !Number.isFinite(prev) || prev <= 0) return null;
    const pct = ((close - prev) / prev) * 100;
    return Number.isFinite(pct) ? pct : null;
  },

  /** Breadth pasar: hitung naik/turun/stagnan dari baris changePercent. */
  breadth(rows: EngineChangeRow[]): { advancers: number; decliners: number; unchanged: number; total: number } {
    let advancers = 0;
    let decliners = 0;
    let unchanged = 0;
    for (const r of rows) {
      if (r.changePercent > 0) advancers++;
      else if (r.changePercent < 0) decliners++;
      else unchanged++;
    }
    return { advancers, decliners, unchanged, total: rows.length };
  },

  /** Rata-rata change% per sektor (aritmetik sederhana — doctrine ponytail),
   * urutan entri = first-seen. Konsumen memformat/mengurutkan sendiri. */
  sectorAverages(rows: { sector: string; changePercent: number }[]): EngineSectorRow[] {
    const m = new Map<string, { total: number; sum: number }>();
    for (const r of rows) {
      const e = m.get(r.sector) ?? { total: 0, sum: 0 };
      e.total++;
      e.sum += r.changePercent;
      m.set(r.sector, e);
    }
    return [...m.entries()].map(([sector, { total, sum }]) => ({ sector, avgChange: sum / total, count: total }));
  },

  /** Top movers: n gainer teratas & n loser terbawah (worst-first).
   * excludeOverlap=true → losers tidak tumpang tindih gainers (jalur snapshot
   * harian: pool likuid kecil); default false (jalur laporan mingguan). */
  movers<T extends { ticker: string; changePercent: number }>(
    rows: T[],
    n: number,
    opts?: { excludeOverlap?: boolean },
  ): { gainers: T[]; losers: T[] } {
    const gainers = [...rows].sort((a, b) => b.changePercent - a.changePercent).slice(0, n);
    const pool = opts?.excludeOverlap
      ? rows.filter((r) => !gainers.some((g) => g.ticker === r.ticker))
      : rows;
    const losers = [...pool].sort((a, b) => a.changePercent - b.changePercent).slice(0, n);
    return { gainers, losers };
  },

  /** Mean change% seluruh pasar. 0 untuk rows kosong. */
  meanChange(rows: EngineChangeRow[]): number {
    if (rows.length === 0) return 0;
    return rows.reduce((acc, r) => acc + r.changePercent, 0) / rows.length;
  },
};

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
    const pct = marketEngine.pctChange(r.close, r.prev);
    if (pct === null) continue;
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
  const { gainers, losers } = marketEngine.movers(liquid, 5, { excludeOverlap: true });

  // ponytail: simple arithmetic mean (not market-cap-weighted) — kept from the
  // old overview so sector numbers stay comparable across releases.
  const breadth = marketEngine.breadth(computed);
  const sectors: Record<string, { avgChange: number; count: number }> = {};
  for (const { sector, avgChange, count } of marketEngine.sectorAverages(computed)) {
    sectors[sector] = { avgChange: Number(avgChange.toFixed(2)), count };
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
  const ihPct = ih ? marketEngine.pctChange(ih.close, ih.prev) : null;
  const ihsg = ih && ihPct !== null ? { close: ih.close, changePercent: ihPct } : null;

  return {
    sessionDate: sessionDate.toISOString().slice(0, 10),
    dataAsOf: new Date().toISOString(),
    ihsg,
    gainers,
    losers,
    sectors,
    breadth,
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
