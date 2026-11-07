/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Test Suite W1: WEB RETENTION — Freemium 3 Saham + Banner Dua Lapis + Upsell Deeplink
 * Memvalidasi 5 acceptance criteria sesuai brief build:
 * 1. GuestQuota: 3 ticker pertama terbuka, ke-4 ter-blur; reset di tanggal baru.
 * 2. Konten premium TIDAK ada di DOM saat ter-blur (assert querySelector null pada data-premium).
 * 3. Banner: dua label cta_click berbeda terkirim saat klik.
 * 4. Inline strip: muncul 1x per sesi saja.
 * 5. Logged-in: tidak ada GuestQuota yang jalan (perilaku lama).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SessionProvider } from "next-auth/react";
import * as parse5 from "parse5";

import {
  evaluateGuestQuotaVisit,
  GUEST_STOCKS_STORAGE_KEY,
} from "../src/lib/guest-quota";
import {
  GuestTradingPlanGate,
  GuestQuota,
} from "../src/components/stock/guest-quota";
import { GuestOverlimitBanner } from "../src/components/ui/guest-overlimit-banner";
import {
  GuestInlineUpsell,
  checkAndMarkInlineUpsell,
  SESSION_INLINE_UPSELL_KEY,
} from "../src/components/stock/guest-inline-upsell";
import type { TradingPlan } from "../src/lib/trading-plan";

// Mock implementation of Web Storage API
class MockStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

// Lightweight DOM wrapper using parse5
interface WrappedElement {
  tagName: string;
  getAttribute(name: string): string | null;
  hasAttribute(name: string): boolean;
  querySelector(sel: string): WrappedElement | null;
  querySelectorAll(sel: string): WrappedElement[];
}

function parseHtml(html: string): WrappedElement {
  const fragment = parse5.parseFragment(html);

  function find(node: any, predicate: (n: any) => boolean): any {
    if (!node) return null;
    if (predicate(node)) return node;
    if (node.childNodes) {
      for (const child of node.childNodes) {
        const found = find(child, predicate);
        if (found) return found;
      }
    }
    return null;
  }

  function findAll(node: any, predicate: (n: any) => boolean, acc: any[] = []): any[] {
    if (!node) return acc;
    if (predicate(node)) acc.push(node);
    if (node.childNodes) {
      for (const child of node.childNodes) {
        findAll(child, predicate, acc);
      }
    }
    return acc;
  }

  function wrap(node: any): WrappedElement | null {
    if (!node) return null;
    return {
      tagName: node.tagName ?? "",
      getAttribute(name: string) {
        return node.attrs?.find((a: any) => a.name === name)?.value ?? null;
      },
      hasAttribute(name: string) {
        return node.attrs?.some((a: any) => a.name === name) ?? false;
      },
      querySelector(sel: string) {
        if (sel.startsWith("[") && sel.endsWith("]")) {
          const attr = sel.slice(1, -1);
          const found = find(node, (n: any) => n.attrs?.some((a: any) => a.name === attr));
          return wrap(found);
        }
        if (sel.startsWith("#")) {
          const id = sel.slice(1);
          const found = find(
            node,
            (n: any) => n.attrs?.find((a: any) => a.name === "id")?.value === id
          );
          return wrap(found);
        }
        const found = find(node, (n: any) => n.tagName === sel);
        return wrap(found);
      },
      querySelectorAll(sel: string) {
        let results: any[] = [];
        if (sel.startsWith("[") && sel.endsWith("]")) {
          const attr = sel.slice(1, -1);
          results = findAll(node, (n: any) => n.attrs?.some((a: any) => a.name === attr));
        } else if (sel.startsWith("#")) {
          const id = sel.slice(1);
          results = findAll(
            node,
            (n: any) => n.attrs?.find((a: any) => a.name === "id")?.value === id
          );
        } else {
          results = findAll(node, (n: any) => n.tagName === sel);
        }
        return results.map(wrap) as WrappedElement[];
      },
    };
  }

  return wrap(fragment)!;
}

