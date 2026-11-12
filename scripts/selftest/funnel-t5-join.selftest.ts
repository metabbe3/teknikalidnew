/**
 * Selftest ops-2026-11-12-01 (CTO night 12 Nov): fix join T5 funnel-v2.
 *
 * Latar (bo-2026-11-12-01 diagnosis + CEO APPROVE 12 Nov): T5 habit funnel
 * 100% blind — join TelegramWatch.anonPrefix MATI PERMANEN (kolom NULL 9/9
 * rows sejak 28 Okt; penulisnya poll.mjs tak pernah jalan; pivot 6 Nov arahkan
 * deeplink ke TeknikalidAgentBot yang menulis agent.agent_user.anon_id).
 * Tanpa fix, tahap habit North Star buta selamanya.
 *
 * RIDER-1 (P1): ganti join T5 -> LEFT(REPLACE(actor,'-',''),12) =
 * agent.agent_user.anon_id (privilege SELECT web-role = true, replay 12 Nov).
 * RIDER-2 (P3 config-only): append e7df9d38 + 4f00932f (known-smoke 10 Nov,
 * konfirmasi QA Sentinel 11 Nov) ke BLOCKED_ACTORS — pola 1-file ops-2026-11-11-01.
 * HOLD (JANGAN blocklist): e4b417c3 (123PV/4d, bisa user nyata) + 5ae28974 —
 * menunggu review audit backoffice berikutnya.
 *
 * Failing-test-first: file ini dijalankan SEBELUM fix — [C1]..[C3] harus GAGAL
 * (route masih join anonPrefix; blocklist masih 2 UUID). Pasca-fix semua HIJAU.
 *
 * Run: npx tsx scripts/selftest/funnel-t5-join.selftest.ts — Exit 0 = PASS.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { BLOCKED_ACTORS } from "../../src/lib/actor-blocklist";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, "..", "..");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

test("[C1] funnel-v2: join T5 TIDAK lagi ke TelegramWatch.anonPrefix (mati permanen)", () => {
  const src = read("src/app/api/admin/funnel-v2/route.ts");
  assert.ok(
    !src.includes('JOIN "TelegramWatch"'),
    "funnel-v2 masih join TelegramWatch — join mati (anonPrefix NULL 9/9) harus dibuang",
  );
});

test("[C2] funnel-v2: join T5 baru ke agent.agent_user.anon_id via LEFT(REPLACE,12)", () => {
  const src = read("src/app/api/admin/funnel-v2/route.ts");
  assert.ok(
    src.includes("agent.agent_user"),
    "join T5 harus menyasar agent.agent_user (sumber identitas bot aktif pasca-pivot 6 Nov)",
  );
  assert.ok(
    /LEFT\(REPLACE\(b\.actor,\s*'-',\s*''\),\s*12\)\s*=\s*au\.anon_id/.test(src),
    "predicate join harus LEFT(REPLACE(b.actor,'-',''),12) = au.anon_id (sesuai spec ops-2026-11-12-01)",
  );
});

test("[C3] blocklist: 2 UUID known-smoke 10 Nov (e7df9d38, 4f00932f) terdaftar penuh", () => {
  const src = read("src/lib/actor-blocklist.ts");
  assert.ok(
    src.includes("e7df9d38-f569-4b85-afbb-f30df636651d"),
    "UUID known-smoke e7df9d38 belum masuk blocklist",
  );
  assert.ok(
    src.includes("4f00932f-1e74-4fcc-a089-614e91da656e"),
    "UUID known-smoke 4f00932f belum masuk blocklist",
  );
  assert.equal(
    BLOCKED_ACTORS.length,
    4,
    `BLOCKED_ACTORS harus tepat 4 UUID (2 lama + 2 baru), nemu ${BLOCKED_ACTORS.length}`,
  );
});

test("[C4] HOLD dihormati: e4b417c3 + 5ae28974 TIDAK ikut di-blocklist", () => {
  const src = read("src/lib/actor-blocklist.ts");
  assert.ok(!src.includes("e4b417c3"), "e4b417c3 (123PV/4d, bisa user nyata) HOLD — jangan diblocklist");
  assert.ok(!src.includes("5ae28974"), "5ae28974 (X11-Linux) HOLD — jangan diblocklist");
});

test("[C5] regresi ops-2026-11-11-01: guardActorSql tetap satu pintu di funnel-v2", () => {
  const src = read("src/app/api/admin/funnel-v2/route.ts");
  assert.ok(
    src.includes("guardActorSql"),
    "funnel-v2 route harus tetap memakai guardActorSql (anti drift blocklist)",
  );
});
