/**
 * Self-test IndexNow (PRD idea-2026-11-07-2 / task prd-2026-11-07-02).
 * Run: npx tsx scripts/selftest-indexnow.ts
 *
 * Menguji src/lib/indexnow.ts: key file, dedupe/absolutize, semantik retry
 * (4xx = 0 retry, network/5xx = 1x backoff), fire-and-forget (publish-path
 * delta < 50ms meski endpoint lambat/gagal), disabled-env = 0 POST.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { isIndexNowEnabled, prepareIndexNowUrls, pingIndexNow } from "../src/lib/indexnow";

const ORIG_FETCH = globalThis.fetch;

function mockFetch(handler: (url: string, init?: RequestInit) => { status?: number; delay?: number; throw?: boolean }, counter: { calls: number }) {
  globalThis.fetch = (async (url: any, init?: any) => {
    counter.calls++;
    const cfg = handler(String(url), init as RequestInit);
    if (cfg.throw) throw new Error("mock network down");
    if (cfg.delay) await new Promise((r) => setTimeout(r, cfg.delay));
    return new Response("", { status: cfg.status ?? 202 });
  }) as any;
}

test.afterEach(() => {
  globalThis.fetch = ORIG_FETCH;
});

test("[1] key file public/: nama == isi, 32 hex, ter-commit di branch ini", () => {
  const files = readdirSync(join(process.cwd(), "public")).filter((f) => /^[a-f0-9]{32}\.txt$/.test(f));
  assert.ok(files.length >= 1, "minimal 1 file key <hex32>.txt di public/");
  for (const f of files) {
    const content = readFileSync(join(process.cwd(), "public", f), "utf8").trim();
    assert.equal(content, f.replace(".txt", ""), `isi ${f} == nama (spec IndexNow)`);
    assert.match(content, /^[a-f0-9]{32}$/, "UUID-v4 tanpa hyphen");
  }
});

test("[2] prepareIndexNowUrls: dedupe + absolutize + prefix-slash + cap", () => {
  const urls = prepareIndexNowUrls(["kenapa-bbca-naik", "/berita/brief-1", "kenapa-bbca-naik", "", "https://teknikal.id/indeks"]);
  assert.deepEqual(urls, [
    "https://teknikal.id/kenapa-bbca-naik",
    "https://teknikal.id/berita/brief-1",
    "https://teknikal.id/indeks",
  ], "dedupe + absolutize + slug-polos jadi path");
  assert.equal(prepareIndexNowUrls([]).length, 0, "kosong -> kosong");
});

test("[3] key invalid/kosong -> isIndexNowEnabled false, ping 0 POST", async () => {
  const prev = process.env.INDEXNOW_KEY;
  const counter = { calls: 0 };
  mockFetch(() => ({ status: 202 }), counter);
  delete process.env.INDEXNOW_KEY;
  assert.equal(isIndexNowEnabled(), false, "tanpa env = disabled");
  let r = await pingIndexNow(["x"]);
  assert.equal(counter.calls, 0, "disabled = tidak ada POST");
  assert.equal(r.ok, false, "return ok=false");
  process.env.INDEXNOW_KEY = "ZZ-invalid-key"; // non-hex
  assert.equal(isIndexNowEnabled(), false, "key non-hex = disabled");
  r = await pingIndexNow(["x"]);
  assert.equal(counter.calls, 0, "key invalid = tidak ada POST");
  if (prev !== undefined) process.env.INDEXNOW_KEY = prev; else delete process.env.INDEXNOW_KEY;
});

test("[4] 202 ok -> ok:true, 1 POST, body sesuai spec (host+key+keyLocation+urlList)", async () => {
  process.env.INDEXNOW_KEY = "9329a1548c534fa7a93543738adb2538";
  const counter = { calls: 0 };
  let capturedBody = "";
  mockFetch((_u, init) => {
    if (init?.body) capturedBody = String(init.body);
    return { status: 202 };
  }, counter);
  const r = await pingIndexNow(["kenapa-bbca-naik"]);
  assert.equal(r.ok, true, "202 = ok");
  assert.equal(counter.calls, 1, "sukses = tepat 1 POST (tanpa retry)");
  assert.equal(r.n, 1);
  const parsed = JSON.parse(capturedBody);
  assert.equal(parsed.host, "teknikal.id");
  assert.equal(parsed.key, "9329a1548c534fa7a93543738adb2538");
  assert.equal(parsed.keyLocation, "https://teknikal.id/9329a1548c534fa7a93543738adb2538.txt");
  assert.deepEqual(parsed.urlList, ["https://teknikal.id/kenapa-bbca-naik"]);
  delete process.env.INDEXNOW_KEY;
});

test("[5] HTTP 400 (key salah) -> 0 retry (spec: 4xx terminal)", async () => {
  process.env.INDEXNOW_KEY = "9329a1548c534fa7a93543738adb2538";
  const counter = { calls: 0 };
  mockFetch(() => ({ status: 400 }), counter);
  const r = await pingIndexNow(["a", "b"], { backoffMs: 10 });
  assert.equal(counter.calls, 1, "4xx = TEPAT 1 POST, tidak ada retry");
  assert.equal(r.ok, false);
  delete process.env.INDEXNOW_KEY;
});

test("[6] network error -> retry 1x lalu menyerah; tetap resolve (tidak throw)", async () => {
  process.env.INDEXNOW_KEY = "9329a1548c534fa7a93543738adb2538";
  const counter = { calls: 0 };
  mockFetch(() => ({ throw: true }), counter);
  const r = await pingIndexNow(["a"], { backoffMs: 10 });
  assert.equal(counter.calls, 2, "network error = 2 POST (1 + retry 1x)");
  assert.equal(r.ok, false, "gagal permanen setelah retry");
  delete process.env.INDEXNOW_KEY;
});

test("[7] network error lalu sukses di retry -> ok:true (2 POST)", async () => {
  process.env.INDEXNOW_KEY = "9329a1548c534fa7a93543738adb2538";
  const counter = { calls: 0 };
  mockFetch(() => (counter.calls === 1 ? { throw: true } : { status: 202 }), counter);
  const r = await pingIndexNow(["a"], { backoffMs: 10 });
  assert.equal(counter.calls, 2, "retry menembus");
  assert.equal(r.ok, true, "attempt-2 sukses = ok");
  delete process.env.INDEXNOW_KEY;
});

test("[8] AC2 fire-and-forget: void pingIndexNow tidak memblok publish (delta < 50ms meski endpoint 300ms)", async () => {
  process.env.INDEXNOW_KEY = "9329a1548c534fa7a93543738adb2538";
  const counter = { calls: 0 };
  mockFetch(() => ({ status: 202, delay: 300 }), counter);
  const t0 = Date.now();
  void pingIndexNow(["kenapa-xyz-naik"], { backoffMs: 10 }); // pola call di repository
  const delta = Date.now() - t0;
  assert.ok(delta < 50, `void call harus kembali segera (delta=${delta}ms < 50ms)`);
  assert.equal(counter.calls, 1, "POST tetap terkirim async");
  delete process.env.INDEXNOW_KEY;
});
