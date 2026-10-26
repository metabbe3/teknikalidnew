/**
 * Predikat murni filter Radar Pantulan (bug-2026-10-25-01).
 * Diekstrak dari screener-analysis.service.ts (predikat oversold inline)
 * agar bisa diuji tanpa DB.
 *
 * Kontrak: nilai 0 = data kosong/sink gagal (bukan oversold sungguhan —
 * RSI 0.0 tidak pernah valid secara teknikal); null = indikator tak tersedia.
 * Hanya nilai > 0 yang boleh dievaluasi terhadap threshold oversold.
 */

/** TRUE jika sinyal oversold VALID (rsi ≤ 30 atau stoch K&D ≤ 20, nilai > 0). */
export function isOversoldSignal(
  rsi14: number | null,
  stochK: number | null,
  stochD: number | null,
): boolean {
  // Sebelum fix bug-2026-10-25-01: guard `> 0` tidak ada sehingga rsi14=0
  // (indikator kosong, kasus SUPR.JK 25 Okt) lolos filter `<= 30`.
  const isRsiOversold = rsi14 !== null && rsi14 > 0 && rsi14 <= 30;
  const isStochOversold =
    stochK !== null && stochD !== null &&
    stochK > 0 && stochD > 0 && stochK <= 20 && stochD <= 20;
  return isRsiOversold || isStochOversold;
}
