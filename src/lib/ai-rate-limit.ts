// RT-07 red-team 30 Okt + daily-tier 30 Okt malam (owner approve):
// Perbaikan v2: (1) Map GC anti leak; (2) cap MAX_ENTRIES; (3) kuota berjenjang;
// (4) DUA LAPIS: per-jam + per-HARI (anon 50/hari, authed 150/hari);
// (5) ANTI-SPOOF: authed flag kini dari session server (route panggil auth()),
//     bukan header x-teknikal-authed yang bisa dipalsukan client.
const RATE = { authed: { hour: 60, day: 150 }, anon: { hour: 30, day: 50 } } as const;
const MAX_ENTRIES = 5000;
const buckets = new Map<string, { hCount: number; dCount: number; resetAt: number; dResetAt: number }>();

function gc(now: number): void {
  if (buckets.size < MAX_ENTRIES) return;
  for (const [k, v] of buckets) {
    if (v.resetAt < now && v.dResetAt < now) buckets.delete(k);
  }
  if (buckets.size >= MAX_ENTRIES) {
    const sorted = [...buckets.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
    for (let i = 0; i < Math.floor(sorted.length / 2); i++) buckets.delete(sorted[i][0]);
  }
}

export interface RateDecision {
  limited: boolean;
  /** "hour" | "day" | null — sisa limit yang tercapai (utk pesan ramah) */
  hit: "hour" | "day" | null;
  /** tier user utk pesan konversi */
  authed: boolean;
}

/** v2: dua lapis (jam + hari). key = ip+tier. */
export function aiRateCheck(key: string, authed: boolean): RateDecision {
  const now = Date.now();
  gc(now);
  const limit = authed ? RATE.authed : RATE.anon;
  const k = `${authed ? "u" : "a"}:${key}`;
  let b = buckets.get(k);
  if (!b || b.resetAt < now) {
    b = { hCount: 0, dCount: 0, resetAt: now + 3600_000, dResetAt: now + 86400_000 };
    buckets.set(k, b);
  }
  if (b.dResetAt < now) { b.dCount = 0; b.dResetAt = now + 86400_000; }
  b.hCount += 1;
  b.dCount += 1;
  if (b.dCount > limit.day) return { limited: true, hit: "day", authed };
  if (b.hCount > limit.hour) return { limited: true, hit: "hour", authed };
  return { limited: false, hit: null, authed };
}

/** backward-compat wrapper (lama return boolean). */
export function aiRateLimited(key: string, authed: boolean): boolean {
  return aiRateCheck(key, authed).limited;
}
