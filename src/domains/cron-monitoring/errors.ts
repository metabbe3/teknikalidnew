import { DomainError } from "@/lib/domain-error";

/**
 * Status kanonik CronLog — SATU definisi dipakai service + repository
 * (fix-2026-10-26-08: repo pakai `string` lepas vs service union).
 */
export type CronJobStatus = "success" | "failed";

/**
 * Cron handler melebihi batas waktu (withTimeout). Pekerjaan yang telat tetap
 * berjalan sampai selesai di background dan hasilnya diabaikan — aman karena
 * job cron idempotent. 504 gateway-timeout semantics (pola sec-2026-10-22-01).
 */
export class CronTimeoutError extends DomainError {
  constructor(label: string, ms: number) {
    super(`[timeout] ${label} exceeded ${ms}ms`, 504);
  }
}
