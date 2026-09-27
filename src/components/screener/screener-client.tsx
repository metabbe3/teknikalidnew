"use client";

import { useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { BottomFishingRadar } from "@/components/stock/bottom-fishing-radar";
import { SavedScreenerBar } from "@/components/screener/saved-screener-bar";
import { SaveScreenPrompt } from "@/components/screener/save-screen-prompt";
import { useWatchlist, useToggleWatchlist, useBatchAddToWatchlist, useBatchRemoveFromWatchlist } from "@/hooks/use-watchlist";

// Import types
export type { TradingStyle, TradingStyleDef, PresetDef, ScreenerStock, ViewMode, SortField, SortOrder, CustomFilter } from "./screener-types";
export { STYLES, CUSTOM_FILTERS, SORT_OPTIONS, signalLabelColor } from "./screener-types";

// Import components
export { BookmarkIcon, PresetIcon } from "./screener-icons";
export { ScreenerTabs, PresetCard, CustomBuilder } from "./screener-presets";
export { ResultsHeader, ResultsTable, ResultsCards } from "./screener-results";

// Import for internal use
import type { TradingStyle, PresetDef, ViewMode, SortField, SortOrder, ScreenerStock } from "./screener-types";
import { stylesForAssetClass } from "./screener-types";
import { ScreenerTabs, PresetCard, CustomBuilder } from "./screener-presets";
import { ResultsHeader, ResultsTable, ResultsCards } from "./screener-results";

// ── Main Page Component ──

function ScreenerPageContent({ assetClass, linkBase = "/stocks" }: { assetClass?: "EQUITY" | "CRYPTO"; linkBase?: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  const styles = stylesForAssetClass(assetClass);

  const [activeStyle, setActiveStyle] = useState<TradingStyle>(
    () => {
      const tab = searchParams.get("tab");
      return (styles.find((s) => s.id === tab)?.id ?? "bottom-fishing") as TradingStyle;
    }
  );
  const [activePreset, setActivePreset] = useState<string | null>(() => searchParams.get("preset"));
  const [viewMode, setViewMode] = useState<ViewMode>(() => (typeof window !== "undefined" && window.innerWidth < 640 ? "cards" : "table"));
  const [sliderValues, setSliderValues] = useState<Record<string, number>>({});
  const [customParams, setCustomParams] = useState<Record<string, string>>({});
  const [sortBy, setSortBy] = useState<SortField>("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const styleDef = styles.find((s) => s.id === activeStyle)!;

  // Determine fetch URL
  const fetchUrl = useMemo(() => {
    let base: string | null = null;
    if (activeStyle === "custom") {
      if (Object.keys(customParams).length === 0) return null;
      const qs = new URLSearchParams(customParams).toString();
      base = `/api/screener?${qs}`;
    } else {
      if (!activePreset || activePreset === "radar") return null;
      const presetDef = styles.flatMap((s) => s.presets).find((p) => p.key === activePreset);
      if (presetDef?.sliders && presetDef.sliders.length > 0) {
        const params = new URLSearchParams();
        const modifiedFilters: Record<string, string> = {};
        for (const slider of presetDef.sliders) {
          const val = sliderValues[slider.key] ?? slider.default;
          modifiedFilters[slider.param] = String(val);
        }
        const isDefault = presetDef.sliders.every((s) => (sliderValues[s.key] ?? s.default) === s.default);
        if (!isDefault) {
          const qs = new URLSearchParams(modifiedFilters).toString();
          base = `/api/screener?${qs}`;
        }
      }
      if (!base) {
        base = `/api/screener?preset=${activePreset}`;
      }
    }
    // Append sort params
    if (base && sortBy) {
      base += `${base.includes("?") ? "&" : "?"}sort_by=${sortBy}&sort_order=${sortOrder}`;
    }
    if (base && assetClass) {
      base += `${base.includes("?") ? "&" : "?"}assetClass=${assetClass}`;
    }
    return base;
  }, [activeStyle, activePreset, sliderValues, customParams, sortBy, sortOrder, assetClass]);

  const { data: stocks = [], isLoading, isError, refetch } = useQuery<ScreenerStock[]>({
    queryKey: ["screener", fetchUrl],
    queryFn: async () => {
      if (!fetchUrl) return [];
      const res = await fetch(fetchUrl);
      if (!res.ok) throw new Error("Screener fetch failed");
      const data = await res.json();
      return Array.isArray(data) ? data : data.data ?? [];
    },
    enabled: !!fetchUrl,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const handleStyleChange = useCallback((style: TradingStyle) => {
    setActiveStyle(style);
    setActivePreset(null);
    setSliderValues({});
    const params = new URLSearchParams();
    params.set("view", "screener");
    params.set("tab", style);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname]);

  const handlePresetClick = useCallback((presetKey: string) => {
    setActivePreset((prev) => prev === presetKey ? null : presetKey);
    setSliderValues({});
    const params = new URLSearchParams();
    params.set("view", "screener");
    params.set("tab", activeStyle);
    if (presetKey !== "radar") {
      params.set("preset", presetKey);
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [activeStyle, router, pathname]);

  const handleSliderChange = useCallback((key: string, param: string, value: number) => {
    setSliderValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSortChange = useCallback((field: SortField, order: SortOrder) => {
    setSortBy(field);
    setSortOrder(order);
  }, []);

  const showRadar = activeStyle === "bottom-fishing" && (activePreset === "radar" || activePreset === null);

  // Watchlist integration
  const { data: watchlistData } = useWatchlist();
  const watchlistTickers = useMemo(() => new Set<string>((watchlistData ?? []).map((item) => item.ticker)), [watchlistData]);
  const toggleWatchlist = useToggleWatchlist();
  const batchAdd = useBatchAddToWatchlist();
  const batchRemove = useBatchRemoveFromWatchlist();

  const handleToggleWatchlist = useCallback((ticker: string) => {
    const action = watchlistTickers.has(ticker) ? "remove" : "add";
    toggleWatchlist.mutate({ ticker, action });
  }, [watchlistTickers, toggleWatchlist]);

  const handleBatchAdd = useCallback(() => {
    const tickers = stocks.map((s) => s.ticker);
    batchAdd.mutate(tickers);
  }, [stocks, batchAdd]);

  const handleBatchRemove = useCallback(() => {
    const tickers = stocks.map((s) => s.ticker).filter((t) => watchlistTickers.has(t));
    if (tickers.length > 0) batchRemove.mutate(tickers);
  }, [stocks, watchlistTickers, batchRemove]);

  // Guest save-intent: representation of the active screen, matching the query fetchUrl builds
  const guestSaveFilters = useMemo(() => {
    if (activeStyle === "custom") return customParams;
    if (!activePreset || activePreset === "radar") return {};
    const presetDef = styles.flatMap((s) => s.presets).find((p) => p.key === activePreset);
    const filters: Record<string, string> = { preset: activePreset };
    for (const slider of presetDef?.sliders ?? []) {
      const val = sliderValues[slider.key] ?? slider.default;
      if (val !== slider.default) filters[slider.param] = String(val);
    }
    return filters;
  }, [activeStyle, activePreset, customParams, sliderValues, styles]);

  const currentUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  return (
    <div className="fade-in">
      {/* Trading-style tabs (the page <PageHero> provides the title/description) */}
      <div className="border-b border-border bg-bg-card">
        <div
          className="max-w-6xl mx-auto px-4"
          style={{ "--screener-accent-rgb": styleDef.accentRgb, "--screener-accent": styleDef.accentHex } as React.CSSProperties}
        >
          <ScreenerTabs activeStyle={activeStyle} onStyleChange={handleStyleChange} accentHex={styleDef.accentHex} assetClass={assetClass} />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Saved Screener Bar — authenticated; guests get the save-intent prompt */}
        {session?.user ? (
          <SavedScreenerBar
            currentFilters={activeStyle === "custom" ? customParams : {}}
            onLoadScreener={(filters) => {
              setActiveStyle("custom");
              setCustomParams(filters);
            }}
            tradingStyle={activeStyle}
          />
        ) : (
          <SaveScreenPrompt filters={guestSaveFilters} next={currentUrl} />
        )}

        {/* Preset Cards */}
        {activeStyle !== "custom" && (
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full" style={{ background: styleDef.accentHex }} aria-hidden="true" />
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Pilih Filter</h2>
                <p className="text-xs text-text-tertiary">{styleDef.presets.length} preset tersedia</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger-grid">
              {styleDef.presets.map((preset, i) => (
                <div key={preset.key} style={{ "--stagger-i": i } as React.CSSProperties}>
                  <PresetCard
                    preset={preset}
                    styleDef={styleDef}
                    isActive={activePreset === preset.key}
                    onClick={() => handlePresetClick(preset.key)}
                    sliderValues={sliderValues}
                    onSliderChange={handleSliderChange}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Radar (bottom fishing only) — below preset cards */}
        {showRadar && (
          <section>
            <BottomFishingRadar assetClass={assetClass} linkBase={linkBase} />
          </section>
        )}

        {/* Custom Builder */}
        {activeStyle === "custom" && (
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full bg-slate-500" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Filter Builder</h2>
                <p className="text-xs text-text-tertiary">Kombinasikan indikator sesuai strategi Anda</p>
              </div>
            </div>
            <CustomBuilder
              onFilterChange={(params) => setCustomParams(params)}
              assetClass={assetClass}
            />
          </section>
        )}

        {/* Results */}
        {fetchUrl && (
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full" style={{ background: styleDef.accentHex }} aria-hidden="true" />
              <ResultsHeader
                count={isLoading ? 0 : stocks.length}
                viewMode={viewMode}
                onViewChange={setViewMode}
                tickers={stocks.map((s) => s.ticker)}
                onBatchAdd={handleBatchAdd}
                isBatchAdding={batchAdd.isPending}
                onBatchRemove={handleBatchRemove}
                isBatchRemoving={batchRemove.isPending}
                watchedCount={stocks.filter((s) => watchlistTickers.has(s.ticker)).length}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={handleSortChange}
              />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16 gap-3 text-text-tertiary text-sm">
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                </svg>
                Memuat hasil...
              </div>
            ) : isError ? (
              <div className="card-gradient depth-shadow rounded-xl p-8 text-center border border-border">
                <p className="text-text-secondary text-sm">Gagal memuat hasil.</p>
                <button onClick={() => refetch()} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2.5 min-h-11 rounded-lg bg-text-primary text-white text-xs font-semibold hover:bg-text-primary/80 transition-colors press-scale cursor-pointer">
                  Coba lagi
                </button>
              </div>
            ) : (
              viewMode === "table"
                ? <ResultsTable stocks={stocks} watchlistTickers={watchlistTickers} onToggleWatchlist={handleToggleWatchlist} linkBase={linkBase} />
                : <ResultsCards stocks={stocks} styleDef={styleDef} watchlistTickers={watchlistTickers} onToggleWatchlist={handleToggleWatchlist} linkBase={linkBase} />
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function ScreenerPageSkeleton() {
  return (
    <div className="fade-in animate-pulse min-h-[70vh]">
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10 space-y-5">
          <div className="h-8 w-64 bg-bg-hover rounded-lg" />
          <div className="h-4 w-96 max-w-full bg-bg-hover rounded" />
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 w-24 bg-bg-hover rounded-lg" />
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="grid grid-cols-3 gap-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-bg-hover rounded-xl" />
          ))}
        </div>
        <div className="h-[50vh] bg-bg-hover rounded-xl" />
      </div>
    </div>
  );
}

export default function ScreenerClient({ assetClass, linkBase }: { assetClass?: "EQUITY" | "CRYPTO"; linkBase?: string }) {
  return (
    <Suspense fallback={<ScreenerPageSkeleton />}>
      <ScreenerPageContent assetClass={assetClass} linkBase={linkBase} />
    </Suspense>
  );
}