/**
 * Screener index-leak filter — bug-2026-11-04-01 (^JKSE indeks bocor ke hasil
 * preset equity screener → link detail /stocks/^JKSE 404 dead-end).
 *
 * ^JKSE (id 959) terklasifikasi assetClass='EQUITY' + isActive=true di tabel
 * Stock, jadi filter stock:{isActive,assetClass} di buildIndicatorWhere TIDAK
 * mengeluarkannya. Predikat pure ini dipakai sebagai safety-net post-filter di
 * choke-point service (screenerQuery preset path + customScreenerQuery),
 * menutup jalur data-salah-klasifikasi tanpa menunggu re-klasifikasi DB.
 *
 * Rule: ticker indeks Yahoo ditandai prefix '^' (^JKSE, ^IHSG, ^IXIC dst).
 * Ticker crypto-IDX eksperimental (CRYPTO assetClass) tidak tersentuh —
 * filter hanya berlaku pada hasil equity screener.
 */

/** True bila ticker adalah ticker indeks (prefix '^' ala Yahoo). */
export function isIndexTicker(ticker: string | null | undefined): boolean {
  return typeof ticker === "string" && ticker.startsWith("^");
}

/** True bila baris layak masuk hasil equity screener (bukan indeks). */
export function isTradableEquityTicker(ticker: string | null | undefined): boolean {
  return !isIndexTicker(ticker);
}

/** Post-filter baris hasil screener: buang baris ber-ticker indeks. */
// Unconstrained generic supaya inferensi tetap utuh saat caller mem-pass
// union hasil preset (teknikal/fundamental shape berbeda); akses ticker
// di-cast internal — baris tanpa kolom ticker dianggap bukan indeks.
export function excludeIndexRows<T>(rows: T[]): T[] {
  return (rows as { ticker: string | null }[]).filter((r) => !isIndexTicker(r.ticker)) as T[];
}
