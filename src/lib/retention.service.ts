/**
 * Retention service — satu sumber kebenaran retensi (PRD idea-2026-10-01-1).
 *
 * Kontrak WIB: server berjalan UTC (docker, tanpa TZ), jadi SEMUA konversi
 * zona waktu memakai aritmetika +7h murni (paritas dengan lib/datetime-wib
 * dan query SQL "+ interval '7 hours'" — jebakan handoff: JANGAN AT TIME ZONE).
 *
 * Read-only terhadap DB; cache in-memory 5 menit (TtlCache).
 */
import { prisma } from "@/lib/prisma";
import { TtlCache } from "@/lib/cache";

export const RETURNING_GUARD_PCT = 12;
export const RETENTION_CACHE_TTL_MS = 5 * 60 * 1000;

/** (instant + 7h) sebagai timestamp UTC — dipakai untuk arithmetic WIB. */
export function wibShifted(d: Date): Date {
  return new Date(d.getTime() + 7 * 60 * 60 * 1000);
}

/** Senin 00:00 WIB yang memuat instant (UTC Date). */
export function wibWeekStart(d: Date = new Date()): Date {
  const w = wibShifted(d);
  const wibDowMon0 = (w.getUTCDay() + 6) % 7; // Senin=0 .. Minggu=6
  const monday = new Date(
    Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate() - wibDowMon0),
  );
  return new Date(monday.getTime() - 7 * 60 * 60 * 1000);
}

export interface RetentionWeekPoint {
  weekStart: string; // YYYY-MM-DD (Senin, WIB)
  returningIps: number;
  totalIps: number;
  returningPct: number | null; // null saat totalIps = 0
}

export interface CohortWeek {
  weekStart: string;
  nRegister: number;
  d1N: number;
  d1Pct: number | null;
  d7N: number;
  d7Pct: number | null;
  /** false kalau jendela D7 cohort belum selesai (minggu berjalan). */
  d7Mature: boolean;
}

export interface DeadLetterMetric {
  totalNotif: number;
  deadLetterNotif: number;
  deadLetterPct: number | null;
  readNotif: number;
}

export interface RetentionOverview {
  generatedAt: string;
  weekStart: string;
  weekEnd: string;
  returningIps: number;
  totalIps: number;
  returningPct: number | null;
  guardPct: number;
  guardOk: boolean;
  guardDeltaPp: number | null; // selisih pp vs guard, null saat pct null
  sparkline: RetentionWeekPoint[];
  cohorts: CohortWeek[];
  deadLetter: DeadLetterMetric;
}

interface WeekRow { week_start: Date; ret_n: bigint; total: bigint }
interface CohortRow {
  week_start: Date; n_register: bigint; d1_n: bigint; d7_n: bigint;
}
interface DeadLetterRow {
  total_notif: bigint; dead_letter: bigint; read_n: bigint;
}

const cache = new TtlCache<RetentionOverview>(4);

/** Persentase 1 desimal; null saat denominator 0. */
export function pct2(n: number, d: number): number | null {
  if (d === 0) return null;
  return Math.round((100 * n) / d * 10) / 10;
}

function isoDate(d: Date): string {
  return wibShifted(d).toISOString().slice(0, 10);
}

