import type { Metadata } from "next";
import Link from "next/link";
import { technicalAnalysisService } from "@/domains/stock/technical-analysis.service";
import { formatPrice, formatPercent, stripJk, changeColor, rsiColor, formatVolume } from "@/lib/utils";
import { SITE_URL } from "@/lib/constants";
import ScreenerClient from "@/components/screener/screener-client";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Screener Saham IDX Gratis — Filter RSI, MACD, Golden Cross & Bollinger Bands",
  description: "Screener saham IDX gratis dengan filter teknikal lengkap: RSI oversold/overbought, MACD crossover, Golden Cross, Bollinger Bands squeeze. Temukan saham untuk scalping, swing trading, dan investasi.",
  alternates: { canonical: "/screener" },
  keywords: [
    "screener saham gratis", "screener saham indonesia", "screener saham idx",
    "saham oversold hari ini", "screener saham untuk swing trading", "screener saham untuk scalping",
    "golden cross saham hari ini", "saham MACD bullish", "filter saham teknikal",
  ],
  openGraph: {
    title: "Screener Saham IDX Gratis — Filter Teknikal Lengkap",
    description: "Screener saham IDX gratis dengan filter teknikal: RSI, MACD, Golden Cross, Bollinger Bands. Temukan saham berdasarkan strategi trading Anda.",
    url: `${SITE_URL}/screener`,
    images: [{ url: `${SITE_URL}/api/og?title=Screener+Saham+IDX+Gratis&type=berita`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Screener Saham IDX Gratis — Filter Teknikal Lengkap",
    description: "Screener saham IDX gratis dengan filter teknikal: RSI, MACD, Golden Cross, Bollinger Bands.",
  },
};

export default async function ScreenerPage() {
  // Fetch default screener data server-side for SEO
  let initialStocks: Record<string, unknown>[] = [];
  try {
    const result = await technicalAnalysisService.screenerQuery("rsi_oversold");
    if (result && !("error" in result)) {
      initialStocks = Array.isArray(result) ? result : [];
    }
  } catch {
    // Non-critical — client component handles interactive fetching
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "Screener Saham IDX — TeknikalID",
        description: "Screener saham IDX40 dengan filter teknikal.",
        url: `${SITE_URL}/screener`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Screener", item: `${SITE_URL}/screener` },
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

      {/* Server-rendered stock table for crawlers — hidden from users */}
      {initialStocks.length > 0 && (
        <section aria-hidden="true" className="hidden">
          <h2>Saham IDX — Screener Teknikal</h2>
          <table>
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Nama</th>
                <th>Sektor</th>
                <th>Harga</th>
                <th>Perubahan</th>
                <th>Volume</th>
                <th>RSI</th>
              </tr>
            </thead>
            <tbody>
              {initialStocks.map((stock) => {
                const s = stock as { ticker: string; name: string; sector: string; close: number | null; changePercent: number | null; volume: number | null; rsi14: number | null };
                return (
                  <tr key={s.ticker}>
                    <td><Link href={`/stocks/${s.ticker}`}>{stripJk(s.ticker)}</Link></td>
                    <td>{s.name}</td>
                    <td>{s.sector}</td>
                    <td>{s.close !== null ? formatPrice(s.close) : "—"}</td>
                    <td>{s.changePercent !== null ? formatPercent(s.changePercent) : "—"}</td>
                    <td>{s.volume !== null ? formatVolume(s.volume) : "—"}</td>
                    <td>{s.rsi14 !== null ? s.rsi14.toFixed(1) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* Interactive client component */}
      <ScreenerClient />
    </>
  );
}
