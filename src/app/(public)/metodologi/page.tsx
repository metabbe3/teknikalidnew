import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/layout/page-hero";
import { SectionHeading } from "@/components/ui/section-heading";
import { SITE_URL } from "@/lib/constants";
import { Calculator, Database, RefreshCw, ShieldCheck, UserCheck } from "lucide-react";

/**
 * seo-2026-10-18-01: Halaman Metodologi (YMYL trust stack).
 * Finance/YMYL niche menuntut: cara analisa dibuat, sumber data, formula indikator,
 * kebijakan update, dan batasan — semuanya eksplisit. Ditambah dari /about yang
 * bersifat misi; halaman ini bersifat TEKNIS (audit trail metodologi).
 */

export const metadata: Metadata = {
  title: "Metodologi Analisa Teknikal TeknikalID — Data, Formula, Update",
  description:
    "Bagaimana TeknikalID menghitung indikator teknikal (RSI, MACD, SMA/EMA, Bollinger, ADX, Stochastic), dari sumber data apa, seberapa sering diperbarui, dan apa batasannya. Transparan penuh untuk trader IDX.",
  alternates: { canonical: "/metodologi" },
  openGraph: {
    title: "Metodologi Analisa Teknikal TeknikalID",
    description: "Sumber data, formula indikator, siklus update, dan batasan analisa TeknikalID.",
    url: `${SITE_URL}/metodologi`,
  },
};

const PIPELINE = [
  {
    icon: Database,
    title: "1 · Sumber Data",
    body: "Harga saham IDX (OHLCV — open, high, low, close, volume) bersumber dari Yahoo Finance dengan jeda sekitar 5–10 menit dari pasar. Indeks IHSG dan sektor dihitung dari data bursa yang sama. Kami tidak menggunakan data broker tertentu dan tidak menerima kompensasi dari sumber data mana pun.",
  },
  {
    icon: Calculator,
    title: "2 · Perhitungan Indikator",
    body: "Indikator dihitung otomatis menggunakan library standar industri technicalindicators: RSI(14) Wilder, MACD(12,26,9), SMA 20/50/200, EMA 20/50, Bollinger Bands(20,2), Stochastic(14,3), ADX(14), ATR(14), OBV, dan Supertrend(10,3). Semua dihitung dari data historis mentah — bukan hasil agregat pihak ketiga — sehingga dapat direproduksi.",
  },
  {
    icon: RefreshCw,
    title: "3 · Siklus Update",
    body: "Harga dan indikator diperbarui mengikuti sesi bursa (09:00–15:50 WIB hari bursa). Halaman analisa harian (mis. Kenapa Saham X Naik Hari Ini) di-refresh maksimal 1 jam sekali; snapshot pasar pagi dikunci setelah sesi tutup. Track record sinyal tidak pernah diubah setelah terbit.",
  },
  {
    icon: ShieldCheck,
    title: "4 · Kontrol Kualitas",
    body: "Setiap deploy terkait data melewati uji konsistensi lintas halaman: angka Top Gainer di beranda, /stocks, dan API wajib identik dengan basis data. Analisa naratif dihasilkan dari aturan deterministik (bukan opini), dan seluruh riwayat perubahan kode tercatat di repositori.",
  },
  {
    icon: UserCheck,
    title: "5 · Editorial & Kepegawaian",
    body: "Konten edukasi Akademi ditinjau editor sebelum terbit. Analisa pergerakan (movement analysis) dihasilkan otomatis oleh mesin aturan dan diberi label jelas sebagai analisa teknikal — bukan rekomendasi beli/jual dan bukan nasihat keuangan.",
  },
];

const LIMITS = [
  "Data harga memiliki jeda ~5–10 menit — bukan real-time tick-by-tick; tidak cocok untuk eksekusi HFT/scalping intrabar.",
  "Analisa teknikal berbasis harga historis; peristiwa fundamental (laporan keuangan, aksi korporasi) bisa mengalahkan sinyal teknikal kapan saja.",
  "Sinyal otomatis adalah deskripsi kondisi indikator, bukan prediksi terjamin. Backtest dan track record kami dipublikasikan apa adanya.",
  "Untuk keputusan investasi besar, lakukan riset mandiri atau konsultasi penasihat keuangan berlisensi.",
];

export default function MetodologiPage() {
  return (
    <>
      <PageHero
        eyebrow="Transparansi"
        title="Metodologi Analisa TeknikalID"
        description="Bagaimana setiap angka di TeknikalID dihitung, dari mana datanya, dan apa batasannya — dijelaskan apa adanya."
      />

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-12">
        <p className="text-text-secondary leading-relaxed">
          Halaman ini menjawab pertanyaan yang seharusnya bisa dijawab setiap platform analisa:
          angka ini dari mana, dihitung bagaimana, dan kapan diperbarui.{" "}
          <Link href="/about" className="text-accent hover:underline">Tentang kami</Link> menjelaskan
          misi; halaman ini menjelaskan mesinnya.
        </p>

        {PIPELINE.map((s) => (
          <section key={s.title} className="bg-bg-card rounded-xl depth-shadow p-6 border border-border">
            <div className="flex items-center gap-3 mb-3">
              <s.icon className="h-5 w-5 text-accent" aria-hidden />
              <h2 className="text-lg font-bold text-text-primary">{s.title}</h2>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">{s.body}</p>
          </section>
        ))}

        <section>
          <SectionHeading eyebrow="Kejujuran" title="Batasan Analisa Kami" />
          <ul className="mt-4 space-y-3">
            {LIMITS.map((l) => (
              <li key={l} className="flex items-start gap-2 text-sm text-text-secondary leading-relaxed">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/70" aria-hidden />
                <span>{l}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-text-tertiary mt-5">
            Lihat juga <Link href="/track-record" className="text-accent hover:underline">track record sinyal</Link> dan{" "}
            <Link href="/disclaimer" className="text-accent hover:underline">disclaimer lengkap</Link>.
          </p>
        </section>
      </div>
    </>
  );
}
