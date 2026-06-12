import Link from "next/link";
import { IDX_STOCKS, SECTORS } from "@/lib/constants";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

interface MarketInfo {
  marketStatus: { isOpen: boolean };
}

interface Overview {
  gainers: { ticker: string; changePercent: number; close: number | null }[];
  losers: { ticker: string; changePercent: number; close: number | null }[];
}

export function PersonalizedGreeting({
  name,
  marketInfo,
  overview,
}: {
  name: string;
  marketInfo: MarketInfo;
  overview: Overview;
}) {
  const isClosed = !marketInfo.marketStatus.isOpen;
  const topGainer = overview.gainers[0];
  const topLoser = overview.losers[0];
  const totalStocks = IDX_STOCKS.length;
  const totalSectors = SECTORS.length;

  return (
    <section className="akademi-hero" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}>
      <div className="relative z-[1] max-w-7xl mx-auto px-4 py-10 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center">
          <div className="max-w-xl space-y-5">
            <div className={`inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full border ${isClosed ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-teal-400 bg-teal-500/10 border-teal-500/20"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isClosed ? "bg-amber-400" : "bg-teal-400 animate-pulse"}`} aria-hidden="true" />
              {isClosed ? "Pasar Tutup — Data Sesi Terakhir" : "Pasar Sedang Buka — Data Real-time"}
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-[1.1] text-white">
              {getGreeting()}, {" "}
              <span className="text-teal-400">{name}</span>
            </h1>
            <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
              {"Ringkasan market & portfolio kamu. Pantau "}<span className="text-white font-semibold">{totalStocks}+ saham</span>{" dari "}<span className="text-white font-semibold">{totalSectors} sektor</span>{" IDX."}
            </p>
            <div className="flex items-center gap-3 pt-1">
              <Link
                href="/stocks"
                className="bg-accent text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors press-scale"
              >
                Lihat Saham
              </Link>
              <Link
                href="/screener"
                className="bg-white/10 text-white border border-white/15 px-5 py-2 rounded-lg text-sm font-medium hover:bg-white/20 transition-all press-scale"
              >
                Screener
              </Link>
              <Link
                href="/watchlist"
                className="bg-white/10 text-white border border-white/15 px-5 py-2 rounded-lg text-sm font-medium hover:bg-white/20 transition-all press-scale"
              >
                Watchlist
              </Link>
            </div>
          </div>

          {/* Market Pulse Panel */}
          <div className="hidden lg:flex flex-col gap-3 min-w-[240px]">
            <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-0.5">
              Market Pulse{isClosed ? " · sesi terakhir" : " · live"}
            </p>
            {topGainer && (
              <div className="terminal-stat group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Top Gainer</p>
                    <p className="text-sm font-semibold text-white mt-0.5">{topGainer.ticker.replace(".JK", "")}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold font-mono text-bullish tabular-nums">
                      +{topGainer.changePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
                {topGainer.close != null && (
                  <p className="text-[10px] text-gray-500 font-mono mt-1">
                    Rp {topGainer.close.toLocaleString("id-ID")}
                  </p>
                )}
              </div>
            )}
            {topLoser && (
              <div className="terminal-stat">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Top Loser</p>
                    <p className="text-sm font-semibold text-white mt-0.5">{topLoser.ticker.replace(".JK", "")}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold font-mono text-bearish tabular-nums">
                      {topLoser.changePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
                {topLoser.close != null && (
                  <p className="text-[10px] text-gray-500 font-mono mt-1">
                    Rp {topLoser.close.toLocaleString("id-ID")}
                  </p>
                )}
              </div>
            )}
            <div className="terminal-stat">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Coverage</p>
                  <p className="text-sm font-semibold text-white mt-0.5">{totalStocks} saham</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold font-mono text-gray-300 tabular-nums">{totalSectors}</span>
                  <p className="text-[10px] text-gray-500">sektor</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
