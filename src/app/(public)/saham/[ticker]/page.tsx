/**
 * /saham/[ticker] — Head-to-Head Compare /saham/[a]-vs-[b] (prd-2026-11-05-01).
 *
 * Next.js tidak punya segmen parsial [a]-vs-[b], jadi slug penuh ditangani di sini.
 * Bare /saham/<ticker> TIDAK sampai page ini (proxy 308 → /stocks/<TICKER>.JK
 * lebih dulu, matcher proxy menang atas page) — page hanya render pasangan "-vs-".
 *
 * PRD AC1: 200 SSR kedua ticker + tabel via curl; invalid/3-ticker → 404 rapi.
 * PRD AC4: SSR-only (tanpa "use client" utk data), canonical unik + og:title.
 * PRD AC6: TIDAK masuk sitemap (policy qa-2026-10-25-01 — tanpa permutasi massal;
 * sitemap tidak berubah di task ini, koordinasi CTO besok utk shortlist kurasi).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Scale } from "lucide-react";
import { compareService, parseCompareSlug, safeDecodeCompareSlug, toJk } from "@/domains/stock/compare.service";
import { CompareTable } from "@/components/saham/compare-table";
import { sectorToBahasa } from "@/lib/sectors";
import { SITE_URL } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const { ticker: slug } = await params;
  const pair = parseCompareSlug(safeDecodeCompareSlug(slug));
  if (!pair) return {};
  const [a, b] = pair.map(toJk);
  const data = await compareService.getCompareData(a, b);
  if (!data) return {};
  const cleanA = data.a.ticker.replace(/\.JK$/, "");
  const cleanB = data.b.ticker.replace(/\.JK$/, "");
  const title = `${cleanA} vs ${cleanB} — Mana yang Lebih Baik? | Perbandingan Saham`;
  const desc = `Bandingkan ${data.a.name} (${cleanA}) vs ${data.b.name} (${cleanB}) berdampingan: harga & performa, valuasi (P/E, P/B, dividen), dan skor sinyal teknikal. Data EOD TeknikalID.`;
  // Canonical unik: selalu urutan slug persis yang diminta (kedua arah sah —
  // konten identik tapi canonical sendiri; PRD "canonical unik" = tidak dobel
  // untuk satu URL yang sama, link "Balik urutan" adalah halaman berbeda by design).
  const canonical = `${SITE_URL}/saham/${slug.toLowerCase()}`;
  return {
    title,
    description: desc,
    alternates: { canonical },
    openGraph: {
      title,
      description: desc,
      type: "website",
      url: canonical,
    },
    robots: { index: true, follow: true },
  };
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker: slug } = await params;
  const pair = parseCompareSlug(safeDecodeCompareSlug(slug));
  // Bukan pola vs (seharusnya sudah di-redirect proxy) ATAU invalid (3 ticker,
  // karakter aneh, ticker kembar) → 404 rapi (PRD AC1), BUKAN 500.
  if (!pair) notFound();

  const [a, b] = pair.map(toJk);
  const data = await compareService.getCompareData(a, b);
  if (!data) notFound(); // ticker tak dikenal → 404 rapi

  const cleanA = data.a.ticker.replace(/\.JK$/, "");
  const cleanB = data.b.ticker.replace(/\.JK$/, "");
  const slugA = cleanA.toLowerCase();
  const slugB = cleanB.toLowerCase();

  const sameSector = data.a.sector === data.b.sector;

  return (
    <article className="min-h-screen bg-background">
      <nav className="mx-auto max-w-4xl px-4 py-3 text-sm text-text-tertiary" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 flex-wrap">
          <li><Link href="/" className="hover:text-text-primary">Home</Link></li>
          <li aria-hidden>/</li>
          <li><Link href="/stocks" className="hover:text-text-primary">Saham</Link></li>
          <li aria-hidden>/</li>
          <li className="text-text-primary font-semibold">{cleanA} vs {cleanB}</li>
        </ol>
      </nav>

      <div className="mx-auto max-w-4xl px-4 pb-16">
        <header className="pt-2 pb-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            {cleanA} vs {cleanB} — Perbandingan Saham
          </h1>
          <p className="mt-2 text-sm text-text-secondary leading-relaxed">
            {data.a.name} ({cleanA}) vs {data.b.name} ({cleanB}) berdampingan —
            harga &amp; performa, valuasi, dan skor sinyal teknikal.
            {sameSector
              ? ` Keduanya sektor ${sectorToBahasa(data.a.sector)}.`
              : ` ${cleanA} sektor ${sectorToBahasa(data.a.sector)}, ${cleanB} sektor ${sectorToBahasa(data.b.sector)}.`}
          </p>
        </header>

        {/* Kartu ringkas kedua ticker → link ke halaman saham masing-masing */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[data.a, data.b].map((s) => (
            <Link
              key={s.ticker}
              href={`/stocks/${s.ticker}`}
              className="indicator-card depth-shadow p-4 hover:border-accent/40 transition-colors block"
            >
              <p className="font-mono font-bold text-text-primary">{s.ticker.replace(/\.JK$/, "")}</p>
              <p className="text-xs text-text-secondary truncate">{s.name}</p>
              <p className="text-[10px] text-text-tertiary mt-1">{sectorToBahasa(s.sector)}</p>
            </Link>
          ))}
        </div>

        <CompareTable data={data} slugA={slugA} slugB={slugB} />

        {/* SEO answer block — angka konkret di HTML (preseden seo-dr-1) */}
        <section className="mt-6 space-y-3 text-[13px] leading-relaxed text-text-secondary">
          <h2 className="text-base font-semibold text-text-primary">Ringkas: {cleanA} atau {cleanB}?</h2>
          <p>
            <strong className="text-text-primary">{cleanA}</strong>: P/E {data.a.valuation.pe !== null ? data.a.valuation.pe.toFixed(2).replace(".", ",") : "—"}
            {data.a.valuation.pb !== null ? `, P/B ${data.a.valuation.pb.toFixed(2).replace(".", ",")}` : ""}
            {data.a.valuation.dividendYield !== null ? `, dividen yield ${data.a.valuation.dividendYield.toFixed(2).replace(".", ",")}%` : ""}
            {data.a.signal.score !== null ? `, skor sinyal ${data.a.signal.score.toFixed(2).replace(".", ",")}` : ""}.
          </p>
          <p>
            <strong className="text-text-primary">{cleanB}</strong>: P/E {data.b.valuation.pe !== null ? data.b.valuation.pe.toFixed(2).replace(".", ",") : "—"}
            {data.b.valuation.pb !== null ? `, P/B ${data.b.valuation.pb.toFixed(2).replace(".", ",")}` : ""}
            {data.b.valuation.dividendYield !== null ? `, dividen yield ${data.b.valuation.dividendYield.toFixed(2).replace(".", ",")}%` : ""}
            {data.b.signal.score !== null ? `, skor sinyal ${data.b.signal.score.toFixed(2).replace(".", ",")}` : ""}.
          </p>
          <p className="text-text-tertiary">
            P/E dan P/B lebih rendah umumnya berarti valuasi lebih murah; dividen yield lebih tinggi berarti arus kas dividen lebih besar per rupiah harga. Skor sinyal −1 s.d. +1 merangkum arah indikator teknikal (RSI, MACD, SMA/EMA cross). Angka di atas dihitung otomatis dari data EOD — bukan rekomendasi beli/jual.
          </p>
        </section>

        <div className="mt-6 flex items-center gap-2 text-[11px] text-text-tertiary">
          <Scale className="h-3.5 w-3.5" aria-hidden />
          <span>Halaman perbandingan otomatis — pilih pasangan lain via URL <code className="font-mono">/saham/&lt;A&gt;-vs-&lt;B&gt;</code> (ticker IDX, tanpa .JK).</span>
        </div>
      </div>
    </article>
  );
}
