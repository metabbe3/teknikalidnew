import type { Metadata } from "next";
import Link from "next/link";
import { safeJsonLd } from "@/lib/safe-json-ld";
import { SITE_URL } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { PageHero } from "@/components/layout/page-hero";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  // seo-dr-4 (deep-research 641c019): kueri "jadwal dividen saham 2026" / "cum date dividen" 12-22rb/bln,
  // kompetitor = berita harian yang basi 3 hari — halaman evergreen ini selalu segar dari DB.
  title: "Kalender Dividen Saham BEI 2026 Terbaru — Jadwal Cum Date & Yield | TeknikalID",
  description:
    "Jadwal pembagian dividen saham BEI terbaru: tanggal cum date, ex date, pembayaran, nominal per lembar, dan estimasi yield. Cek apakah tren harga aman sebelum beli — gratis tanpa login.",
  alternates: { canonical: "/kalender-dividen" },
  openGraph: {
    title: "Kalender Dividen Saham BEI Terbaru — Jadwal Cum Date & Yield | TeknikalID",
    description: "Jadwal cum date & ex date dividen seluruh emiten BEI, update otomatis tiap hari bursa.",
    url: `${SITE_URL}/kalender-dividen`,
  },
};

type DividendRow = {
  ticker: string;
  name: string;
  close: number | null;
  perShare: number | null;
  cumDate: Date;
  exDate: Date | null;
  paymentDate: Date | null;
  kind: string;
};

async function loadDividendCalendar(): Promise<DividendRow[]> {
  const today = new Date();
  const from = new Date(today.getTime() - 45 * 86400000); // tampilkan juga yang baru lewat (konteks)
  const rows = await prisma.stockDividend.findMany({
    where: { cumDate: { gte: from, lte: new Date(today.getTime() + 120 * 86400000) } },
    orderBy: { cumDate: "asc" },
    take: 120,
    select: {
      type: true,
      cumDate: true,
      exDate: true,
      paymentDate: true,
      amount: true,
      stock: {
        select: {
          ticker: true,
          name: true,
          prices: { orderBy: { date: "desc" }, take: 1, select: { close: true } },
        },
      },
    },
  });
  return rows.flatMap((r) => {
    if (!r.cumDate) return [];
    return [{
      ticker: r.stock.ticker,
      name: r.stock.name,
      close: r.stock.prices[0] ? Number(r.stock.prices[0].close) : null,
      perShare: r.amount ? Number(r.amount) : null,
      cumDate: r.cumDate,
      exDate: r.exDate,
      paymentDate: r.paymentDate,
      kind: r.type,
    }];
  });
}

const fmtDate = (d: Date | null) =>
  d ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(d) : "—";
const fmtRp = (n: number | null) => (n !== null ? new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n) : "—");

