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
import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const LOG_PATH = "logs/api-latency.jsonl";
const FLUSH_MS = 30_000;

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

const stats = new Map<string, RouteStat>();
let flushing = false;
let lastFlushHadData = false;

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

async function flush(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    const rows: unknown[] = [];
    for (const [route, s] of stats) {
      rows.push({
        route,
        count: s.count,
        avgMs: Math.round(s.totalMs / Math.max(s.count, 1)),
        p95Ms: percentile(s.hist, s.count, 0.95),
        p99Ms: percentile(s.hist, s.count, 0.99),
        maxMs: Math.round(s.maxMs),
        slow: s.slow,
        err5xx: s.err,
        at: new Date().toISOString(),
      });
    }
    if (rows.length) {
      await mkdir(dirname(LOG_PATH), { recursive: true });
      await appendFile(LOG_PATH, rows.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
      lastFlushHadData = true;
    }
    // reset agregat setelah flush (file = rolling window terakhir per flush)
    stats.clear();
  } catch {
    /* file IO gagal (RO fs?) — tetap lanjut, ring akan di-cull */
  } finally {
    flushing = false;
  }
}

let timerStarted = false;
function ensureTimer(): void {
  if (timerStarted) return;
  timerStarted = true;
  setInterval(() => void flush(), FLUSH_MS).unref?.();
}

/** Dipanggil dari /api/admin/monitoring: snapshot live + tail file terakhir. */
export async function getLatencySnapshot(): Promise<{
  live: unknown[];
  recent: unknown[];
}> {
  ensureTimer();
  const live: unknown[] = [];
  for (const [route, s] of stats) {
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
  let recent: unknown[] = [];
  try {
    const { readFile } = await import("node:fs/promises");
    const txt = await readFile(LOG_PATH, "utf8").catch(() => "");
    const lines = txt.trim().split("\n").filter(Boolean);
    // ambil flush terakhir per route dari ≤300 baris akhir
    const last = new Map<string, unknown>();
    for (const line of lines.slice(-300)) {
      try {
        const obj = JSON.parse(line) as { route?: string };
        if (obj.route) last.set(obj.route, obj);
      } catch {
        /* skip baris korup */
      }
    }
    recent = [...last.values()];
  } catch {
    /* fs tidak tersedia — kembalikan kosong */
  }
  return { live, recent };
}
