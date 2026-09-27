import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/layout/page-hero";
import { weeklyReportService } from "@/domains/stock/weekly-report.service";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 3600;

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export const metadata: Metadata = {
  title: "Laporan Pasar Saham IDX Mingguan — IHSG, Breadth & Sinyal",
  description:
    "Laporan pasar saham Indonesia setiap minggu dari data asli TeknikalID: pergerakan IHSG, market breadth, sektor terkuat-terlemah, top movers, dan sinyal golden cross / death cross.",
  alternates: { canonical: "/laporan-pasar" },
  keywords: [
    "laporan pasar saham mingguan",
    "ringkasan ihsg minggu ini",
    "market breadth idx",
    "sektor saham terkuat minggu ini",
    "golden cross saham minggu ini",
  ],
  openGraph: {
    title: "Laporan Pasar Saham IDX Mingguan | TeknikalID",
    description: "Ringkasan mingguan pasar IDX dari data asli — IHSG, breadth, sektor, movers, sinyal.",
    url: `${SITE_URL}/laporan-pasar`,
    images: [{ url: `${SITE_URL}/api/og?title=Laporan+Pasar+Saham+IDX+Mingguan&type=berita`, width: 1200, height: 630 }],
  },
};

export default async function LaporanPasarHubPage() {
  const weeks = await weeklyReportService.getRecentWeeks(8);

  return (
    <>
      <PageHero
        eyebrow="Data asli TeknikalID"
        title="Laporan Pasar Saham IDX Mingguan"
        description="Setiap minggu, dihitung langsung dari 1,5 tahun data harga dan indikator TeknikalID. Bukan opini — murni angka: IHSG, breadth, sektor, movers, dan sinyal SMA."
      />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="space-y-2">
          {weeks.map((w, i) => {
            const slug = `minggu-${w.toISOString().slice(0, 10)}`;
            const isLatest = i === 0;
            return (
              <Link
                key={slug}
                href={`/laporan-pasar/${slug}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-card p-4 hover:depth-shadow-hover transition-all"
              >
                <span>
                  <span className="text-sm font-semibold text-text-primary">
                    Minggu {w.getUTCDate()} {MONTHS_ID[w.getUTCMonth()]} {w.getUTCFullYear()}
                  </span>
                  {isLatest && (
                    <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                      TERBARU
                    </span>
                  )}
                </span>
                <span className="text-xs text-text-tertiary">IHSG · breadth · sinyal →</span>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/stocks?view=screener" className="rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent/90">
            🔍 Screener Saham
          </Link>
          <Link href="/saham-golden-cross" className="rounded-lg border border-border px-4 py-3 text-sm font-semibold hover:bg-bg-hover">
            📈 Saham Golden Cross
          </Link>
        </div>
      </div>
    </>
  );
}
