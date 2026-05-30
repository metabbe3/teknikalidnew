import type { Metadata } from "next";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { StockTable } from "@/components/stock/stock-table";
import { IDX_STOCKS } from "@/lib/constants";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";
import type { MarketStatusResult } from "@/lib/market-hours";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Daftar Harga Saham IDX Hari Ini",
  description: "Cek harga saham IDX hari ini. Filter berdasarkan sektor, RSI, MACD, dan indikator teknikal lainnya. Analisa teknikal saham BEI terlengkap.",
  alternates: { canonical: "/stocks" },
};

function MarketStatus({ marketStatus, latestPrice }: { marketStatus: MarketStatusResult; latestPrice: { date: Date } | null }) {
  const dateStr = latestPrice
    ? format(latestPrice.date, "d MMM yyyy", { locale: idLocale })
    : null;
  const todayStr = format(new Date(), "EEEE, d MMMM yyyy", { locale: idLocale });

  if (marketStatus.isOpen) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-500/20">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
          <span className="font-mono font-semibold uppercase tracking-wider text-xs">Pasar Buka</span>
        </div>
        {dateStr && (
          <span className="text-gray-400 text-xs font-mono">
            Data terakhir: {dateStr}
          </span>
        )}
      </div>
    );
  }

  const reasonLabel = marketStatus.reason === "weekend"
    ? "AKHIR PEKAN"
    : marketStatus.reason === "holiday"
      ? "HARI LIBUR NASIONAL"
      : "SESI BERAKHIR";

  const reasonDesc = marketStatus.reason === "weekend"
    ? "Bursa Efek Indonesia tutup pada hari Sabtu & Minggu"
    : marketStatus.reason === "holiday"
      ? "Hari libur nasional — tidak ada sesi perdagangan"
      : "Sesi perdagangan hari ini telah berakhir";

  return (
    <div className="space-y-0">
      {/* Hero status strip */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
        <div className="flex items-center gap-2.5 bg-amber-500/15 px-4 py-2.5 rounded-lg border border-amber-500/30 market-closed-glow">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 market-dot-pulse" aria-hidden="true" />
          <span className="font-mono font-bold uppercase tracking-widest text-sm text-amber-300">
            Pasar Tutup
          </span>
          <span className="hidden sm:block w-px h-4 bg-amber-500/30" aria-hidden="true" />
          <span className="font-mono text-xs text-amber-400/80 uppercase tracking-wider">
            {reasonLabel}
          </span>
        </div>
        {dateStr && (
          <span className="text-gray-400 text-xs font-mono">
            Data sesi terakhir: <span className="text-gray-300 font-semibold">{dateStr}</span>
          </span>
        )}
      </div>

      {/* Full-width info banner */}
      <div className="market-closed-bar rounded-lg px-5 py-4 mt-4">
        <div className="relative z-10 flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-amber-100">
              Pasar saham BEI tutup hari ini ({todayStr})
            </p>
            <p className="text-xs text-amber-200/70 leading-relaxed">
              {reasonDesc}. Data yang ditampilkan adalah dari sesi perdagangan terakhir.
              Harga dan indikator teknikal belum diperbarui sejak penutupan pasar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function StocksPage() {
  const [rows, latestPrice, marketInfo] = await Promise.all([
    stockMarketService.getStockList(),
    stockMarketService.getLatestPriceDate(),
    stockMarketService.getMarketStatusForPage(),
  ]);

  const sectors = [...new Set(rows.map((s) => s.sector))].sort();

  const withChange = rows.filter((s) => s.changePercent !== null);
  const gainers = withChange.filter((s) => s.changePercent! > 0).length;
  const losers = withChange.filter((s) => s.changePercent! < 0).length;
  const unchanged = withChange.length - gainers - losers;
  const isClosed = !marketInfo.marketStatus.isOpen;

  return (
    <div className="fade-in">
      {/* Terminal Hero */}
      <section className="stocks-hero">
        <div className="relative z-[1] max-w-7xl mx-auto px-4 py-12 sm:py-16">
          <div className="max-w-3xl space-y-5">
            <MarketStatus marketStatus={marketInfo.marketStatus} latestPrice={latestPrice} />
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Daftar Saham
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent"> BEI</span>
            </h1>
            <p className="text-gray-300 text-base leading-relaxed">
              Screen <span className="text-white font-semibold">{IDX_STOCKS.length}+</span> saham IDX berdasarkan sektor, indikator teknikal, dan performa.
            </p>
          </div>

          {/* Market Stats */}
          <div className={`flex flex-wrap items-center gap-2.5 mt-8 ${isClosed ? "opacity-70" : ""}`}>
            <div className="terminal-stat">
              <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Total</p>
              <p className="text-sm font-bold text-white tabular-nums mt-0.5">
                {rows.length} <span className="text-xs font-normal text-gray-400">saham</span>
              </p>
            </div>
            <div className="terminal-stat">
              <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Naik</p>
              <p className="text-sm font-bold text-bullish tabular-nums mt-0.5">{gainers}</p>
            </div>
            <div className="terminal-stat">
              <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Turun</p>
              <p className="text-sm font-bold text-bearish tabular-nums mt-0.5">{losers}</p>
            </div>
            {unchanged > 0 && (
              <div className="terminal-stat">
                <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Tetap</p>
                <p className="text-sm font-bold text-gray-300 tabular-nums mt-0.5">{unchanged}</p>
              </div>
            )}
            {isClosed && (
              <div className="terminal-stat border-amber-500/20 bg-amber-500/5">
                <p className="text-[10px] text-amber-500/80 font-mono uppercase tracking-wider">Status</p>
                <p className="text-sm font-bold text-amber-300 font-mono mt-0.5">SESI TERAKHIR</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Table Section */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <StockTable stocks={rows} sectors={sectors} />
      </div>
    </div>
  );
}
