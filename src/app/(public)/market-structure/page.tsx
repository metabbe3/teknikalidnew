import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/layout/page-hero";
import { AskAiCta } from "@/components/seo/ask-ai-cta";
import { marketStructureService } from "@/domains/stock/market-structure.service";
import { stockRepository } from "@/domains/stock/stock.repository";
import { formatPrice, formatVolume, stripJk } from "@/lib/utils";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Market Structure — Struktur Tren Saham IDX Terlikuid",
  description:
    "Analisis struktur pasar 40 saham IDX terlikuid: uptrend (HH/HL), downtrend (LH/LL), atau konsolidasi. Berbasis swing point ZigZag + ATR.",
  alternates: { canonical: "/market-structure" },
  keywords: [
    "struktur tren saham",
    "market structure saham idx",
    "higher high lower low",
    "saham uptrend hari ini",
    "saham downtrend hari ini",
  ],
  openGraph: {
    title: "Market Structure — Struktur Tren Saham IDX | TeknikalID",
    description: "Struktur tren 40 saham IDX terlikuid berbasis swing point analysis.",
    url: `${SITE_URL}/market-structure`,
    images: [{ url: `${SITE_URL}/api/og?title=Market+Structure+IDX&type=berita`, width: 1200, height: 630 }],
  },
};

const STRUCTURE_META: Record<string, { label: string; tone: string; desc: string }> = {
  UPTREND: { label: "Uptrend", tone: "text-bullish", desc: "Higher High & Higher Low — struktur naik sehat" },
  DOWNTREND: { label: "Downtrend", tone: "text-bearish", desc: "Lower High & Lower Low — struktur turun" },
  CONSOLIDATION: { label: "Konsolidasi", tone: "text-text-tertiary", desc: "Sideways — belum ada arah jelas" },
};

type Row = {
  ticker: string;
  name: string;
  close: number | null;
  volume: number | null;
  structure: string;
  lastSwing: string;
};

async function getRows(): Promise<{ rows: Row[]; failed: boolean }> {
  try {
    // Universe trust: 40 saham equity terlikuid di sesi terakhir (volume nyata, bukan beku).
    const universe = await stockRepository.findMostLiquidEquities(40);
    const rows: Row[] = [];
    for (const u of universe) {
      const ms = await marketStructureService.getMarketStructure(u.ticker).catch(() => null);
      const meta = STRUCTURE_META[ms?.structure ?? "CONSOLIDATION"] ?? STRUCTURE_META.CONSOLIDATION;
      const last = ms?.swings[ms.swings.length - 1];
      rows.push({
        ticker: u.ticker,
        name: u.name,
        close: u.close,
        volume: u.volume,
        structure: ms?.structure ?? "CONSOLIDATION",
        lastSwing: last ? `${last.type === "HIGH" ? "HH/High" : "HL/Low"} @ ${formatPrice(last.price)}` : "—",
      });
      void meta;
    }
    return { rows, failed: false };
  } catch (e) {
    console.error("[market-structure] gagal:", e instanceof Error ? e.message : e);
    return { rows: [], failed: true };
  }
}

export default async function MarketStructurePage() {
  const { rows, failed } = await getRows();

  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.structure] = (acc[r.structure] ?? 0) + 1;
    return acc;
  }, {});

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "Market Structure — Struktur Tren Saham IDX Terlikuid",
        description: "Struktur tren 40 saham IDX terlikuid berbasis swing point analysis.",
        url: `${SITE_URL}/market-structure`,
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero
        eyebrow="Tools"
        title="Market Structure"
        description="Struktur tren 40 saham IDX terlikuid — Uptrend (HH/HL), Downtrend (LH/LL), atau Konsolidasi, dari analisis swing point 150 hari."
      />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {failed ? (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-sm text-text-secondary">
            Data sedang diperbarui — coba beberapa saat lagi.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(STRUCTURE_META) as (keyof typeof STRUCTURE_META)[]).map((k) => (
                <div key={k} className={`rounded-lg border border-border bg-bg-card p-4 ${failed ? "opacity-50" : ""}`}>
                  <div className={`text-xs font-medium ${STRUCTURE_META[k].tone}`}>{STRUCTURE_META[k].label}</div>
                  <div className="text-2xl font-bold font-mono tabular-nums mt-1">{counts[k] ?? 0}</div>
                  <div className="text-[10px] text-text-tertiary mt-1 leading-snug">{STRUCTURE_META[k].desc}</div>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-hover text-left text-xs uppercase tracking-wide text-text-tertiary">
                    <th className="px-4 py-3">Saham</th>
                    <th className="px-4 py-3 text-right">Harga</th>
                    <th className="px-4 py-3">Struktur</th>
                    <th className="px-4 py-3">Swing Terakhir</th>
                    <th className="px-4 py-3 text-right">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const meta = STRUCTURE_META[r.structure] ?? STRUCTURE_META.CONSOLIDATION;
                    return (
                      <tr key={r.ticker} className="border-b border-border/50 last:border-0 hover:bg-bg-hover/50">
                        <td className="px-4 py-3">
                          <Link href={`/stocks/${r.ticker}`} className="font-mono font-semibold text-text-primary hover:text-accent">
                            {stripJk(r.ticker)}
                          </Link>
                          <span className="block text-xs text-text-tertiary">{r.name}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                          {r.close != null ? formatPrice(r.close) : "—"}
                        </td>
                        <td className={`px-4 py-3 font-medium ${meta.tone}`}>{meta.label}</td>
                        <td className="px-4 py-3 text-text-secondary text-xs font-mono">{r.lastSwing}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary">
                          {r.volume != null ? formatVolume(r.volume) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="rounded-lg border border-border bg-bg-card p-5">
          <h2 className="text-sm font-semibold mb-2">Cara membaca struktur ini</h2>
          <ul className="text-sm text-text-secondary space-y-1.5 list-disc pl-5">
            <li>Uptrend = higher high + higher low berurutan — tren naik, pullback adalah peluang.</li>
            <li>Downtrend = lower high + lower low — tren turun, hati-hati menangkap pisau jatuh.</li>
            <li>Konsolidasi = range sideways — tunggu breakout terkonfirmasi.</li>
            <li>Analisis memakai swing point ZigZag dengan filter ATR pada 150 hari data — klik saham untuk chart lengkap.</li>
          </ul>
        </div>

        <AskAiCta question="Saham yang uptrend sekarang apa aja?" />
      </div>
    </>
  );
}
