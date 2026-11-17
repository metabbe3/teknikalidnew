/**
 * Merge relatedArticles utk halaman ticker — bridge konten /stocks → /berita
 * (prd-2026-11-17-01, PRD idea-2026-11-12-2).
 *
 * AKAR (SQL 17 Nov): query lama meng-exclude DAILY_SNAPSHOT sehingga ticker
 * panas jalur sosmed (BBCA 8 exit, CUAN 3) tampil TANPA jembatan konten
 * padahal DS tersedia 40 ticker/7d. Ticker non-DS non-NEWS → list kosong.
 *
 * Merge: berita biasa (non-DS non-SA) + maks 2 DAILY_SNAPSHOT termuda,
 * hasil sort publishedAt desc, cap total take. STOCK_ANALYSIS tetap
 * di-exclude (auth-gated, embed nilai indikator).
 */

export const MAX_DAILY_SNAPSHOT_SLOTS = 2;

export interface RelatedArticleLite {
  id: string;
  slug: string;
  title: string;
  publishedAt: Date;
  articleType: string;
}

/**
 * Gabung berita biasa + slot DS (maks MAX_DAILY_SNAPSHOT_SLOTS termuda),
 * re-sort recency, potong ke totalTake. Fungsi pure — unit-testable tanpa DB.
 */
export function mergeRelatedArticles(
  plain: RelatedArticleLite[],
  dailySnapshots: RelatedArticleLite[],
  totalTake = 6,
): RelatedArticleLite[] {
  const ds = [...dailySnapshots]
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, MAX_DAILY_SNAPSHOT_SLOTS);
  return [...plain, ...ds]
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, totalTake);
}
