import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StockLogo } from "@/components/stock/stock-logo";
import { PageHero } from "@/components/layout/page-hero";
import { AskAiCta } from "@/components/seo/ask-ai-cta";
import { TradingPlanPicker } from "@/components/trading-plan/plan-picker";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { stockRepository } from "@/domains/stock/stock.repository";
import { monteCarloTpFirst } from "@/lib/monte-carlo";
import { auth } from "@/lib/auth";
import { formatPrice, formatPercent, stripJk, changeColor } from "@/lib/utils";
import { IDX_STOCKS } from "@/lib/constants";
import { subDays } from "date-fns";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Kalkulator Trading Plan Saham — Entry, Target, Cut Loss",
  description:
    "Kalkulator trading plan otomatis untuk saham IDX: entry, TP1/TP2, cut loss, risk-reward, dan confidence berbasis Pivot Points & ATR. Beberapa saham sekaligus.",
  robots: { index: false, follow: false },
};

const CONF_LABEL: Record<string, string> = { high: "Tinggi", medium: "Sedang", low: "Rendah" };
const KNOWN = new Set(IDX_STOCKS.map((s) => s.ticker));

/** Verdict risiko — objektif & explainable:
 *  - tunggu: strategi Wait & See (harga belum di zona entry ideal)
 *  - layak: RR >= 1.5 DAN confidence Tinggi
 *  - menengah: sisanya (RR 1-1.5 atau confidence Sedang/Rendah) */
type Tier = "layak" | "menengah" | "tunggu";
const TIERS: Tier[] = ["layak", "menengah", "tunggu"];
const TIER_META: Record<Tier, { label: string; desc: string; border: string; badge: string; dot: string }> = {
  layak: {
    label: "Layak",
    desc: "RR ≥ 1,5 & confidence Tinggi",
    border: "border-l-bullish",
    badge: "bg-bullish-bg text-bullish",
    dot: "bg-bullish",
  },
  menengah: {
    label: "Menengah",
    desc: "RR 1–1,5 atau confidence Sedang",
    border: "border-l-amber-400",
    badge: "bg-amber-400/10 text-amber-400",
    dot: "bg-amber-400",
  },
  tunggu: {
    label: "Tunggu",
    desc: "Harga belum di zona entry — Wait & See",
    border: "border-l-text-tertiary",
    badge: "bg-bg-hover text-text-tertiary",
    dot: "bg-text-tertiary",
  },
};

function tierOf(d: { tradingStrategy: string | null; riskReward: number | null; confidence: string | null }): Tier {
  if (d.tradingStrategy === "Wait & See") return "tunggu";
  const rr = d.riskReward ?? 0;
  if (rr >= 1.5 && d.confidence === "high") return "layak";
  return "menengah";
}

