import type { Metadata } from "next";
import { safeJsonLd } from "@/lib/safe-json-ld";
import { PageHero } from "@/components/layout/page-hero";
import { AskAiCta } from "@/components/seo/ask-ai-cta";
import { screenerAnalysisService } from "@/domains/stock/screener-analysis.service";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/constants";
import { stripJk } from "@/lib/utils";
import { formatDecimalId } from "@/lib/format-number";
import Link from "next/link";
import { Gem, Landmark, Search } from "lucide-react";
import { GuestStar } from "@/components/stock/guest-star";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Daftar Saham Dividen Tinggi Indonesia — Yield Terbaru",
  description:
    "Daftar 198+ saham dividen tinggi Indonesia dengan yield terbaru dari data pasar. Lihat BMRI, BBRI, TLKM dan saham dividen 8%+ sebelum membeli.",
  alternates: { canonical: "/saham-dividen" },
  keywords: [
    "saham dividen tinggi",
    "daftar saham dividen",
    "saham dividend yield tinggi",
    "dividen saham terbaru",
    "saham passive income",
    "investasi dividen",
    "saham bagi hasil",
  ],
  openGraph: {
    title: "Daftar Saham Dividen Tinggi Indonesia",
    description: "198+ saham dividen tinggi dengan yield live dari data pasar terbaru.",
    url: `${SITE_URL}/saham-dividen`,
    images: [{ url: `${SITE_URL}/api/og?title=Saham+Dividen+Tinggi+Indonesia&type=berita`, width: 1200, height: 630 }],
  },
};

type FundRow = {
  ticker: string; name: string; sector: string; close: number;
  pe: number | null; pb: number | null; eps: number | null;
  dividendYield: number | null; marketCap: number | null;
};

type ExDateRow = {
  ticker: string; name: string; kind: string;
  perShare: number | null; exDate: Date; paymentDate: Date | null;
};

// prd-2026-11-02-01 fase-1: ex-date 30 hari ke depan dari tabel StockDividend (pipeline hidup)
async function loadUpcomingExDates(): Promise<ExDateRow[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const until = new Date(today.getTime() + 30 * 86400000);
  const rows = await prisma.stockDividend.findMany({
    where: { exDate: { gte: today, lte: until } },
    orderBy: { exDate: "asc" },
    take: 30,
    select: {
      type: true,
      amount: true,
      exDate: true,
      paymentDate: true,
      stock: { select: { ticker: true, name: true } },
    },
  });
  return rows.flatMap((r) =>
    r.exDate
      ? [{
          ticker: r.stock.ticker,
          name: r.stock.name,
          kind: r.type,
          perShare: r.amount != null ? Number(r.amount) : null,
          exDate: r.exDate,
          paymentDate: r.paymentDate,
        }]
      : [],
  );
}

const fmtTgl = (d: Date | null) =>
  d ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(d) : "—";
const fmtRp = (n: number | null) =>
  n !== null ? new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n) : "—";

