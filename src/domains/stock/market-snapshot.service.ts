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

// ── Pure market engine — SATU PINTU (fix-2026-10-26-10, bo-2026-11-02-01) ──
// Definisi fisik pindah ke src/lib/market-engine.ts (pure, 0 import) supaya
// src/lib/* (serialize, mailer) bisa konsumsi tanpa circular import.
// Re-export: konsumen lama (weekly-report, screener-analysis, stock-graph,
// pasar-live, dan 14 call-site hasil migrasi bo-2026-11-02-01) tetap satu
// objek yang sama — tidak ada jalur duplikat baru.
import { marketEngine } from "@/lib/market-engine";
export { marketEngine } from "@/lib/market-engine";
export type { EngineChangeRow, EngineSectorRow } from "@/lib/market-engine";

const SNAPSHOT_CACHE_KEY = "market-snapshot-v1";
const SNAPSHOT_TTL_MS = 60_000;
const MOVER_VOLUME_FLOOR = 1_000_000;
// code-audit-tk-1: cache khusus oversold-count (TTL panjang — indikator hanya
// berubah saat EOD sync; hindari 2 query aggregate tiap render halaman).
const OVERSOLD_CACHE_KEY = "oversold-count-v1";
const OVERSOLD_TTL_MS = 300_000;
// ops-2026-11-05-03: cache signal counts window 7-SESI (pinned trading sessions,
// bukan hari kalender). 3x FATAL konten: LLM mengarang "19/21/22 golden cross"
// karena context tak memuat angka sinyal; angka kanonik sekarang SATU PINTU di sini.
const SIGNAL_COUNTS_CACHE_KEY = "signal-counts-v1";
const SIGNAL_COUNTS_TTL_MS = 300_000;

type SessionRow = { ticker: string; name: string; sector: string; close: number; prev: number; volume: bigint };

/** Baris volume-leader (satu pintu, bigint sudah dikonversi ke number). */
export interface VolumeLeaderRow {
  ticker: string;
  name: string;
  sector: string;
  close: number | null;
  prev: number | null;
  volume: number;
}

/**
 * Signal counts kanonik window 7 SESI bursa (ops-2026-11-05-03).
 * Window = 7 tanggal sesi DISTINCT terakhir (equity aktif, volume > 0),
 * BUKAN hari kalender — pola kalender "max(date) - interval '6 days'"
 * melewatkan/memotong sesi lintas weekend dan menghasilkan angka yang
 * tidak bisa di-replay dari kalimat artikel.
 */