describe("W1 Retention — Web Freemium & Upsell", () => {
  it("1. GuestQuota: 3 ticker pertama terbuka, ke-4 ter-blur; reset di tanggal baru", () => {
    const storage = new MockStorage();
    const day1 = new Date("2026-11-07T10:00:00Z");

    // Kunjungan 1: BBCA -> terbuka
    const r1 = evaluateGuestQuotaVisit("BBCA", { isAuthed: false, storage, now: day1 });
    assert.equal(r1.isGated, false);
    assert.deepEqual(r1.tickers, ["BBCA"]);

    // Kunjungan 2: BBRI -> terbuka
    const r2 = evaluateGuestQuotaVisit("BBRI", { isAuthed: false, storage, now: day1 });
    assert.equal(r2.isGated, false);
    assert.deepEqual(r2.tickers, ["BBCA", "BBRI"]);

    // Kunjungan 3: BMRI -> terbuka
    const r3 = evaluateGuestQuotaVisit("BMRI", { isAuthed: false, storage, now: day1 });
    assert.equal(r3.isGated, false);
    assert.deepEqual(r3.tickers, ["BBCA", "BBRI", "BMRI"]);

    // Kunjungan ulang ke saham yang sudah dibuka (BBCA) -> tetap terbuka
    const rRevisit = evaluateGuestQuotaVisit("BBCA", { isAuthed: false, storage, now: day1 });
    assert.equal(rRevisit.isGated, false);
    assert.deepEqual(rRevisit.tickers, ["BBCA", "BBRI", "BMRI"]);

    // Kunjungan 4 (ticker baru ASII saat kuota 3 sudah habis) -> ter-blur (isGated: true)
    const r4 = evaluateGuestQuotaVisit("ASII", { isAuthed: false, storage, now: day1 });
    assert.equal(r4.isGated, true, "Ticker ke-4 harus ter-blur (gated)");
    assert.deepEqual(r4.tickers, ["BBCA", "BBRI", "BMRI"]); // ASII tidak masuk kuota gratis

    // Rollover ke tanggal baru (besok: 2026-11-08) -> kuota otomatis reset
    const day2 = new Date("2026-11-08T10:00:00Z");
    const r5 = evaluateGuestQuotaVisit("ASII", { isAuthed: false, storage, now: day2 });
    assert.equal(r5.isGated, false, "Rollover ke tanggal baru harus mereset kuota");
    assert.deepEqual(r5.tickers, ["ASII"]);
  });

  it("2. Konten premium TIDAK ada di DOM saat ter-blur (assert querySelector null pada data-premium)", () => {
    const dummyPlan: TradingPlan = {
      strategy: "BUY_ON_WEAKNESS",
      status: "TRADEABLE",
      entry: 10000,
      entryZone: "9900 - 10050",
      tp1: 10500,
      tp1Source: "R1",
      tp2: 11000,
      tp2Source: "R2",
      sl: 9500,
      slSource: "S1",
      riskReward: 1.5,
      confidence: "high",
      warnings: [],
      suggestion: "Antri beli di area support",
    };

    // 2a. Saat terbuka (kuota belum habis / within quota): data-premium ADA di DOM
    const openHtml = renderToStaticMarkup(
      <SessionProvider session={null}>
        <GuestTradingPlanGate
          ticker="BBCA"
          plan={dummyPlan}
          forceOverLimit={false}
        />
      </SessionProvider>
    );
    const openDom = parseHtml(openHtml);
    assert.notEqual(openDom.querySelector("[data-premium]"), null);
    assert.equal(
      openDom.querySelector("[data-premium]")?.getAttribute("data-premium"),
      "trading-plan"
    );

    // 2b. Saat ter-blur (kuota habis / overlimit): data-premium TIDAK ADA di DOM (null)
    const blurredHtml = renderToStaticMarkup(
      <SessionProvider session={null}>
        <GuestTradingPlanGate
          ticker="ASII"
          plan={dummyPlan}
          forceOverLimit={true}
        />
      </SessionProvider>
    );
    const blurredDom = parseHtml(blurredHtml);
    assert.strictEqual(
      blurredDom.querySelector("[data-premium]"),
      null,
      "data-premium harus NULL di DOM saat ter-blur"
    );

    // 2c. Uji juga pada GuestQuota wrapper umum:
    const openWrapHtml = renderToStaticMarkup(
      <SessionProvider session={null}>
        <GuestQuota ticker="BBCA" forceOverLimit={false}>
          <div id="real-secret">Rahasia Analisis</div>
        </GuestQuota>
      </SessionProvider>
    );
    const openWrapDom = parseHtml(openWrapHtml);
    assert.notEqual(openWrapDom.querySelector("[data-premium]"), null);
    assert.notEqual(openWrapDom.querySelector("#real-secret"), null);

    const blurredWrapHtml = renderToStaticMarkup(
      <SessionProvider session={null}>
        <GuestQuota ticker="ASII" forceOverLimit={true}>
          <div id="real-secret">Rahasia Analisis</div>
        </GuestQuota>
      </SessionProvider>
    );
    const blurredWrapDom = parseHtml(blurredWrapHtml);
    assert.strictEqual(
      blurredWrapDom.querySelector("[data-premium]"),
      null,
      "GuestQuota wrapper: data-premium harus NULL saat ter-blur"
    );
    assert.strictEqual(
      blurredWrapDom.querySelector("#real-secret"),
      null,
      "GuestQuota wrapper: konten rahasia tidak boleh dirender di DOM saat ter-blur"
    );
  });

  it("3. Banner: dua label cta_click berbeda terkirim saat klik", () => {
    const bannerHtml = renderToStaticMarkup(
      <SessionProvider session={null}>
        <GuestOverlimitBanner ticker="BBCA" forceShow={true} />
      </SessionProvider>
    );
    const dom = parseHtml(bannerHtml);

    // Cari elemen-elemen CTA
    const ctas = dom.querySelectorAll("[data-engagement]");
    assert.ok(ctas.length >= 2, "Harus ada minimal 2 CTA bertag data-engagement");

    const labels = ctas.map((el) => el.getAttribute("data-engagement"));
    assert.ok(labels.includes("reg_free_banner"), "Lapis 1 harus berlabel reg_free_banner");
    assert.ok(
      labels.includes("agent_deeplink_banner"),
      "Lapis 2 harus berlabel agent_deeplink_banner"
    );
    assert.notEqual(
      "reg_free_banner",
      "agent_deeplink_banner",
      "Label lapis 1 dan lapis 2 harus berbeda"
    );

    // Periksa link deeplink lapis 2 membawa tag source src_stock_BBCA
    const tgLink = ctas.find(
      (el) => el.getAttribute("data-engagement") === "agent_deeplink_banner"
    );
    assert.ok(
      tgLink?.getAttribute("href")?.includes("t.me/TeknikalidAgentBot?start=src_stock_BBCA"),
      "Deeplink lapis 2 harus membawa format src_stock_{ticker}"
    );
  });

  it("4. Inline strip: muncul 1x per sesi saja", () => {
    const sessionStorage = new MockStorage();

    // Sesi baru: kunjungan pertama -> strip harus muncul (true)
    const show1 = checkAndMarkInlineUpsell(sessionStorage);
    assert.equal(show1, true, "Kunjungan pertama dalam sesi harus menampilkan strip");
    assert.equal(sessionStorage.getItem(SESSION_INLINE_UPSELL_KEY), "1");

    // Kunjungan kedua dalam sesi yang sama (misal buka saham lain) -> TIDAK muncul (false)
    const show2 = checkAndMarkInlineUpsell(sessionStorage);
    assert.equal(show2, false, "Kunjungan kedua dalam sesi yang sama TIDAK boleh muncul lagi");

    // Kunjungan ketiga dalam sesi yang sama -> tetap false
    const show3 = checkAndMarkInlineUpsell(sessionStorage);
    assert.equal(show3, false, "Kunjungan ketiga tetap tidak muncul");

    // Sesi baru dimulai (sessionStorage bersih) -> kembali muncul 1x
    sessionStorage.clear();
    const showNewSession = checkAndMarkInlineUpsell(sessionStorage);
    assert.equal(showNewSession, true, "Sesi baru kembali menampilkan 1x");

    // Render HTML GuestInlineUpsell dengan initialShow=true dan assert label & deeplink
    const html = renderToStaticMarkup(
      <SessionProvider session={null}>
        <GuestInlineUpsell ticker="BBCA" initialShow={true} />
      </SessionProvider>
    );
    const dom = parseHtml(html);
    const cta = dom.querySelector("[data-engagement]");
    assert.equal(
      cta?.getAttribute("data-engagement"),
      "agent_deeplink_inline",
      "Label inline strip harus agent_deeplink_inline"
    );
    assert.ok(
      cta?.getAttribute("href")?.includes("t.me/TeknikalidAgentBot?start=src_ask_BBCA"),
      "Deeplink inline strip harus berformat src_ask_{ticker}"
    );
  });

  it("5. Logged-in: tidak ada GuestQuota yang jalan (perilaku lama)", () => {
    const storage = new MockStorage();
    const day = new Date("2026-11-07T10:00:00Z");

    // User logged-in membuka 10 saham berbeda berturut-turut:
    const tickers = [
      "BBCA",
      "BBRI",
      "BMRI",
      "BBNI",
      "ASII",
      "TLKM",
      "UNVR",
      "GOTO",
      "AMMN",
      "ADRO",
    ];
    for (const t of tickers) {
      const res = evaluateGuestQuotaVisit(t, { isAuthed: true, storage, now: day });
      assert.equal(res.isGated, false, `Logged-in user tidak boleh digate pada saham ${t}`);
    }

    // Storage guest kuota TIDAK tersentuh oleh kunjungan user logged-in
    assert.equal(storage.getItem(GUEST_STOCKS_STORAGE_KEY), null);

    // Render komponen dengan user logged in:
    const authedSession = {
      user: { id: "user-1", name: "Trader Pro", email: "pro@teknikal.id" },
      expires: "2099-01-01",
    };

    const dummyPlan: TradingPlan = {
      strategy: "BUY_ON_WEAKNESS",
      status: "TRADEABLE",
      entry: 10000,
      entryZone: "9900 - 10050",
      tp1: 10500,
      tp1Source: "R1",
      tp2: 11000,
      tp2Source: "R2",
      sl: 9500,
      slSource: "S1",
      riskReward: 1.5,
      confidence: "high",
      warnings: [],
      suggestion: "Antri beli di area support",
    };

    const html = renderToStaticMarkup(
      <SessionProvider session={authedSession as any}>
        <GuestTradingPlanGate
          ticker="ADRO"
          plan={dummyPlan}
          isAuthed={true}
        />
      </SessionProvider>
    );
    const dom = parseHtml(html);
    // Trading plan tetap terbuka (data-premium ada)
    assert.notEqual(dom.querySelector("[data-premium]"), null);
    // Overlimit banner tidak ada sama sekali
    assert.strictEqual(dom.querySelector("[data-testid='guest-overlimit-banner']"), null);
  });
});
