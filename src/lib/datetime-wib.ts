// Asia/Jakarta (WIB) = UTC+7, no DST — pure arithmetic, no timezone lib needed.
// Used for admin analytics calendar-day ranges (00:00–23:59 WIB) and bucket keys,
// instead of rolling 24h windows / UTC date slices.

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/** 00:00:00 WIB for the given instant, expressed as a UTC Date. */
export function wibDayStart(d: Date = new Date()): Date {
  const w = new Date(d.getTime() + WIB_OFFSET_MS);
  return new Date(
    Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate()) - WIB_OFFSET_MS,
  );
}

/** 00:00:00 WIB of the next calendar day — use as the half-open range upper bound. */
export function wibNextDayStart(d: Date = new Date()): Date {
  return new Date(wibDayStart(d).getTime() + 24 * 60 * 60 * 1000);
}

/** "YYYY-MM-DD" of the WIB calendar day containing the instant. */
export function wibDayKey(d: Date): string {
  return new Date(d.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

/** Hour of day (0–23) in WIB. */
export function wibHour(d: Date): number {
  return new Date(d.getTime() + WIB_OFFSET_MS).getUTCHours();
}
