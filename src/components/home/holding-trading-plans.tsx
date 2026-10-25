import Link from "next/link";
import {
  stockMarketService,
} from "@/domains/stock/stock-market.service";
import { stockRepository } from "@/domains/stock/stock.repository";
import { monteCarloTpFirst } from "@/lib/monte-carlo";
import { formatPrice, formatPercent, changeColor } from "@/lib/utils";
import { subDays } from "date-fns";
import { SectionHeading } from "@/components/ui/section-heading";
import { StockLogo } from "@/components/stock/stock-logo";

type Tier = "layak" | "menengah" | "tunggu";

const TIER_META: Record<Tier, { label: string; border: string; badge: string }> = {
  layak: { label: "Layak", border: "border-l-bullish", badge: "bg-bullish-bg text-bullish" },
  menengah: { label: "Menengah", border: "border-l-amber-400", badge: "bg-amber-400/10 text-amber-400" },
  tunggu: { label: "Tunggu", border: "border-l-text-tertiary", badge: "bg-bg-hover text-text-tertiary" },
};

function tierOf(d: { tradingStrategy: string | null; riskReward: number | null; confidence: string | null }): Tier {
  if (d.tradingStrategy === "Wait & See") return "tunggu";
  const rr = d.riskReward ?? 0;
  if (rr >= 1.5 && d.confidence === "high") return "layak";
  return "menengah";
}

const CONF_LABEL: Record<string, string> = { high: "Tinggi", medium: "Sedang", low: "Rendah" };

/**
 * Trading plan per HOLDING portofolio user (home, logged-in) — engine sama dengan
 * /trading-plan (getStockOgData: ARA-lock guard) + Monte Carlo on-demand.
 * Max 4 saham agar home tetap ringan; link ke /trading-plan utk lengkap.
 */
export async function HoldingTradingPlans({ tickers }: { tickers: string[] }) {
  const selected = tickers.slice(0, 4);
  if (selected.length === 0) return null;

  const [ogList, closesList] = await Promise.all([
    Promise.all(selected.map((t) => stockMarketService.getStockOgData(t).catch(() => null))),
    Promise.all(selected.map((t) =>
      stockRepository
        .findPricesByTicker(t, { date: { gte: subDays(new Date(), 150) } })
        .then((ps) => ps.map((x) => Number(x.close)))
        .catch(() => [] as number[]),
    )),
  ]);

  const details = ogList.map((d, i) => {
    const mc = d && d.entryPrice != null && d.tp1 != null && d.sl != null
      ? monteCarloTpFirst(closesList[i], d.entryPrice, d.tp1, d.sl, { seedKey: d.ticker })
      : null;
    return { ticker: selected[i], d, tier: d && d.close != null ? tierOf(d) : null, mc };
  }).filter((x) => x.d && x.d.close != null);

  if (details.length === 0) return null;

  const qs = selected.map((t) => `t=${encodeURIComponent(t.replace(/\.JK$/, ""))}`).join("&");

  return (
    <section className="space-y-4">
      <SectionHeading
        eyebrow="otomatis dari portofolio"
        title="Trading Plan Holdings"
        action={
          <Link href={`/trading-plan?${qs}`} className="text-xs text-accent hover:underline font-medium">
            Detail & filter →
          </Link>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {details.map(({ ticker, d, tier, mc }) => {
          if (!d || !tier || d.close == null) return null;
          const meta = TIER_META[tier];
          return (
            <Link
              key={ticker}
              href={`/stocks/${ticker}`}
              className={`block rounded-xl border border-border border-l-4 ${meta.border} bg-bg-card p-4 space-y-3 hover:depth-shadow-hover transition-all`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-mono font-bold text-text-primary">
                  <StockLogo name="" ticker={ticker} size={22} />
                  {ticker.replace(/\.JK$/, "")}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${meta.badge}`}>
                  {meta.label}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="font-mono font-bold tabular-nums text-sm">{formatPrice(d.close as number)}</span>
                {d.changePercent != null && (
                  <span className={`text-xs font-mono tabular-nums ${changeColor(d.changePercent)}`}>
                    {formatPercent(d.changePercent)}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div className="rounded-md bg-bg-hover px-2 py-1.5">
                  <span className="block text-text-tertiary">Entry</span>
                  <span className="font-mono font-semibold tabular-nums">{d.entryPrice != null ? formatPrice(d.entryPrice) : "—"}</span>
                </div>
                <div className="rounded-md bg-bullish-bg/40 px-2 py-1.5">
                  <span className="block text-bullish/80">TP 1</span>
                  <span className="font-mono font-semibold tabular-nums text-bullish">{d.tp1 != null ? formatPrice(d.tp1) : "—"}</span>
                </div>
                <div className="rounded-md bg-bearish-bg/40 px-2 py-1.5">
                  <span className="block text-bearish/80">Cut Loss</span>
                  <span className="font-mono font-semibold tabular-nums text-bearish">{d.sl != null ? formatPrice(d.sl) : "—"}</span>
                </div>
                <div className="rounded-md bg-bg-hover px-2 py-1.5">
                  <span className="block text-text-tertiary">
                    MC TP dulu{d.confidence ? ` · ${CONF_LABEL[d.confidence] ?? d.confidence}` : ""}
                  </span>
                  <span className={`font-mono font-semibold tabular-nums ${mc && mc.winRate >= 0.5 ? "text-bullish" : "text-bearish"}`}>
                    {mc ? `${(mc.winRate * 100).toFixed(0)}%` : "—"}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
