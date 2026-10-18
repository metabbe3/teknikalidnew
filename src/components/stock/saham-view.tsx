"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { StockTable, type StockRow } from "@/components/stock/stock-table";
import ScreenerClient from "@/components/screener/screener-client";
import { ScreenerAiButton } from "@/components/screener/screener-ai-modal";

/**
 * Saham page content: Browse (full stock table) | Screener (filter presets) in one place.
 * Tab is URL-driven via ?view=screener so the merged /screener→/stocks redirect + inbound
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
  const router = useRouter();
  const pathname = usePathname();
  const isScreener = searchParams.get("view") === "screener";

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

  const showBrowse = () => router.push(pathname);
  const showScreener = () => router.push(`${pathname}?view=screener`);

  const Tab = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-card ${
        active ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="tablist"
          aria-label="Mode tampilan"
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-bg-card p-1"
        >
          <Tab active={!isScreener} onClick={showBrowse}>{browseLabel}</Tab>
          <Tab active={isScreener} onClick={showScreener}>Screener</Tab>
        </div>
        <ScreenerAiButton />
      </div>

      {isScreener ? (
        <Suspense fallback={<div className="p-8 text-center text-text-secondary">Memuat screener…</div>}>
          <ScreenerClient assetClass={assetClass} linkBase={linkBase} />
        </Suspense>
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
