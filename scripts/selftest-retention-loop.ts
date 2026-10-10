/**
 * Self-test Retention Loop v1 (PRD idea-2026-10-09-1 / task prd-2026-10-09-01).
 * Run: npx tsx scripts/selftest-retention-loop.ts
 *
 * Unit-test src/lib/guest-storage.ts (pure, storage-injectable — no DOM needed):
 * guest watchlist toggle/persist, saved screens dedupe+FIFO, validasi ticker & queryString.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readGuestWatchlist,
  writeGuestWatchlist,
  toggleGuestWatchlistTicker,
  clearGuestWatchlist,
  readSavedScreens,
  saveScreen,
  removeSavedScreen,
  GUEST_WATCHLIST_KEY,
  SAVED_SCREENS_KEY,
  MAX_SAVED_SCREENS,
  type GuestStorage,
} from "../src/lib/guest-storage";

class MemStorage implements GuestStorage {
  map = new Map<string, string>();
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
}

test("[1] guest watchlist: toggle add/remove + persist", () => {
  const st = new MemStorage();
  const r1 = toggleGuestWatchlistTicker("BBRI", st);
  assert.ok(r1 && r1.added, "toggle pertama = add");
  assert.deepEqual(r1!.list, ["BBRI"], "list berisi BBRI");
  const r2 = toggleGuestWatchlistTicker("BBCA", st);
  assert.deepEqual(r2!.list, ["BBRI", "BBCA"], "append BBCA");
  const r3 = toggleGuestWatchlistTicker("BBRI", st);
  assert.equal(r3!.added, false, "toggle BBRI lagi = remove");
  assert.deepEqual(r3!.list, ["BBCA"], "BBRI hilang");
  assert.deepEqual(readGuestWatchlist(st), ["BBCA"], "persist via readGuestWatchlist");
});

test("[2] guest watchlist: dedupe + tolak ticker malformed", () => {
  const st = new MemStorage();
  writeGuestWatchlist(["BBRI", "BBRI"], st);
  assert.deepEqual(readGuestWatchlist(st), ["BBRI"], "duplikat didedupe saat read");
  // malformed entries dibuang, bukan crash
  st.setItem(GUEST_WATCHLIST_KEY, JSON.stringify(["OKTO", "BBRI", 42, "a b", ""]));
  assert.deepEqual(readGuestWatchlist(st), ["OKTO", "BBRI"], "non-string/malformed difilter");
  assert.equal(toggleGuestWatchlistTicker("bad ticker", st), null, "spasi ditolak");
  assert.equal(toggleGuestWatchlistTicker("x", st), null, "1 char ditolak");
  // format kanonis DB (.JK) harus diterima — jalur UI screener/detail memakai suffix
  const r1 = toggleGuestWatchlistTicker("AMAR.JK", st);
  assert.ok(r1 && r1.added, "AMAR.JK diterima = add");
  assert.deepEqual(r1!.list, ["OKTO", "BBRI", "AMAR.JK"], "list berisi AMAR.JK");
  const r2 = toggleGuestWatchlistTicker("AMAR.JK", st);
  assert.equal(r2!.added, false, "toggle AMAR.JK lagi = remove");
  assert.equal(toggleGuestWatchlistTicker("AMAR.JKX9", st), null, "suffix >4 char ditolak");
  assert.equal(toggleGuestWatchlistTicker("A B.JK", st), null, "spasi ditolak walau ada suffix");
});

test("[3] guest watchlist: JSON korup / oversized dibaca sebagai kosong", () => {
  const st = new MemStorage();
  st.setItem(GUEST_WATCHLIST_KEY, "{not json");
  assert.deepEqual(readGuestWatchlist(st), [], "JSON korup -> []");
  st.setItem(GUEST_WATCHLIST_KEY, "x".repeat(40 * 1024));
  assert.deepEqual(readGuestWatchlist(st), [], "oversized -> []");
  const stThrow: GuestStorage = {
    getItem: () => { throw new Error("quota"); },
    setItem: () => { throw new Error("quota"); },
    removeItem: () => { throw new Error("quota"); },
  };
  assert.deepEqual(readGuestWatchlist(stThrow), [], "storage throw -> [] (fail-open)");
  assert.equal(writeGuestWatchlist(["BBRI"], stThrow), false, "write throw -> false");
  clearGuestWatchlist(stThrow); // tidak boleh throw
});

test("[4] saved screens: save + dedupe by queryString + FIFO cap 10", () => {
  const st = new MemStorage();
  const s1 = saveScreen({ key: "swing", label: "GC swing", queryString: "view=screener&tab=swing-trade&preset=golden_cross" }, st);
  assert.equal(s1!.length, 1, "1 layar tersimpan");
  // save queryString sama (label beda) -> replace, bukan duplikat
  const s2 = saveScreen({ key: "swing", label: "GC swing 2", queryString: "view=screener&tab=swing-trade&preset=golden_cross" }, st);
  assert.equal(s2!.length, 1, "dedupe by queryString");
  assert.equal(s2![0].label, "GC swing 2", "label terbaru menang");
  // isi sampai >10 -> FIFO drop terlama
  for (let i = 0; i < 12; i++) {
    saveScreen({ key: `k${i}`, label: `L${i}`, queryString: `view=screener&tab=t&preset=p${i}` }, st);
  }
  const all = readSavedScreens(st);
  assert.equal(all.length, MAX_SAVED_SCREENS, `cap ${MAX_SAVED_SCREENS}`);
  assert.equal(all[0].label, "L11", "entry terbaru di depan");
  assert.ok(!all.some((s) => s.label === "L0" || s.label === "GC swing 2"), "terlama ter-FIFO");
});

test("[5] saved screens: validasi queryString (anti URL-absolut) + remove", () => {
  const st = new MemStorage();
  assert.equal(saveScreen({ key: "evil", label: "evil", queryString: "https://evil.com/x" }, st), null, "URL absolut ditolak");
  assert.equal(saveScreen({ key: "evil", label: "evil", queryString: "//evil.com" }, st), null, "protocol-relative ditolak");
  const saved = saveScreen({ key: "a", label: "A", queryString: "view=screener&preset=rsi_oversold" }, st)!;
  assert.equal(saved.length, 1);
  // data korup di storage -> parseSavedScreens memfilter
  st.setItem(SAVED_SCREENS_KEY, JSON.stringify([{ key: 1 }, { key: "k", label: "L", queryString: "view=ok", createdAt: "x" }, "junk"]));
  assert.equal(readSavedScreens(st).length, 1, "hanya entry valid yang lolos");
  removeSavedScreen("view=ok", st);
  assert.equal(readSavedScreens(st).length, 0, "remove by queryString");
});
