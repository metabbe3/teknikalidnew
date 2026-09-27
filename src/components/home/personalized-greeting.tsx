import Link from "next/link";

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
  sectors: Record<string, { avgChange: number; count: number }>;
}

export function PersonalizedGreeting({
  name,
  marketInfo,
  overview,
  ihsg,
}: {
  name: string;
  marketInfo: MarketInfo;
  overview: Overview;
  ihsg: { close: number; change: number | null; changePercent: number | null } | null;
}) {
  const isClosed = !marketInfo.marketStatus.isOpen;
  const topGainer = overview.gainers[0];
  const topLoser = overview.losers[0];

  const sectorEntries = Object.values(overview.sectors);
  const positiveSectors = sectorEntries.filter((s) => s.avgChange > 0).length;
  const totalSectors = sectorEntries.length;

  const navLinks = [
    { label: "Screener", href: "/screener" },
    { label: "Watchlist", href: "/watchlist" },
    { label: "Paper Trading", href: "/paper-trading" },
    { label: "Komunitas", href: "/community" },
  ];

  return (
    <section className="bg-bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
        {/* Greeting + market status */}
        <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-text-primary leading-tight">
            {getGreeting()}, <span className="text-bullish">{name}</span>
          </h1>
          <div className={`inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full border ${isClosed ? "text-amber-700 bg-amber-500/10 border-amber-500/25" : "text-bullish bg-bullish-bg border-bullish/25"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isClosed ? "bg-amber-500" : "bg-bullish animate-pulse"}`} aria-hidden="true" />
            {isClosed ? "Pasar Tutup" : "Live"}
          </div>
        </div>

        {/* Compact market summary — inline stats, not a hero-metric card grid */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm mb-6">
          <span className="text-text-secondary">
            IHSG{" "}
            <span className="font-mono font-semibold text-text-primary tabular-nums">
              {ihsg ? ihsg.close.toLocaleString("id-ID", { minimumFractionDigits: 2 }) : "—"}
            </span>
            {ihsg?.changePercent !== null && ihsg?.changePercent !== undefined && (
              <span className={`ml-1 font-mono font-semibold tabular-nums ${ihsg.changePercent >= 0 ? "text-bullish" : "text-bearish"}`}>
                {ihsg.changePercent >= 0 ? "+" : ""}{ihsg.changePercent.toFixed(2)}%
              </span>
            )}
          </span>
          {topGainer && (
            <span className="text-text-secondary">
              Top Gainer{" "}
              <span className="font-mono font-semibold text-text-primary">{topGainer.ticker.replace(".JK", "")}</span>{" "}
              <span className="font-mono font-semibold text-bullish">+{topGainer.changePercent.toFixed(2)}%</span>
            </span>
          )}
          {topLoser && (
            <span className="text-text-secondary">
              Top Loser{" "}
              <span className="font-mono font-semibold text-text-primary">{topLoser.ticker.replace(".JK", "")}</span>{" "}
              <span className="font-mono font-semibold text-bearish">{topLoser.changePercent.toFixed(2)}%</span>
            </span>
          )}
          <span className="text-text-secondary">
            Sektor{" "}
            <span className={`font-mono font-semibold ${positiveSectors > totalSectors / 2 ? "text-bullish" : "text-bearish"}`}>
              {positiveSectors}/{totalSectors} naik
            </span>
          </span>
        </div>

        {/* Nav pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-4 py-2.5 rounded-lg text-xs font-medium bg-bg-hover border border-border text-text-secondary hover:text-text-primary hover:bg-bg-card transition-all press-scale"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
