/**
 * API latency observability (adm-2026-11-09): per-endpoint duration histograms.
 *
 * proxy.ts measures wall-clock time around the handler chain and calls
 * recordApiLatency(path, status, ms) when the response leaves. Entries aggregate
 * in an in-memory ring keyed by (route-prefix) → {count,totalMs,maxMs,slow,hist}
 * and flush to logs/api-latency.json every 30s (read by /api/admin/monitoring).
 *
 * Design mirrors api-traffic-log.ts: no DB write on the hot path, one append per
 * flush, grep/parsable file, O(1) per request. p95/p99 computed from a bounded
 * bucket histogram (10ms buckets up to 2s+) — enough precision to rank slow
 * endpoints without storing every sample.
 */
// adm-2026-11-09 rev2: middleware runtime tidak dapat diandalkan utk file IO —
// ring murni di globalThis (survive HMR, shared per process). Window = 30 menit terakhir.
const WINDOW_MS = 30 * 60_000;

// 10ms buckets, up to 2s (201 buckets). Anything above clamps into the last bucket.
const BUCKET_MS = 10;
const MAX_BUCKET = 200;

interface RouteStat {
  count: number;
  totalMs: number;
  maxMs: number;
  slow: number; // requests > 500ms
  err: number; // status >= 500
  hist: number[]; // bucket histogram
  updatedAt: number;
}

// globalThis: middleware & route handler bisa jalan module-instance berbeda dalam 1 proses.
const g = globalThis as unknown as { __apiLatencyStats?: Map<string, RouteStat> };
const stats: Map<string, RouteStat> = (g.__apiLatencyStats ??= new Map());

/** Coarse route prefix: /api/stocks/BBCA/history → /api/stocks/BBCA (2 segmen —
 *  cukup spesifik utk "endpoint mana yang lamban", cukup kasar utk tidak meledak). */
export function latencyRouteKey(pathname: string): string | null {
  if (!pathname.startsWith("/api/")) return null;
  const parts = pathname.split("/").filter(Boolean); // ["api","stocks","BBCA","history"]
  if (parts.length < 2) return "/api";
  // ticker-like segment (huruf besar / ^JKSE / hash) → collapse agar tidak per-ticker
  const seg2 = parts[1];
  const collapsed = parts.slice(0, 3).map((p, i) =>
    i === 2 && p.length <= 12 && !p.includes(".") ? ":param" : p,
  );
  return "/" + collapsed.join("/");
}

export function recordApiLatency(pathname: string, status: number, ms: number): void {
  try {
    const key = latencyRouteKey(pathname);
    if (!key) return;
    let s = stats.get(key);
    if (!s) {
      s = { count: 0, totalMs: 0, maxMs: 0, slow: 0, err: 0, hist: new Array(MAX_BUCKET + 1).fill(0), updatedAt: 0 };
      stats.set(key, s);
    }
    s.count++;
    s.totalMs += ms;
    if (ms > s.maxMs) s.maxMs = ms;
    if (ms > 500) s.slow++;
    if (status >= 500) s.err++;
    const b = Math.min(Math.floor(ms / BUCKET_MS), MAX_BUCKET);
    s.hist[b]++;
    s.updatedAt = Date.now();
  } catch {
    /* observability tidak boleh menjatuhkan request */
  }
}

function percentile(hist: number[], count: number, p: number): number {
  if (!count) return 0;
  const target = count * p;
  let acc = 0;
  for (let i = 0; i < hist.length; i++) {
    acc += hist[i];
    if (acc >= target) return i * BUCKET_MS;
  }
  return MAX_BUCKET * BUCKET_MS;
}


/** Dipanggil dari /api/admin/monitoring: snapshot ring (window 30 menit). */
export async function getLatencySnapshot(): Promise<{
  live: unknown[];
  recent: unknown[];
}> {
  const cutoff = Date.now() - WINDOW_MS;
  const live: unknown[] = [];
  for (const [route, s] of stats) {
    if (s.updatedAt && s.updatedAt < cutoff && s.updatedAt !== 0) continue; // route idle >30 mnt
    live.push({
      route,
      count: s.count,
      avgMs: Math.round(s.totalMs / Math.max(s.count, 1)),
      p95Ms: percentile(s.hist, s.count, 0.95),
      p99Ms: percentile(s.hist, s.count, 0.99),
      maxMs: Math.round(s.maxMs),
      slow: s.slow,
      err5xx: s.err,
    });
  }
  return { live, recent: [] };
}
