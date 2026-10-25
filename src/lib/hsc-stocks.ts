/**
 * HSC (High Shareholding Concentration) — saham kepemilikan terkonsentrasi tinggi
 * menurut penetapan BEI+KSEI (SKB Kep-00047/BEI/03-2026 & KEP-0024/DIR/KSEI/0426).
 *
 * Implikasi utama: saham HSC DIKELUARKAN dari perhitungan IHSG
 * efektif 2 November 2026 (Pengumuman BEI 19-21 Okt 2026) — bukan delisting,
 * tetap dapat diperdagangkan, tapi likuiditas efektif rendah & risiko
 * pergerakan harga tidak wajar lebih tinggi.
 *
 * Sumber daftar: pengumuman resmi BEI (idx.co.id) per 13 Okt 2026 = 80 emiten;
 * total 87 per 21 Okt 2026 (daftar lengkap versi final menyusul di-publish).
 * Evaluasi berkala: Jan/Apr/Jul/Okt + evaluasi insidental — update list ini
 * setiap ada pengumuman baru.
 */

// Daftar per 13 Okt 2026 (basis Katadata/IDX Channel/Radar Kudus — 80 ticker)
export const HSC_TICKERS: ReadonlySet<string> = new Set([
  "SSMS", "SMMT", "BMAS", "TBIG", "CITA", "PSAB", "BALI", "MAYA", "CLAY",
  "ADES", "TMAS", "BBMD", "INPP", "SAME", "DMND", "MTEL", "EPMT", "SHIP",
  "DUTI", "BSWD", "INDO", "BIKE", "MSJA", "NICK", "SAFE", "BDKR", "MDIA",
  "BAJA", "BKDP", "ALKA", "AGAR", "BNII", "MCOL", "LIFE", "POLU", "ELPI",
  "KING", "ALII", "FITT", "YUPI", "KONI", "MKPI", "CMNT", "SMAR", "CMNP",
  "PRAY", "MPRO", "BELI", "MEGA", "GEMS", "MLPT", "STTP", "BTPN", "BBSI",
  "SILO", "FAPA", "RISE", "SOHO", "BBHI", "PGUN", "BINA", "BNLI", "SRAJ",
  "MORA", "DNET", "BYAN", "DCII", "HATM", "DGWG", "SATU", "MGRO", "TCPI",
  "WBSA", "SOTS", "ROCK", "RLCO", "IFSH", "DSSA", "BREN", "AGII",
]);

/** Tanggal efektif saham HSC dikeluarkan dari perhitungan IHSG. */
export const HSC_IHSG_EXCLUSION_DATE = "2026-11-02";

/** Tanggal pembaruan daftar terakhir (untuk footer/keterbukaan sumber). */
export const HSC_LIST_AS_OF = "2026-10-13";

export function isHscTicker(ticker: string): boolean {
  return HSC_TICKERS.has(ticker.replace(/\.JK$/i, "").toUpperCase());
}
