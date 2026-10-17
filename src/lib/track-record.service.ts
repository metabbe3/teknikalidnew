/**
 * Track-record sinyal — akurasi cross SMA50/200 dihitung otomatis dari DB sendiri.
 * Layer 2: fetch Prisma ($queryRaw). Math murni ada di track-record-math.ts.
 *
 * PENTING (RCA 17 Okt): "smaCrossSignal" adalah STATE yang bertahan rata-rata ~7,5 hari
 * setelah cross — memakainya langsung = overcount ~85× (34.615 baris vs 405 event).
 * Event sebenarnya = baris dengan si.date = si."smaCrossDate" (hari cross terjadi).
 *
 * Window N = offset baris harga per emiten (hari bursa, bukan hari kalender):
 * LEAD(close, N) over (PARTITION BY stockId ORDER BY date).
 */
import { prisma } from "@/lib/prisma";
import {
  computeWindowStats,
  rankBestWindow,
  type SignalKind,
  type SignalRow,
  type WindowStat,
} from "@/lib/track-record-math";

export type { SignalKind, SignalRow, WindowStat };
export { computeWindowStats, rankBestWindow } from "@/lib/track-record-math";

interface RawSignalRow {
  stockId: number;
  date: string; // date::text → YYYY-MM-DD
  signal: string;
  close0: unknown; // Decimal dari $queryRaw
  close5: unknown;
  close20: unknown;
}

const toNum = (v: unknown): number | null => (v === null ? null : Number(v));

export interface TrackRecordData {
  rows5: SignalRow[];
  rows20: SignalRow[];
  stats5: WindowStat[]; // agregat "all" per (signal, window)
  stats20: WindowStat[];
  monthly5: WindowStat[]; // histori per bulan
  monthly20: WindowStat[];
  best: WindowStat | null; // superlatif dari ranking, bukan narasi manual
  snapshotDate: string | null; // MAX(si.date) interval 1d — stale-guard
  generatedAt: string;
}

/**
 * Event sinyal 110 hari terakhir; harga 140 hari (LEAD N butuh baris ke depan).
 * Superlatif lahir dari rankBestWindow(stats) — dilarang klaim manual di narasi.
 */
export async function getTrackRecordData(): Promise<TrackRecordData> {
  const raw = await prisma.$queryRaw<RawSignalRow[]>`
    WITH px AS (
      SELECT sp."stockId", sp.date, sp.close,
        LEAD(sp.close, 5)  OVER (PARTITION BY sp."stockId" ORDER BY sp.date) AS close5,
        LEAD(sp.close, 20) OVER (PARTITION BY sp."stockId" ORDER BY sp.date) AS close20
      FROM "StockPrice" sp
      JOIN "Stock" st ON st.id = sp."stockId"
      WHERE st."assetClass" = 'EQUITY'
        AND st."isActive" = true
        AND sp.date >= CURRENT_DATE - INTERVAL '140 days'
    )
    SELECT px."stockId" AS "stockId", px.date::text AS date,
           si."smaCrossSignal" AS signal,
           px.close  AS "close0",
           px.close5 AS "close5",
           px.close20 AS "close20"
    FROM px
    JOIN "StockIndicator" si
      ON si."stockId" = px."stockId" AND si.date = px.date
    WHERE si.interval = '1d'
      AND si."smaCrossSignal" IN ('golden_cross', 'death_cross')
      AND si.date = si."smaCrossDate"          -- event hari-cross, bukan state harian
      AND si.date >= CURRENT_DATE - INTERVAL '110 days'
  `;

  const snap = await prisma.$queryRaw<{ d: string | null }[]>`
    SELECT MAX(date)::text AS d FROM "StockIndicator" WHERE interval = '1d'
  `;

  const monthOf = (date: string) => date.slice(0, 7);
  const toSignal = (s: string): SignalKind => (s === "death_cross" ? "death_cross" : "golden_cross");
  const base = (r: RawSignalRow): Pick<SignalRow, "stockId" | "date" | "signal" | "close0"> => ({
    stockId: r.stockId,
    date: r.date,
    signal: toSignal(r.signal),
    close0: toNum(r.close0),
  });

  const rows5: SignalRow[] = raw.map((r) => ({ ...base(r), closeN: toNum(r.close5) }));
  const rows20: SignalRow[] = raw.map((r) => ({ ...base(r), closeN: toNum(r.close20) }));

  const stats5 = computeWindowStats(rows5, 5, () => "all");
  const stats20 = computeWindowStats(rows20, 20, () => "all");
  const monthly5 = computeWindowStats(rows5, 5, monthOf);
  const monthly20 = computeWindowStats(rows20, 20, monthOf);

  return {
    rows5,
    rows20,
    stats5,
    stats20,
    monthly5,
    monthly20,
    best: rankBestWindow([...stats5, ...stats20]),
    snapshotDate: snap[0]?.d ?? null,
    generatedAt: new Date().toISOString(),
  };
}
