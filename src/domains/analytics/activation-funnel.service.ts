import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { wibDayKey } from "@/lib/datetime-wib";

/**
 * 6 event aktivasi resmi untuk Funnel Aktivasi (Wave-10).
 */
export const ACTIVATION_FUNNEL_EVENTS = [
  "guest_chat_open",
  "guest_first_question",
  "guest_quota_wall",
  "register_click_from_chat",
  "analysis_block_cta",
  "hero_ai_cta",
] as const;

export type ActivationFunnelEvent = (typeof ACTIVATION_FUNNEL_EVENTS)[number];

const ACTIVATION_FUNNEL_SET = new Set<string>(ACTIVATION_FUNNEL_EVENTS);

export function isActivationFunnelEvent(event: unknown): event is ActivationFunnelEvent {
  return typeof event === "string" && ACTIVATION_FUNNEL_SET.has(event);
}

export interface ActivationFunnelDayRow {
  date: string; // YYYY-MM-DD (WIB)
  guest_chat_open: number;
  guest_first_question: number;
  guest_quota_wall: number;
  register_click_from_chat: number;
  analysis_block_cta: number;
  hero_ai_cta: number;
}

export interface ActivationFunnelTotals {
  guest_chat_open: number;
  guest_first_question: number;
  guest_quota_wall: number;
  register_click_from_chat: number;
  analysis_block_cta: number;
  hero_ai_cta: number;
}

export interface ActivationFunnelResult {
  days: ActivationFunnelDayRow[];
  totals: ActivationFunnelTotals;
}

export interface RawActivationDailyRow {
  date: string | Date;
  event: string;
  count: number | bigint | string;
}

export interface RawActivationTotalRow {
  event: string;
  count: number | bigint | string;
}

/**
 * Helper menghitung persentase konversi (0 - 100) atau null bila pembagi 0 / tidak valid.
 */
export function calcConversionRate(numerator: number, denominator: number): number | null {
  if (!denominator || denominator <= 0 || !Number.isFinite(denominator)) {
    return null;
  }
  if (!numerator || numerator <= 0) {
    return 0;
  }
  return (numerator / denominator) * 100;
}

/**
 * Normalisasi tanggal ke format string YYYY-MM-DD.
 */
function normalizeDateString(d: string | Date): string {
  if (d instanceof Date) {
    return wibDayKey(d);
  }
  const str = String(d).trim();
  if (str.includes("T")) {
    return str.split("T")[0]!;
  }
  if (str.includes(" ")) {
    return str.split(" ")[0]!;
  }
  return str.slice(0, 10);
}

/**
 * Inisialisasi baris kosong untuk tanggal tertentu dengan semua 6 event bernilai 0.
 */
export function createEmptyDayRow(dateStr: string): ActivationFunnelDayRow {
  return {
    date: dateStr,
    guest_chat_open: 0,
    guest_first_question: 0,
    guest_quota_wall: 0,
    register_click_from_chat: 0,
    analysis_block_cta: 0,
    hero_ai_cta: 0,
  };
}

/**
 * Inisialisasi struktur totals dengan semua 6 event bernilai 0.
 */
export function createEmptyTotals(): ActivationFunnelTotals {
  return {
    guest_chat_open: 0,
    guest_first_question: 0,
    guest_quota_wall: 0,
    register_click_from_chat: 0,
    analysis_block_cta: 0,
    hero_ai_cta: 0,
  };
}

export interface TransformOptions {
  dates?: string[];
  order?: "asc" | "desc";
}

/**
 * Pure function: Transformasi baris agregat mentah (daily rows + total rows)
 * menjadi struktur terstandarisasi `{ days, totals }`.
 *
 * Menerima baris hasil query dari DB atau dummy rows untuk unit test.
 */
