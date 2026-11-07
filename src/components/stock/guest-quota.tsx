"use client";

/**
 * GuestQuota (W1a, plan 2026-11-07):
 * Client component gating kuota freemium 3 saham per hari untuk guest:
 * - Menjaga SSR tetap penuh untuk crawler / SEO.
 * - Setelah hidrasi, mengevaluasi `tk_guest_stocks_v1`.
 * - Jika > 3 saham: konten trading plan dan rincian skor diganti overlay blur ringan + GuestOverlimitBanner.
 * - Konten premium TIDAK dirender ke DOM saat ter-blur.
 * - Logged-in user: 100% perilaku lama (bebas akses, tanpa gating).
 */

import React, { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { TradingPlan } from "@/lib/trading-plan";
import type { McResult } from "@/lib/monte-carlo";
import { TradingPlanCard } from "@/components/stock/trading-plan-card";
import { SignalBreakdownDetails } from "@/components/stock/signal-breakdown-details";
import { GuestOverlimitBanner } from "@/components/ui/guest-overlimit-banner";
import { GuestInlineUpsell } from "@/components/stock/guest-inline-upsell";
import {
  evaluateGuestQuotaVisit,
  normalizeTicker,
  isGuestStockGated,
  readGuestStocksQuota,
} from "@/lib/guest-quota";

interface BreakdownItem {
  name: string;
  sentiment: "positif" | "negatif" | "netral";
  weight: number;
}

interface GuestQuotaContextType {
  isOverLimit: boolean;
  isAuthed: boolean;
  ticker: string;
  mounted: boolean;
  tickers: string[];
}

const emptySubscribe = () => () => {};

// Referensi stabil — getSnapshot useSyncExternalStore TIDAK BOLEH balik array baru
// (bug 7 Nov: infinite re-render React #185 "Maximum update depth exceeded").
const EMPTY_TICKERS: string[] = [];
let cachedTickers: string[] = EMPTY_TICKERS;
let cachedTickersKey = "";
function stableGuestTickers(): string[] {
  const state = readGuestStocksQuota();
  const key = state.date + "|" + state.tickers.join(",");
  if (key !== cachedTickersKey) {
    cachedTickersKey = key;
    cachedTickers = state.tickers;
  }
  return cachedTickers;
}

const GuestQuotaContext = createContext<GuestQuotaContextType | null>(null);

export function useGuestQuota(): GuestQuotaContextType {
  const ctx = useContext(GuestQuotaContext);
  if (!ctx) {
    return {
      isOverLimit: false,
      isAuthed: false,
      ticker: "",
      mounted: false,
      tickers: [],
    };
  }
  return ctx;
}

export function GuestQuotaProvider({
  ticker,
  isAuthed = false,
  children,
}: {
  ticker: string;
  isAuthed?: boolean;
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const cleanTicker = normalizeTicker(ticker);
  const effectiveAuthed = isAuthed || status === "authenticated";

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // Catat kunjungan pada storage eksternal (efek samping murni ke localStorage)
  useEffect(() => {
    if (!effectiveAuthed && status === "unauthenticated") {
      evaluateGuestQuotaVisit(cleanTicker, { isAuthed: false });
    }
  }, [cleanTicker, effectiveAuthed, status]);

  const isOverLimit = useSyncExternalStore(
    emptySubscribe,
    () => {
      if (effectiveAuthed) return false;
      return isGuestStockGated(cleanTicker);
    },
    () => false
  );

  // Snapshot harus referensi STABIL antar panggilan (bug 7 Nov: array baru tiap getSnapshot
  // → React "Maximum update depth" #185 saat hydration). Cache per-ticker, invalidate saat
  // kunjungan baru dicatat.
  const tickers = useSyncExternalStore(
    emptySubscribe,
    () => (effectiveAuthed ? EMPTY_TICKERS : stableGuestTickers()),
    () => EMPTY_TICKERS
  );

  const value: GuestQuotaContextType = {
    isOverLimit,
    isAuthed: effectiveAuthed,
    ticker: cleanTicker,
    mounted,
    tickers,
  };

  return (
    <GuestQuotaContext.Provider value={value}>
      {children}
    </GuestQuotaContext.Provider>
  );
}

/**
 * Gate khusus untuk Trading Plan Card.
 * Saat overlimit:
 * - Real plan TIDAK dirender ke DOM (data-premium tidak ada).
 * - Diganti blurred overlay + GuestOverlimitBanner dua lapis.
 */
export function GuestTradingPlanGate({
  ticker,
  plan,
  mc,
  isAuthed = false,
  forceOverLimit,
}: {
  ticker: string;
  plan: TradingPlan;
  mc?: McResult | null;
  isAuthed?: boolean;
  forceOverLimit?: boolean;
}) {
  const ctx = useContext(GuestQuotaContext);
  const { status } = useSession();

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const cleanTicker = normalizeTicker(ticker || ctx?.ticker || "");
  const effectiveAuthed = isAuthed || ctx?.isAuthed || status === "authenticated";

  const isOverLimitStore = useSyncExternalStore(
    emptySubscribe,
    () => {
      if (forceOverLimit !== undefined) return forceOverLimit;
      if (effectiveAuthed) return false;
      if (ctx && ctx.mounted) return ctx.isOverLimit;
      return isGuestStockGated(cleanTicker);
    },
    () => (forceOverLimit !== undefined ? forceOverLimit : false)
  );

  const effectiveOverLimit =
    forceOverLimit !== undefined ? forceOverLimit : isOverLimitStore;

  // SSR initial render: bila belum mounted dan tidak ada override forceOverLimit,
  // crawler menerima markup trading plan penuh untuk SEO.
  if (!mounted && forceOverLimit === undefined) {
    return (
      <div data-premium="trading-plan" suppressHydrationWarning>
        <TradingPlanCard plan={plan} mc={mc} />
      </div>
    );
  }

  // Logged-in atau kuota masih ada: tampil penuh + strip upsell inline (W1c)
  if (effectiveAuthed || !effectiveOverLimit) {
    return (
      <div data-premium="trading-plan">
        <TradingPlanCard plan={plan} mc={mc} />
        {!effectiveAuthed && (
          <GuestInlineUpsell ticker={cleanTicker} isOverLimit={false} />
        )}
      </div>
    );
  }

  // Overlimit: trading plan asli TIDAK dirender ke DOM (data-premium nihil)
  return (
    <div
      className="relative rounded-xl border border-border bg-bg-card/80 p-5 overflow-hidden backdrop-blur-sm"
      data-testid="trading-plan-blur-overlay"
    >
      {/* Blurred dummy silhouette — TIDAK ADA DATA ASLI */}
      <div
        className="filter blur-sm pointer-events-none select-none opacity-40 space-y-3"
        aria-hidden="true"
      >
        <div className="h-5 w-1/3 bg-border rounded" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-14 bg-border/60 rounded-lg" />
          <div className="h-14 bg-border/60 rounded-lg" />
          <div className="h-14 bg-border/60 rounded-lg" />
        </div>
        <div className="h-9 bg-border/40 rounded-lg" />
      </div>

      <div className="mt-4">
        <GuestOverlimitBanner ticker={cleanTicker} forceShow />
      </div>
    </div>
  );
}

/**
 * Gate khusus untuk Rincian Skor Sinyal (9 indikator).
 * Saat overlimit:
 * - Konten 9 indikator tidak dirender ke DOM.
 * - Diganti teaser baris terkunci dengan ajakan daftar.
 */
export function GuestSignalBreakdownGate({
  breakdown,
  ticker,
  isAuthed = false,
  forceOverLimit,
}: {
  breakdown: BreakdownItem[];
  ticker?: string;
  isAuthed?: boolean;
  forceOverLimit?: boolean;
}) {
  const ctx = useContext(GuestQuotaContext);
  const { status } = useSession();

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const cleanTicker = normalizeTicker(ticker || ctx?.ticker || "");
  const effectiveAuthed = isAuthed || ctx?.isAuthed || status === "authenticated";

  const isOverLimitStore = useSyncExternalStore(
    emptySubscribe,
    () => {
      if (forceOverLimit !== undefined) return forceOverLimit;
      if (effectiveAuthed) return false;
      if (ctx && ctx.mounted) return ctx.isOverLimit;
      return isGuestStockGated(cleanTicker);
    },
    () => (forceOverLimit !== undefined ? forceOverLimit : false)
  );

  const effectiveOverLimit =
    forceOverLimit !== undefined ? forceOverLimit : isOverLimitStore;

  // SSR initial render: crawler menerima breakdown penuh untuk SEO
  if (!mounted && forceOverLimit === undefined) {
    return (
      <div data-premium="signal-breakdown" suppressHydrationWarning>
        <SignalBreakdownDetails breakdown={breakdown} />
      </div>
    );
  }

  // Logged-in atau kuota masih ada: rincian terbuka penuh
  if (effectiveAuthed || !effectiveOverLimit) {
    return (
      <div data-premium="signal-breakdown">
        <SignalBreakdownDetails breakdown={breakdown} />
      </div>
    );
  }

  // Overlimit: rincian indikator asli TIDAK dimasukkan ke DOM
  return (
    <div
      className="mt-3 border-t border-border/60 pt-2.5 backdrop-blur-sm"
      data-testid="signal-breakdown-locked"
    >
      <div className="flex items-center justify-between text-xs font-semibold text-text-tertiary">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true">🔒</span>
          <span>Rincian {breakdown.length} Indikator Terkunci</span>
          <span className="hidden sm:inline text-[10px] font-normal text-text-tertiary">
            (kuota 3 saham gratis habis)
          </span>
        </span>
        <Link
          href="/auth/register"
          data-engagement="reg_free_banner"
          className="text-accent text-[11px] font-medium hover:underline"
        >
          Daftar gratis untuk buka →
        </Link>
      </div>
    </div>
  );
}

/**
 * Komponen pembungkus serbaguna `GuestQuota`.
 * Bisa digunakan secara langsung membungkus area konten tertentu:
 * <GuestQuota ticker={ticker} isAuthed={isAuthed}>{children}</GuestQuota>
 */
export function GuestQuota({
  ticker,
  isAuthed = false,
  forceOverLimit,
  children,
  fallback,
}: {
  ticker: string;
  isAuthed?: boolean;
  forceOverLimit?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { status } = useSession();
  const cleanTicker = normalizeTicker(ticker);
  const effectiveAuthed = isAuthed || status === "authenticated";

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const isOverLimitStore = useSyncExternalStore(
    emptySubscribe,
    () => {
      if (forceOverLimit !== undefined) return forceOverLimit;
      if (effectiveAuthed) return false;
      return isGuestStockGated(cleanTicker);
    },
    () => (forceOverLimit !== undefined ? forceOverLimit : false)
  );

  const effectiveOver =
    forceOverLimit !== undefined ? forceOverLimit : isOverLimitStore;

  if (!mounted && forceOverLimit === undefined) {
    return (
      <div data-premium="true" suppressHydrationWarning>
        {children}
      </div>
    );
  }

  if (effectiveAuthed || !effectiveOver) {
    return <div data-premium="true">{children}</div>;
  }

  return (
    <>
      {fallback ?? (
        <div
          className="relative rounded-xl border border-border bg-bg-card/80 p-5 overflow-hidden backdrop-blur-sm"
          data-testid="guest-quota-fallback"
        >
          <GuestOverlimitBanner ticker={cleanTicker} forceShow />
        </div>
      )}
    </>
  );
}
