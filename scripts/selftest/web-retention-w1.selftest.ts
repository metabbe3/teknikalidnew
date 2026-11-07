/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Selftest: W1 Web Retention — Freemium 3 Saham + Banner Dua Lapis + Upsell Deeplink
 * Run: npx tsx scripts/selftest/web-retention-w1.selftest.ts
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SessionProvider } from "next-auth/react";
import * as parse5 from "parse5";

import {
  evaluateGuestQuotaVisit,
  GUEST_STOCKS_STORAGE_KEY,
} from "../../src/lib/guest-quota";
import {
  GuestTradingPlanGate,
  GuestQuota,
} from "../../src/components/stock/guest-quota";
import { GuestOverlimitBanner } from "../../src/components/ui/guest-overlimit-banner";
import {
  GuestInlineUpsell,
  checkAndMarkInlineUpsell,
  SESSION_INLINE_UPSELL_KEY,
} from "../../src/components/stock/guest-inline-upsell";
import type { TradingPlan } from "../../src/lib/trading-plan";

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
          const found = find(node, (n) => n.attrs?.some((a: any) => a.name === attr));
          return wrap(found);
        }
        if (sel.startsWith("#")) {
          const id = sel.slice(1);
          const found = find(
            node,
            (n) => n.attrs?.find((a: any) => a.name === "id")?.value === id
          );
          return wrap(found);
        }
        const found = find(node, (n) => n.tagName === sel);
        return wrap(found);
      },
      querySelectorAll(sel: string) {
        let results: any[] = [];
        if (sel.startsWith("[") && sel.endsWith("]")) {
          const attr = sel.slice(1, -1);
          results = findAll(node, (n) => n.attrs?.some((a: any) => a.name === attr));
        } else if (sel.startsWith("#")) {
          const id = sel.slice(1);
          results = findAll(
            node,
            (n) => n.attrs?.find((a: any) => a.name === "id")?.value === id
          );
        } else {
          results = findAll(node, (n) => n.tagName === sel);
        }
        return results.map(wrap) as WrappedElement[];
      },
    };
  }

  return wrap(fragment)!;
}

let failed = 0;
function check(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) {
    failed++;
    if (detail) console.log(`      ${detail}`);
  }
}

