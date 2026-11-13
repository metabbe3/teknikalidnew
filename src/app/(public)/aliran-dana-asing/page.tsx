import type { Metadata } from "next";
import Link from "next/link";
import { safeJsonLd } from "@/lib/safe-json-ld";
import { SITE_URL } from "@/lib/constants";
import { pasarLiveService } from "@/domains/stock/pasar-live.service";
import { PageHero } from "@/components/layout/page-hero";
import { GuestStar } from "@/components/stock/guest-star";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  // seo-dr-4 (deep-research 641c019): kueri "saham net foreign buy hari ini" / "akumulasi asing BEI"
  // 4,5-8,5rb/bln — kompetitor mengunci data di balik login sekuritas; kita free + satu-pintu pasarLiveService.
  title: "Aliran Dana Asing Hari Ini — Net Foreign Buy BEI",
  description:
    "Saham net foreign buy & sell terbesar BEI hari ini dari data resmi IDX, plus skor sinyal teknikal tiap emiten. Update tiap hari bursa.",
  alternates: { canonical: "/aliran-dana-asing" },
  openGraph: {
    title: "Aliran Dana Asing Hari Ini — Net Foreign Buy BEI",
    description: "Saham net foreign buy & sell terbesar BEI hari ini dari data resmi IDX, plus skor sinyal teknikal tiap emiten. Update tiap hari bursa.",
    url: `${SITE_URL}/aliran-dana-asing`,
  },
};

const fmtRpCompact = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1e12) return `Rp${(n / 1e12).toFixed(2).replace(".", ",")} T`;
  if (abs >= 1e9) return `Rp${(n / 1e9).toFixed(1).replace(".", ",")} mlr`;
  if (abs >= 1e6) return `Rp${(n / 1e6).toFixed(1).replace(".", ",")} jt`;
  return `Rp${new Intl.NumberFormat("id-ID").format(n)}`;
};

