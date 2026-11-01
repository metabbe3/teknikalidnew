/**
 * Format angka desimal menggunakan standar id-ID (koma sebagai pemisah desimal).
 * Pure function tanpa side effect, aman terhadap null/undefined/NaN/Infinity.
 */
export function formatDecimalId(
  value: number | null | undefined,
  digits: number = 2
): string {
  if (value == null || !Number.isFinite(value)) {
    return "";
  }
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}
