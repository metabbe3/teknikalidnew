/**
 * qa-2026-11-13-02 — pure helper label sesi strip OHLCV.
 *
 * Masalah: angka O/H/L/C/Vol di-hydrate live oleh LivePrice (data-live-*),
 * tapi label "sesi <tanggal>" tetap string SSR = tanggal EOD terakhir. Saat
 * jam bursa REGULAR, volume sesi HARI INI tampil berlabel kemarin.
 *
 * Aturan label (jujur, bukan neko-neko):
 *  - jam bursa WIB DAN quote live (bukan CLOSED) -> label sesi hari ini
 *  - selain itu -> label EOD SSR apa adanya (angka yang tampil memang EOD)
 *
 * Pure (tanpa DOM/React) supaya bisa diuji node:test — dipakai oleh
 * live-price.tsx (patcher DOM) dan konsisten dengan isMarketHoursWib di sana.
 */

/** Tanggal WIB "d MMM" (id-ID, singkat) — agnostik timezone mesin. */
export function wibTodayLabel(now: Date = new Date()): string {
  // Geser UTC+7 lalu format zona UTC: bebas dari timezone lokal mesin
  // (berbeda dari trik getTimezoneOffset di wibNow() live-price.tsx yang
  // mengandalkan getter LOKAL — di sini kita format via UTC).
  const WIB_UTC_MS = 7 * 3_600_000;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(now.getTime() + WIB_UTC_MS));
}

export function resolveSessionLabel(input: {
  /** Label sesi hasil SSR (tanggal EOD terakhir), mis. "12 Nov". */
  eodLabel?: string;
  /** Jam bursa WIB (Sen–Jum 09:00–16:15) — lihat isMarketHoursWib live-price.tsx. */
  isMarketHours: boolean;
  /** Quote provider hidup (marketState bukan CLOSED/CLOSED_WIB). */
  quoteLive: boolean;
  /** Override utk test; default = wibTodayLabel(). */
  todayLabel?: string;
}): string | null {
  const { eodLabel, isMarketHours, quoteLive } = input;
  const today = input.todayLabel ?? wibTodayLabel();
  if (isMarketHours && quoteLive) {
    return today;
  }
  // Di luar jam live: label EOD SSR = kebenaran angka yang sedang tampil.
  return eodLabel ?? null;
}
