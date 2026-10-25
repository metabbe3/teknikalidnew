/**
 * Runtime timeout guard untuk handler cron berat (sec-2026-10-22-01, IT-SEC 22 Okt).
 *
 * Promise.race dipilih daripada AbortController karena query prisma/native di
 * handler cron ini tidak semuanya menerima AbortSignal. Race menjamin route
 * SELALU membalas dalam <ms; pekerjaan yang telat tetap berjalan sampai selesai
 * di background dan hasilnya diabaikan — aman karena job cron ini idempotent
 * (resolve-predictions re-run, sync-eod re-sync upsert, generate-articles
 * dedupe via hasRunningJob) dan dijadwalkan ulang otomatis.
 *
 * Dipakai bersama `export const maxDuration = 300` (pola sync-fundamental).
 */
export class TimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`[timeout] ${label} exceeded ${ms}ms`);
    this.name = "TimeoutError";
  }
}

export function withTimeout<T>(
  fn: () => Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(label, ms)), ms);
  });
  return Promise.race([fn(), timeout]).finally(() => clearTimeout(timer)) as Promise<T>;
}
