/**
 * Self-test data-trust guards (CTO Night 11 Okt, task test-2026-10-11-01).
 * Run: npx tsx scripts/selftest-data-trust.ts
 *
 * Regression-test dua insiden data-trust nyata:
 * 1. isWibWriteWindow (P0 14 Sep: 865 baris fantasi Minggu 13 Sep + pre-market Senin
 *    dari intraday cron tanpa guard) — kasus batas WIB: weekend, pre-market,
 *    sesi, buffer EOD, tepat 18:00 (eksklusif di menit >18:00).
 * 2. formatVolumeHuman (P1 15 Sep: 41 artikel label "juta lot" padahal DB = saham,
 *    implikasi 100x) — unit WAJIB "saham", tiering miliar/juta/ribuan, null.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { _isWibWriteWindow } from "../src/domains/stock/data-sync.service";
import { _formatVolumeHuman } from "../src/domains/article/article-template";

// Helper: epoch UTC dari "YYYY-MM-DD HH:MM" dianggap waktu WIB (UTC+7).
// isWibWriteWindow menambah 7h lalu baca field UTC — jadi kirim offset -7h dari WIB yang dimaksud.
const wibEpoch = (dayUTCDow: number, h: number, m: number): number => {
  // Cari epoch contoh: Minggu 2026-10-11 & Senin 2026-10-12 (weekend vs weekday nyata).
  const sunday = Date.UTC(2026, 9, 11, 0, 0, 0); // 11 Okt 2026 = MINGGU
  const monday = Date.UTC(2026, 9, 12, 0, 0, 0); // 12 Okt 2026 = SENIN
  const base = dayUTCDow === 0 ? sunday : monday;
  return base + (h * 60 + m - 7 * 60) * 60 * 1000; // kurangi 7h agar dibaca sebagai WIB h:m
};

test("isWibWriteWindow: MINGGU ditolak (insiden 865 baris fantasi 13 Sep)", () => {
  assert.equal(_isWibWriteWindow(() => wibEpoch(0, 12, 0)), false, "Minggu siang harus ditolak");
  assert.equal(_isWibWriteWindow(() => wibEpoch(0, 10, 30)), false, "Minggu jam sesi pun ditolak");
});

test("isWibWriteWindow: SABTU ditolak", () => {
  const saturday = Date.UTC(2026, 9, 10, 0, 0, 0); // 10 Okt 2026 = SABTU
  const ts = saturday + (12 * 60 - 7 * 60) * 60 * 1000; // Sabtu 12:00 WIB
  assert.equal(_isWibWriteWindow(() => ts), false);
});

test("isWibWriteWindow: pre-market Senin ditolak (insiden 00:00-08:59)", () => {
  assert.equal(_isWibWriteWindow(() => wibEpoch(1, 8, 59)), false, "08:59 WIB = belum boleh");
  assert.equal(_isWibWriteWindow(() => wibEpoch(1, 0, 5)), false, "tengah malam ditolak");
});

test("isWibWriteWindow: sesi + buffer EOD diterima", () => {
  assert.equal(_isWibWriteWindow(() => wibEpoch(1, 9, 0)), true, "09:00 tepat = boleh");
  assert.equal(_isWibWriteWindow(() => wibEpoch(1, 12, 0)), true, "siang = boleh");
  assert.equal(_isWibWriteWindow(() => wibEpoch(1, 16, 15)), true, "close sesi = masih boleh");
  assert.equal(_isWibWriteWindow(() => wibEpoch(1, 18, 0)), true, "18:00 tepat = batas atas inklusif");
});

test("isWibWriteWindow: malam setelah 18:00 ditolak", () => {
  assert.equal(_isWibWriteWindow(() => wibEpoch(1, 18, 1)), false, "18:01 = tutup");
  assert.equal(_isWibWriteWindow(() => wibEpoch(1, 23, 59)), false, "23:59 = tutup");
});

test("isWibWriteWindow: Jumat malam & weekday penuh", () => {
  const friday = Date.UTC(2026, 9, 9, 0, 0, 0); // 9 Okt 2026 = JUMAT
  assert.equal(_isWibWriteWindow(() => friday + (10 * 60 - 420) * 60000), true, "Jumat 10:00 boleh");
  assert.equal(_isWibWriteWindow(() => friday + (20 * 60 - 420) * 60000), false, "Jumat 20:00 ditolak");
});

test("formatVolumeHuman: unit SAHAM bukan LOT (insiden 41 artikel 15 Sep)", () => {
  assert.equal(_formatVolumeHuman(278495400), "278.5 juta saham", "BBRI 14 Sep persis kasus insiden");
  assert.ok(!_formatVolumeHuman(278495400).includes("lot"), "kata lot dilarang muncul");
});

test("formatVolumeHuman: tiering miliar/juta/ribu/satuan", () => {
  assert.equal(_formatVolumeHuman(1.25e9), "1.3 miliar saham");
  assert.equal(_formatVolumeHuman(1e6), "1.0 juta saham");
  assert.equal(_formatVolumeHuman(1500), "1.5 ribu saham");
  assert.equal(_formatVolumeHuman(742), "742 saham");
  assert.equal(_formatVolumeHuman(0), "0 saham");
});

test("formatVolumeHuman: null = N/A", () => {
  assert.equal(_formatVolumeHuman(null), "N/A");
});
