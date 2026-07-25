/**
 * Lightweight /api request observability.
 *
 * proxy.ts calls recordApiRequest() per /api hit; entries aggregate in an in-memory
 * ring buffer keyed by (minute × ip × route-prefix × status-class) and flush to
 * logs/api-traffic.log every 60s. getApiTrafficSummary() tails that log.
 *
 * Why a log file, not a DB write: the /api hot path can't afford a write per
 * request, and we already have DB-backed rate-limit + blocklist telemetry. This
 * answers a different question — "which IPs pull which /api routes, and how often"
 * — including slow scrapers that stay under the rate limit. One append/min, grep-able.
 *
 * ponytail ceiling: single-process (one container). Multi-instance would need a
 * shared log (Upstash/Redis, already a dep) or per-instance files merged at read.
 */
import { appendFile, mkdir } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { dirname } from "node:path";

const LOG_PATH = "logs/api-traffic.log";
const FLUSH_MS = 60_000;

const bucket = new Map<string, number>();
let flushing = false;

/** Coarse route prefix: /api/stocks/BBCA/history → /api/stocks. */
function apiPrefix(pathname: string): string | null {
  if (!pathname.startsWith("/api/")) return null;
  const parts = pathname.split("/").filter(Boolean); // ["api","stocks","BBCA","history"]
  if (parts.length < 2) return "/api";
  return `/${parts.slice(0, 2).join("/")}`;
}

function statusClass(status: number): string {
  if (status < 400) return "2xx";
  if (status < 500) return "4xx";
  return "5xx";
}

/** Called from the proxy for every /api request. O(1), never throws. */
export function recordApiRequest(
  ip: string | null,
  pathname: string,
  status: number,
): void {
  const prefix = apiPrefix(pathname);
  if (!prefix) return;
  const minute = Math.floor(Date.now() / 60_000);
  const key = `${minute}|${ip ?? "unknown"}|${prefix}|${statusClass(status)}`;
  bucket.set(key, (bucket.get(key) ?? 0) + 1);
}

async function flush(): Promise<void> {
  if (flushing || bucket.size === 0) return;
  flushing = true;
  const snap = new Map(bucket);
  bucket.clear();
  try {
    await mkdir(dirname(LOG_PATH), { recursive: true });
    let out = "";
    const ts = new Date().toISOString();
    for (const [key, n] of snap) out += `${ts}\t${key}\t${n}\n`;
    await appendFile(LOG_PATH, out);
  } catch {
    // fail-soft: drop this bucket rather than breaking the request path
  }
  flushing = false;
}

// ponytail: module-scoped interval, unref'd so it never keeps the process alive.
// Single container = one writer; see file header for multi-instance caveat.
if (typeof setInterval !== "undefined") {
  const h = setInterval(flush, FLUSH_MS);
  h.unref?.();
}

export interface ApiTrafficEntry {
  ip: string;
  totalHits: number;
  prefixes: { prefix: string; hits: number }[];
}

export interface ApiTrafficSummary {
  windowMinutes: number;
  generatedAt: string;
  topConsumers: ApiTrafficEntry[];
}

/**
 * Read the traffic log and return the top /api consumers within the last
 * `windowMinutes`. Tails the file (cheap; file is append-only, bounded by log rotation).
 * Fail-soft: returns an empty summary if the log is missing/unreadable.
 */
export async function getApiTrafficSummary(
  windowMinutes = 60,
): Promise<ApiTrafficSummary> {
  const sinceMs = Date.now() - windowMinutes * 60_000;
  const sinceMinute = Math.floor(sinceMs / 60_000);

  let raw: string;
  try {
    raw = await readFile(LOG_PATH, "utf8");
  } catch {
    return { windowMinutes, generatedAt: new Date().toISOString(), topConsumers: [] };
  }

  // byIp: ip → { total, prefixMap }
  const byIp = new Map<string, { total: number; prefixMap: Map<string, number> }>();
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    // ts \t minute|ip|prefix|status \t count
    const firstTab = line.indexOf("\t");
    const lastTab = line.lastIndexOf("\t");
    if (firstTab === -1 || lastTab === -1 || firstTab === lastTab) continue;
    const key = line.slice(firstTab + 1, lastTab);
    const count = Number(line.slice(lastTab + 1));
    if (!count) continue;
    const [minuteStr, ip, prefix] = key.split("|");
    const minute = Number(minuteStr);
    if (!minute || minute < sinceMinute) continue;
    let entry = byIp.get(ip);
    if (!entry) {
      entry = { total: 0, prefixMap: new Map() };
      byIp.set(ip, entry);
    }
    entry.total += count;
    entry.prefixMap.set(prefix, (entry.prefixMap.get(prefix) ?? 0) + count);
  }

  const topConsumers = [...byIp.entries()]
    .map(([ip, e]) => ({
      ip,
      totalHits: e.total,
      prefixes: [...e.prefixMap.entries()]
        .map(([prefix, hits]) => ({ prefix, hits }))
        .sort((a, b) => b.hits - a.hits),
    }))
    .sort((a, b) => b.totalHits - a.totalHits)
    .slice(0, 15);

  return {
    windowMinutes,
    generatedAt: new Date().toISOString(),
    topConsumers,
  };
}
