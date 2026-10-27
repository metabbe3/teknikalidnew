/**
 * Daily award core (Point & Badge v1 — PRD prd-2026-10-24-01).
 *
 * Satu sumber kebenaran untuk key tanggal harian WIB + satuan poin + streak.
 * Diekstrak dari reputation.service.ts pasca-bug 24-26 Okt 2026:
 *   - repository hardcode `increment: 1` padahal spec/UI bilang +5;
 *   - cacheKey pakai tanggal UTC (container TZ=UTC) -> window 00:00-07:00 WIB
 *     bisa dobel-award per hari WIB.
 * Pure & testable (tanpa prisma) — dicek scripts/selftest-reputation-daily.ts.
 */

/** Satuan poin harian sesuai PRD (jangan hardcode di repo/service). */
export const DAILY_AWARD_POINTS = 5;

/** Offset WIB (UTC+7) dalam menit — Indonesia tidak punya DST. */
const WIB_OFFSET_MINUTES = 7 * 60;

/**
 * Tanggal kalender WIB untuk suatu instan waktu, "YYYY-MM-DD".
 * new Date().toISOString().slice(0,10) adalah tanggal UTC — BUKAN tanggal WIB.
 */
export function wibDateKey(instant: Date): string {
  const t = new Date(instant.getTime() + WIB_OFFSET_MINUTES * 60_000);
  return t.toISOString().slice(0, 10);
}

/** Key idempotensi harian: `daily-rep:<userId>:<tanggal-WIB>`. */
export function dailyCacheKey(userId: string, instant: Date): string {
  return `daily-rep:${userId}:${wibDateKey(instant)}`;
}

/**
 * Expiry baris idempotensi: akhir hari WIB + 24h buffer (≥48h dari sekarang,
 * senada jendela 48h lama — aman utk pembersih cache basi).
 */
export function dailyWindowExpiresAt(instant: Date): Date {
  const wib = new Date(instant.getTime() + WIB_OFFSET_MINUTES * 60_000);
  const endOfWibDayUtc = Date.UTC(
    wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate() + 1, // besok 00:00 WIB ...
    0 - WIB_OFFSET_MINUTES / 60, 0, 0, 0                            // ... = hari ini 17:00 UTC
  );
  return new Date(endOfWibDayUtc + 48 * 3600 * 1000); // +48h buffer (>= 48h dari award, superset jendela lama)
}

/** Selisih hari kalender WIB antar dua instan (a - b), robust lintas bulan/tahun. */
function wibDayStartUtc(instant: Date): number {
  const wib = new Date(instant.getTime() + WIB_OFFSET_MINUTES * 60_000);
  return Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate());
}

function wibDayDiff(a: Date, b: Date): number {
  return Math.round((wibDayStartUtc(a) - wibDayStartUtc(b)) / 86_400_000);
}

/**
 * Streak berikutnya berbasis hari WIB:
 * lastClaim null -> 1; kemarin WIB -> streak+1; lainnya -> reset 1.
 */
export function nextStreakFor(lastClaim: Date | null, currentStreak: number, now: Date): number {
  if (!lastClaim) return 1;
  const diff = wibDayDiff(now, lastClaim);
  if (diff === 1) return currentStreak + 1;
  return 1;
}