export default async function AliranDanaAsingPage() {
  let snap: Awaited<ReturnType<typeof pasarLiveService.getSnapshot>> | null = null;
  let failed = false;
  try {
    snap = await pasarLiveService.getSnapshot(false);
  } catch {
    failed = true;
  }
  const netBuy = snap?.foreign.netBuy ?? [];
  const netSell = snap?.foreign.netSell ?? [];
  // fix-2026-11-09: tanggal ASING bisa beda dari tanggal harga (sore pra-sync IDX:
  // harga live hari ini sudah masuk, data asing masih sesi kemarin). Tampilkan
  // tanggal data asing yang benar + hint jujur.
  const flowSession = snap?.foreign.flowDate
    ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(snap.foreign.flowDate))
    : "sesi terakhir";
  const isFallbackFlow =
    !!snap?.foreign.flowDate &&
    !!snap?.sessionDate &&
    new Date(snap.foreign.flowDate).toISOString().slice(0, 10) !== snap.sessionDate.slice(0, 10);
  const session = flowSession;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Aliran Dana Asing Saham BEI Hari Ini",
        description: "Top net foreign buy & net foreign sell BEI dari data resmi IDX, plus skor sinyal teknikal.",
        url: `${SITE_URL}/aliran-dana-asing`,
      },
      {
        "@type": "Dataset",
        name: "Aliran Dana Asing BEI Harian",
        description: `Peringkat ${netBuy.length} saham net foreign buy dan ${netSell.length} net foreign sell sesi ${session}, dihitung dari data IDX TradingSummary (beli − jual asing) × harga penutupan.`,
        license: "https://teknikal.id/metodologi",
        creator: { "@type": "Person", name: "Nicholas Andrian Surjadi", url: SITE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Beranda", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Aliran Dana Asing", item: `${SITE_URL}/aliran-dana-asing` },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Apa itu net foreign buy pada saham?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Net foreign buy berarti investor asing membeli lebih banyak lembar saham tersebut daripada yang mereka jual pada satu sesi perdagangan. Arus masuk asing yang konsisten sering dianggap sinyal akumulasi institusional — namun bukan jaminan harga naik; selalu konfirmasi dengan tren harga dan indikator teknikal.",
            },
          },
          {
            "@type": "Question",
            name: "Dari mana data aliran dana asing ini berasal?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Dari ringkasan perdagangan harian resmi Bursa Efek Indonesia (IDX TradingSummary): volume beli dan jual investor asing per saham dikalikan harga penutupan sesi untuk menghitung nilai bersih dalam Rupiah. Data diperbarui setiap hari bursa setelah sesi berakhir.",
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
        title="Aliran Dana Asing Saham BEI Hari Ini"
        description="Saham yang paling banyak dibeli bersih investor asing (net foreign buy) dan paling banyak dijual bersih (net foreign sell) — dari data resmi IDX TradingSummary."
      />
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* seo-dr-4: blok jawaban instan utk SERP */}
        <p className="rounded-lg bg-bg-hover/60 px-3 py-2 text-[13px] text-text-secondary leading-relaxed">
          Sesi {session}: <strong className="text-text-primary">{netBuy.length} emiten</strong> mencatat beli
          bersih asing (net foreign buy), <strong className="text-text-primary">{netSell.length} emiten</strong> dijual
          bersih. Terbesar: {netBuy[0] ? `${netBuy[0].ticker.replace(".JK", "")} ${fmtRpCompact(netBuy[0].netValue)}` : "—"}
          {" "}— data resmi BEI, <strong className="text-text-primary">gratis tanpa login</strong>.
          {isFallbackFlow && (
            <span className="block mt-1 text-text-tertiary">
              Data asing sesi hari ini masih diproses (IDX rilis malam) — menampilkan sesi terakhir tersedia.
            </span>
          )}
        </p>

        {failed ? (
          <p className="mt-6 text-sm text-text-tertiary">Data aliran dana asing sedang tidak tersedia. Coba beberapa saat lagi.</p>
        ) : (
          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="text-base font-bold text-bullish">Top Net Foreign Buy ({netBuy.length})</h2>
              <p className="text-xs text-text-tertiary mb-3">Diborong asing — cek konfirmasi tren di halaman sahamnya.</p>
              <div className="overflow-x-auto rounded-lg border border-border" tabIndex={0} role="region" aria-label="Top Net Foreign Buy">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-bg-hover text-text-tertiary text-xs">
                      <th scope="col" className="text-left px-3 py-2">#</th>
                      <th scope="col" className="text-left px-3 py-2">Emiten</th>
                      <th scope="col" className="text-right px-3 py-2">Net Beli Asing</th>
                      <th scope="col" className="text-center px-3 py-2">Pantau</th>
                    </tr>
                  </thead>
                  <tbody>
                    {netBuy.slice(0, 15).map((r, i) => (
                      <tr key={r.ticker} className="border-t border-border">
                        <td className="px-3 py-2 text-text-tertiary font-mono">{i + 1}</td>
                        <td className="px-3 py-2">
                          <Link href={`/stocks/${r.ticker}`} className="font-mono font-semibold text-accent hover:underline">
                            {r.ticker.replace(".JK", "")}
                          </Link>
                          <span className="block text-xs text-text-tertiary max-w-[180px] truncate" title={r.name}>{r.name}</span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-bullish whitespace-nowrap">{fmtRpCompact(r.netValue)}</td>
                        <td className="px-3 py-2 text-center"><GuestStar ticker={r.ticker} compact /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h2 className="text-base font-bold text-bearish">Top Net Foreign Sell ({netSell.length})</h2>
              <p className="text-xs text-text-tertiary mb-3">Tekanan distribusi asing — waspadai bila tren harga ikut melemah.</p>
              <div className="overflow-x-auto rounded-lg border border-border" tabIndex={0} role="region" aria-label="Top Net Foreign Sell">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-bg-hover text-text-tertiary text-xs">
                      <th scope="col" className="text-left px-3 py-2">#</th>
                      <th scope="col" className="text-left px-3 py-2">Emiten</th>
                      <th scope="col" className="text-right px-3 py-2">Net Jual Asing</th>
                      <th scope="col" className="text-center px-3 py-2">Pantau</th>
                    </tr>
                  </thead>
                  <tbody>
                    {netSell.slice(0, 15).map((r, i) => (
                      <tr key={r.ticker} className="border-t border-border">
                        <td className="px-3 py-2 text-text-tertiary font-mono">{i + 1}</td>
                        <td className="px-3 py-2">
                          <Link href={`/stocks/${r.ticker}`} className="font-mono font-semibold text-accent hover:underline">
                            {r.ticker.replace(".JK", "")}
                          </Link>
                          <span className="block text-xs text-text-tertiary max-w-[180px] truncate" title={r.name}>{r.name}</span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-bearish whitespace-nowrap">{fmtRpCompact(r.netValue)}</td>
                        <td className="px-3 py-2 text-center"><GuestStar ticker={r.ticker} compact /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <details className="mt-8 group rounded-lg border border-border bg-bg-card p-5 text-sm leading-relaxed text-text-secondary">
          <summary className="flex items-center justify-between cursor-pointer list-none font-semibold text-text-primary select-none">
            <span>Tentang Data Aliran Dana Asing</span>
            <span className="text-xs text-text-tertiary transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="space-y-3 mt-3 pt-3 border-t border-border/40">
            <p>
              <strong className="text-text-primary">Aliran dana asing</strong> menunjukkan saham mana yang sedang
              diakumulasi atau didistribusikan investor asing di Bursa Efek Indonesia. Nilai bersih dihitung dari
              volume beli dikurangi jual asing (data resmi IDX TradingSummary) dikalikan harga penutupan sesi.
            </p>
            <p>
              Akumulasi asing paling berguna sebagai <em>konfirmasi</em>, bukan sinyal tunggal: saham yang sehat
              adalah saat arus masuk asing diikuti tren harga dan indikator teknikal yang membaik. Buka halaman
              saham untuk melihat skor sinyal (−1 s.d. +1), RSI, dan posisi terhadap rata-rata harga — atau lihat{" "}
              <Link href="/pasar" className="text-accent hover:underline">Koran Pasar Live</Link> untuk gambaran
              pasar hari ini.
            </p>
          </div>
        </details>
      </div>
    </>
  );
}
