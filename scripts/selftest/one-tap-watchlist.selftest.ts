/**
 * Selftest prd-2026-11-15-01 (CTO night 15 Nov): one-tap watchlist (T3 unblock).
 *
 * Latar (PRD docs/agent-org/specs/prd-2026-11-15-01-one-tap-watchlist.md,
 * mandat CEO 11 Nov idea-2026-11-11-1): exit T2 terbesar di '/' (35 aktor) dan
 * '/stocks' (33) TANPA affordance simpan; empty-state /watchlist guest
 * anti-pattern "Cari saham"; definisi T3 funnel tak terkunci satu pintu.
 *
 * Failing-test-first: file ini dijalankan SEBELUM implementasi — [W1]..[W8]
 * harus GAGAL pada tree lama. Pasca-implementasi semua HIJAU.
 *
 * Run: npx tsx scripts/selftest/one-tap-watchlist.selftest.ts — Exit 0 = PASS.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  addManyGuestWatchlistTickers,
  type GuestStorage,
} from "../../src/lib/guest-storage";
import { T3_SAVE_LABELS } from "../../src/lib/funnel-labels";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, "..", "..");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

/** AC3 — definisi T3 satu pintu: konstanta terpusat, dipakai route funnel. */
test("[W1] funnel-v2 memakai T3_SAVE_LABELS dari satu pintu (bukan literal inline)", () => {
  const src = read("src/app/api/admin/funnel-v2/route.ts");
  assert.ok(src.includes("T3_SAVE_LABELS"), "funnel-v2 route harus merender label saved dari konstanta T3_SAVE_LABELS (anti drift definisi T3)");
});

test("[W2] definisi T3 = persis pantau_tambah|tg_pantau_klik — pantau_hapus BUKAN 'simpan'", () => {
  assert.deepEqual([...T3_SAVE_LABELS].sort(), ["pantau_tambah", "tg_pantau_klik"]);
  const src = read("src/app/api/admin/funnel-v2/route.ts");
  assert.ok(
    !/label IN \([^)]*'pantau_hapis'/.test(src) && !src.includes("'pantau_tambah','tg_pantau_klik','pantau_hapus'"),
    "CTE saved tidak boleh lagi memuat 'pantau_hapus' (hapus = unsaved; definisi PRD AC3)",
  );
});

/** AC1 — bintang one-tap di dua halaman traffic terbesar. */
test("[W3] /stocks: tabel top-30 punya kolom bintang GuestStar", () => {
  const src = read("src/app/(public)/stocks/page.tsx");
  assert.ok(src.includes('"@/components/stock/guest-star"'), "/stocks belum import GuestStar");
  const stars = src.match(/<GuestStar/g) ?? [];
  assert.ok(stars.length >= 1, `/stocks harus merender GuestStar per baris top-30, nemu ${stars.length}`);
});

test("[W4] home '/': hero signal cards (SnapshotCard) membawa bintang", () => {
  const home = read("src/app/(public)/page.tsx");
  assert.ok(/<SnapshotCard[^>]*star(\s|}|={|\/>)/.test(home.replace(/\n/g, " ")), "home harus pass prop star ke SnapshotCard");
  const card = read("src/components/berita/snapshot-card.tsx");
  assert.ok(card.includes("star?: boolean"), "SnapshotCard harus punya prop star?: boolean");
  assert.ok(card.includes('GuestStar'), "SnapshotCard harus merender GuestStar saat star aktif");
  // non-nested: bintang di wrapper DI LUAR <Link> (bukan button dalam anchor — HTML invalid)
  assert.ok(/star\s*\?\s*\(?\s*<div className="relative">/.test(card.replace(/\n/g, " ")) || /if \(star\)/.test(card), "GuestStar harus di-render di luar elemen <Link> kartu (wrapper relative)");
});

/** AC2 — empty-state preset kurasi 1-klik. */
test("[W5] /watchlist guest kosong: preset kurasi menggantikan CTA 'Cari saham'", () => {
  const view = read("src/components/watchlist/guest-watchlist-view.tsx");
  assert.ok(view.includes("WatchlistPresets"), "GuestWatchlistView harus merender WatchlistPresets di empty-state");
  const page = read("src/app/(public)/watchlist/page.tsx");
  assert.ok(page.includes("getWatchlistPresets"), "/watchlist harus fetch data preset server-side");
  const presets = read("src/components/watchlist/watchlist-presets.tsx");
  assert.ok(presets.includes("addMany"), "preset klik harus pakai addMany (batch, tanpa reload)");
});

test("[W6] preset Populer = snapshot SQL views /stocks 21d server-side (bukan runtime client)", () => {
  const lib = read("src/lib/watchlist-presets.ts");
  assert.ok(lib.includes("pageView.groupBy") || lib.includes("groupBy"), "preset Populer harus ranking PageView groupBy path");
  assert.ok(/21/.test(lib) && /createdAt/.test(lib), "window 21 hari wajib (breadth-rule qa-30-01)");
  assert.ok(lib.includes("TtlCache"), "preset data harus di-cache (pattern retention.service satu pintu)");
});

/** Infrastruktur batch — addMany di storage + hook. */
test("[W7] guest-storage addManyGuestWatchlistTickers: merge dedupe + validasi ticker (unit fungsional)", () => {
  const mem = new Map<string, string>();
  const storage: GuestStorage = {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => void mem.set(k, v),
    removeItem: (k) => void mem.delete(k),
  };
  const r1 = addManyGuestWatchlistTickers(["BBCA.JK", "BMRI.JK", "BBRI.JK", "bogus ticker!", "BBCA.JK"], storage);
  assert.ok(r1, "hasil addMany tidak boleh null pada storage sehat");
  assert.equal(r1?.addedCount, 3, `3 ticker valid ditambah (bogus didrop, dedupe), nemu ${r1?.addedCount}`);
  assert.deepEqual(r1?.list, ["BBCA.JK", "BMRI.JK", "BBRI.JK"]);
  const r2 = addManyGuestWatchlistTickers(["BBCA.JK", "TPIA.JK"], storage);
  assert.equal(r2?.addedCount, 1, "ticker yang sudah ada tidak dihitung ulang");
  assert.equal(r2?.list.length, 4);
});

test("[W8] hook use-guest-watchlist mengekspos addMany (event sinkron panel tanpa reload)", () => {
  const hook = read("src/hooks/use-guest-watchlist.ts");
  assert.ok(hook.includes("addMany"), "hook harus mengekspos addMany untuk preset batch");
  assert.ok(hook.includes("GUEST_WATCHLIST_EVENT"), "addMany harus dispatch GUEST_WATCHLIST_EVENT agar panel/guest-view sinkron");
});
