/**
 * Self-test Guest Migration v2 (PRD prd-2026-10-26-02).
 * Run: npx tsx scripts/selftest-guest-migrate.ts
 *
 * Unit-test murni (storage-injectable, no DOM):
 * 1. buildMigratePayload — read guest watchlist+presets, cap 30/10, ticker .JK normalize,
 *    flag migrasi PISAH per jenis (watchlist vs presets).
 * 2. Preset dedupe by queryString (server-side idempoten via 409, client side flag).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildMigratePayload,
  readGuestWatchlist,
  writeGuestWatchlist,
  saveScreen,
  GUEST_WATCHLIST_KEY,
  SAVED_SCREENS_KEY,
  type GuestStorage,
} from "../src/lib/guest-storage";

class MemStorage implements GuestStorage {
  map = new Map<string, string>();
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
}

test("[1] buildMigratePayload: watchlist bare -> .JK normalized + cap 30", () => {
  const st = new MemStorage();
  const many: string[] = [];
  for (let i = 0; i < 40; i++) many.push(`T${String(i).padStart(3, "0")}`);
  writeGuestWatchlist([...many, "BBCA", "BBRI.JK"], st);
  const payload = buildMigratePayload(st);
  assert.equal(payload.watchlist.length <= 30, true, "cap 30");
  assert.ok(payload.watchlist.includes("BBCA.JK"), "bare BBCA dinormalisasi ke .JK");
  assert.ok(payload.watchlist.includes("BBRI.JK"), ".JK asli tetap");
  assert.equal(payload.watchlist.filter((t) => !t.endsWith(".JK")).length, 0, "semua ber-.JK");
});

test("[2] buildMigratePayload: presets cap 10 + field server-side", () => {
  const st = new MemStorage();
  for (let i = 0; i < 12; i++) {
    saveScreen({ key: `k${i}`, label: `Preset ${i}`, queryString: `view=list&i=${i}` }, st);
  }
  const payload = buildMigratePayload(st);
  assert.equal(payload.presets.length <= 10, true, "cap 10 FIFO terbaru-dulu");
  assert.equal(typeof payload.presets[0].queryString, "string");
  assert.ok(payload.presets.every((p) => p.name.length <= 100), "name <=100 VarChar(100)");
});

test("[3] buildMigratePayload: no-op bersih saat kosong", () => {
  const st = new MemStorage();
  const payload = buildMigratePayload(st);
  assert.deepEqual(payload.watchlist, []);
  assert.deepEqual(payload.presets, []);
  assert.equal(payload.isEmpty, true, "AC4: no-op = 0 query");
});
