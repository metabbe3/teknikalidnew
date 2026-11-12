"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { StockTable, type StockRow } from "@/components/stock/stock-table";
import ScreenerClient from "@/components/screener/screener-client";
import { ScreenerAiButton } from "@/components/screener/screener-ai-modal";

export type SahamViewMode = "semua" | "screener" | "swing" | "pasar";

export function parseSahamViewMode(raw: string | null | undefined, allowExtended = true): SahamViewMode {
  if (raw === "screener") return "screener";
  if (allowExtended && raw === "swing") return "swing";
  if (allowExtended && raw === "pasar") return "pasar";
  return "semua";
}

const StocksSwingPanel = dynamic(
  () => import("@/components/stock/stocks-swing-panel").then((m) => m.StocksSwingPanel),
  {
    ssr: false,
    loading: () => (
      <div className="p-8 text-center text-text-secondary" role="status">
        Memuat setup swing…
      </div>
    ),
  }
);

const StocksPasarPanel = dynamic(
  () => import("@/components/stock/stocks-pasar-panel").then((m) => m.StocksPasarPanel),
  {
    ssr: false,
    loading: () => (
      <div className="p-8 text-center text-text-secondary" role="status">
        Memuat Koran Pasar…
      </div>
    ),
  }
);

function ViewTab({
  active,
  onClick,
  engagement,
  navLabel,
  children,
}: {
  active: boolean;
  onClick: () => void;
  engagement: string;
  navLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-engagement={engagement}
      data-nav-label={navLabel}
      className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-card ${
        active ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Saham page content: Browse (full stock table) | Screener (filter presets) | Swing | Koran Pasar in one place.
 * Tab is URL-driven via ?view=screener|swing|pasar so the merged /screener→/stocks redirect + inbound
 * /stocks?view=screener&tab=...&preset=... links land on the right view. ScreenerClient reads
 * its own ?tab=&preset= params unchanged.
 *
 * perf-2026-10-18-01: stocks/sectors sekarang optional. /stocks & /crypto tidak lagi
 * serialize 962 baris ke HTML+RSC flight (~977KB → shell kecil): tabel browse render
 * client-side + fetch /api/stocks (endpoint LAMA cache 5 mnt — API Reuse Rule, bukan
 * endpoint baru). Pemanggil lain masih boleh kirim props SSR. SEO aman: title/meta/FAQ/
 * breadcrumb/schema tetap server-rendered di page.tsx; daftar harga bukan teks unik indeks.
 */
export function SahamView({
  stocks: initialStocks,
  sectors: initialSectors,
  assetClass,
  browseLabel = "Semua Saham",
  linkBase = "/stocks",
}: {
  stocks?: StockRow[];
  sectors?: string[];
  assetClass?: "EQUITY" | "CRYPTO";
  browseLabel?: string;
  linkBase?: string;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const isEquity = assetClass !== "CRYPTO";
  const urlMode = parseSahamViewMode(searchParams.get("view"), isEquity);

  const [manualOverride, setManualOverride] = useState<{
    baseUrlMode: SahamViewMode;
    mode: SahamViewMode;
  } | null>(null);
  const mode = manualOverride && manualOverride.baseUrlMode === urlMode ? manualOverride.mode : urlMode;

  const [stocks, setStocks] = useState<StockRow[] | null>(initialStocks ?? null);
  const [sectors, setSectors] = useState<string[] | null>(initialSectors ?? null);
  const [loadError, setLoadError] = useState(false);

  const apiPath = assetClass === "CRYPTO" ? "/api/crypto" : "/api/stocks";

  useEffect(() => {
    if (initialStocks) return; // server-provided — tidak perlu fetch
    let cancelled = false;
    fetch(apiPath)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((rows: StockRow[]) => {
        if (cancelled) return;
        setStocks(rows);
        if (!initialSectors) setSectors([...new Set(rows.map((s) => s.sector))].sort());
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [initialStocks, initialSectors, apiPath]);

  const switchTab = (nextMode: SahamViewMode) => {
    setManualOverride({ baseUrlMode: urlMode, mode: nextMode });
    if (typeof window !== "undefined") {
      const nextUrl = nextMode === "semua" ? pathname : `${pathname}?view=${nextMode}`;
      window.history.replaceState(null, "", nextUrl);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="tablist"
          aria-label="Mode tampilan"
          className="flex max-w-full overflow-x-auto items-center gap-1 rounded-lg border border-border bg-bg-card p-1"
        >
          <ViewTab
            active={mode === "semua"}
            onClick={() => switchTab("semua")}
            engagement="nav_stocksTabSemua"
          >
            {browseLabel}
          </ViewTab>
          <ViewTab
            active={mode === "screener"}
            onClick={() => switchTab("screener")}
            engagement="nav_stocksTabScreener"
          >
            Filter Kondisi
          </ViewTab>
          {isEquity && (
            <>
              <ViewTab
                active={mode === "swing"}
                onClick={() => switchTab("swing")}
                engagement="nav_stocksTabSwing"
                navLabel="nav_hubTabSwing_click"
              >
                <span>Setup Swing</span>
                <span
                  className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-tight ${
                    mode === "swing"
                      ? "bg-white/20 text-white"
                      : "bg-accent/15 text-accent"
                  }`}
                >
                  SL/TP
                </span>
              </ViewTab>
              <ViewTab
                active={mode === "pasar"}
                onClick={() => switchTab("pasar")}
                engagement="nav_stocksTabPasar"
                navLabel="nav_hubTabPasar_click"
              >
                <span>Koran Pasar</span>
                <span
                  className={`h-2 w-2 rounded-full ${
                    mode === "pasar" ? "bg-white" : "bg-emerald-500"
                  }`}
                  aria-hidden="true"
                />
              </ViewTab>
            </>
          )}
        </div>
        <ScreenerAiButton />
      </div>

      {mode === "screener" ? (
        <Suspense fallback={<div className="p-8 text-center text-text-secondary">Memuat screener…</div>}>
          <ScreenerClient assetClass={assetClass} linkBase={linkBase} />
        </Suspense>
      ) : mode === "swing" && isEquity ? (
        <StocksSwingPanel linkBase={linkBase} />
      ) : mode === "pasar" && isEquity ? (
        <StocksPasarPanel linkBase={linkBase} />
      ) : stocks === null ? (
        <div className="p-8 text-center text-text-secondary" role="status">
          {loadError ? (
            <>
              Gagal memuat daftar.{" "}
              <button className="text-accent underline" onClick={() => window.location.reload()}>
                Coba lagi
              </button>
            </>
          ) : (
            "Memuat daftar…"
          )}
        </div>
      ) : (
        <StockTable stocks={stocks} sectors={sectors ?? []} linkBase={linkBase} />
      )}
    </div>
  );
}
