import Link from "next/link";
import { stripJk, changeColor, formatPrice } from "@/lib/utils";
import { signalBadge } from "@/lib/seo/signal-badge";

export interface PeerCandidate {
  ticker: string;
  name: string;
  close: number | null;
  changePercent: number | null;
  signalScore: number | null;
}

interface StrongerPeersStripProps {
  currentTicker: string;
  currentScore: number | null;
  sectorLabel: string;
  peers: PeerCandidate[];
}

export function StrongerPeersStrip({
  currentTicker,
  currentScore,
  sectorLabel,
  peers,
}: StrongerPeersStripProps) {
  const currentClean = stripJk(currentTicker);
  const validPeers = (peers ?? [])
    .filter(
      (p) =>
        stripJk(p.ticker) !== currentClean &&
        p.signalScore !== null &&
        p.signalScore !== undefined
    )
    .sort((a, b) => (b.signalScore ?? 0) - (a.signalScore ?? 0))
    .slice(0, 3);

  if (validPeers.length === 0) return null;

  const topPeer = validPeers[0];
  const isStronger = (topPeer.signalScore ?? -1) > (currentScore ?? -1);
  const title = isStronger
    ? `🔥 ${validPeers.length === 3 ? "3 " : ""}Saham ${sectorLabel} dengan Sinyal Lebih Kuat Hari Ini`
    : `📊 Pembanding Terkuat Sektor ${sectorLabel} Hari Ini`;

  return (
    <section
      aria-label="Saham sejenis sinyal lebih kuat"
      className="mt-3 rounded-xl border border-border bg-bg-card p-3 depth-shadow"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs sm:text-sm font-semibold text-text-primary truncate">
          {title}
        </p>
        <Link
          href="/stocks?style=swing-trade"
          data-engagement="funnel_screenerTopCta"
          className="text-xs font-semibold text-accent hover:underline shrink-0"
        >
          Scan 900+ Saham →
        </Link>
      </div>
      <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
        {validPeers.map((p) => {
          const pClean = stripJk(p.ticker);
          const badge = signalBadge(p.signalScore!);
          const scoreStr = `${p.signalScore! > 0 ? "+" : ""}${p.signalScore!.toFixed(2).replace(".", ",")}`;
          return (
            <Link
              key={p.ticker}
              href={`/stocks/${p.ticker}`}
              data-engagement="funnel_peerStrongerCard"
              className="group flex flex-col justify-between min-h-11 rounded-lg border border-border bg-bg/60 p-2.5 transition-all hover:border-accent/40 hover:bg-bg-hover"
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-mono text-xs font-bold text-text-primary group-hover:text-accent transition-colors truncate">
                    {pClean}
                  </span>
                  {p.close !== null && (
                    <span className="text-[11px] tabular-nums text-text-secondary truncate">
                      {formatPrice(p.close)}
                    </span>
                  )}
                </div>
                {p.changePercent !== null && (
                  <span
                    className={`text-[11px] font-semibold tabular-nums shrink-0 ${changeColor(
                      p.changePercent
                    )}`}
                  >
                    {p.changePercent >= 0 ? "+" : ""}
                    {p.changePercent.toFixed(1).replace(".", ",")}%
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center justify-between gap-1">
                <span className="text-[10px] text-text-tertiary truncate">
                  {p.name}
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded tabular-nums shrink-0 ${badge.cls}`}
                >
                  {scoreStr} · {badge.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default StrongerPeersStrip;
