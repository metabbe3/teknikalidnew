"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { StockTable, type StockRow } from "@/components/stock/stock-table";
import ScreenerClient from "@/components/screener/screener-client";

/**
 * Saham page content: Browse (full stock table) | Screener (filter presets) in one place.
 * Tab is URL-driven via ?view=screener so the merged /screener→/stocks redirect + inbound
 * /stocks?view=screener&tab=...&preset=... links land on the right view. ScreenerClient reads
 * its own ?tab=&preset= params unchanged.
 */
export function SahamView({
  stocks,
  sectors,
  assetClass,
  browseLabel = "Semua Saham",
  linkBase = "/stocks",
}: {
  stocks: StockRow[];
  sectors: string[];
  assetClass?: "EQUITY" | "CRYPTO";
  browseLabel?: string;
  linkBase?: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const isScreener = searchParams.get("view") === "screener";

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
      <div
        role="tablist"
        aria-label="Mode tampilan"
        className="inline-flex items-center gap-1 rounded-lg border border-border bg-bg-card p-1"
      >
        <Tab active={!isScreener} onClick={showBrowse}>{browseLabel}</Tab>
        <Tab active={isScreener} onClick={showScreener}>Screener</Tab>
      </div>

      {isScreener ? (
        <Suspense fallback={<div className="p-8 text-center text-text-secondary">Memuat screener…</div>}>
          <ScreenerClient assetClass={assetClass} />
        </Suspense>
      ) : (
        <StockTable stocks={stocks} sectors={sectors} linkBase={linkBase} />
      )}
    </div>
  );
}
