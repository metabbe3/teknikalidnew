/**
 * market-engine — SATU PINTU rumus pasar (ref-2026-10-17-01, bo-2026-11-02-01).
 *
 * Modul PURE (0 import) berisi rumus canonical change% / breadth / sektor /
 * movers / mean. Di-extract dari domains/stock/market-snapshot.service.ts agar
 * src/lib/* (serialize, mailer) bisa konsumsi tanpa circular import;
 * market-snapshot.service me-re-export objek ini — semua konsumen lama tak
 * berubah (satu objek, satu definisi).
 *
 * DILARANG menulis ((close - prev) / prev) * 100 di luar modul ini.
 * Guard prev <= 0: harga penutupan negatif = data sampah, bukan sinyal.
 * Guard kelengkapan (null) tetap tanggung jawab call-site — engine menerima
 * number dan mengembalikan null hanya untuk input non-finite/prev <= 0.
 */

export interface EngineChangeRow {
  ticker: string;
  changePercent: number;
}

export interface EngineSectorRow {
  sector: string;
  avgChange: number;
  count: number;
}

export const marketEngine = {
  /** (close - prev) / prev sebagai fraksi (0.05 = +5%). null jika prev invalid. */
  changeFraction(close: number, prev: number): number | null {
    if (!Number.isFinite(close) || !Number.isFinite(prev) || prev <= 0) return null;
    const f = (close - prev) / prev;
    return Number.isFinite(f) ? f : null;
  },

  /** ((close - prev) / prev) * 100 sebagai persen. null jika prev invalid. */
  pctChange(close: number, prev: number): number | null {
    if (!Number.isFinite(close) || !Number.isFinite(prev) || prev <= 0) return null;
    const pct = ((close - prev) / prev) * 100;
    return Number.isFinite(pct) ? pct : null;
  },

  /** Breadth pasar: hitung naik/turun/stagnan dari baris changePercent. */
  breadth(rows: EngineChangeRow[]): { advancers: number; decliners: number; unchanged: number; total: number } {
    let advancers = 0;
    let decliners = 0;
    let unchanged = 0;
    for (const r of rows) {
      if (r.changePercent > 0) advancers++;
      else if (r.changePercent < 0) decliners++;
      else unchanged++;
    }
    return { advancers, decliners, unchanged, total: rows.length };
  },

  /** Rata-rata change% per sektor (aritmetik sederhana — doctrine ponytail),
   * urutan entri = first-seen. Konsumen memformat/mengurutkan sendiri. */
  sectorAverages(rows: { sector: string; changePercent: number }[]): EngineSectorRow[] {
    const m = new Map<string, { total: number; sum: number }>();
    for (const r of rows) {
      const e = m.get(r.sector) ?? { total: 0, sum: 0 };
      e.total++;
      e.sum += r.changePercent;
      m.set(r.sector, e);
    }
    return [...m.entries()].map(([sector, { total, sum }]) => ({ sector, avgChange: sum / total, count: total }));
  },

  /** Top movers: n gainer teratas & n loser terbawah (worst-first).
   * excludeOverlap=true → losers tidak tumpang tindih gainers (jalur snapshot
   * harian: pool likuid kecil); default false (jalur laporan mingguan). */
  movers<T extends { ticker: string; changePercent: number }>(
    rows: T[],
    n: number,
    opts?: { excludeOverlap?: boolean },
  ): { gainers: T[]; losers: T[] } {
    const gainers = [...rows].sort((a, b) => b.changePercent - a.changePercent).slice(0, n);
    const pool = opts?.excludeOverlap
      ? rows.filter((r) => !gainers.some((g) => g.ticker === r.ticker))
      : rows;
    const losers = [...pool].sort((a, b) => a.changePercent - b.changePercent).slice(0, n);
    return { gainers, losers };
  },

  /** Mean change% seluruh pasar. 0 untuk rows kosong. */
  meanChange(rows: EngineChangeRow[]): number {
    if (rows.length === 0) return 0;
    return rows.reduce((acc, r) => acc + r.changePercent, 0) / rows.length;
  },
};
