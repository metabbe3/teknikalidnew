/**
 * Rate limit in-memory Map untuk /api/track/activation:
 * Max 60 event/anonId/menit (Wave-7 Item 2).
 */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_EVENTS = 60;
const MAX_RATE_ENTRIES = 5000;

interface RateBucket {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, RateBucket>();

function gcRateBuckets(now: number): void {
  if (rateBuckets.size < MAX_RATE_ENTRIES) return;
  for (const [k, v] of rateBuckets) {
    if (v.resetAt < now) rateBuckets.delete(k);
  }
  if (rateBuckets.size >= MAX_RATE_ENTRIES) {
    const sorted = [...rateBuckets.entries()].sort(
      (a, b) => a[1].resetAt - b[1].resetAt,
    );
    for (let i = 0; i < Math.floor(sorted.length / 2); i++) {
      rateBuckets.delete(sorted[i][0]);
    }
  }
}

export function checkActivationRateLimit(
  key: string,
  limit: number = RATE_LIMIT_MAX_EVENTS,
  windowMs: number = RATE_LIMIT_WINDOW_MS,
): boolean {
  const now = Date.now();
  gcRateBuckets(now);

  let bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + windowMs };
    rateBuckets.set(key, bucket);
  }

  bucket.count += 1;
  return bucket.count <= limit;
}

/** Reset rate limit buckets (digunakan untuk selftest) */
export function _resetActivationRateLimitBuckets(): void {
  rateBuckets.clear();
}