export default async function TradingPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string | string[]; f?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const params = await searchParams;
  const raw = Array.isArray(params.t) ? params.t : params.t ? [params.t] : [];
  const tickers = [...new Set(
    raw
      .flatMap((v) => v.split(","))
      .map((v) => v.trim().toUpperCase().replace(/\.JK$/, ""))
      .filter(Boolean)
      .map((v) => (KNOWN.has(`${v}.JK`) ? `${v}.JK` : v))
      .filter((v) => KNOWN.has(v)),
  )].slice(0, 6);
  const selected = tickers.length > 0 ? tickers : ["BBCA.JK"];
  const filter = (TIERS as string[]).includes(params.f ?? "") ? (params.f as Tier) : "semua";

  const [ogList, closesList] = await Promise.all([
    Promise.all(selected.map((t) => stockMarketService.getStockOgData(t).catch(() => null))),
    Promise.all(selected.map((t) =>
      stockRepository.findPricesByTicker(t, { date: { gte: subDays(new Date(), 150) } })
        .then((ps) => ps.map((x) => Number(x.close)))
        .catch(() => [] as number[]),
    )),
  ]);

  const details = ogList.map((d, i) => {
    const mc = d && d.entryPrice != null && d.tp1 != null && d.sl != null
      ? monteCarloTpFirst(closesList[i], d.entryPrice, d.tp1, d.sl, { seedKey: d.ticker })
      : null;
    return { ticker: selected[i], d, tier: d ? tierOf(d) : null, mc };
  });

  const counts = TIERS.reduce<Record<string, number>>((acc, t) => {
    acc[t] = details.filter((x) => x.tier === t).length;
    return acc;
  }, {});
  const shown = filter === "semua" ? details : details.filter((x) => x.tier === filter);

  const qsBase = (f: string) => {
    const qs = selected.map((t) => `t=${encodeURIComponent(t.replace(/\.JK$/, ""))}`).join("&");
    return `/trading-plan?${qs}${f !== "semua" ? `&f=${f}` : ""}`;
  };

  return (
    <>
      <PageHero
        eyebrow="Tools"
        title="Kalkulator Trading Plan"
        description="Rencana trading otomatis — entry, target, dan cut loss dari Pivot Points & ATR. Sampai 6 saham, langsung kelihatan mana yang layak."
      />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <TradingPlanPicker selected={selected} />

        {/* Filter pills — mana yang oke */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "semua", label: `Semua (${details.length})` },
            { key: "layak", label: `Layak (${counts.layak})` },
            { key: "menengah", label: `Menengah (${counts.menengah})` },
            { key: "tunggu", label: `Tunggu (${counts.tunggu})` },
          ].map((p) => (
            <Link
              key={p.key}
              href={qsBase(p.key)}
              scroll={false}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                filter === p.key
                  ? p.key === "layak"
                    ? "bg-bullish-bg text-bullish border-bullish/40"
                    : p.key === "menengah"
                      ? "bg-amber-400/10 text-amber-400 border-amber-400/40"
                      : p.key === "tunggu"
                        ? "bg-bg-hover text-text-secondary border-border"
                        : "bg-bg-hover text-text-primary border-border"
                  : "bg-bg-card text-text-tertiary border-border hover:text-text-secondary"
              }`}
            >
              {p.key !== "semua" && <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${TIER_META[p.key as Tier].dot}`} />}
              {p.label}
            </Link>
          ))}
        </div>

        {shown.length === 0 ? (
          <div className="rounded-xl border border-border bg-bg-card p-6 text-sm text-text-secondary">
            Tidak ada saham di kategori ini — coba filter <Link href={qsBase("semua")} className="text-accent underline underline-offset-2">Semua</Link>.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {shown.map(({ ticker, d, tier, mc }) => {
              if (!d || d.close == null) {
                return (
                  <div key={ticker} className="rounded-xl border border-border bg-bg-card p-5 text-sm text-text-secondary">
                    Saham <span className="font-mono font-semibold">{stripJk(ticker)}</span> belum ada data — coba kode lain.
                  </div>
                );
              }
              const meta = TIER_META[tier as Tier];
              const rr = d.riskReward;
              return (
                <div
                  key={ticker}
                  className={`rounded-xl border border-border border-l-4 ${meta.border} bg-bg-card p-5 space-y-4 ${
                    tier === "layak" ? "ring-1 ring-bullish/20" : ""
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <StockLogo name={d.name} ticker={ticker} size={32} />
                      <div>
                        <Link href={`/stocks/${ticker}`} className="font-mono font-bold text-lg text-text-primary hover:text-accent">
                          {stripJk(ticker)}
                        </Link>
                        <span className="block text-xs text-text-tertiary">{d.name}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold tabular-nums">{formatPrice(d.close)}</div>
                      {d.changePercent != null && (
                        <div className={`text-xs font-mono tabular-nums ${changeColor(d.changePercent)}`}>
                          {formatPercent(d.changePercent)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${meta.badge}`}>{meta.label}</span>
                    {d.tradingStrategy && (
                      <span className={`text-xs px-2.5 py-1 rounded-full ${
                        d.tradingStrategy === "Wait & See" ? "bg-bearish-bg text-bearish" : "bg-bullish-bg text-bullish"
                      }`}>
                        {d.tradingStrategy}
                      </span>
                    )}
                    {d.confidence && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-bg-hover text-text-secondary">
                        Confidence: {CONF_LABEL[d.confidence] ?? d.confidence}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-lg bg-bg-hover p-3">
                      <div className="text-[10px] uppercase tracking-wide text-text-tertiary">Entry</div>
                      <div className="font-mono font-bold tabular-nums mt-0.5">{d.entryPrice != null ? formatPrice(d.entryPrice) : "—"}</div>
                      <div className="text-[10px] text-text-tertiary mt-0.5">Zona beli</div>
                    </div>
                    <div className="rounded-lg bg-bullish-bg/40 p-3">
                      <div className="text-[10px] uppercase tracking-wide text-bullish/80">TP 1</div>
                      <div className="font-mono font-bold tabular-nums mt-0.5 text-bullish">{d.tp1 != null ? formatPrice(d.tp1) : "—"}</div>
                      <div className="text-[10px] text-text-tertiary mt-0.5">{d.tp1Source || "Target 1"}</div>
                    </div>
                    <div className="rounded-lg bg-bullish-bg/40 p-3">
                      <div className="text-[10px] uppercase tracking-wide text-bullish/80">TP 2</div>
                      <div className="font-mono font-bold tabular-nums mt-0.5 text-bullish">{d.tp2 != null ? formatPrice(d.tp2) : "—"}</div>
                      <div className="text-[10px] text-text-tertiary mt-0.5">Target 2</div>
                    </div>
                    <div className="rounded-lg bg-bearish-bg/40 p-3">
                      <div className="text-[10px] uppercase tracking-wide text-bearish/80">Cut Loss</div>
                      <div className="font-mono font-bold tabular-nums mt-0.5 text-bearish">{d.sl != null ? formatPrice(d.sl) : "—"}</div>
                      <div className="text-[10px] text-text-tertiary mt-0.5">{d.slSource || "Stop"}</div>
                    </div>
                  </div>

                  {mc && (
                    <div className="rounded-lg bg-bg-hover px-3 py-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary">Probabilitas kena TP dulu (Monte Carlo, {mc.simulations}x simulasi / {mc.horizonDays} hari)</span>
                        <span className={`font-mono font-bold tabular-nums ${mc.winRate >= 0.5 ? "text-bullish" : "text-bearish"}`}>
                          {(mc.winRate * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-border overflow-hidden">
                        <div
                          className={`h-full rounded-full ${mc.winRate >= 0.5 ? "bg-bullish" : "bg-bearish"}`}
                          style={{ width: `${Math.min(100, Math.max(2, mc.winRate * 100))}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-text-tertiary">
                        Expected value: {mc.evPerShare >= 0 ? "+" : "−"}Rp{Math.abs(Math.round(mc.evPerShare)).toLocaleString("id-ID")}/lembar · bootstrap 150 hari
                      </div>
                    </div>
                  )}
                  {rr != null && (
                    <div className="text-xs text-text-secondary">
                      Risk-Reward:{" "}
                      <span className={`font-mono font-semibold ${rr >= 1.5 ? "text-bullish" : rr >= 1 ? "text-amber-400" : "text-bearish"}`}>
                        1 : {rr.toFixed(1)}
                      </span>
                      {d.tradingWarning && (
                        <span className="block mt-1.5 text-text-tertiary leading-snug">⚠ {d.tradingWarning}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="rounded-lg border border-border bg-bg-card p-5">
          <h2 className="text-sm font-semibold mb-2">Cara membaca verdict</h2>
          <ul className="text-sm text-text-secondary space-y-1.5 list-disc pl-5">
            <li><span className="font-semibold text-bullish">Layak</span> — risk-reward ≥ 1:1,5 dan confidence Tinggi. {counts.layak} dari {details.length} saham terpilih.</li>
            <li><span className="font-semibold text-amber-400">Menengah</span> — masih oke tapi margin tipis (RR 1–1,5 atau confidence Sedang). Posisi kecil, sabar menunggu entry.</li>
            <li><span className="font-semibold text-text-secondary">Tunggu</span> — harga belum di zona entry ideal, strategi otomatis jadi Wait &amp; See. Jangan kejar.</li>
            <li>Plan dihitung dari Pivot Points &amp; ATR(14) — kerangka disiplin, bukan prediksi.</li>
          </ul>
        </div>

        <AskAiCta question={`Trading plan ${stripJk(selected[0])} bagaimana?`} />
      </div>
    </>
  );
}
