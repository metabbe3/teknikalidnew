import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/layout/page-hero";

// SEO-T6 (audit 3 Nov): 404 harus self-contained — title unik + TANPA canonical ke
// homepage (canonical 404→home yang diwarisi layout adalah sinyal duplikat salah).
export const metadata: Metadata = {
  title: "Halaman Tidak Ditemukan | TeknikalID",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col justify-start">
      <PageHero
        eyebrow="404"
        title="Halaman tidak ditemukan"
        description="Saham atau halaman yang kamu cari tidak tersedia di TeknikalID."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="bg-accent text-white px-5 py-2.5 rounded-full text-sm font-medium hover:opacity-90 transition-opacity press-scale"
          >
            Beranda
          </Link>
          <Link
            href="/stocks"
            className="bg-bg-card text-text-primary px-5 py-2.5 rounded-full text-sm font-medium hover:bg-bg-hover transition-colors press-scale border border-border"
          >
            Saham
          </Link>
          <Link
            href="/stocks?view=screener"
            className="bg-bg-card text-text-primary px-5 py-2.5 rounded-full text-sm font-medium hover:bg-bg-hover transition-colors press-scale border border-border"
          >
            Screener
          </Link>
          <Link
            href="/agent"
            className="bg-bg-card text-text-primary px-5 py-2.5 rounded-full text-sm font-medium hover:bg-bg-hover transition-colors press-scale border border-border"
          >
            Tanya AI
          </Link>
        </div>
      </PageHero>
    </div>
  );
}