async function main() {
  console.log("=== SELFTEST: W1 WEB RETENTION ===");

  // 1. GuestQuota: 3 ticker pertama terbuka, ke-4 ter-blur; reset di tanggal baru
  {
    const storage = new MockStorage();
    const day1 = new Date("2026-11-07T10:00:00Z");

    const r1 = evaluateGuestQuotaVisit("BBCA", { isAuthed: false, storage, now: day1 });
    check("1a. Kunjungan 1 BBCA terbuka", !r1.isGated && r1.tickers.length === 1);

    const r2 = evaluateGuestQuotaVisit("BBRI", { isAuthed: false, storage, now: day1 });
    check("1b. Kunjungan 2 BBRI terbuka", !r2.isGated && r2.tickers.length === 2);

    const r3 = evaluateGuestQuotaVisit("BMRI", { isAuthed: false, storage, now: day1 });
    check("1c. Kunjungan 3 BMRI terbuka", !r3.isGated && r3.tickers.length === 3);

    const rRevisit = evaluateGuestQuotaVisit("BBCA", { isAuthed: false, storage, now: day1 });
    check("1d. Revisit BBCA tetap terbuka", !rRevisit.isGated && rRevisit.tickers.length === 3);

    const r4 = evaluateGuestQuotaVisit("ASII", { isAuthed: false, storage, now: day1 });
    check("1e. Kunjungan 4 ASII ter-blur (gated)", r4.isGated && r4.tickers.length === 3);

    const day2 = new Date("2026-11-08T10:00:00Z");
    const r5 = evaluateGuestQuotaVisit("ASII", { isAuthed: false, storage, now: day2 });
    check("1f. Rollover tanggal baru reset kuota (ASII terbuka)", !r5.isGated && r5.tickers.length === 1);
  }

  // 2. Konten premium TIDAK ada di DOM saat ter-blur (assert querySelector null pada data-premium)
  {
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

    const openHtml = renderToStaticMarkup(
      React.createElement(
        SessionProvider,
        { session: null },
        React.createElement(GuestTradingPlanGate, {
          ticker: "BBCA",
          plan: dummyPlan,
          forceOverLimit: false,
        })
      )
    );
    const openDom = parseHtml(openHtml);
    check(
      "2a. data-premium ADA di DOM saat within quota",
      openDom.querySelector("[data-premium]")?.getAttribute("data-premium") === "trading-plan"
    );

    const blurredHtml = renderToStaticMarkup(
      React.createElement(
        SessionProvider,
        { session: null },
        React.createElement(GuestTradingPlanGate, {
          ticker: "ASII",
          plan: dummyPlan,
          forceOverLimit: true,
        })
      )
    );
    const blurredDom = parseHtml(blurredHtml);
    check(
      "2b. data-premium NULL di DOM saat ter-blur (TradingPlanGate)",
      blurredDom.querySelector("[data-premium]") === null
    );

    const blurredWrap = renderToStaticMarkup(
      React.createElement(
        SessionProvider,
        { session: null },
        React.createElement(
          GuestQuota,
          { ticker: "ASII", forceOverLimit: true },
          React.createElement("div", { id: "secret-data" }, "SECRET")
        )
      )
    );
    const wrapDom = parseHtml(blurredWrap);
    check(
      "2c. data-premium NULL di DOM saat ter-blur (GuestQuota wrapper)",
      wrapDom.querySelector("[data-premium]") === null && wrapDom.querySelector("#secret-data") === null
    );
  }

  // 3. Banner: dua label cta_click berbeda terkirim saat klik
  {
    const bannerHtml = renderToStaticMarkup(
      React.createElement(
        SessionProvider,
        { session: null },
        React.createElement(GuestOverlimitBanner, { ticker: "BBCA", forceShow: true })
      )
    );
    const dom = parseHtml(bannerHtml);
    const ctas = dom.querySelectorAll("[data-engagement]");
    const labels = ctas.map((el) => el.getAttribute("data-engagement"));
    const hasReg = labels.includes("reg_free_banner");
    const hasAgent = labels.includes("agent_deeplink_banner");
    check("3a. Banner memuat label reg_free_banner", hasReg);
    check("3b. Banner memuat label agent_deeplink_banner", hasAgent);
    check("3c. Label CTA lapis 1 dan lapis 2 berbeda", hasReg && hasAgent && "reg_free_banner" !== "agent_deeplink_banner");

    const tgLink = ctas.find((el) => el.getAttribute("data-engagement") === "agent_deeplink_banner");
    const href = tgLink?.getAttribute("href") ?? "";
    check("3d. Deeplink membawa tag src_stock_BBCA", href.includes("t.me/TeknikalidAgentBot?start=src_stock_BBCA"));
  }

  // 4. Inline strip: muncul 1x per sesi saja
  {
    const sessionStorage = new MockStorage();
    const show1 = checkAndMarkInlineUpsell(sessionStorage);
    check("4a. Kunjungan pertama sesi: inline strip tampil (true)", show1 === true);
    check("4b. sessionStorage tersimpan flag 1x", sessionStorage.getItem(SESSION_INLINE_UPSELL_KEY) === "1");

    const show2 = checkAndMarkInlineUpsell(sessionStorage);
    check("4c. Kunjungan kedua sesi yang sama: inline strip tidak tampil (false)", show2 === false);

    sessionStorage.clear();
    const showNew = checkAndMarkInlineUpsell(sessionStorage);
    check("4d. Sesi baru: inline strip kembali tampil 1x", showNew === true);

    const html = renderToStaticMarkup(
      React.createElement(
        SessionProvider,
        { session: null },
        React.createElement(GuestInlineUpsell, { ticker: "BBCA", initialShow: true })
      )
    );
    const dom = parseHtml(html);
    const cta = dom.querySelector("[data-engagement]");
    check(
      "4e. Label inline strip = agent_deeplink_inline",
      cta?.getAttribute("data-engagement") === "agent_deeplink_inline"
    );
    check(
      "4f. Deeplink inline strip = src_ask_BBCA",
      (cta?.getAttribute("href") ?? "").includes("t.me/TeknikalidAgentBot?start=src_ask_BBCA")
    );
  }

  // 5. Logged-in: tidak ada GuestQuota yang jalan (perilaku lama)
  {
    const storage = new MockStorage();
    const day = new Date("2026-11-07T10:00:00Z");
    let allOpen = true;
    for (let i = 1; i <= 10; i++) {
      const res = evaluateGuestQuotaVisit(`STOCK${i}`, { isAuthed: true, storage, now: day });
      if (res.isGated) allOpen = false;
    }
    check("5a. Logged-in user buka 10 saham berbeda: semua terbuka (isGated=false)", allOpen);
    check("5b. Storage guest quota tidak berubah/tersentuh", storage.getItem(GUEST_STOCKS_STORAGE_KEY) === null);

    const authedSession = {
      user: { name: "Trader Pro", email: "pro@teknikal.id" },
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
      React.createElement(
        SessionProvider,
        { session: authedSession },
        React.createElement(GuestTradingPlanGate, {
          ticker: "ADRO",
          plan: dummyPlan,
          isAuthed: true,
        })
      )
    );
    const dom = parseHtml(html);
    check("5c. Logged-in: konten trading plan ada di DOM (data-premium)", dom.querySelector("[data-premium]") !== null);
    check("5d. Logged-in: banner overlimit tidak dirender", dom.querySelector("[data-testid='guest-overlimit-banner']") === null);
  }

  console.log(`\nRESULT: ${failed === 0 ? "ALL PASS" : `${failed} FAILED`}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("FATAL ERROR in selftest:", err);
  process.exit(1);
});
