import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/layout/page-hero";
import { SectionHeading } from "@/components/ui/section-heading";
import { ShieldCheck, BarChart3, Globe, Heart, TrendingUp } from "lucide-react";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Tentang TeknikalID — Platform Analisa Teknikal Saham BEI",
  description:
    "TeknikalID adalah platform analisa teknikal saham Indonesia yang gratis. Chart real-time, indikator RSI MACD, screener, dan paper trading untuk trader IDX.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "Tentang TeknikalID — Platform Analisa Teknikal Saham BEI",
    description: "Platform analisa teknikal saham Indonesia gratis untuk trader IDX.",
    url: `${SITE_URL}/about`,
  },
};

const VALUES = [
  {
    icon: BarChart3,
    title: "Analisa Teknikal Lengkap",
    desc: "12 indikator teknikal (RSI, MACD, Bollinger Bands, SMA/EMA, Stochastic, ADX, Supertrend) dihitung otomatis untuk ratusan saham IDX.",
  },
  {
    icon: Globe,
    title: "Data Real-Time",
    desc: "Harga saham dari Yahoo Finance dengan jeda ~5-10 menit. Chart interaktif TradingView untuk analisa mendalam.",
  },
  {
    icon: ShieldCheck,
    title: "Gratis & Transparan",
    desc: "Semua fitur analisa teknikal gratis. Tidak ada hidden fee. Kami tidak menjual data Anda. Bukan rekomendasi investasi.",
  },
  {
    icon: Heart,
    title: "Untuk Trader Indonesia",
    desc: "Dibuat khusus untuk investor dan trader Bursa Efek Indonesia. Konten dalam Bahasa Indonesia, data IDX lengkap.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="Tentang Kami"
        title="Tentang TeknikalID"
        description="Platform analisa teknikal saham BEI yang gratis dan mudah digunakan. Chart interaktif, indikator lengkap, screener, paper trading, dan komunitas untuk trader Indonesia."
      />

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-12">
        {/* Mission */}
        <section>
          <SectionHeading eyebrow="Misi" title="Misi Kami" />
          <div className="prose prose-stone max-w-none">
            <p className="text-text-secondary leading-relaxed">
              TeknikalID lahir dari satu keyakinan: setiap trader Indonesia berhak mendapat alat analisa teknikal
              yang profesional, mudah dipahami, dan gratis. Kami percaya bahwa akses ke data pasar dan indikator
              teknikal yang berkualitas tidak seharusnya menjadi hak istimewa segelintir orang.
            </p>
            <p className="text-text-secondary leading-relaxed mt-4">
              Kami membangun platform ini untuk membantu trader pemula maupun berpengalaman membuat keputusan
              trading yang lebih baik — dengan chart real-time, sinyal trading otomatis, screener cerdas, dan
              paper trading tanpa risiko.
            </p>
          </div>
        </section>

        {/* Values */}
        <section>
          <SectionHeading eyebrow="Fitur" title="Apa yang Kami Tawarkan" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {VALUES.map((v) => (
              <div key={v.title} className="bg-bg-card rounded-xl depth-shadow p-5 border border-border">
                <v.icon className="h-6 w-6 text-accent mb-3" aria-hidden />
                <h3 className="font-semibold text-text-primary mb-1">{v.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Data sources */}
        <section>
          <SectionHeading eyebrow="Transparansi" title="Sumber Data" />
          <p className="text-text-secondary leading-relaxed">
            Data harga saham bersumber dari Yahoo Finance API dengan jeda sekitar 5-10 menit dari pasar real-time.
            Indikator teknikal dihitung menggunakan library standar industri
            (<code className="text-xs bg-bg-hover px-1 py-0.5 rounded">technicalindicators</code>).
            Chart interaktif ditenagai oleh TradingView Lightweight Charts.
          </p>
          <p className="text-sm text-text-tertiary mt-4 italic">
            ⚠️ Semua data bersifat informasi dan edukasi. TeknikalID bukan penasihat investasi.
            Keputusan trading adalah tanggung jawab Anda sendiri.
          </p>
        </section>

        {/* Disclaimer */}
        <section className="bg-bg-card rounded-xl depth-shadow p-6 border border-border/60">
          <h3 className="font-semibold text-text-primary mb-2">Disclaimer Penting</h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            TeknikalID adalah platform edukasi dan alat analisa, bukan layanan penasihat keuangan atau
            rekomendasi investasi. Semua analisa teknikal, sinyal trading, dan trading plan yang dihasilkan
            oleh sistem kami bersifat otomatis dan tidak menjamin hasil. Trading saham memiliki risiko
            kehilangan modal. Selalu lakukan riset mandiri dan pertimbangkan konsultasi dengan penasihat
            keuangan yang berlisensi sebelum mengambil keputusan investasi.
          </p>
          <p className="text-sm text-text-tertiary mt-3">
            Lihat <Link href="/disclaimer" className="text-accent hover:underline">disclaimer lengkap</Link> dan{" "}
            <Link href="/terms" className="text-accent hover:underline">syarat layanan</Link>.
          </p>
        </section>

        {/* CTA */}
        <section className="text-center">
          <p className="text-lg font-serif font-semibold text-text-primary mb-3">
            Mulai analisa saham Anda sekarang — gratis.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/stocks"
              className="inline-flex items-center gap-1.5 bg-accent text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-accent/90 transition-colors"
            >
              <TrendingUp className="h-4 w-4" aria-hidden />
              Lihat Saham
            </Link>
            <Link
              href="/screener"
              className="inline-flex items-center gap-1.5 bg-bg-primary text-text-primary border border-border px-5 py-2.5 rounded-xl font-medium text-sm hover:border-accent/40 transition-colors"
            >
              Coba Screener
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