export default async function SahamDividenPage() {
  const result = await screenerAnalysisService.screenerQuery("high_dividend");
  const rows = (Array.isArray(result) ? result : []) as unknown as FundRow[];
  const top = rows
    .filter((r) => r.dividendYield != null)
    .sort((a, b) => (b.dividendYield ?? 0) - (a.dividendYield ?? 0))
    .slice(0, 20);

  // prd-2026-11-02-01: gagal load jangan robohkan halaman ranking (render jujur, section disembunyikan)
  let exDates: ExDateRow[] = [];
  try {
    exDates = await loadUpcomingExDates();
  } catch {
    exDates = [];
  }
  const now = new Date();
  const MS_DAY = 86400000;
  const daysUntil = (d: Date) => Math.ceil((d.getTime() - now.getTime()) / MS_DAY);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "Daftar Saham Dividen Tinggi Indonesia",
        description: "Daftar saham Indonesia dengan dividen yield tertinggi, update harian.",
        url: `${SITE_URL}/saham-dividen`,
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Berapa dividen yield yang disebut tinggi?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Umumnya yield di atas 5-6% sudah dianggap tinggi untuk saham Indonesia. Beberapa saham bank BUMN seperti BBRI dan BMRI rutin memberi yield di atas 8-11%. Yang lebih penting: pastikan dividen konsisten, bukan sekali bayar besar lalu berhenti.",
            },
          },
          {
            "@type": "Question",
            name: "Apakah saham dividen tinggi selalu bagus?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Tidak selalu. Yield tinggi bisa terjadi karena harganya anjlok (value trap). Cek juga kesehatan fundamental (laba stabil, utang wajar) dan tren harganya lewat analisa teknikal sebelum membeli.",
            },
          },
          {
            "@type": "Question",
            name: "Kapan saya menerima dividen saham?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Anda menerima dividen jika memegang saham sampai tanggal cum date (tanggal terakhir kepemilikan untuk berhak dividen). Pembayaran biasanya 1-2 bulan setelah RUPS tahunan perusahaan.",
            },
          },
          {
            "@type": "Question",
            name: "Apa itu ex date dividen dan kenapa penting?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Ex date adalah hari pertama pembeli saham TIDAK lagi berhak atas dividen yang baru diumumkan. Supaya dapat dividen, Anda harus membeli saham sebelum ex date (paling lambat di cum date). Di hari ex date harga biasanya disesuaikan turun kira-kira sebesar dividen per lembar. Kalender ex-date 30 hari ke depan bisa dicek di halaman ini.",
            },
          },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <PageHero
        eyebrow="Saham IDX"
        title="Daftar Saham Dividen Tinggi Indonesia"
        description={`${rows.length} saham dengan dividen yield di atas 3% — diurutkan dari yield tertinggi, update otomatis dari data pasar.`}
      />
      <div className="mx-auto max-w-5xl px-4 py-8">

        <div className="mt-4 rounded-lg border border-bullish/30 bg-bullish/5 p-4 text-sm text-text-secondary">
          <strong className="text-text-primary"> Apa itu dividend yield?</strong> Yield = besarnya dividen setahun dibagi harga saham.
          Yield 8% artinya setiap Rp100 yang Anda investasikan memberi sekitar Rp8 dividen per tahun —
          asalkan dividen dan harga bertahan.
        </div>

        <AskAiCta question="Dividen di atas 8% ada yang aman?" />

        {exDates.length > 0 ? (
          <section className="mt-6" aria-labelledby="exdate-heading">
            <h2 id="exdate-heading" className="text-lg font-bold">
              Kalender Ex-Date 30 Hari ke Depan
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Saham yang masuk ex date di 30 hari ke depan — beli paling lambat sehari sebelum ex date untuk berhak dividen.
            </p>
            <div className="mt-3 overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b bg-bg-hover/50 text-left text-xs text-text-secondary">
                    <th className="px-3 py-2 font-medium">Saham</th>
                    <th className="px-3 py-2 font-medium">Ex Date</th>
                    <th className="px-3 py-2 font-medium">Dividen/Lbr</th>
                    <th className="px-3 py-2 font-medium">Tanggal Bayar</th>
                  </tr>
                </thead>
                <tbody>
                  {exDates.map((r) => {
                    const days = daysUntil(r.exDate);
                    return (
                      <tr key={`${r.ticker}-${r.exDate.toISOString()}`} className="border-b last:border-0">
                        <td className="px-3 py-2">
                          <Link href={`/stocks/${r.ticker}`} className="font-bold hover:underline">
                            {stripJk(r.ticker)}
                          </Link>
                          <span className="block text-xs text-text-secondary">{r.name}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          {fmtTgl(r.exDate)}{" "}
                          {days <= 3 && (
                            <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              segera
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">{fmtRp(r.perShare)}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-text-secondary">{fmtTgl(r.paymentDate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-text-secondary">
              Jadwal dari pengumuman resmi emiten. Ingin daftar lengkap cum date + estimasi yield?{" "}
              <Link href="/kalender-dividen" className="font-semibold underline">Kalender Dividen BEI</Link>.
            </p>
          </section>
        ) : (
          <p className="mt-6 text-sm text-text-secondary">
            Belum ada ex-date dividen terjadwal dalam 30 hari ke depan — cek{" "}
            <Link href="/kalender-dividen" className="underline">kalender dividen lengkap</Link>.
          </p>
        )}

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-text-secondary">
                <th className="py-2 pr-4 font-medium">Saham</th>
                <th className="py-2 pr-4 font-medium">Yield</th>
                <th className="py-2 pr-4 font-medium">Harga</th>
                <th className="py-2 pr-4 font-medium">PE</th>
                <th className="py-2 pr-4 font-medium">Sektor</th>
                <th className="py-2 pr-4 font-medium">Pantau</th>
              </tr>
            </thead>
            <tbody>
              {top.map((r) => (
                <tr key={r.ticker} className="border-b last:border-0">
                  <td className="py-2 pr-4">
                    <Link href={`/stocks/${r.ticker}`} className="font-bold hover:underline">
                      {stripJk(r.ticker)}
                    </Link>
                    <span className="block text-xs text-text-secondary">{r.name}</span>
                  </td>
                  <td className="py-2 pr-4">
                    <span className="rounded bg-bullish/10 px-2 py-0.5 text-xs font-semibold text-bullish">
                      {r.dividendYield != null ? `${formatDecimalId(r.dividendYield, 2)}%` : "-"}
                    </span>
                  </td>
                  <td className="py-2 pr-4">{r.close != null ? r.close.toLocaleString("id-ID") : "-"}</td>
                  <td className="py-2 pr-4">{r.pe != null ? formatDecimalId(r.pe, 1) : "-"}</td>
                  <td className="py-2 text-xs">{r.sector}</td>
                  <td className="py-2 pr-4"><GuestStar ticker={r.ticker} compact /></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4">
            <a
              href="https://t.me/TeknikalidAgentBot?start=web_screener_tematik"
              target="_blank"
              rel="noopener noreferrer"
              data-engagement="tg_subscribe_click"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
            >
              🔔 Dapatkan notifikasi sinyal harian via Telegram →
            </a>
          </div>
        </div>
        <p className="mt-2 text-xs text-text-secondary">
          Menampilkan 20 teratas dari {rows.length} saham. Data fundamental update berkala; harga indikatif.
          Bukan rekomendasi beli.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/stocks?view=screener" className="rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent/90"><Search className="inline h-4 w-4" /> Screener Lengkap</Link>
          <Link href="/saham-blue-chip" className="rounded-lg border px-4 py-3 text-sm font-semibold hover:bg-bg-hover"><Landmark className="inline h-4 w-4" /> Saham Blue Chip</Link>
          <Link href="/saham-undervalued" className="rounded-lg border px-4 py-3 text-sm font-semibold hover:bg-bg-hover"><Gem className="inline h-4 w-4" /> Saham Undervalued</Link>
        </div>
      </div>
    </>
  );
}
