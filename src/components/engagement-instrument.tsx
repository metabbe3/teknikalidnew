"use client";

import { useEffect } from "react";

/**
 * Engagement telemetry beacon (prd-2026-10-10-01).
 * Captures dwell-time (15/60/180s), max scroll %, and CTA clicks, then batches
 * them to /api/public/engagement (queue ≥10, every 5s, and on
 * visibilitychange-hidden/pagehide via navigator.sendBeacon).
 *
 * Zero-touch: one global delegated click listener + fallback selectors —
 * existing star/copy/radar/screener components are NOT modified; new UI can
 * opt in with data-engagement="star_add|preset_copy|radar_open|preset_save".
 * No PII: anonId is a localStorage uuid. Renders null.
 */

const ENDPOINT = "/api/public/engagement";
const DWELL_TICKS = [15, 60, 180];
const MAX_BATCH = 10;

type EngEventType = "dwell_tick" | "scroll_max" | "cta_click" | "nav_click";

interface QueuedEvent {
  type: EngEventType;
  label?: string | null;
  valueNum?: number | null;
  path: string;
}

// ponytail: module-level singleton — a ref flag only guards one instance; this
// also survives any accidental double-mount of the component.
let installed = false;
let anonId = "";
const queue: QueuedEvent[] = [];

function getAnonId(): string {
  let id = localStorage.getItem("eng_anon");
  if (!id) {
    id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    localStorage.setItem("eng_anon", id);
  }
  return id;
}

function currentPath(): string {
  // pathname only — query string stripped, capped to schema max
  return window.location.pathname.slice(0, 255);
}

function flush(useBeacon: boolean): void {
  try {
    if (queue.length === 0 || !anonId) return;
    const payload = JSON.stringify({ anonId, events: queue.splice(0, MAX_BATCH) });
    if (useBeacon && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: "application/json" }));
      return;
    }
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // silent — telemetry must never break the page
  }
}

function push(ev: QueuedEvent): void {
  queue.push(ev);
  if (queue.length >= MAX_BATCH) flush(false);
}

/** cta_click programmatic — PRD prd-2026-10-26-01 AC3: impression sheet register
 *  dihitung tanpa endpoint baru (reuse queue/endpoint existing); langsung flush
 *  agar impresi tidak hilang kalau user segera navigasi. */
export function trackCtaEvent(label: string): void {
  if (typeof window === "undefined") return;
  push({ type: "cta_click", label, path: currentPath() });
  flush(false);
}

/** Resolve a CTA label for a click target; null = not a tracked CTA. */
function ctaLabel(target: EventTarget | null): string | null {
  const el = target instanceof Element ? target : null;
  if (!el) return null;
  const tagged = el.closest<HTMLElement>("[data-engagement]");
  if (tagged?.dataset.engagement) return tagged.dataset.engagement;
  // Fallback selectors for existing components (zero-touch, best-effort)
  if (el.closest("[class*='GuestStar']")) return "star_add";
  if (el.closest("button[class*='copy' i], [data-copy]")) return "preset_copy";
  const cbtn = el.closest("button");
  if (cbtn && /copy\s*link|salin\s*tautan/i.test(cbtn.textContent ?? "")) return "preset_copy";
  if (el.closest("article a[href='/stocks']")) return "radar_open";
  if (el.closest("[class*='SaveScreen' i]")) return "preset_save";
  const btn = el.closest("button");
  if (btn && /simpan\s+(screen|preset)/i.test(btn.textContent ?? "")) return "preset_save";
  return null;
}

/**
 * nav_click (28 Okt, owner: "semua button navigasi antar-page harus ter-track"):
 * label utk KLIK yang meninggalkan/mengubah halaman — <a href> internal,
 * <button> yang navigate (router.push/window.location), dan anchor in-page.
 * Sistematis: satu titik ini menangkap SEMUA navigasi tanpa menandai tombol
 * satu per satu. Label pendek = `nav:<action>→<dest>` (cap 32 char kolom).
 */
