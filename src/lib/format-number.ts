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

/**
 * Format mata uang Rupiah (IDR) tanpa desimal dengan pemisah ribuan titik.
 * Mengembalikan "-" jika n bernilai null.
 */
export function formatRupiah(n: number | null): string {
  if (n === null) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

