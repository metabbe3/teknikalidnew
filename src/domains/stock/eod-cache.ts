import { stockCache } from "@/lib/cache";

/**
 * EOD Screener Cache (ref-2026-10-17-03)
 *
 * Screener presets, bottom-fishing radar, dan signal pages semuanya
 * membaca data EOD (StockIndicator + StockPrice sesi terakhir) yang hanya
 * berubah saat eod-sync — sekali sehari (±17:45 WIB) + backfill langka.
 * Sebelum ini: setiap request = query DB penuh (9 signal pages + radar +
 * /screener = belasan query identik per detik di jam ramai).
 *
 * TTL 5 menit dipilih (bukan 24 jam) supaya:
 *  - eod-sync sore ter-refresh tanpa perlu invalidasi manual,
 *  - tetap aman kalau backfill/backdate jalan siang (max stale 5 menit),
 *  - pola sama dengan TTL quote (5 menit) — mudah dipahami.
 *
 * Cache key WAJIB meng-encode argumen (preset/assetClass) — tidak ada
 * key statis. clearEodCaches() dipanggil pasca eod-sync untuk refresh
 * instan (best-effort; TTL tetap jaring pengaman).
 */

const EOD_TTL_MS = 5 * 60 * 1000;

const EOD_PREFIX = "eod:";

export function eodKey(...parts: (string | undefined | null)[]): string {
  return EOD_PREFIX + parts.filter((p) => p != null && p !== "").join(":");
}

export function cachedEod<T>(key: string, compute: () => Promise<T>): Promise<T> {
  const hit = stockCache.get(key);
  if (hit !== undefined) return Promise.resolve(hit as T);

  return compute().then((result) => {
    // jangan cache hasil error/kosong-gagal — biarkan retry berikutnya query lagi
    if (result === null || result === undefined) return result;
    stockCache.set(key, result, EOD_TTL_MS);
    return result;
  });
}

/** Dipanggil pasca eod-sync / backfill supaya halaman signal & radar
 *  langsung segar tanpa menunggu TTL 5 menit. */
export function clearEodCaches() {
  stockCache.invalidate(EOD_PREFIX);
}