export async function getRetentionOverview(
  now: Date = new Date(),
): Promise<RetentionOverview> {
  const key = "retention-overview";
  const cached = cache.get(key);
  if (cached) return cached;

  const thisWeek = wibWeekStart(now);
  const firstSparkWeek = new Date(thisWeek.getTime() - 7 * 7 * 24 * 60 * 60 * 1000);
  const cohortFrom = new Date(thisWeek.getTime() - 3 * 7 * 24 * 60 * 60 * 1000);

  const [weekRows, cohortRows, deadRows] = await Promise.all([
    prisma.$queryRaw<WeekRow[]>`
      SELECT wk AS week_start,
             count(*) FILTER (WHERE days >= 2) AS ret_n,
             count(*) AS total
      FROM generate_series(
        ${firstSparkWeek}::timestamptz,
        ${thisWeek}::timestamptz,
        interval '1 week') wk
      CROSS JOIN LATERAL (
        SELECT ip, count(DISTINCT (pv."createdAt" + interval '7 hours')::date) AS days
        FROM "PageView" pv
        WHERE pv."isBot" = false AND pv.ip IS NOT NULL
          AND pv."createdAt" >= wk AND pv."createdAt" < wk + interval '1 week'
        GROUP BY ip) s
      GROUP BY wk ORDER BY wk`,
    prisma.$queryRaw<CohortRow[]>`
      WITH weeks AS (
        SELECT gs AS week_start FROM generate_series(
          ${cohortFrom}::timestamptz,
          ${thisWeek}::timestamptz,
          interval '1 week') gs)
      SELECT w.week_start,
             count(DISTINCT u.id) AS n_register,
             count(DISTINCT pv1.uid) AS d1_n,
             count(DISTINCT pv7.uid) AS d7_n
      FROM weeks w
      LEFT JOIN "User" u
        ON (u."createdAt" + interval '7 hours') >= w.week_start
       AND (u."createdAt" + interval '7 hours') <  w.week_start + interval '1 week'
      LEFT JOIN LATERAL (
        SELECT DISTINCT pv."userId" AS uid FROM "PageView" pv
        WHERE pv."userId" = u.id
          AND (pv."createdAt" + interval '7 hours')::date >  (u."createdAt" + interval '7 hours')::date
          AND (pv."createdAt" + interval '7 hours')::date <= (u."createdAt" + interval '7 hours')::date + 1
      ) pv1 ON true
      LEFT JOIN LATERAL (
        SELECT DISTINCT pv."userId" AS uid FROM "PageView" pv
        WHERE pv."userId" = u.id
          AND (pv."createdAt" + interval '7 hours')::date >  (u."createdAt" + interval '7 hours')::date
          AND (pv."createdAt" + interval '7 hours')::date <= (u."createdAt" + interval '7 hours')::date + 7
      ) pv7 ON true
      GROUP BY w.week_start ORDER BY w.week_start`,
    prisma.$queryRaw<DeadLetterRow[]>`
      SELECT count(*) AS total_notif,
             count(*) FILTER (WHERE COALESCE(last_pv, to_timestamp(0)) < n."createdAt" - interval '30 days') AS dead_letter,
             count(*) FILTER (WHERE n.read) AS read_n
      FROM "Notification" n
      LEFT JOIN LATERAL (
        SELECT MAX(pv."createdAt") AS last_pv FROM "PageView" pv
        WHERE pv."userId" = n."recipientId" AND pv."createdAt" < n."createdAt"
      ) l ON true
      WHERE n.type IN ('RE_ENGAGE','SCREENER_MATCH')`,
  ]);

  const sparkline: RetentionWeekPoint[] = weekRows.map((r) => {
    const total = Number(r.total);
    const ret = Number(r.ret_n);
    return {
      weekStart: isoDate(r.week_start),
      returningIps: ret,
      totalIps: total,
      returningPct: pct2(ret, total),
    };
  });

  const current = sparkline.find((p) => p.weekStart === isoDate(thisWeek));
  const returningPct = current?.returningPct ?? null;
  const returningIps = current?.returningIps ?? 0;
  const totalIps = current?.totalIps ?? 0;

  const cohorts: CohortWeek[] = cohortRows.map((r) => {
    const n = Number(r.n_register);
    const d1 = Number(r.d1_n);
    const d7 = Number(r.d7_n);
    const ws = isoDate(r.week_start);
    return {
      weekStart: ws,
      nRegister: n,
      d1N: d1,
      d1Pct: pct2(d1, n),
      d7N: d7,
      d7Pct: pct2(d7, n),
      d7Mature: new Date(r.week_start).getTime() + 7 * 24 * 60 * 60 * 1000 <= now.getTime(),
    };
  });

  const dl = deadRows[0];
  const deadLetter: DeadLetterMetric = {
    totalNotif: Number(dl?.total_notif ?? 0),
    deadLetterNotif: Number(dl?.dead_letter ?? 0),
    deadLetterPct: pct2(Number(dl?.dead_letter ?? 0), Number(dl?.total_notif ?? 0)),
    readNotif: Number(dl?.read_n ?? 0),
  };

  const overview: RetentionOverview = {
    generatedAt: now.toISOString(),
    weekStart: isoDate(thisWeek),
    weekEnd: isoDate(new Date(thisWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1)),
    returningIps,
    totalIps,
    returningPct,
    guardPct: RETURNING_GUARD_PCT,
    guardOk: returningPct !== null && returningPct >= RETURNING_GUARD_PCT,
    guardDeltaPp:
      returningPct === null
        ? null
        : Math.round((returningPct - RETURNING_GUARD_PCT) * 10) / 10,
    sparkline,
    cohorts,
    deadLetter,
  };

  cache.set(key, overview, RETENTION_CACHE_TTL_MS);
  return overview;
}