function navClickLabel(target: EventTarget | null): string | null {
  const el = target instanceof Element ? target : null;
  if (!el) return null;

  // 1) Anchor internal (bukan external/href='#'/download)
  const a = el.closest("a[href]");
  if (a) {
    const href = a.getAttribute("href") ?? "";
    // pure-hash (#chart) = in-page jump, bukan navigasi page — skip biar tak
    // banjir noise nav:home dari sticky nav section.
    if (href.startsWith("#") || href === "") return null;
    if (!/^(https?:|mailto:|tel:)/i.test(href) && !a.hasAttribute("download")) {
      const clean = href.split(/[?#]/)[0] || "/";
      const seg = clean.split("/").filter(Boolean).slice(0, 2).join("_");
      return `nav:${seg || "home"}`;
    }
    return null;
  }

  // 2) Button yang navigate via JS — deteksi heuristik teks umum
  const b = el.closest("button");
  if (b) {
    const t = (b.textContent ?? "").trim().toLowerCase();
    if (/^(lihat|buka|mulai|daftar|login|masuk|lanjut|cari|bandingkan|pelajari|baca|lihat semua|selengkapnya|mulai gratis)/.test(t) || /lihat semua|selengkapnya|mulai gratis/.test(t)) {
      const seg = t.replace(/[^a-z0-9 ]/g, "").slice(0, 20);
      return `nav:${seg.replace(/\s+/g, "_").slice(0, 24)}`;
    }
  }
  return null;
}

export function EngagementInstrument() {
  useEffect(() => {
    if (installed || typeof window === "undefined") return;
    installed = true;

    try {
      anonId = getAnonId();

      // dwell_tick at 15s/60s/180s (wall-clock based so tab throttling
      // doesn't underreport; ticks fire on catch-up, then the timer stops)
      const start = Date.now();
      let ticksSent = 0;
      const dwellTimer = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - start) / 1000);
        while (ticksSent < DWELL_TICKS.length && elapsed >= DWELL_TICKS[ticksSent]) {
          push({ type: "dwell_tick", valueNum: DWELL_TICKS[ticksSent], path: currentPath() });
          ticksSent++;
        }
        if (ticksSent >= DWELL_TICKS.length) window.clearInterval(dwellTimer);
      }, 1000);

      // scroll_max — track the max % reached; emit once (flag) on the next
      // flush boundary or pagehide so it carries the deepest value seen
      let maxScroll = 0;
      let scrollSent = false;
      const onScroll = () => {
        try {
          const denom = Math.max(document.documentElement.scrollHeight, 1);
          const pct = Math.round(((window.scrollY + window.innerHeight) / denom) * 100);
          maxScroll = Math.max(maxScroll, Math.min(Math.max(pct, 0), 100));
        } catch {
          // silent
        }
      };
      window.addEventListener("scroll", onScroll, { passive: true });

      const flushWithScroll = (useBeacon: boolean) => {
        if (!scrollSent && maxScroll > 0) {
          scrollSent = true;
          queue.push({ type: "scroll_max", valueNum: maxScroll, path: currentPath() });
        }
        flush(useBeacon);
      };

      // cta_click — delegated document listener, zero-touch on components
      const onClick = (e: MouseEvent) => {
        try {
          const label = ctaLabel(e.target);
          if (label) push({ type: "cta_click", label, path: currentPath() });
          // nav_click — semua navigasi antar-page/anchor (28 Okt); cta_label
          // eksplisit tetap menang utk tombol yang ter-tag.
          const nav = navClickLabel(e.target);
          if (nav) push({ type: "nav_click", label: nav.slice(0, 32), path: currentPath() });
        } catch {
          // silent
        }
      };
      document.addEventListener("click", onClick, { passive: true });

      const onVisibility = () => {
        if (document.visibilityState === "hidden") flushWithScroll(true);
      };
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("pagehide", () => flushWithScroll(true));

      window.setInterval(() => flushWithScroll(false), 5000);
    } catch {
      // silent — telemetry must never break the page
    }
  }, []);

  return null;
}
