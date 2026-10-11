import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";
import { PageHero } from "@/components/layout/page-hero";
import { EodPriceTable } from "@/components/stock/eod-price-table";
import { DailyRadar } from "@/components/stock/daily-radar";
import { stockRepository } from "@/domains/stock/stock.repository";
import { dailyRadarService } from "@/domains/stock/screener-analysis.service";
import { SITE_URL } from "@/lib/constants";

// PRD idea-2026-10-10-1 AC3 — pattern /saham-golden-cross (ISR 5 menit).
export const revalidate = 300;

// AC1/AC7: tanggal EOD asli dari data (bukan "hari ini" fabrikasi) — dievaluasi
// saat request, bukan di export-time metadata statis.
export async function generateMetadata(): Promise<Metadata> {
  let dateLabel = "";
  try {
    const { date } = await stockRepository.findTopValueTraded(1);
    if (date) dateLabel = ` — ${format(date, "d MMM yyyy", { locale: idLocale })}`;
  } catch {
    // fail-open: metadata tanpa tanggal, halaman render fallback jujur
  }
  const fullTitle = `Harga Saham Hari Ini${dateLabel} | teknikal.id`;
  return {
    // absolute — cegah double-suffix dari layout template "%s | TeknikalID" (AC3 exact-title)
    title: { absolute: fullTitle },
    description:
      "Daftar harga saham IDX hari ini — 15 emiten teraktif berdasarkan nilai transaksi, lengkap dengan perubahan harga dan volume. Update tiap hari bursa.",
    alternates: { canonical: "/harga-saham-hari-ini" },
    keywords: [
      "harga saham hari ini",
      "daftar harga saham",
      "harga saham idx hari ini",
      "saham teraktif hari ini",
      "harga penutupan saham hari ini",
      "saham nilai transaksi terbesar",
    ],
    openGraph: {
      title: fullTitle,
      description:
        "Daftar harga saham IDX — 15 emiten teraktif berdasarkan nilai transaksi + perubahan harga dan volume.",
      url: `${SITE_URL}/harga-saham-hari-ini`,
      images: [{ url: `${SITE_URL}/api/og?title=Harga+Saham+Hari+Ini&type=berita`, width: 1200, height: 630 }],
    },
  };
}

export default async function HargaSahamHariIniPage() {
  // Fail-closed: query error -> pesan jujur, bukan error page (AC7; pattern screener-data).
  let eod: Awaited<ReturnType<typeof stockRepository.findTopValueTraded>> = { date: null, rows: [] };
  let radar: Awaited<ReturnType<typeof dailyRadarService.getDailyRadar>> = { date: null, items: [] };
  try {
    [eod, radar] = await Promise.all([
      stockRepository.findTopValueTraded(15),
      dailyRadarService.getDailyRadar(5),
    ]);
  } catch (e) {
    console.error("[harga-saham-hari-ini] query gagal:", e instanceof Error ? e.message : e);
  }

  const dateStr = eod.date ? format(eod.date, "d MMM yyyy", { locale: idLocale }) : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "Harga Saham Hari Ini",
        description: "Daftar harga saham IDX — emiten teraktif berdasarkan nilai transaksi.",
        url: `${SITE_URL}/harga-saham-hari-ini`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Saham", item: `${SITE_URL}/stocks` },
          { "@type": "ListItem", position: 3, name: "Harga Saham Hari Ini", item: `${SITE_URL}/harga-saham-hari-ini` },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageHero
        eyebrow="Data Bursa IDX"
        title="Harga Saham Hari Ini"
        description="Daftar 15 emiten dengan nilai transaksi terbesar di Bursa Efek Indonesia — harga penutupan, perubahan, dan volume sesi terakhir."
      />

      <div className="mx-auto max-w-5xl px-4 py-8">
        <p className="mb-4 text-sm text-text-secondary">
          {dateStr ? (
            <>
              Data harga penutupan sesi bursa <strong className="font-semibold">{dateStr}</strong> (WIB).
              Hari non-trading menampilkan sesi terakhir yang tersedia.
            </>
          ) : (
            <>Data harga sementara tidak tersedia.</>
          )}
        </p>

        <EodPriceTable rows={eod.rows} />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href="/stocks"
            className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            🔍 Lihat semua di screener
          </Link>
          <Link
            href="/saham-golden-cross"
            className="rounded-lg border border-border px-4 py-3 text-sm font-semibold hover:bg-muted"
          >
            📈 Saham Golden Cross Hari Ini
          </Link>
        </div>

        <div className="mt-10">
          <h2 className="mb-3 text-lg font-bold tracking-tight">Radar Emiten Hari Ini</h2>
          {radar.items.length > 0 ? (
            <DailyRadar date={radar.date} items={radar.items} />
          ) : (
            <p className="rounded-xl border border-border bg-bg-card p-4 text-sm text-text-secondary">
              Belum ada emiten radar untuk hari ini. Lihat{" "}
              <Link href="/saham-golden-cross" className="text-accent hover:underline">
                sinyal golden cross terbaru
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </>
  );
}
