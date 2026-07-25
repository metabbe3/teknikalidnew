import type { Metadata } from "next";
import Link from "next/link";
import { stockRepository } from "@/domains/stock/stock.repository";
import { SITE_URL } from "@/lib/constants";
import { decimalToNumber } from "@/lib/serialize";
import { formatPrice, formatPercent, changeColor, stripJk } from "@/lib/utils";
import { SectionHeading } from "@/components/ui/section-heading";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Harga Crypto Hari Ini — BTC, ETH, SOL (IDR) | TeknikalID",
  description:
    "Harga crypto Bitcoin, Ethereum, Solana dalam Rupiah (data Indodax). Chart interaktif, indikator teknikal RSI/MACD/SMA, dan sinyal trading — analisa teknikal crypto bahasa Indonesia.",
  alternates: { canonical: "/crypto" },
  keywords: ["harga crypto hari ini", "harga btc idr", "harga ethereum", "analisa teknikal crypto", "bitcoin indonesia"],
  openGraph: {
    title: "Harga Crypto Hari Ini — BTC, ETH, SOL (IDR) | TeknikalID",
    description: "Harga crypto dalam Rupiah (Indodax) + analisa teknikal. Chart, RSI, MACD, sinyal trading untuk BTC, ETH, SOL.",
    url: `${SITE_URL}/crypto`,
  },
};

function signalTone(label: string | null): string {
  if (!label) return "text-text-tertiary bg-bg-hover";
  const l = label.toLowerCase();
  if (l.includes("bullish")) return "text-bullish bg-bullish/10";
  if (l.includes("bearish")) return "text-bearish bg-bearish/10";
  return "text-text-tertiary bg-bg-hover";
}

export default async function CryptoPage() {
  const stocks = await stockRepository.findCryptoStocksWithIndicators();

  const cards = stocks.map((s) => {
    const close = s.prices[0] ? decimalToNumber(s.prices[0].close) : null;
    const prev = s.prices[1] ? decimalToNumber(s.prices[1].close) : null;
    const changePercent = close !== null && prev !== null && prev !== 0 ? ((close - prev) / prev) * 100 : null;
    const ind = s.indicators[0];
    return {
      ticker: s.ticker,
      name: s.name,
      close,
      changePercent,
      signalLabel: ind?.signalLabel ?? null,
      rsi14: ind?.rsi14 ? decimalToNumber(ind.rsi14) : null,
    };
  });

  return (
    <div className="fade-in">
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
        <section className="space-y-5">
          <SectionHeading
            eyebrow="indodax · rupiah"
            title="Crypto"
            action={<span className="text-xs text-text-tertiary">{cards.length} koin</span>}
          />
          <p className="text-sm text-text-secondary max-w-2xl">
            Harga crypto dalam Rupiah (data Indodax). Klik koin untuk chart interaktif, indikator teknikal
            (RSI, MACD, SMA, Bollinger Bands), dan sinyal trading.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cards.map((c) => {
              const up = (c.changePercent ?? 0) >= 0;
              return (
                <Link
                  key={c.ticker}
                  href={`/crypto/${c.ticker}`}
                  className="group flex flex-col bg-bg-card rounded-xl p-4 border border-border/60 hover:border-accent/30 hover:depth-shadow-hover transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-mono text-sm font-bold text-text-primary">{stripJk(c.ticker)}</span>
                      <p className="text-[11px] text-text-tertiary leading-tight line-clamp-1 mt-0.5">{c.name}</p>
                    </div>
                    {c.signalLabel && (
                      <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${signalTone(c.signalLabel)}`}>
                        {c.signalLabel}
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <span className="font-mono text-lg font-bold tabular-nums text-text-primary">
                      {c.close !== null ? formatPrice(c.close) : "—"}
                    </span>
                    {c.changePercent !== null && (
                      <div className={`flex items-center gap-1 font-mono text-xs font-semibold tabular-nums ${changeColor(c.changePercent)}`}>
                        <span aria-hidden>{up ? "▲" : "▼"}</span>
                        <span>{formatPercent(c.changePercent)}</span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
