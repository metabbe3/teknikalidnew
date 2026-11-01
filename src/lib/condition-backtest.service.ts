/**
 * condition-backtest.service — SATU PINTU matematika backtest kondisi teknikal
 * (PRD im-2026-10-29-1 / prd-2026-10-31-01; pilar GROWTH + TRUST).
 *
 * "Apa yang terjadi setelahnya?" — statistik historis JUJUR per kondisi:
 * n kejadian 24 bulan, median return +5/+20 hari perdagangan, % positif,
 * median relatif IHSG. Bukan prediksi — disclaimer ada di komponen.
 *
 * Definisi kondisi 100% REUSE pipeline indikator (anti-divergensi, akar bug
 * QA superlatif berulang): kejadian cross = baris StockIndicator harian di
 * mana date = smaCrossDate (onset regime; penulis pipeline = trackCrosses/
 * detectCrossover pada SMA50/200), oversold = rsi14 < 30 dengan guard rsi14
 * > 0 (bug-2026-10-25-01: 0 = indikator kosong). Tidak ada rumus duplikat.
 *
 * Beban: ~549rb baris StockPrice — DILARANG dipindai per-request. Seluruh
 * hasil di-cache 12 jam per kondisi via cachedEod (halaman force-dynamic,
 * RCA 18 Okt). Event horizon diperpendek: kejadian >90 hari otomatis
 * di-drop dari horizon +20 (look-ahead guard).
 */
import { prisma } from "@/lib/prisma";
import { eodKey } from "@/domains/stock/eod-cache";
import { stockCache } from "@/lib/cache";

export const CONDITION_KEYS = ["golden_cross", "death_cross", "rsi_oversold"] as const;
export type ConditionKey = (typeof CONDITION_KEYS)[number];

export const HORIZONS = [5, 20] as const;

/** Jendela historis bulan (pre-registered, PRD) — jangan pilih horizon/periode terbaik pasca-lihat hasil. */
export const WINDOW_MONTHS = 24;

/** Guard look-ahead: horizon maksimum yang dihitung utk kejadian muda (n hari kalender ≈ 20 sesi). */
const HORIZON_GUARD_DAYS = 90;

const JKSE_TICKER = "^JKSE";

export interface ConditionEventInput {
  entry: number | null;
  fwd: number | null;
  jkseEntry: number | null;
  jkseFwd: number | null;
}

export interface HorizonStats {
  horizon: number;
  /** kejadian dengan fwd price tersedia (horizon tercapai) */
  n: number;
  medianPct: number | null;
  positivePct: number | null;
  /** median (return saham − return IHSG) utk kejadian dgn baseline lengkap */
  medianRelPct: number | null;
  nWithJkse: number;
}

export interface ConditionBacktestResult {
  condition: ConditionKey;
  label: string;
  windowMonths: number;
  nEvents: number;
  nStocks: number;
  firstEvent: Date | null;
  lastEvent: Date | null;
  stats: HorizonStats[];
  recentEvents: { ticker: string; date: Date }[];
  computedAt: Date;
  /** true = kondisi belum pernah terjadi dalam jendela — render empty-state eksplisit */
  empty: boolean;
}

export function summarizeForwardStats(rows: ConditionEventInput[]): {
  n: number;
  medianPct: number | null;
  positivePct: number | null;
  medianRelPct: number | null;
  nWithJkse: number;
} {
  const valid = rows.filter((r) => r.entry !== null && r.entry > 0 && r.fwd !== null && r.fwd > 0);
  if (valid.length === 0) {
    return { n: 0, medianPct: null, positivePct: null, medianRelPct: null, nWithJkse: 0 };
  }
  const rets = valid.map((r) => ((r.fwd as number) - (r.entry as number)) / (r.entry as number) * 100);
  const median = (xs: number[]): number => {
    const s = [...xs].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  };
  const positives = rets.filter((r) => r > 0).length;
  const rel = valid
    .filter((r) => r.jkseEntry !== null && r.jkseEntry > 0 && r.jkseFwd !== null && r.jkseFwd > 0)
    .map((r) => {
      const stockRet = ((r.fwd as number) - (r.entry as number)) / (r.entry as number) * 100;
      const jkseRet = ((r.jkseFwd as number) - (r.jkseEntry as number)) / (r.jkseEntry as number) * 100;
      return stockRet - jkseRet;
    });
  return {
    n: valid.length,
    medianPct: Math.round(median(rets) * 100) / 100,
    positivePct: Math.round((positives / valid.length) * 10000) / 100,
    medianRelPct: rel.length ? Math.round(median(rel) * 100) / 100 : null,
    nWithJkse: rel.length,
  };
}