export function transformActivationRows(
  dailyRows: RawActivationDailyRow[],
  totalRows?: RawActivationTotalRow[],
  options?: TransformOptions,
): ActivationFunnelResult {
  const order = options?.order ?? "desc";

  // 1. Tentukan daftar tanggal yang akan ditampilkan
  let targetDates: string[];
  if (options?.dates && options.dates.length > 0) {
    targetDates = [...options.dates];
  } else {
    const rawDates = new Set<string>();
    for (const r of dailyRows) {
      if (r.date) {
        rawDates.add(normalizeDateString(r.date));
      }
    }
    targetDates = Array.from(rawDates);
    targetDates.sort((a, b) => (order === "asc" ? a.localeCompare(b) : b.localeCompare(a)));
  }

  // 2. Siapkan peta baris per tanggal
  const daysMap = new Map<string, ActivationFunnelDayRow>();
  for (const dt of targetDates) {
    daysMap.set(dt, createEmptyDayRow(dt));
  }

  // 3. Masukkan data harian
  for (const r of dailyRows) {
    const dt = normalizeDateString(r.date);
    const dayRow = daysMap.get(dt);
    if (!dayRow) continue;

    if (isActivationFunnelEvent(r.event)) {
      const val = Number(r.count) || 0;
      dayRow[r.event] += val;
    }
  }

  // 4. Hitung atau petakan totals
  const totals = createEmptyTotals();

  if (totalRows && totalRows.length > 0) {
    for (const tr of totalRows) {
      if (isActivationFunnelEvent(tr.event)) {
        totals[tr.event] += Number(tr.count) || 0;
      }
    }
  } else {
    // Jika totalRows tidak diberikan, hitung dari penjumlahan seluruh baris harian
    for (const dayRow of daysMap.values()) {
      for (const ev of ACTIVATION_FUNNEL_EVENTS) {
        totals[ev] += dayRow[ev];
      }
    }
  }

  return {
    days: Array.from(daysMap.values()),
    totals,
  };
}

/**
 * Helper menghasilkan daftar N tanggal terakhir dalam WIB (format YYYY-MM-DD, descending).
 */
export function getLastNWibDates(daysCount = 7, now = new Date()): string[] {
  const dates: string[] = [];
  for (let i = 0; i < daysCount; i++) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dates.push(wibDayKey(d));
  }
  return dates;
}

/**
 * Query DB: Ambil agregat ActivationEvent 7 hari terakhir (WIB).
 * 1 query untuk groupBy event+date dan 1 query untuk totals.
 * Service tunggal yang dipakai bersama oleh REST API route dan Server Component.
 */
export async function getActivationFunnelData(
  daysCount = 7,
  now = new Date(),
): Promise<ActivationFunnelResult> {
  const dates = getLastNWibDates(daysCount, now);

  // Batas bawah waktu 7 hari ke belakang (WIB)
  const since = new Date(now.getTime() - daysCount * 24 * 60 * 60 * 1000);

  const eventSqlList = Prisma.join(
    ACTIVATION_FUNNEL_EVENTS.map((e) => Prisma.sql`${e}`),
  );

  // 1 query groupBy event+date + 1 query totals
  const [dailyRows, totalRows] = await Promise.all([
    prisma.$queryRaw<Array<{ date: string; event: string; count: number | bigint }>>`
      SELECT
        to_char(("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::date, 'YYYY-MM-DD') AS date,
        event,
        COUNT(*)::int AS count
      FROM "ActivationEvent"
      WHERE "createdAt" >= ${since}
        AND event IN (${eventSqlList})
      GROUP BY 1, 2
      ORDER BY 1 DESC
    `,
    prisma.$queryRaw<Array<{ event: string; count: number | bigint }>>`
      SELECT
        event,
        COUNT(*)::int AS count
      FROM "ActivationEvent"
      WHERE "createdAt" >= ${since}
        AND event IN (${eventSqlList})
      GROUP BY 1
    `,
  ]);

  return transformActivationRows(dailyRows, totalRows, { dates, order: "desc" });
}
