import test from "node:test";
import assert from "node:assert/strict";
import {
  isLiveMarketOpen,
  buildClosedQuoteRow,
} from "../live-quotes.helper";

test("isLiveMarketOpen: Hari kerja Senin 09:00 WIB -> pasar buka", () => {
  // 2026-11-09 is a Monday
  // 02:00 UTC = 09:00 WIB
  const mondayOpen = new Date("2026-11-09T02:00:00.000Z");
  assert.equal(isLiveMarketOpen(mondayOpen), true);
});

test("isLiveMarketOpen: Hari kerja Senin 16:15 WIB -> pasar masih sesi closing", () => {
  // 09:15 UTC = 16:15 WIB
  const mondayClosing = new Date("2026-11-09T09:15:00.000Z");
  assert.equal(isLiveMarketOpen(mondayClosing), true);
});

test("isLiveMarketOpen: Hari kerja Senin 08:59 WIB -> sebelum pasar buka (closed)", () => {
  // 01:59 UTC = 08:59 WIB
  const mondayPre = new Date("2026-11-09T01:59:00.000Z");
  assert.equal(isLiveMarketOpen(mondayPre), false);
});

test("isLiveMarketOpen: Hari kerja Senin 16:16 WIB -> setelah pasar tutup (closed)", () => {
  // 09:16 UTC = 16:16 WIB
  const mondayPost = new Date("2026-11-09T09:16:00.000Z");
  assert.equal(isLiveMarketOpen(mondayPost), false);
});

test("isLiveMarketOpen: Akhir pekan Sabtu & Minggu -> selalu closed", () => {
  // 2026-11-07 is Saturday, 2026-11-08 is Sunday
  const saturday = new Date("2026-11-07T04:00:00.000Z"); // 11:00 WIB
  const sunday = new Date("2026-11-08T04:00:00.000Z"); // 11:00 WIB
  assert.equal(isLiveMarketOpen(saturday), false);
  assert.equal(isLiveMarketOpen(sunday), false);
});

test("buildClosedQuoteRow: Saham valid dengan harga latest dan prevClose", () => {
  const eodPrev = new Map([["BBCA.JK", 9900]]);
  const eodLatest = new Map([["BBCA.JK", 10000]]);

  const row = buildClosedQuoteRow("BBCA.JK", eodPrev, eodLatest);
  assert.equal(row.ticker, "BBCA.JK");
  assert.equal(row.price, 10000);
  assert.equal(row.prevClose, 9900);
  // change & changePercent WAJIB null saat pasar tutup agar tidak menimpa SSR EOD
  assert.equal(row.change, null);
  assert.equal(row.changePercent, null);
  assert.equal(row.marketState, "CLOSED_WIB");
  assert.equal(row.note, undefined);
});

test("buildClosedQuoteRow: Saham valid sebelum sync latest EOD (fallback ke prev)", () => {
  const eodPrev = new Map([["BBRI.JK", 5200]]);
  const eodLatest = new Map<string, number>();

  const row = buildClosedQuoteRow("BBRI.JK", eodPrev, eodLatest);
  assert.equal(row.ticker, "BBRI.JK");
  assert.equal(row.price, 5200);
  assert.equal(row.prevClose, 5200);
  assert.equal(row.changePercent, null);
  assert.equal(row.marketState, "CLOSED_WIB");
  assert.equal(row.note, undefined);
});

test("buildClosedQuoteRow: Simbol invalid (?s=XXXX saat closed) -> price null & note: invalid", () => {
  const eodPrev = new Map<string, number>();
  const eodLatest = new Map<string, number>();

  const row = buildClosedQuoteRow("XXXX.JK", eodPrev, eodLatest);
  assert.equal(row.ticker, "XXXX.JK");
  assert.equal(row.price, null);
  assert.equal(row.prevClose, null);
  assert.equal(row.change, null);
  assert.equal(row.changePercent, null);
  assert.equal(row.marketState, "CLOSED_WIB");
  assert.equal(row.note, "invalid");
});