export default async function KalenderDividenPage() {
  let rows: DividendRow[] = [];
  let failed = false;
  try {
    rows = await loadDividendCalendar();
  } catch {
    failed = true;
  }
  const now = new Date();
  const upcoming = rows.filter((r) => r.cumDate >= now);
  const past = rows.filter((r) => r.cumDate < now).reverse();
  const upcomingCount = upcoming.length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Kalender Dividen Saham BEI Terbaru",
        description: "Jadwal cum date, ex date, dan pembayaran dividen seluruh emiten BEI — update harian.",
        url: `${SITE_URL}/kalender-dividen`,
      },
      {
        "@type": "Dataset",
        name: "Kalender Dividen BEI",
        description: `Data jadwal dividen ${rows.length} emiten BEI (45 hari terakhir hingga 120 hari ke depan), bersumber dari pengumuman resmi emiten.`,
        license: "https://teknikal.id/metodologi",
        creator: { "@type": "Organization", name: "TeknikalID", url: SITE_URL },
        temporalCoverage: `${new Date(now.getTime() - 45 * 86400000).toISOString().slice(0, 10)}/${new Date(now.getTime() + 120 * 86400000).toISOString().slice(0, 10)}`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Beranda", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Kalender Dividen", item: `${SITE_URL}/kalender-dividen` },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Apa itu cum date dividen saham?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Cum date adalah hari TERAKHIR pembeli saham masih berhak mendapat dividen. Jika kamu membeli pada atau sebelum cum date, dividen menjadi milikmu; membeli setelahnya (di ex date) tidak berhak. Di BEI, ex date biasanya 1 hari bursa setelah cum date.",
            },
          },
          {
            "@type": "Question",
            name: "Apakah beli saham sebelum cum date selalu untung?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Tidak selalu. Pada ex date harga saham biasanya turun kira-kira sebesar dividen per lembar (penyesuaian). Jika tren harga sedang lemah, harga bisa turun lebih dalam dari dividen yang diterima (dividend trap). Selalu cek tren dan skor sinyal teknikal sebelum berburu dividen.",
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
        eyebrow="Data BEI"
        title="Kalender Dividen Saham BEI Terbaru"
        description="Jadwal cum date, ex date, dan pembayaran dividen seluruh emiten Bursa Efek Indonesia — update otomatis setiap hari bursa dari pengumuman resmi."
      />
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* seo-dr-4: blok jawaban instan utk SERP */}
        <p className="rounded-lg bg-bg-hover/60 px-3 py-2 text-[13px] text-text-secondary leading-relaxed">
          Per {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(now)},
          terdapat <strong className="text-text-primary">{upcomingCount} emiten BEI</strong> dengan jadwal
          {" "}cum date dividen dalam 120 hari ke depan. Tabel di bawah memuat nominal per lembar, estimasi
          {" "}modal 1 lot, dan estimasi yield — <strong className="text-text-primary">gratis tanpa login</strong>.
        </p>

        <div className="mt-4 rounded-lg border border-amber-300/50 bg-amber-500/5 p-4 text-sm text-text-secondary leading-relaxed">
          <strong className="text-text-primary">Tips menghindari jebakan ex-date:</strong> pembeli saham pada
          atau sebelum <em>cum date</em> berhak atas dividen; setelahnya tidak. Harga biasanya turun kira-kira
          sebesar dividen di hari ex date — jadi pastikan tren harga sehat (cek{" "}
          <Link href="/saham-dividen" className="text-accent hover:underline">saham dividen ber-yield tinggi</Link>{" "}
          dan skor sinyal di halaman sahamnya) sebelum berburu dividen.
        </div>

        {failed ? (
          <p className="mt-6 text-sm text-text-tertiary">Data kalender dividen sedang tidak tersedia. Coba beberapa saat lagi.</p>
        ) : (
          <>
            <h2 className="mt-8 text-lg font-bold text-text-primary">Jadwal Cum Date Mendatang ({upcoming.length})</h2>
            <div className="mt-3 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-bg-hover text-text-tertiary text-xs">
                    <th className="text-left px-3 py-2">Cum Date</th>
                    <th className="text-left px-3 py-2">Emiten</th>
                    <th className="text-right px-3 py-2">Dividen/Lbr</th>
                    <th className="text-right px-3 py-2">Harga</th>
                    <th className="text-right px-3 py-2">Modal 1 Lot</th>
                    <th className="text-right px-3 py-2">Est. Yield</th>
                    <th className="text-left px-3 py-2">Ex Date</th>
                    <th className="text-left px-3 py-2">Bayar</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((r) => {
                    const yieldPct = r.perShare && r.close && r.close > 0 ? (r.perShare / r.close) * 100 : null;
                    return (
                      <tr key={`${r.ticker}-${r.cumDate.toISOString()}`} className="border-t border-border">
                        <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{fmtDate(r.cumDate)}</td>
                        <td className="px-3 py-2">
                          <Link href={`/stocks/${r.ticker}`} className="font-mono font-semibold text-accent hover:underline">
                            {r.ticker.replace(".JK", "")}
                          </Link>
                          <span className="block text-xs text-text-tertiary max-w-[200px] truncate" title={r.name}>{r.name}</span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{fmtRp(r.perShare)}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-text-secondary">{r.close !== null ? formatPrice(r.close) : "—"}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-text-secondary">{r.close !== null ? formatPrice(r.close * 100) : "—"}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{yieldPct !== null ? `${yieldPct.toFixed(2).replace(".", ",")}%` : "—"}</td>
                        <td className="px-3 py-2 font-mono text-xs whitespace-nowrap text-text-secondary">{fmtDate(r.exDate)}</td>
                        <td className="px-3 py-2 font-mono text-xs whitespace-nowrap text-text-secondary">{fmtDate(r.paymentDate)}</td>
                      </tr>
                    );
                  })}
                  {upcoming.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-6 text-center text-sm text-text-tertiary">Belum ada jadwal cum date baru — bursa biasanya ramai pengumuman dividen setelah RUPS (Februari-Juni).</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {past.length > 0 && (
              <>
                <h2 className="mt-8 text-base font-semibold text-text-primary">Baru Berlalu (45 Hari Terakhir)</h2>
                <p className="text-xs text-text-tertiary mb-3">Pembeli setelah tanggal ini tidak lagi berhak dividen periode tersebut.</p>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-bg-hover text-text-tertiary text-xs">
                        <th className="text-left px-3 py-2">Cum Date</th>
                        <th className="text-left px-3 py-2">Emiten</th>
                        <th className="text-right px-3 py-2">Dividen/Lbr</th>
                        <th className="text-left px-3 py-2">Ex Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {past.map((r) => (
                        <tr key={`${r.ticker}-${r.cumDate.toISOString()}-past`} className="border-t border-border opacity-75">
                          <td className="px-3 py-2 font-mono text-xs">{fmtDate(r.cumDate)}</td>
                          <td className="px-3 py-2">
                            <Link href={`/stocks/${r.ticker}`} className="font-mono font-semibold text-text-secondary hover:text-accent hover:underline">
                              {r.ticker.replace(".JK", "")}
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums">{fmtRp(r.perShare)}</td>
                          <td className="px-3 py-2 font-mono text-xs text-text-secondary">{fmtDate(r.exDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        <div className="mt-8 space-y-3 text-sm leading-relaxed text-text-secondary">
          <p>
            <strong className="text-text-primary">Kalender dividen</strong> ini menghimpun jadwal pembagian dividen
            tunai seluruh emiten Bursa Efek Indonesia dari data pengumuman resmi — mulai tanggal{" "}
            <em>cum date</em> (hari terakhir pembeli berhak dividen), <em>ex date</em> (harga saham disesuaikan),
            hingga <em>payment date</em> (dividen masuk rekening). Berbeda dari berita harian yang cepat basi,
            halaman ini selalu menampilkan jadwal termutakhir secara otomatis.
          </p>
          <p>
            Dividen tinggi bukan satu-satunya pertimbangan. Cek <Link href="/saham-dividen" className="text-accent hover:underline">daftar saham dividen ber-yield tinggi</Link>,
            bandingkan dengan <Link href="/screener" className="text-accent hover:underline">saringan indikator teknikal</Link>,
            dan pastikan tren harga emiten sedang sehat di halaman sahamnya sebelum memutuskan membeli menjelang cum date.
          </p>
        </div>
      </div>
    </>
  );
}
