import { type Metadata } from "next";
import { safeJsonLd } from "@/lib/safe-json-ld";
import Link from "next/link";
import { SECTORS, SECTOR_SLUG_MAP } from "@/lib/sectors";
import { SITE_URL } from "@/lib/constants";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { formatPercent, changeColor } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sektor Saham BEI — Harga & Analisa per Sektor",
  description:
    "Jelajahi analisa teknikal saham BEI berdasarkan 12 sektor resmi: perbankan, energi, konsumer, properti, teknologi, kesehatan, dan lainnya. Cek jumlah saham, pergerakan harga, dan sinyal tiap sektor.",
  alternates: { canonical: "/sektor" },
  openGraph: {
    title: "Sektor Saham BEI — Harga & Analisa per Sektor",
    description:
      "Jelajahi analisa teknikal saham BEI berdasarkan 12 sektor resmi: perbankan, energi, konsumer, properti, teknologi, kesehatan, dan lainnya.",
    url: `${SITE_URL}/sektor`,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      name: "Sektor Saham BEI — Harga & Analisa per Sektor",
      description:
        "Daftar 12 sektor saham di Bursa Efek Indonesia dengan ringkasan jumlah saham dan analisis teknikal per sektor.",
      url: `${SITE_URL}/sektor`,
      breadcrumb: { "@id": `${SITE_URL}/sektor#breadcrumb` },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${SITE_URL}/sektor#breadcrumb`,
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
          name: "Sektor",
          item: `${SITE_URL}/sektor`,
        },
      ],
    },
  ],
};

export default async function SectorIndexPage() {
  let allStocks: Awaited<ReturnType<typeof stockMarketService.getStockList>> = [];
  try {
    allStocks = await stockMarketService.getStockList();
  } catch {
    allStocks = [];
  }

  // Calculate sector metrics SSR for all 12 sectors
  const sectorRows = SECTORS.map((sector) => {
    const idxSectorName = Object.entries(SECTOR_SLUG_MAP).find(([, sl]) => sl === sector.slug)?.[0];
    const matching = allStocks.filter(
      (r) =>
        (idxSectorName && r.sector === idxSectorName) ||
        sector.stocks.some((t) => r.ticker.replace(/\.JK$/, "") === t || r.ticker === t),
    );

    const totalCount = matching.length > 0 ? matching.length : sector.stocks.length;
    const upCount = matching.filter((r) => (r.changePercent ?? 0) > 0).length;
    const downCount = matching.filter((r) => (r.changePercent ?? 0) < 0).length;
    const avgChange =
      matching.length > 0
        ? matching.reduce((acc, r) => acc + (r.changePercent ?? 0), 0) / matching.length
        : 0;

    return {
      sector,
      totalCount,
      upCount,
      downCount,
      avgChange,
    };
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div>
          <nav className="text-xs text-text-tertiary flex items-center gap-1.5 mb-4">
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
            <span className="text-text-secondary" aria-current="page">
              Sektor
            </span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-text-primary">
            Sektor Saham BEI — Harga & Analisa per Sektor
          </h1>
          <p className="text-text-secondary mt-2 text-sm sm:text-base max-w-3xl">
            Ringkasan data pasar dan analisis teknikal 12 sektor saham Bursa Efek Indonesia.
            Pilih sektor untuk melihat pergerakan harga lengkap seluruh emiten serta indikator RSI dan MACD.
          </p>
        </div>

        {/* 12-row SSR Sector Table */}
        <div className="overflow-x-auto rounded-xl border border-border bg-bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-text-tertiary">
                <th className="py-3 px-4 font-semibold">Sektor</th>
                <th className="py-3 px-4 font-semibold text-right">Jumlah Saham</th>
                <th className="py-3 px-4 font-semibold text-right">Saham Naik</th>
                <th className="py-3 px-4 font-semibold text-right">Saham Turun</th>
                <th className="py-3 px-4 font-semibold text-right">Rata-Rata Perubahan</th>
                <th className="py-3 px-4 font-semibold">Saham Utama</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sectorRows.map(({ sector, totalCount, upCount, downCount, avgChange }) => (
                <tr key={sector.slug} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4">
                    <Link
                      href={`/sektor/${sector.slug}`}
                      className="font-semibold text-text-primary hover:text-accent transition-colors"
                    >
                      {sector.name}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-text-secondary">
                    {totalCount}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-bullish">
                    {upCount}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-bearish">
                    {downCount}
                  </td>
                  <td className={`py-3 px-4 text-right font-mono font-medium ${changeColor(avgChange)}`}>
                    {formatPercent(avgChange)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1.5">
                      {sector.stocks.map((t) => (
                        <Link
                          key={t}
                          href={`/stocks/${t}.JK`}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted hover:bg-accent/15 hover:text-accent text-text-tertiary transition-colors"
                        >
                          {t}
                        </Link>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sector Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
          {SECTORS.map((sector) => (
            <Link
              key={sector.slug}
              href={`/sektor/${sector.slug}`}
              className="group block bg-bg-card rounded-xl depth-shadow p-5 hover:depth-shadow-hover border border-border transition-all"
            >
              <h2 className="text-lg font-semibold text-text-primary group-hover:text-accent transition-colors">
                {sector.name}
              </h2>
              <p className="text-xs text-text-tertiary mt-1 line-clamp-2">
                {sector.description}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {sector.stocks.map((ticker) => (
                  <span
                    key={ticker}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-accent/10 text-accent"
                  >
                    {ticker}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
