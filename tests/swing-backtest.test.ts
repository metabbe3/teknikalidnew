/**
 * Unit test matematika swing-backtest.service (Swing Trader Pack v1)
 *
 * 3 Kasus Wajib:
 *  1. Seri naik murni (skor tinggi -> winRate 1.0)
 *  2. Seri turun (winRate 0)
 *  3. Seri pendek (<21 baris -> signals=0)
 *
 * Runner:
 *  - npx tsx tests/swing-backtest.test.ts
 *  - npx tsx --test tests/swing-backtest.test.ts
 */

import test from "node:test";
import assert from "node:assert/strict";
import { computeSwingStats, type SwingRow } from "../src/domains/stock/swing-backtest.service";

test("Kasus 1: Seri naik murni (skor tinggi -> winRate 1.0)", () => {
  // Deret 25 hari bursa naik stabil dari 1000 ke 1240
  const rows: SwingRow[] = [];
  const baseDate = new Date("2026-01-01T00:00:00Z");

  for (let i = 0; i < 25; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    rows.push({
      date: d.toISOString().slice(0, 10),
      close: 1000 + i * 10, // Naik terus: 1000, 1010, ..., 1240
      signalScore: 0.5, // Skor tinggi di atas 0.34
      signalLabel: "Sangat Menguat",
      ticker: "NAIK.JK",
    });
  }

  const stats = computeSwingStats(rows, 0.34);

  // Ada 5 sinyal yang horizon T+20 nya tercapai (index 0..4 dengan T+20 di index 20..24)
  assert.equal(stats.signals, 5, "Harus menghasilkan 5 sinyal terukur");
  assert.equal(stats.winRate, 1.0, "Win rate harus 1.0 (100% menang)");
  assert.ok(stats.avgReturn > 0, "Average return harus positif");
  assert.ok(stats.medianReturn > 0, "Median return harus positif");
  assert.equal(stats.avgHoldDays, 20, "Holding days horizon harus 20");
  assert.equal(stats.perLabelBreakdown["Sangat Menguat"]?.winRate, 1.0);
});

test("Kasus 2: Seri turun (winRate 0)", () => {
  // Deret 25 hari bursa turun stabil dari 2000 ke 1760
  const rows: SwingRow[] = [];
  const baseDate = new Date("2026-01-01T00:00:00Z");

  for (let i = 0; i < 25; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    rows.push({
      date: d.toISOString().slice(0, 10),
      close: 2000 - i * 10, // Turun terus: 2000, 1990, ..., 1760
      signalScore: 0.45, // Skor tinggi di atas 0.34
      signalLabel: "Menguat",
      ticker: "TURUN.JK",
    });
  }

  const stats = computeSwingStats(rows, 0.34);

  assert.equal(stats.signals, 5, "Harus menghasilkan 5 sinyal terukur");
  assert.equal(stats.winRate, 0, "Win rate harus 0 (semua rugi)");
  assert.ok(stats.avgReturn < 0, "Average return harus negatif");
  assert.ok(stats.medianReturn < 0, "Median return harus negatif");
  assert.equal(stats.avgHoldDays, 20);
});

test("Kasus 3: Seri pendek (<21 baris -> signals=0)", () => {
  // Hanya 20 baris data (index 0..19), index T+20 tidak pernah tercapai
  const rows: SwingRow[] = [];
  const baseDate = new Date("2026-01-01T00:00:00Z");

  for (let i = 0; i < 20; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    rows.push({
      date: d.toISOString().slice(0, 10),
      close: 1000 + i * 5,
      signalScore: 0.6,
      signalLabel: "Sangat Menguat",
      ticker: "PENDEK.JK",
    });
  }

  const stats = computeSwingStats(rows, 0.34);

  assert.equal(stats.signals, 0, "Signals harus 0 karena data < 21 baris setelah T");
  assert.equal(stats.winRate, 0, "Win rate fallback 0");
  assert.equal(stats.avgReturn, 0, "Avg return fallback 0");
  assert.equal(stats.medianReturn, 0, "Median return fallback 0");
  assert.equal(stats.avgHoldDays, 0, "Avg hold days fallback 0");
});

test("Uji Tambahan: Null-safety dan threshold filtering", () => {
  const rows: SwingRow[] = [
    { date: "2026-01-01", close: 100, signalScore: 0.1, ticker: "TEST.JK" }, // skor < 0.34
    { date: "2026-01-02", close: 0, signalScore: 0.5, ticker: "TEST.JK" }, // close invalid <= 0
    { date: "2026-01-03", close: 100, signalScore: null, ticker: "TEST.JK" }, // null score
  ];

  const stats = computeSwingStats(rows, 0.34);
  assert.equal(stats.signals, 0, "Invalid rows tidak boleh menyebabkan throw atau sinyal palsu");
});
