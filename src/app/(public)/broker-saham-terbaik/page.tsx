import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import Link from "next/link";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Perbandingan Broker Saham Terbaik 2026 — Fee Termurah & Aplikasi Terbaik",
  description:
    "Perbandingan lengkap broker saham Indonesia 2026: Stockbit, Bareksa, IPOT, Mirae, BNI Sekuritas. Bandingkan fee beli/jual, minimum deposit, fitur, dan aplikasi. Pilih broker terbaik untuk trading saham IDX.",
  alternates: { canonical: "/broker-saham-terbaik" },
  keywords: [
    "broker saham terbaik 2026",
    "broker saham termurah",
    "perbandingan broker saham",
    "stockbit vs ipot",
    "aplikasi trading saham terbaik",
    "broker saham fee termurah",
    "sekuritas terbaik indonesia",
    "aplikasi beli saham terbaik",
    "biaya transaksi saham",
  ],
  openGraph: {
    title: "Perbandingan Broker Saham Terbaik 2026 | TeknikalID",
    description: "Bandingkan fee, minimum deposit, dan fitur semua broker saham Indonesia.",
    url: `${SITE_URL}/broker-saham-terbaik`,
    images: [{ url: `${SITE_URL}/api/og?title=Broker+Saham+Terbaik+2026&type=berita`, width: 1200, height: 630 }],
  },
};

interface BrokerInfo {
  name: string;
  slug: string;
  app: string;
  feeBeli: string;
  feeJual: string;
  minDeposit: string;
  pros: string[];
  cons: string[];
  bestFor: string;
  rating: number;
}

const BROKERS: BrokerInfo[] = [
  {
    name: "Stockbit",
    slug: "stockbit",
    app: "Stockbit",
    feeBeli: "0,15%",
    feeJual: "0,25%",
    minDeposit: "Rp 0",
    pros: ["Komunitas saham terbesar", "UI/UX terbaik", "Virtual trading gratis", "Notifikasi cerdas"],
    cons: ["Fee bukan termurah", "Charting terbatas dibanding platform pro"],
    bestFor: "Pemula & social trading",
    rating: 4.5,
  },
  {
    name: "Bareksa",
    slug: "bareksa",
    app: "Bareksa",
    feeBeli: "0,15%",
    feeJual: "0,25%",
    minDeposit: "Rp 100.000",
    pros: ["Mutual fund terlengkap", "Robo advisor", "Reksa dana tanpa fee"],
    cons: ["Tools analisa teknikal terbatas", "Komunitas lebih kecil"],
    bestFor: "Investor reksa dana & pemula",
    rating: 4.0,
  },
  {
    name: "IPOT (Indo Premier)",
    slug: "ipot",
    app: "IPOT",
    feeBeli: "0,15%",
    feeJual: "0,25%",
    minDeposit: "Rp 0",
    pros: ["IPO terlengkap", "Charting professional", "Data fundamental lengkap"],
    cons: ["UI cukup kompleks untuk pemula", "App kadang lag"],
    bestFor: "Trader serius & IPO hunting",
    rating: 4.2,
  },
  {
    name: "Mirae Asset",
    slug: "mirae",
    app: "Mirae",
    feeBeli: "0,15%",
    feeJual: "0,25%",
    minDeposit: "Rp 0",
    pros: ["Akses saham global", "Research report berkualitas", "Eksekusi cepat"],
    cons: ["Fitur sosial terbatas", "Verifikasi akun lama"],
    bestFor: "Investor saham global",
    rating: 4.1,
  },
  {
    name: "BNI Sekuritas",
    slug: "bni-sekuritas",
    app: "BNI Mobile X",
    feeBeli: "0,15%",
    feeJual: "0,25%",
    minDeposit: "Rp 0",
    pros: ["Terintegrasi dengan bank BNI", "Aman & terpercaya", "Bond & sukuk tersedia"],
    cons: ["UI kurang modern", "Fitur analisa terbatas"],
    bestFor: "Nasabah BNI & investor konservatif",
    rating: 3.8,
  },
  {
    name: "Trimegah",
    slug: "trimegah",
    app: "TRIM",
    feeBeli: "0,15%",
    feeJual: "0,25%",
    minDeposit: "Rp 500.000",
    pros: ["Research report mendalam", "Wealth management", "Client premium"],
    cons: ["Minimum deposit cukup tinggi", "App kurang intuitif"],
    bestFor: "Investor modal besar",
    rating: 3.9,
  },
];