const CONDITION_LABELS: Record<ConditionKey, string> = {
  golden_cross: "Golden Cross (MA50 menembus naik MA200)",
  death_cross: "Death Cross (MA50 menembus turun MA200)",
  rsi_oversold: "RSI di bawah 30 (oversold)",
};

interface RawEventRow {
  stockId: number;
  ticker: string;
  eventDate: Date;
}

async function fetchCrossEvents(signal: "golden_cross" | "death_cross", since: Date): Promise<RawEventRow[]> {
  // Kejadian = baris ONSET (date = smaCrossDate), definisi kolom pipeline.
  const rows = await prisma.$queryRaw<RawEventRow[]>`
    SELECT si."stockId" AS "stockId", s.ticker, si.date AS "eventDate"
    FROM "StockIndicator" si
    JOIN "Stock" s ON s.id = si."stockId"
    WHERE si.interval = '1d'
      AND si.date = si."smaCrossDate"
      AND si."smaCrossSignal" = ${signal}
      AND si.date >= ${since}
      AND s."isActive" = true AND s."assetClass" = 'EQUITY'
    ORDER BY si.date DESC`;
  return rows;
}

async function fetchOversoldEvents(since: Date): Promise<RawEventRow[]> {
  // Kejadian = HARI PERTAMA masuk kondisi (rsi14 < 30 setelah sebelumnya >= 30/
  // null) — onset episode, konsisten semantik "kejadian" onset cross. Guard
  // rsi14 > 0: nilai 0 = indikator kosong (bug-2026-10-25-01).
  const rows = await prisma.$queryRaw<RawEventRow[]>`
    WITH flag AS (
      SELECT si."stockId", si.date, si.rsi14,
             LAG(si.rsi14) OVER (PARTITION BY si."stockId" ORDER BY si.date) AS prev_rsi
      FROM "StockIndicator" si
      JOIN "Stock" s ON s.id = si."stockId"
      WHERE si.interval = '1d'
        AND si.date >= (${since}::date - INTERVAL '14 days')
        AND s."isActive" = true AND s."assetClass" = 'EQUITY'
    )
    SELECT f."stockId", s.ticker, f.date AS "eventDate"
    FROM flag f
    JOIN "Stock" s ON s.id = f."stockId"
    WHERE f.rsi14 > 0 AND f.rsi14 < 30
      AND (f.prev_rsi IS NULL OR f.prev_rsi >= 30)
      AND f.date >= ${since}
    ORDER BY f.date DESC`;
  return rows;
}

