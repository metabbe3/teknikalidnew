// RT-07 red-team 30 Okt: rate-limiter AI terpusat.
// Perbaikan vs lama: (1) Map GC (expired entries dihapus — anti memory leak);
// (2) cap MAX_ENTRIES; (3) kuota berjenjang: user login (header x-teknikal-authed=1, di-set
// server-side proxy TBD) 60/jam, anon 30/jam — bukan 300/jam anonim (600 LLM calls/jam/IP).
const RATE = { authed: 60, anon: 30 } as const;
const MAX_ENTRIES = 5000;
const buckets = new Map<string, { count: number; resetAt: number; authed: boolean }>();

function gc(now: number): void {
  if (buckets.size < MAX_ENTRIES) return;
  for (const [k, v] of buckets) {
    if (v.resetAt < now) buckets.delete(k);
  }
  // masih overload? buang separuh terlama
  if (buckets.size >= MAX_ENTRIES) {
    const sorted = [...buckets.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
    for (let i = 0; i < Math.floor(sorted.length / 2); i++) buckets.delete(sorted[i][0]);
  }
}

/** true = terlimit (429). key = ip; authed via session proxy header (fallback anon). */
export function aiRateLimited(key: string, authed: boolean): boolean {
  const now = Date.now();
  gc(now);
  const b = buckets.get(key);
  const limit = authed ? RATE.authed : RATE.anon;
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + 3600_000, authed });
    return false;
  }
  b.count += 1;
  return b.count > limit;
}
