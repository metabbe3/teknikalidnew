import type { Metadata } from "next";
import { safeJsonLd } from "@/lib/safe-json-ld";
import Link from "next/link";
import { StockLogo } from "@/components/stock/stock-logo";
import { PageHero } from "@/components/layout/page-hero";
import { AskAiCta } from "@/components/seo/ask-ai-cta";
import { RegisterCta } from "@/components/signal/register-cta";
import { fetchScreenerRows } from "@/components/signal/screener-data";
import { formatPrice, formatPercent, formatVolume, stripJk, changeColor, rsiColor } from "@/lib/utils";
import { SITE_URL } from "@/lib/constants";


// force-dynamic (RCA 18 Okt): prerender build-time tanpa DB membekukan empty state
// ("Data sedang diperbarui") — ISR revalidate tidak pernah mengisi (pola /berita).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bottom Fishing Radar — Saham Oversold Potensi Reversal",
  description:
    "Radar bottom fishing IDX: saham oversold RSI di bawah 30 dengan volume transaksi nyata. Temukan saham potensi rebound sebelum market bergerak.",
  alternates: { canonical: "/bottom-fishing" },
  keywords: [
    "bottom fishing saham",
    "saham oversold hari ini",
    "saham potensi rebound",
    "beli saham murah idx",
    "rsi oversold saham indonesia",
  ],
  openGraph: {
    title: "Bottom Fishing Radar — Saham Oversold Potensi Reversal | TeknikalID",
    description: "Saham oversold RSI < 30 dengan volume transaksi nyata di Bursa Efek Indonesia.",
    url: `${SITE_URL}/bottom-fishing`,
    images: [{ url: `${SITE_URL}/api/og?title=Bottom+Fishing+Radar&type=berita`, width: 1200, height: 630 }],
  },
};

type Row = {
  ticker: string;
  name: string;
  sector: string | null;
  close: number | null;
  changePercent: number;
  volume: number | null;
  rsi14: number | null;
};

export default async function BottomFishingPage() {
  const { stocks, failed } = await fetchScreenerRows("rsi_oversold", 50);

  // Trust: hanya saham dengan transaksi nyata di sesi terakhir (bar volume > 0) —
  // saham beku/suspend (carry-forward) tidak layak jadi kandidat bottom fishing.
  const rows: Row[] = (stocks as unknown as Row[]).filter(
    (s) => s.volume != null && s.volume > 0 && s.close != null && s.close > 0,
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "Bottom Fishing Radar — Saham Oversold Potensi Reversal",
        description: "Radar saham oversold RSI < 30 dengan volume transaksi nyata.",
        url: `${SITE_URL}/bottom-fishing`,
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <PageHero
        eyebrow="Tools"
        title="Bottom Fishing Radar"
        description="Saham IDX oversold (RSI < 30) yang masih transaksi di sesi terakhir — kandidat rebound dengan data nyata, bukan saham beku."
      />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {failed ? (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-sm text-text-secondary">
            Data sedang diperbarui — mungkin sebagian saham masih disinkronkan. Coba beberapa saat lagi.
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-sm text-text-secondary">
            Tidak ada saham oversold dengan transaksi aktif saat ini — pasar sedang dalam kondisi normal.
            Kunjungi{" "}
            <Link href="/screener" className="text-accent underline underline-offset-2">
              Screener
            </Link>{" "}
            untuk filter lain.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-hover text-left text-xs uppercase tracking-wide text-text-tertiary">
                  <th className="px-4 py-3">Saham</th>
                  <th className="px-4 py-3 text-right">Harga</th>
                  <th className="px-4 py-3 text-right">Perubahan</th>
                  <th className="px-4 py-3 text-right">RSI(14)</th>
                  <th className="px-4 py-3 text-right">Volume</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.ticker} className="border-b border-border/50 last:border-0 hover:bg-bg-hover/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <StockLogo name={s.name} ticker={s.ticker} size={28} />
                        <div>
                          <Link href={`/stocks/${s.ticker}`} className="font-mono font-semibold text-text-primary hover:text-accent">
                            {stripJk(s.ticker)}
                          </Link>
                          <span className="block text-xs text-text-tertiary">{s.name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{s.close != null ? formatPrice(s.close) : "—"}</td>
                    <td className={`px-4 py-3 text-right font-mono tabular-nums ${changeColor(s.changePercent)}`}>
                      {formatPercent(s.changePercent)}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono tabular-nums ${rsiColor(s.rsi14)}`}>
                      {s.rsi14 != null ? Math.round(s.rsi14).toString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary">
                      {s.volume != null ? formatVolume(s.volume) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="rounded-lg border border-border bg-bg-card p-5">
          <h2 className="text-sm font-semibold mb-2">Cara membaca radar ini</h2>
          <ul className="text-sm text-text-secondary space-y-1.5 list-disc pl-5">
            <li>RSI(14) di bawah 30 = kondisi oversold — tekanan jual sangat kuat, berpotensi rebound.</li>
            <li>Volume hanya menghitung saham yang benar-benar transaksi di sesi terakhir — saham suspend/beku otomatis dikeluarkan.</li>
            <li>Oversold bukan berarti langsung beli — selalu cek struktur tren dan trading plan di halaman sahamnya.</li>
          </ul>
        </div>

        <RegisterCta slug="saham-oversold" />
        <AskAiCta question="Saham oversold murah ada?" />
      </div>
    </>
  );
}