async function fetchJkseId(): Promise<number | null> {
  const rows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM "Stock" WHERE ticker = ${JKSE_TICKER} LIMIT 1`;
  return rows[0]?.id ?? null;
}

interface PxRow { stockId: number; date: Date; close: number }

/**
 * Ambil close entry + forward + baseline IHSG utk sekumpulan kejadian pada
 * satu horizon. Jalur satu pintu: LATERAL (OFFSET n LIMIT 1) per kejadian —
 * query tunggal per horizon, bukan per-event (anti N+1, code-audit-tk-2).
 */
interface EventWithPx {
  stockId: number;
  ticker: string;
  eventDate: Date;
  entry: number | null;
  fwd: number | null;
  jkseEntry: number | null;
  jkseFwd: number | null;
}

async function fetchEventsWithPrices(
  events: RawEventRow[],
  jkseId: number | null,
  horizon: number,
): Promise<EventWithPx[]> {
  if (events.length === 0) return [];
  // VALUES list chunk 400 kejadian (bind param cap postgres 65535 aman; chunk kecil)
  const out: EventWithPx[] = [];
  const CHUNK = 400;
  for (let off = 0; off < events.length; off += CHUNK) {
    const chunk = events.slice(off, off + CHUNK);
    const dates = chunk.map((e) => e.eventDate);
    const ids = Array.from(new Set(chunk.map((e) => e.stockId)));
    const jkseJoin = jkseId !== null
      ? Prisma.sql`LEFT JOIN LATERAL (
          SELECT close FROM "StockPrice" p
          WHERE p."stockId" = ${jkseId} AND p.date <= ev."eventDate"
          ORDER BY p.date DESC LIMIT 1
        ) jent ON true
        LEFT JOIN LATERAL (
          SELECT close FROM "StockPrice" p
          WHERE p."stockId" = ${jkseId} AND p.date > ev."eventDate"
          ORDER BY p.date ASC OFFSET ${horizon - 1} LIMIT 1
        ) jfwd ON true`
      : Prisma.empty;
    const rows = await prisma.$queryRaw<EventWithPx[]>(Prisma.sql`
      WITH ev("stockId", "eventDate") AS (
        SELECT * FROM (
          VALUES ${PrismaJoin2(chunk.map((e) => Prisma.sql`(${e.stockId}::int, ${e.eventDate}::date)`))}
        ) AS t("stockId", "eventDate")
      )
      SELECT ev."stockId", s.ticker, ev."eventDate",
        ent.close::float8 AS entry,
        fwd.close::float8 AS fwd,
        jent.close::float8 AS "jkseEntry",
        jfwd.close::float8 AS "jkseFwd"
      FROM ev
      JOIN "Stock" s ON s.id = ev."stockId"
      LEFT JOIN LATERAL (
        SELECT close FROM "StockPrice" p
        WHERE p."stockId" = ev."stockId" AND p.date <= ev."eventDate"
        ORDER BY p.date DESC LIMIT 1
      ) ent ON true
      LEFT JOIN LATERAL (
        SELECT close FROM "StockPrice" p
        WHERE p."stockId" = ev."stockId" AND p.date > ev."eventDate"
        ORDER BY p.date ASC OFFSET ${horizon - 1} LIMIT 1
      ) fwd ON true
      ${jkseJoin}
      WHERE s."isActive" = true`);
    void ids; void dates;
    out.push(...rows);
  }
  return out;
}

// ── SQL helper kecil (Prisma join array utk IN + date literal utk VALUES) ──
import { Prisma } from "@/generated/prisma/client";

function PrismaJoin2(parts: Prisma.Sql[]): Prisma.Sql {
  return Prisma.join(parts, ", ");
}

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

async function computeUncached(condition: ConditionKey): Promise<ConditionBacktestResult> {
  const since = new Date(Date.now() - WINDOW_MONTHS * 30.5 * 86400 * 1000);
  const events =
    condition === "rsi_oversold"
      ? await fetchOversoldEvents(since)
      : await fetchCrossEvents(condition, since);

  const label = CONDITION_LABELS[condition];
  const base: ConditionBacktestResult = {
    condition,
    label,
    windowMonths: WINDOW_MONTHS,
    nEvents: events.length,
    nStocks: new Set(events.map((e) => e.stockId)).size,
    firstEvent: events.length ? events[events.length - 1].eventDate : null,
    lastEvent: events.length ? events[0].eventDate : null,
    stats: [],
    recentEvents: events.slice(0, 3).map((e) => ({ ticker: e.ticker, date: e.eventDate })),
    computedAt: new Date(),
    empty: events.length === 0,
  };
  if (events.length === 0) return base;

  const jkseId = await fetchJkseId();
  const guardCutoff = Date.now() - HORIZON_GUARD_DAYS * 86400 * 1000;

  for (const horizon of HORIZONS) {
    // look-ahead guard: horizon panjang hanya utk kejadian cukup tua
    const eligible = events.filter((e) => e.eventDate.getTime() <= guardCutoff || horizon === HORIZONS[0]);
    if (eligible.length === 0) {
      base.stats.push({ horizon, n: 0, medianPct: null, positivePct: null, medianRelPct: null, nWithJkse: 0 });
      continue;
    }
    try {
      const withPx = await fetchEventsWithPrices(eligible, jkseId, horizon);
      const stats = summarizeForwardStats(withPx);
      base.stats.push({ horizon, ...stats });
    } catch (e) {
      // fail-diam per horizon — halaman tetap render n kejadian tanpa stat horizon ini
      console.error(`[condition-backtest] horizon ${horizon} ${condition} gagal:`, e instanceof Error ? e.message : e);
      base.stats.push({ horizon, n: 0, medianPct: null, positivePct: null, medianRelPct: null, nWithJkse: 0 });
    }
  }
  return base;
}

/**
 * SATU PINTU publik — dipakai halaman kondisi fase-1. Cache 12 jam per kondisi
 * (stockCache infra eod-cache, key prefix eod: supaya ikut ter-invalidasi
 * pasca eod-sync). Hasil empty TIDAK di-cache — biar muncul begitu ada data.
 * Error compute dibiarkan throw (cachedEod tak men-cache error) — halaman
 * menangkap dan render section gagal diam.
 */
export async function getConditionBacktest(condition: ConditionKey): Promise<ConditionBacktestResult> {
  if (!CONDITION_KEYS.includes(condition)) {
    throw new Error(`[condition-backtest] kondisi tak dikenal: ${condition}`);
  }
  const key = eodKey("condition-backtest", condition);
  const hit = stockCache.get(key);
  if (hit !== undefined) return hit as ConditionBacktestResult;
  const result = await computeUncached(condition);
  if (!result.empty) stockCache.set(key, result, CACHE_TTL_MS);
  return result;
}

export const conditionBacktestService = {
  getConditionBacktest,
};
