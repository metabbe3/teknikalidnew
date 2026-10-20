"use client";

/**
 * GuestStockTracker — client wrapper untuk page saham anon:
 * bump kuota harian sekali per ticker/hari + render meter.
 * Dipasang di halaman detail saham (server component parent).
 */
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { bumpGuestQuota, readGuestQuota, GuestQuotaMeter } from "./guest-quota-meter";

const SEEN_KEY = "teknikal:guest_quota_seen";

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function GuestStockTracker({ ticker }: { ticker: string }) {
  const { status } = useSession();
  const [views, setViews] = useState<number | null>(null);

  useEffect(() => {
    if (status !== "unauthenticated") return;
    try {
      const raw = localStorage.getItem(SEEN_KEY);
      const seen: { date: string; tickers: string[] } = raw
        ? JSON.parse(raw)
        : { date: today(), tickers: [] };
      if (seen.date !== today()) {
        seen.date = today();
        seen.tickers = [];
      }
      if (!seen.tickers.includes(ticker)) {
        seen.tickers.push(ticker);
        if (seen.tickers.length > 50) seen.tickers.shift();
        localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
        // Sinyal aktivitas nyata utk wizard (score step): stockVisits di teknikal:visitor.
        // use-registration-prompt hanya trackPageView() tanpa ticker, jadi jalur ini
        // yang mengisi stockVisits utk anon di halaman saham.
        try {
          const vraw = localStorage.getItem("teknikal:visitor");
          const v = vraw ? JSON.parse(vraw) : { firstVisitAt: Date.now(), totalPageViews: 1, stockVisits: {}, lastVisitedTickers: [] };
          if (typeof v.stockVisits !== "object" || v.stockVisits === null) v.stockVisits = {};
          v.stockVisits[ticker] = (v.stockVisits[ticker] ?? 0) + 1;
          v.lastVisitAt = Date.now();
          localStorage.setItem("teknikal:visitor", JSON.stringify(v));
          window.dispatchEvent(new Event("tek:visitor-updated"));
        } catch {
          // ignore
        }
        const q = bumpGuestQuota();
        // Beacon event utk admin analytics (Retention Loop v2): quotaViews = hitungan
        // ke-n hari itu. Fire-and-forget, gagal = diam.
        try {
          const body = JSON.stringify({
            target: "guest_quota",
            context: String(q.count),
            path: `/stocks/${ticker}`,
          });
          if (navigator.sendBeacon) navigator.sendBeacon("/api/track/share", body);
          else fetch("/api/track/share", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
        } catch {
          // ignore
        }
        // Server-side quota claim (cookie) — supaya RSC page render konten penuh
        // selama kuota tersisa (guest pass v2.1). Fire-and-forget.
        try {
          const gpBody = JSON.stringify({ ticker });
          if (navigator.sendBeacon) navigator.sendBeacon("/api/track/guest-pass", new Blob([gpBody], { type: "application/json" }));
          else fetch("/api/track/guest-pass", { method: "POST", headers: { "Content-Type": "application/json" }, body: gpBody, keepalive: true }).catch(() => {});
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore private mode
    }
    setViews(readGuestQuota().count);
  }, [status, ticker]);

  return views !== null ? <GuestQuotaMeter stockViews={views} /> : null;
}
