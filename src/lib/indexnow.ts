/**
 * IndexNow ping (PRD idea-2026-11-07-2 / task prd-2026-11-07-02).
 * Fire-and-forget submit URL baru ke ekosistem Bing/Yandex/Seznam/Naver/Yeti
 * (endpoint tunggal api.indexnow.org) supaya konten harian (kenapa-*, brief)
 * terindeks dalam menit-jam, bukan menunggu crawl natural.
 *
 * Prinsip: KEGAGALAN IndexNow TIDAK PERNAH boleh menggagalkan/memperlambat
 * jalur publish artikel — void + catch semua, timeout pendek, retry HANYA
 * utk timeout/jaringan/5xx (1x, backoff 2s); HTTP 4xx = 0 retry (spec: 202 ok,
 * 400 key invalid). Log 1 baris terstruktur [IndexNow] {ok,n,ms,host}.
 */
import { SITE_URL } from "./constants";

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const MAX_URLS = 10000; // spec IndexNow: urlList max 10.000

/** Nama file key publik di public/ — HARUS identik dengan file yang di-commit. */
function keyFileName(): string {
  return `${process.env.INDEXNOW_KEY}.txt`;
}

/** True bila IndexNow aktif (env valid) — gate tanpa-throw utk semua caller. */
export function isIndexNowEnabled(): boolean {
  const key = process.env.INDEXNOW_KEY;
  if (!key) return false;
  // Spec: key 8-128 hex (a-f0-9). Invalid = diam, jangan spam endpoint 400.
  return /^[a-f0-9]{8,128}$/.test(key);
}

/** Dedupe + absolutize + filter kosong + cap 10.000 (spec batch max). */
export function prepareIndexNowUrls(slugs: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of slugs) {
    if (!s) continue;
    const url = s.startsWith("http") ? s : `${SITE_URL}${s.startsWith("/") ? "" : "/"}${s}`;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(url);
    if (out.length >= MAX_URLS) break;
  }
  return out;
}

type AttemptResult = "ok" | "no-retry" | "retry";

async function postOnce(body: string): Promise<AttemptResult> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    try {
      const res = await fetch(INDEXNOW_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body,
        signal: ctrl.signal,
      });
      if (res.ok || res.status === 202) return "ok";
      if (res.status >= 400 && res.status < 500) return "no-retry"; // 4xx: salah key/payload — jangan retry
      return "retry"; // 5xx / status lain: boleh retry
    } finally {
      clearTimeout(t);
    }
  } catch {
    return "retry"; // network error / abort timeout: boleh retry
  }
}

/**
 * Ping fire-and-forget. SELALU resolve (tidak pernah throw) — caller wajib
 * memanggil via `void pingIndexNow(...)` agar tidak memblok hot-path publish.
 * `backoffMs` hanya utk selftest (default 2000 sesuai PRD AC3).
 */
export async function pingIndexNow(
  slugs: string[],
  opts?: { backoffMs?: number },
): Promise<{ ok: boolean; n: number; ms: number; host: string }> {
  const started = Date.now();
  const host = new URL(SITE_URL).host;
  if (!isIndexNowEnabled()) return { ok: false, n: 0, ms: 0, host };
  const urls = prepareIndexNowUrls(slugs);
  if (urls.length === 0) return { ok: false, n: 0, ms: 0, host };

  const body = JSON.stringify({
    host,
    key: process.env.INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${keyFileName()}`,
    urlList: urls,
  });

  let result: AttemptResult = await postOnce(body);
  if (result === "retry") {
    await new Promise((r) => setTimeout(r, opts?.backoffMs ?? 2000));
    result = await postOnce(body);
  }

  const ok = result === "ok";
  const ms = Date.now() - started;
  console.info(`[IndexNow] ${JSON.stringify({ ok, n: urls.length, ms, host })}`);
  return { ok, n: urls.length, ms, host };
}
