import { type Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { IDX_INDICES } from "@/lib/idx-indices";
import { SITE_URL } from "@/lib/constants";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { formatPrice, formatPercent, stripJk, changeColor, rsiColor, rsiStatus } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const idx = IDX_INDICES.find((i) => i.slug === slug);
  if (!idx) return {};

  const desc =
    idx.description.length > 160
      ? idx.description.slice(0, 157) + "..."
      : idx.description;

  return {
    title: `Daftar Harga Saham ${idx.fullName} Hari Ini — Analisa Teknikal`,
    description: desc,
    alternates: { canonical: `/indeks/${slug}` },
    openGraph: {
      title: `${idx.fullName} — Daftar Saham & Harga Hari Ini | TeknikalID`,
      description: desc,
      url: `${SITE_URL}/indeks/${slug}`,
    },
  };
}

export default async function IndexDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const idx = IDX_INDICES.find((i) => i.slug === slug);
  if (!idx) notFound();

  const stocks = await stockMarketService.getStockBatchWithIndicators(
    idx.stocks.slice(0, 30)
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: `${idx.fullName} — Analisis Teknikal Saham BEI`,
        description: idx.description,
        url: `${SITE_URL}/indeks/${idx.slug}`,
        breadcrumb: { "@id": `${SITE_URL}/indeks/${idx.slug}#breadcrumb` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${SITE_URL}/indeks/${idx.slug}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Indeks",
            item: `${SITE_URL}/indeks`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: idx.name,
            item: `${SITE_URL}/indeks/${idx.slug}`,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Breadcrumb */}
        <nav
          className="text-xs text-text-tertiary flex items-center gap-1.5"
          aria-label="Breadcrumb"
        >
          <Link href="/" className="hover:text-accent transition-colors">
            Home
          </Link>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <Link
            href="/indeks"
            className="hover:text-accent transition-colors"
          >
            Indeks
          </Link>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="text-text-secondary" aria-current="page">
            {idx.name}
          </span>
        </nav>

        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
            {idx.fullName}
          </h1>
          <p className="text-text-secondary mt-3 text-sm sm:text-base leading-relaxed max-w-3xl">
            {idx.description}
          </p>
        </div>

        {/* Stock table */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary mb-4">
            Saham Konstituen ({stocks.length})
          </h2>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-tertiary text-xs uppercase tracking-wider">
                  <th className="text-left py-3 px-3 font-semibold">Ticker</th>
                  <th className="text-left py-3 px-3 font-semibold">Nama</th>
                  <th className="text-right py-3 px-3 font-semibold">Harga</th>
                  <th className="text-right py-3 px-3 font-semibold">Perubahan</th>
                  <th className="text-right py-3 px-3 font-semibold">RSI 14</th>
                  <th className="text-center py-3 px-3 font-semibold">Sinyal</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((stock) => {
                  const isPositive =
                    stock.changePercent !== null && stock.changePercent >= 0;
                  return (
                    <tr
                      key={stock.ticker}
                      className="border-b border-border/50 hover:bg-bg-card/50 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <Link
                          href={`/stocks/${stock.ticker}`}
                          className="font-mono font-semibold text-text-primary hover:text-accent transition-colors"
                        >
                          {stripJk(stock.ticker)}
                        </Link>
                      </td>
                      <td className="py-3 px-3 text-text-secondary truncate max-w-[200px]">
                        {stock.name}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums font-medium">
                        {stock.close != null
                          ? formatPrice(stock.close)
                          : "—"}
                      </td>
                      <td
                        className={`py-3 px-3 text-right tabular-nums font-medium ${changeColor(stock.changePercent)}`}
                      >
                        {stock.changePercent != null
                          ? `${isPositive ? "+" : ""}${formatPercent(stock.changePercent)}`
                          : "—"}
                      </td>
                      <td
                        className={`py-3 px-3 text-right tabular-nums ${rsiColor(stock.rsi14)}`}
                      >
                        {stock.rsi14 != null ? stock.rsi14.toFixed(1) : "—"}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            stock.rsi14 != null
                              ? stock.rsi14 > 70
                                ? "bg-bearish/15 text-bearish"
                                : stock.rsi14 < 30
                                  ? "bg-bullish/15 text-bullish"
                                  : "bg-gray-200 text-gray-500"
                              : "bg-gray-200 text-gray-500"
                          }`}
                        >
                          {rsiStatus(stock.rsi14)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden grid grid-cols-1 gap-3">
            {stocks.map((stock) => {
              const isPositive =
                stock.changePercent !== null && stock.changePercent >= 0;
              return (
                <Link
                  key={stock.ticker}
                  href={`/stocks/${stock.ticker}`}
                  className="group flex items-center gap-3 bg-bg-card rounded-xl depth-shadow p-4 hover:depth-shadow-hover border border-border transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center font-bold text-accent text-sm font-mono shrink-0">
                    {stripJk(stock.ticker).slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-text-primary group-hover:text-accent transition-colors font-mono">
                        {stripJk(stock.ticker)}
                      </p>
                      {stock.rsi14 != null && (
                        <span
                          className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                            stock.rsi14 > 70
                              ? "bg-bearish/15 text-bearish"
                              : stock.rsi14 < 30
                                ? "bg-bullish/15 text-bullish"
                                : "bg-gray-200 text-gray-500"
                          }`}
                        >
                          {rsiStatus(stock.rsi14)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-tertiary truncate">
                      {stock.name}
                    </p>
                  </div>
                  <div className="text-right shrink-0 tabular-nums">
                    {stock.close != null ? (
                      <p className="font-semibold text-sm">
                        {formatPrice(stock.close)}
                      </p>
                    ) : (
                      <p className="font-semibold text-text-tertiary">—</p>
                    )}
                    {stock.changePercent != null && (
                      <p
                        className={`text-xs font-medium ${changeColor(stock.changePercent)}`}
                      >
                        {isPositive ? "+" : ""}
                        {formatPercent(stock.changePercent)}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Back link */}
        <Link
          href="/indeks"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent transition-colors"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Semua Indeks
        </Link>
      </div>
    </>
  );
}
