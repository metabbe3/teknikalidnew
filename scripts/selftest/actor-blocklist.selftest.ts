/**
 * Selftest ops-2026-11-11-01: blocklist actor UUID saver-smoke dari funnel/retention.
 *
 * Latar (bo-2026-11-11-01, VERDICT CEO 11 Nov 06:57 APPROVE OPSI B): 2 saver BARU
 * jam 02:25-02:49 WIB 11 Nov (a035afcf, bd8a46cb; UA 'Android 10; K' emulasi CDP,
 * path /stocks→/bottom-fishing→/saham-oversold→/agent→tg_pantau_klik) = verify
 * agen TANPA prefix qa- SETELAH guard ops-2026-11-10-03 — guard NOT LIKE 'qa-%'
 * tak menangkap karena actor UUID acak. Tanpa blocklist, T3 bisa inflated 2x lagi.
 *
 * Fix (opsi B CEO): blocklist actor UUID via config 1-file service — semua query
 * metrik kanonik (funnel-v2 + retention sparkline/cohort) mengecualikan actor
 * terdaftar; pola sama dengan guard qa-% (ops-2026-11-10-03).
 *
 * Cek:
 *   [A1] config blocklist ada sebagai module 1-file + UUID saver 11 Nov terdaftar.
 *   [A2] funnel-v2: kedua CTE (pv+ev) memfilter actor blocklist.
 *   [A3] retention: sparkline device-level memfilter actor blocklist.
 *   [A4] retention: cohort register (initialAnonId) memfilter blocklist.
 *   [A5] SATU PINTU: filter SQL dirender dari config terpusat (anti drift).
 *   [A6] log visibility: beacon pageview actor blocklist menulis console.warn
 *        (opsional CEO — visibility saja, tidak memblokir ingest).
 *   [B1] semantik: guardActorSql() merender fragment aman-bound utk list non-kosong
 *        DAN fallback '' utk list kosong (tidak ada SQL fragment bocor saat kosong).
 *
 * Run: npx tsx scripts/selftest/actor-blocklist.selftest.ts
 * Exit 0 = PASS semua.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  BLOCKED_ACTORS,
  guardActorSql,
} from "../../src/lib/actor-blocklist";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, "..", "..");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

test("[A1] config blocklist: module 1-file berisi 2 UUID saver-smoke 11 Nov", () => {
  const src = read("src/lib/actor-blocklist.ts");
  assert.ok(
    src.includes("a035afcf-c4f4-4646-9e78-187798a4fdbe"),
    "UUID saver a035afcf tidak terdaftar di config blocklist",
  );
  assert.ok(
    src.includes("bd8a46cb-7d96-4fc6-a6c5-f7a4855aa968"),
    "UUID saver bd8a46cb tidak terdaftar di config blocklist",
  );
  assert.ok(
    Array.isArray(BLOCKED_ACTORS) && BLOCKED_ACTORS.length >= 2,
    "BLOCKED_ACTORS harus array >=2 UUID",
  );
  assert.ok(
    BLOCKED_ACTORS.every((a) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(a)),
    "semua entri blocklist harus UUID lowercase kanonik (anti injection)",
  );
});

test("[A2] funnel-v2: CTE pv+ev memfilter actor blocklist", () => {
  const src = read("src/app/api/admin/funnel-v2/route.ts");
  assert.ok(
    src.includes("guardActorSql"),
    "funnel-v2 route tidak memakai guardActorSql dari config terpusat",
  );
});

test("[A3] retention sparkline: device blocklist tidak dihitung", () => {
  const src = read("src/lib/retention.service.ts");
  assert.ok(
    /guardActorSql/.test(src),
    "retention.service tidak memfilter actor blocklist (sparkline)",
  );
});

test("[A4] retention cohort: register dari sesi blocklist tidak dihitung", () => {
  const src = read("src/lib/retention.service.ts");
  const m = src.match(/guardActorSql/g) ?? [];
  assert.ok(
    m.length >= 2,
    `retention.service butuh >=2 pemakaian guardActorSql (sparkline + cohort), nemu ${m.length}`,
  );
});

test("[A5] SATU PINTU: fragment SQL dirender dari config terpusat, bukan literal tersebar", () => {
  const lib = read("src/lib/actor-blocklist.ts");
  assert.ok(lib.includes("guardActorSql"), "fragment harus didefinisikan di config terpusat");
});

test("[A6] log visibility: pageview actor blocklist → console.warn (visibility saja)", () => {
  const src = read("src/app/api/track/pageview/route.ts");
  assert.ok(
    src.includes("isBlockedActor") && /console\.warn/.test(src),
    "beacon pageview harus menulis console.warn saat actor blocklist terdeteksi",
  );
});

test("[B1] semantik guardActorSql: fragment aman utk list non-kosong, '' saat kosong", () => {
  const frag = guardActorSql();
  assert.ok(
    typeof frag === "string",
    "guardActorSql harus return string fragment",
  );
  assert.ok(
    frag.length > 0,
    "list non-kosong → fragment tidak boleh string kosong",
  );
  assert.ok(
    !frag.includes("'"),
    "fragment TIDAK boleh memuat literal quote tunggal (harus via join aman)",
  );
  assert.ok(
    !/SELECT|DROP|;/i.test(frag),
    "fragment harus berupa kondisi, bukan SQL lengkap",
  );
});

// Failing-test-first ops-2026-11-11-01: modul belum ada → run ini GAGAL dulu,
// fix menyusul. Test ini adalah bukti bug (T3 inflated 2x) hilang pasca-fix.
