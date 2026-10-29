import { type Metadata } from "next";
import { safeJsonLd } from "@/lib/safe-json-ld";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SECTORS, SECTOR_SLUG_MAP } from "@/lib/sectors";
import { SITE_URL } from "@/lib/constants";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { StockCard } from "@/components/stock/stock-card";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return SECTORS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sector = SECTORS.find((s) => s.slug === slug);
  if (!sector) return {};

  return {
    title: `Daftar Harga Saham Sektor ${sector.name} BEI Hari Ini — Analisa Teknikal`,
    description: sector.description.length > 160
      ? sector.description.slice(0, 157) + "..."
      : sector.description,
    alternates: { canonical: `/sektor/${slug}` },
    openGraph: {
      title: `Sektor ${sector.name} — Daftar Saham & Harga Hari Ini | TeknikalID`,
      description: sector.description.length > 160
        ? sector.description.slice(0, 157) + "..."
        : sector.description,
      url: `${SITE_URL}/sektor/${slug}`,
    },
  };
}

export default async function SectorDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sector = SECTORS.find((s) => s.slug === slug);
  if (!sector) notFound();

  // Live data for representative tickers. SECTORS stores bare tickers; DB uses .JK.
  // Fail-soft so a DB hiccup degrades to an empty list, not a 500.
  const tickers = sector.stocks.map((t) => (t.endsWith(".JK") ? t : `${t}.JK`));
  let stocks: Awaited<ReturnType<typeof stockMarketService.getStockBatchWithIndicators>> = [];
  try {
    stocks = await stockMarketService.getStockBatchWithIndicators(tickers);
  } catch {
    stocks = [];
  }

  // seo-dr-3 (deep-research 641c019): daftar LENGKAP seluruh saham aktif sektor ini via
  // satu-pintu getStockList(sector) — sebelumnya hanya 2-5 saham statis (halaman 128 kata).
  // Reverse-map slug → nama sektor IDX (English) via SECTOR_SLUG_MAP.
  const idxSectorName = Object.entries(SECTOR_SLUG_MAP).find(([, sl]) => sl === slug)?.[0];
  let allSectorRows: Awaited<ReturnType<typeof stockMarketService.getStockList>> = [];
  if (idxSectorName) {
    try {
      allSectorRows = await stockMarketService.getStockList(idxSectorName);
    } catch {
      allSectorRows = [];
    }
  }
  // Baris unik (representative + full), urut: turun % dulu lalu likuiditas (volume).
  const seen = new Set<string>();
  const merged = [
    ...allSectorRows
      .filter((r) => r.close !== null)
      .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
      .slice(0, 60),
    ...allSectorRows.filter((r) => r.close === null),
  ];
  const fullList = merged.filter((r) => {
    if (seen.has(r.ticker)) return false;
    seen.add(r.ticker);
    return true;
  });
  const fullBreath = fullList.reduce(
    (acc, r) => {
      if (r.close === null) return acc;
      if ((r.changePercent ?? 0) > 0) acc.bullish++;
      else if ((r.changePercent ?? 0) < 0) acc.bearish++;
      else acc.neutral++;
      return acc;
    },
    { bullish: 0, bearish: 0, neutral: 0 },
  );
  const breath = stocks.reduce(
    (acc, s) => {
      const l = s.signalLabel ?? "";
      if (l.includes("Bullish")) acc.bullish++;
      else if (l.includes("Bearish")) acc.bearish++;
      else acc.neutral++;
      return acc;
    },
    { bullish: 0, bearish: 0, neutral: 0 },
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: `Sektor ${sector.name} — Analisis Teknikal Saham BEI`,
        description: sector.description,
        url: `${SITE_URL}/sektor/${sector.slug}`,
        breadcrumb: { "@id": `${SITE_URL}/sektor/${sector.slug}#breadcrumb` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${SITE_URL}/sektor/${sector.slug}#breadcrumb`,
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
          {
            "@type": "ListItem",
            position: 3,
            name: sector.name,
            item: `${SITE_URL}/sektor/${sector.slug}`,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
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
            href="/sektor"
            className="hover:text-accent transition-colors"
          >
            Sektor
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
            {sector.name}
          </span>
        </nav>

        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-text-primary">
            Sektor {sector.name}
          </h1>
          <p className="text-text-secondary mt-3 text-sm sm:text-base leading-relaxed max-w-3xl">
            {sector.description}
          </p>
        </div>

        {/* Stock list — live verdicts + %change */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary">
              Saham Sektor {sector.name} Hari Ini
            </h2>
            {(stocks.length > 0 || fullList.length > 0) && (
              <div className="flex items-center gap-2 text-[11px] font-medium">
                <span className="text-bullish">{fullBreath.bullish} Sinyal Naik</span>
                <span className="text-text-tertiary">·</span>
                <span className="text-text-secondary">{fullBreath.neutral} Netral</span>
                <span className="text-text-tertiary">·</span>
                <span className="text-bearish">{fullBreath.bearish} Tekanan Jual</span>
              </div>
            )}
          </div>
          {stocks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {stocks.map((s) => (
                <StockCard key={s.ticker} {...s} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-tertiary">Belum ada data harga untuk saham di sektor ini.</p>
          )}
        </div>

        {/* seo-dr-3: tabel LENGKAP seluruh saham aktif sektor (SSR, internal link ke semua emiten) */}
        {fullList.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary mb-3">
              Daftar Lengkap {fullList.length} Saham Sektor {sector.name} di BEI
            </h2>
            <p className="text-sm text-text-secondary mb-4 leading-relaxed">
              Berikut seluruh emiten aktif sektor {sector.name.toLowerCase()} di Bursa Efek Indonesia,
              diurutkan berdasarkan likuiditas perdagangan. Kolom modal 1 lot membantu pemula menghitung
              uang yang dibutuhkan untuk membeli 100 lembar saham.
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-bg-hover text-text-tertiary text-xs">
                    <th className="text-left px-3 py-2">Kode</th>
                    <th className="text-left px-3 py-2">Nama Emiten</th>
                    <th className="text-right px-3 py-2">Harga</th>
                    <th className="text-right px-3 py-2">Modal 1 Lot</th>
                    <th className="text-right px-3 py-2">Perubahan</th>
                    <th className="text-right px-3 py-2">RSI-14</th>
                  </tr>
                </thead>
                <tbody>
                  {fullList.map((r) => (
                    <tr key={r.ticker} className="border-t border-border">
                      <td className="px-3 py-2">
                        <Link href={`/stocks/${r.ticker}`} className="font-mono font-semibold text-accent hover:underline">
                          {r.ticker.replace(".JK", "")}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-text-secondary max-w-[240px] truncate" title={r.name}>{r.name}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{r.close !== null ? new Intl.NumberFormat("id-ID").format(r.close) : "—"}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-text-secondary">{r.close !== null ? new Intl.NumberFormat("id-ID").format(r.close * 100) : "—"}</td>
                      <td className={`px-3 py-2 text-right font-mono tabular-nums ${(r.changePercent ?? 0) > 0 ? "text-bullish" : (r.changePercent ?? 0) < 0 ? "text-bearish" : "text-text-tertiary"}`}>
                        {r.changePercent !== null ? `${r.changePercent > 0 ? "+" : ""}${r.changePercent.toFixed(2).replace(".", ",")}%` : "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-text-secondary">{r.rsi14 !== null ? r.rsi14.toFixed(0) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Back link */}
        <Link
          href="/sektor"
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
          Semua Sektor
        </Link>
      </div>
    </>
  );
}
