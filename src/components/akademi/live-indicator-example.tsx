import Link from "next/link";
import { TrendingUp, ArrowRight } from "lucide-react";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { summarizeVerdict, explainMove, computeOutlook, toSnapshot } from "@/lib/verdict-prose";
import { stripJk } from "@/lib/utils";

/**
 * LiveIndicatorExample — deterministic "Contoh Live: TICKER" card for akademi
 * educational articles. Renders qualitative verdict prose from the ticker's
 * latest StockIndicator via the verdict-prose engine — unique per ticker/day,
 * zero AI, zero decimal leak (exact indicator values stay freemium-gated; only
 * the RSI zone + verdict + %move are shown, which are already public on the
 * stock page's SEO teaser).
 *
 * SEO: turns a static educational article into a per-article live-data page
 * that refreshes daily — defeats the thin/templated-content filter.
 * Conversion: CTA links into the gated stock detail page.
 *
 * ponytail: reuses getStockDetailForPage + verdict-prose; no new queries beyond
 * one detail fetch per akademi page (already force-dynamic with N queries).
 */
export async function LiveIndicatorExample({ ticker }: { ticker: string }) {
  const detail = await stockMarketService.getStockDetailForPage(ticker).catch(() => null);
  if (!detail || !detail.indicator || detail.close === null) return null;

  const { stock, close, changePercent, indicator, prevIndicator } = detail;
  const snapshot = toSnapshot(indicator);
  const outlook = computeOutlook(snapshot, close);
  const verdict = summarizeVerdict(snapshot, outlook, close);
  const move = explainMove({
    ticker,
    latest: snapshot,
    prev: prevIndicator ? toSnapshot(prevIndicator) : null,
    changePercent,
  });

  const sym = stripJk(ticker);
  // Qualitative RSI zone only — the exact RSI value is login-gated (freemium).
  const rsi = indicator.rsi14;
  const rsiZone =
    rsi == null
      ? null
      : rsi <= 30
        ? "oversold — potensi terjual berlebih (sering mendahului rebound)"
        : rsi >= 70
          ? "overbought — potensi jenuh beli (sering mendahului koreksi)"
          : "zona netral — belum ekstrem";

  const outlookStyles = {
    Bullish: "bg-bullish/15 text-bullish border-bullish/30",
    Bearish: "bg-bearish/15 text-bearish border-bearish/30",
    Neutral: "bg-bg-hover text-text-secondary border-border",
  } as const;

  return (
    <section
      className="mb-8 p-6 bg-bg-card rounded-xl depth-shadow border border-border"
      aria-label={`Contoh live ${sym}`}
    >
      <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-accent" />
          Contoh Live: {sym}
        </h2>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${outlookStyles[outlook]}`}>
          {outlook}
        </span>
      </div>

      <p className="text-xs text-text-tertiary mb-3 font-mono">{stock.name}</p>

      <div className="space-y-2 text-sm text-text-secondary">
        <p>{verdict}</p>
        {rsiZone && (
          <p>
            <span className="font-semibold text-text-primary">RSI (14):</span> {rsiZone}.
          </p>
        )}
        {move && <p className="text-text-tertiary italic">{move.headline}</p>}
      </div>

      <Link
        href={`/stocks/${ticker}`}
        className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-accent hover:text-accent/80 transition-colors"
      >
        Lihat analisa teknikal {sym} lengkap
        <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