export default function BrokerComparisonPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "Perbandingan Broker Saham Terbaik 2026",
        description: "Bandingkan fee, fitur, minimum deposit semua broker saham Indonesia.",
        url: `${SITE_URL}/broker-saham-terbaik`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Broker Saham Terbaik", item: `${SITE_URL}/broker-saham-terbaik` },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Broker saham mana yang paling murah?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Mayoritas broker saham Indonesia memiliki fee standar yang sama: 0,15% untuk beli dan 0,25% untuk jual (sudah termasuk biaya BEI, KPEI, KSEI, dan pajak). Perbedaan utama ada pada minimum deposit dan fitur aplikasi.",
            },
          },
          {
            "@type": "Question",
            name: "Berapa minimum deposit untuk mulai investasi saham?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Sebagian besar broker seperti Stockbit, IPOT, dan Mirae Asset tidak memiliki minimum deposit (Rp 0). Beberapa broker seperti Trimegah memerlukan minimum Rp 500.000.",
            },
          },
          {
            "@type": "Question",
            name: "Broker mana yang terbaik untuk pemula?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Untuk pemula, Stockbit adalah pilihan terbaik karena komunitas yang aktif, UI yang mudah dipahami, virtual trading gratis untuk belajar, dan tidak ada minimum deposit.",
            },
          },
          {
            "@type": "Question",
            name: "Apakah TeknikalID adalah broker saham?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "TeknikalID bukan broker saham. Kami adalah platform analisa teknikal gratis untuk saham IDX yang menyediakan chart, indikator RSI, MACD, Bollinger Bands, screener, dan sinyal trading untuk membantu Anda menganalisa saham sebelum membeli melalui broker.",
            },
          },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageHero
        eyebrow="Broker"
        title="Perbandingan Broker Saham Terbaik 2026"
        description="Bandingkan fee, minimum deposit, dan fitur semua broker saham Indonesia untuk trading IDX."
      />
      <div className="mx-auto max-w-5xl px-4 py-8">

        {/* Comparison Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4 font-semibold">Broker</th>
                <th className="py-2 pr-4 font-semibold">Fee Beli</th>
                <th className="py-2 pr-4 font-semibold">Fee Jual</th>
                <th className="py-2 pr-4 font-semibold">Min. Deposit</th>
                <th className="py-2 pr-4 font-semibold">Rating</th>
                <th className="py-2 pr-4 font-semibold">Cocok Untuk</th>
              </tr>
            </thead>
            <tbody>
              {BROKERS.map((b) => (
                <tr key={b.slug} className="border-b hover:bg-muted/50">
                  <td className="py-3 pr-4 font-semibold">{b.name}</td>
                  <td className="py-3 pr-4">{b.feeBeli}</td>
                  <td className="py-3 pr-4">{b.feeJual}</td>
                  <td className="py-3 pr-4">{b.minDeposit}</td>
                  <td className="py-3 pr-4">⭐ {b.rating}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{b.bestFor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detailed Cards */}
        <h2 className="mt-10 text-2xl font-bold">Review Detail Setiap Broker</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {BROKERS.map((b) => (
            <div key={b.slug} className="rounded-lg border p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{b.name}</h3>
                <span className="text-sm font-semibold text-yellow-600">⭐ {b.rating}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{b.bestFor}</p>

              <div className="mt-3 text-sm">
                <span className="font-semibold">Fee Beli:</span> {b.feeBeli} • <span className="font-semibold">Jual:</span> {b.feeJual}
              </div>
              <div className="text-sm">
                <span className="font-semibold">Min. Deposit:</span> {b.minDeposit}
              </div>

              <div className="mt-3">
                <p className="text-xs font-semibold text-green-600">✅ Kelebihan</p>
                <ul className="ml-4 list-disc text-sm">
                  {b.pros.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
              <div className="mt-2">
                <p className="text-xs font-semibold text-red-600">❌ Kekurangan</p>
                <ul className="ml-4 list-disc text-sm">
                  {b.cons.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <h2 className="mt-10 text-2xl font-bold">FAQ Broker Saham</h2>
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">Broker saham mana yang paling murah?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Mayoritas broker Indonesia memiliki fee standar sama: 0,15% beli, 0,25% jual (sudah termasuk semua biaya bursa dan pajak). Pilih berdasarkan fitur, bukan hanya fee.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">Berapa minimum deposit untuk mulai investasi saham?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Stockbit, IPOT, dan Mirae: Rp 0 (no minimum). Trimegah: Rp 500.000. Anda bisa mulai dengan 1 lot (100 lembar) saham harga berapapun.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">Broker mana yang terbaik untuk pemula?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Stockbit untuk komunitas & kemudahan. Bareksa untuk reksa dana. IPOT untuk akses IPO. Pilih yang sesuai kebutuhan Anda.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 rounded-lg bg-blue-600 p-6 text-center text-white">
          <h3 className="text-xl font-bold">Sudah punya broker?</h3>
          <p className="mt-1 text-blue-100">Analisa saham gratis di TeknikalID sebelum beli. Chart, RSI, MACD, screener untuk 956+ saham IDX.</p>
          <Link href="/screener" className="mt-3 inline-block rounded-lg bg-white px-6 py-2 font-semibold text-blue-600 hover:bg-blue-50">
            Mulai Analisa Sekarang →
          </Link>
        </div>
      </div>
    </>
  );
}