export interface SignalCounts {
  sessionDate: string;
  windowStartDate: string;
  goldenCross7s: number;
  deathCross7s: number;
  emaBullish7s: number;
  emaBearish7s: number;
}

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

  /**
   * Jumlah saham oversold (RSI<30, non-gorengan, aktif) di sesi indikator
   * terakhir — SATU PINTU (code-audit-tk-1). Sebelumnya kriteria ini
   * terduplikasi 3x inline (homepage + /pasar weekend + /pasar live) dan
   * bisa bergeser diam-diam antar halaman.
   * Fail-soft 0: badge ekstrem hilang, halaman tetap render (bukan 500).
   */
  async getOversoldCount(): Promise<number> {
    const cached = stockCache.get(OVERSOLD_CACHE_KEY);
    if (typeof cached === "number") return cached;
    try {
      const agg = await prisma.stockIndicator.aggregate({
        _max: { date: true },
        where: { interval: "1d" },
      });
      const count = agg._max.date
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
      // TTL lebih panjang dari snapshot: indikator hanya berubah saat EOD sync.
      stockCache.set(OVERSOLD_CACHE_KEY, count, OVERSOLD_TTL_MS);
      return count;
    } catch {
      return 0;
    }
  },

  /**
   * Signal counts window 7 SESI bursa — SATU PINTU (ops-2026-11-05-03).
   * Dipakai gatherMarketContext agar generator brief/analis tidak lagi
   * mengarang jumlah golden cross / EMA cross (3x FATAL: qa-11-04-03/04, qa-11-05-01).
   * Window pinned: 7 tanggal sesi DISTINCT terakhir ber-volume — definisi
   * identik dengan selftest signal-window-pinning (parity layer B).
   * Throw saat DB gagal — pemanggil konten punya catch-null fallback sendiri
   * (fail-open context, bukan fail-open angka).
   */
  async getSignalCounts(): Promise<SignalCounts> {
    const cached = stockCache.get(SIGNAL_COUNTS_CACHE_KEY);
    if (cached) return cached as SignalCounts;

    const sessionRows = await prisma.$queryRaw<Array<{ date: Date }>>`
      SELECT DISTINCT sp.date
      FROM "StockPrice" sp
      JOIN "Stock" s ON s.id = sp."stockId"
      WHERE s."assetClass" = 'EQUITY' AND s."isActive" = true AND sp.volume > 0
      ORDER BY sp.date DESC
      LIMIT 7`;
    if (sessionRows.length < 7) {
      throw new Error(`getSignalCounts: butuh 7 sesi, hanya ada ${sessionRows.length}`);
    }
    const sessionDate = sessionRows[0].date;
    const windowStartDate = sessionRows[6].date;

    const counts = await prisma.$queryRaw<Array<{
      gc: bigint; dc: bigint; eb: bigint; es: bigint;
    }>>`
      SELECT
        count(DISTINCT si."stockId") FILTER (
          WHERE si."smaCrossSignal" = 'golden_cross'
            AND si."smaCrossDate" >= ${windowStartDate} AND si."smaCrossDate" <= ${sessionDate}
        )::bigint AS gc,
        count(DISTINCT si."stockId") FILTER (
          WHERE si."smaCrossSignal" = 'death_cross'
            AND si."smaCrossDate" >= ${windowStartDate} AND si."smaCrossDate" <= ${sessionDate}
        )::bigint AS dc,
        count(DISTINCT si."stockId") FILTER (
          WHERE si."emaCrossSignal" = 'bullish'
            AND si."emaCrossDate" >= ${windowStartDate} AND si."emaCrossDate" <= ${sessionDate}
        )::bigint AS eb,
        count(DISTINCT si."stockId") FILTER (
          WHERE si."emaCrossSignal" = 'bearish'
            AND si."emaCrossDate" >= ${windowStartDate} AND si."emaCrossDate" <= ${sessionDate}
        )::bigint AS es
      FROM "StockIndicator" si
      JOIN "Stock" s ON s.id = si."stockId"
      WHERE si.interval = '1d'
        AND s."isActive" = true AND s."assetClass" = 'EQUITY' AND s.ticker NOT LIKE '^%'
        AND COALESCE(si."isGorengan", false) = false`;
    const row = counts[0] ?? { gc: BigInt(0), dc: BigInt(0), eb: BigInt(0), es: BigInt(0) };

    const out: SignalCounts = {
      sessionDate: sessionDate.toISOString().slice(0, 10),
      windowStartDate: windowStartDate.toISOString().slice(0, 10),
      goldenCross7s: bigIntToNumber(row.gc) ?? 0,
      deathCross7s: bigIntToNumber(row.dc) ?? 0,
      emaBullish7s: bigIntToNumber(row.eb) ?? 0,
      emaBearish7s: bigIntToNumber(row.es) ?? 0,
    };
    stockCache.set(SIGNAL_COUNTS_CACHE_KEY, out, SIGNAL_COUNTS_TTL_MS);
    return out;
  },

  /**
   * Top volume leaders sesi terakhir — dipindah verbatim dari raw SQL inline
   * homepage (code-audit-tk-1: app layer konsumsi service, bukan SQL).
   * Fail-soft []: kartu "Teraktif" kosong, halaman tetap render.
   */
  async getVolumeLeaders(limit = 5): Promise<VolumeLeaderRow[]> {
    try {
      const rows = await prisma.$queryRaw<Array<{
        ticker: string; name: string; sector: string;
        close: number | null; prev: number | null; volume: bigint;
      }>>`
        SELECT s.ticker, s.name, s.sector,
               sp.close::float8 AS close, p.close::float8 AS prev,
               sp.volume::bigint AS volume
        FROM "StockPrice" sp
        JOIN "Stock" s ON s.id = sp."stockId"
        JOIN LATERAL (
          SELECT close FROM "StockPrice"
          WHERE "stockId" = sp."stockId" AND date < sp.date
          ORDER BY date DESC LIMIT 1
        ) p ON true
        WHERE sp.date = (SELECT MAX(date) FROM "StockPrice" sp2
                         JOIN "Stock" s2 ON s2.id = sp2."stockId"
                         WHERE s2."assetClass" = 'EQUITY' AND s2."isActive" = true AND sp2.volume > 0)
          AND s."assetClass" = 'EQUITY' AND s."isActive" = true AND sp.volume > 0
        ORDER BY sp.volume DESC
        LIMIT ${limit}
      `;
      return rows.map((r) => ({
        ticker: r.ticker,
        name: r.name,
        sector: r.sector,
        close: r.close,
        prev: r.prev,
        volume: bigIntToNumber(r.volume) ?? 0,
      }));
    } catch {
      return [];
    }
  },
};
