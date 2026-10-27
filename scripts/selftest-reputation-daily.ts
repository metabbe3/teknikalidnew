/**
 * Self-test Point & Badge v1 daily award (PRD prd-2026-10-24-01 / task teknikal-2026-10-20-01).
 * Run: npx tsx scripts/selftest-reputation-daily.ts
 *
 * Reproduksi bug live 26 Okt (SQL read-only: user kyoci 18 award lifetime = reputation 18,
 * padahal spec/PRD/UI copy "+5 otomatis"):
 *   [BUG-1] repository.claimDailyReward hardcode `increment: 1` — service comment bilang +5,
 *           commit b50cd1f tidak pernah menyentuh repository.
 *   [BUG-2] cacheKey pakai toISOString() = tanggal UTC, bukan tanggal WIB (spec PRD eksplisit
 *           "key tanggal WIB"); container TZ=UTC -> window 00:00-07:00 WIB bisa dobel award
 *           per hari WIB.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// Modul baru hasil ekstraksi (fix) — import di sini agar test GAGAL dulu saat modul belum ada.
import {
  DAILY_AWARD_POINTS,
  wibDateKey,
  dailyCacheKey,
  dailyWindowExpiresAt,
  nextStreakFor,
} from "../src/domains/reputation/daily-award";

const repoSrc = readFileSync(join(here, "../src/domains/reputation/reputation.repository.ts"), "utf8");
const svcSrc = readFileSync(join(here, "../src/domains/reputation/reputation.service.ts"), "utf8");

test("[1] BUG-1 satuan award: satu sumber kebenaran +5, repository TIDAK hardcode 1", () => {
  assert.equal(DAILY_AWARD_POINTS, 5, "konstanta hariah = 5 poin sesuai PRD");
  assert.match(
    repoSrc,
    /increment:\s*DAILY_AWARD_POINTS/,
    "repository.claimDailyReward harus increment DAILY_AWARD_POINTS (bukan literal)"
  );
  assert.doesNotMatch(
    repoSrc,
    /increment:\s*1\b/,
    "regresi: literal `increment: 1` ditemukan lagi (bug live 24-26 Okt)"
  );
});

test("[2] BUG-2 key tanggal WIB (UTC+7, tanpa DST), bukan UTC", () => {
  // 16:30 UTC = 23:30 WIB masih hari yang sama
  assert.equal(wibDateKey(new Date("2026-10-26T16:30:00Z")), "2026-10-26");
  // 17:30 UTC = 00:30 WIB HARI BERIKUTNYA
  assert.equal(wibDateKey(new Date("2026-10-26T17:30:00Z")), "2026-10-27");
  // batas UTC-midnight = 07:00 WIB: 06:59 dan 07:00 WIB = hari WIB berbeda
  assert.equal(wibDateKey(new Date("2026-10-25T23:59:00Z")), "2026-10-26"); // 06:59 WIB
  assert.equal(wibDateKey(new Date("2026-10-26T00:01:00Z")), "2026-10-26"); // 07:01 WIB, hari WIB sama dgn atas? tidak — cek eksplisit:
  assert.equal(wibDateKey(new Date("2026-10-26T00:01:00Z")), wibDateKey(new Date("2026-10-25T23:59:00Z")), "07:01 WIB masih hari WIB yang sama dengan 06:59 WIB");
});

test("[3] format cacheKey stabil + jendela expiry > 1 hari", () => {
  const key = dailyCacheKey("user-1", new Date("2026-10-26T10:00:00Z")); // 17:00 WIB 26 Okt
  assert.equal(key, "daily-rep:user-1:2026-10-26");
  const exp = dailyWindowExpiresAt(new Date("2026-10-26T10:00:00Z"));
  assert.ok(exp.getTime() - Date.parse("2026-10-26T10:00:00Z") >= 48 * 3600 * 1000, "expiry >= 48h");
});

test("[4] streak pakai hari WIB: kemarin +1, bolong reset ke 1, null mulai 1", () => {
  const now = new Date("2026-10-26T15:00:00Z"); // 22:00 WIB Senin 26 Okt
  // terakhir claim kemarin WIB (25 Okt 20:00 WIB = 13:00 UTC)
  assert.equal(nextStreakFor(new Date("2026-10-25T13:00:00Z"), 3, now), 4, "consecutive +1");
  // bolong 2 hari WIB
  assert.equal(nextStreakFor(new Date("2026-10-23T13:00:00Z"), 5, now), 1, "bolong reset ke 1");
  // belum pernah
  assert.equal(nextStreakFor(null, 0, now), 1, "pertama kali = 1");
  // claim kemarin jam 23:59 WIB (16:59 UTC) tetap dihitung kemarin-WIB
  assert.equal(nextStreakFor(new Date("2026-10-25T16:59:00Z"), 1, now), 2);
});

test("[5] service pakai helper (bukan logika tanggal inline UTC lagi)", () => {
  assert.match(svcSrc, /dailyCacheKey\(/, "service memakai dailyCacheKey helper");
  assert.doesNotMatch(svcSrc, /toISOString\(\)\.slice\(0,\s*10\)/, "regresi: key UTC inline kembali");
  assert.match(svcSrc, /nextStreakFor\(/, "streak dihitung via helper WIB");
});
