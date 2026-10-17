/**
 * Monte Carlo TP-before-SL estimator (owner request 17 Okt: "bikin lebih
 * akurat, pakai monte carlo jika perlu").
 *
 * Metode: bootstrap historis — ambil return harian log-price N sesi
 * terakhir, sampel dgn penggantian utk b simulasi x H horizon hari,
 * catat P(hitung TP sebelum SL) + expected value per lembar.
 * Deterministic seed (mulberry32) supaya SSR stabil per kombinasi input.
 */

export interface McResult {
  winRate: number;      // P(TP kena sebelum SL), 0-1
  evPerShare: number;   // expected value (Rp) per saham: p*reward - (1-p)*risk
  simulations: number;
  horizonDays: number;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(parts: (string | number)[]): number {
  const s = parts.join("|");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function monteCarloTpFirst(
  closes: number[],
  entry: number,
  tp: number,
  sl: number,
  opts?: { simulations?: number; horizonDays?: number; seedKey?: string },
): McResult | null {
  const sims = opts?.simulations ?? 1000;
  const horizon = opts?.horizonDays ?? 10;

  // Guard: plan degenerate (ARA-lock dsb) — jangan dikasih angka palsu
  if (!(entry > 0) || tp <= entry || sl >= entry || closes.length < 30) return null;

  // Return harian (log) dari close, buang NaN/0
  const rets: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1];
    const cur = closes[i];
    if (prev > 0 && cur > 0) rets.push(Math.log(cur / prev));
  }
  if (rets.length < 20) return null;

  const rand = mulberry32(hashSeed([opts?.seedKey ?? "", entry.toFixed(0), tp.toFixed(0), sl.toFixed(0)]));

  let wins = 0;
  let pnlSum = 0;
  const reward = tp - entry;
  const risk = entry - sl;

  for (let s = 0; s < sims; s++) {
    let price = entry;
    let outcome: "tp" | "sl" | "timeout" = "timeout";
    for (let d = 0; d < horizon; d++) {
      const r = rets[Math.floor(rand() * rets.length)];
      price *= Math.exp(r);
      if (price >= tp) { outcome = "tp"; break; }
      if (price <= sl) { outcome = "sl"; break; }
    }
    if (outcome === "tp") { wins++; pnlSum += reward; }
    else if (outcome === "sl") { pnlSum -= risk; }
    // timeout: P/L 0 utk konservatisme (posisi ditutup di entry ≈ netral)
  }

  const winRate = wins / sims;
  return {
    winRate,
    evPerShare: pnlSum / sims,
    simulations: sims,
    horizonDays: horizon,
  };
}
