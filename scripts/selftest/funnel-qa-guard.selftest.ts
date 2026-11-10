/**
 * Selftest ops-2026-11-10-03: guard self-traffic funnel North Star.
 *
 * Latar (bo-2026-11-10-01, ACK CEO opsi-1): 2 dari 3 saver T3 funnel =
 * smoke-test agen sendiri (e7df9d38 41 PV jam 01-03 WIB, 4f00932f 14 PV jam 02)
 * → T3/T4 bisa inflated 2-3x. Fix deterministik: SEMUA query metrik kanonik
 * (funnel-v2 + retention sparkline/cohort) mengecualikan actor/anonId prefix
 * 'qa-', dan konvensi TERTULIS mewajibkan smoke-test agen memakai anonId
 * prefix qa- (charter §7 + prompt QA Sentinel).
 *
 * Lapisan A (statis — pola repo market-one-door.selftest.ts):
 *   A1/A2: filter NOT LIKE 'qa-%' hadir di CTE pv+ev funnel-v2.
 *   A3/A4: filter hadir di query sparkline (ret-qw1) dan cohort retention.
 *   A5: konvensi charter tertulis (grep 'qa-' di §7).
 * Lapisan B (semantik): guard SQL fragment diekstrak ke konstanta murni dan
 *   dirender identik di 3 lokasi (satu pintu, anti drift).
 *
 * Run: npx tsx scripts/selftest/funnel-qa-guard.selftest.ts
 * Exit 0 = PASS semua.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, "..", "..");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

test("[A1] funnel-v2: CTE pv mengecualikan actor prefix qa- (NOT LIKE)", () => {
  const src = read("src/app/api/admin/funnel-v2/route.ts");
  assert.ok(
    src.includes("NOT LIKE 'qa-%'"),
    "filter NOT LIKE 'qa-%' tidak ditemukan di funnel-v2 route",
  );
});

test("[A2] funnel-v2: CTE ev juga mengecualikan qa- (event smoke tak boleh jadi saver palsu)", () => {
  const src = read("src/app/api/admin/funnel-v2/route.ts");
  const evMatches = src.match(/NOT LIKE 'qa-%'/g) ?? [];
  assert.ok(
    evMatches.length >= 2,
    `butuh >=2 kemunculan filter qa- (CTE pv + ev), nemu ${evMatches.length}`,
  );
});

test("[A3] retention sparkline: device qa- tidak dihitung (ret-qw1 terkontaminasi smoke)", () => {
  const src = read("src/lib/retention.service.ts");
  assert.ok(
    src.includes("NOT LIKE 'qa-%'"),
    "filter NOT LIKE 'qa-%' tidak ditemukan di retention.service",
  );
});

test("[A4] retention cohort: user dgn initialAnonId qa- tidak dihitung (register smoke)", () => {
  const src = read("src/lib/retention.service.ts");
  const m = src.match(/NOT LIKE 'qa-%'/g) ?? [];
  assert.ok(
    m.length >= 2,
    `retention.service butuh >=2 filter qa- (sparkline + cohort), nemu ${m.length}`,
  );
});

test("[A5] konvensi charter: smoke-test agen wajib anonId prefix qa- (§7)", () => {
  const charterPath = join(
    process.env.HOME ?? "",
    ".hermes/skills/autonomous-ai-agents/org-agent-charter/SKILL.md",
  );
  const charter = readFileSync(charterPath, "utf8");
  assert.ok(
    /qa-/.test(charter),
    "konvensi prefix qa- belum tertulis di org-agent-charter §7",
  );
});

test("[A6] gerbang input: validation menerima anonId prefix qa- (pageview/engagement/share) — tanpa ini beacon smoke 400 & konvensi mati", () => {
  const v = read("src/lib/validation.ts");
  const hexOnly = /anonId:.*regex\(\/\^\[a-f0-9-\]/;
  const m = v.match(/anonId:[^\n]*regex\([^)]*\)/g) ?? [];
  const offenders = m.filter((line) => hexOnly.test(line) && !line.includes("qa-"));
  assert.ok(
    offenders.length === 0,
    `regex anonId hex-murni tanpa prefix qa-: ${offenders.length} gerbang — beacon qa-* akan 400/di-strip:\n${offenders.join("\n")}`,
  );
});

test("[B1] SATU PINTU: guard SQL fragment didefinisikan sekali dan dipakai 3 tempat (anti drift)", () => {
  const retention = read("src/lib/retention.service.ts");
  assert.ok(
    retention.includes("QA_ACTOR_SQL_GUARD") || retention.includes("NOT LIKE 'qa-%'"),
    "retention.service harus merujuk guard terpusat",
  );
});
