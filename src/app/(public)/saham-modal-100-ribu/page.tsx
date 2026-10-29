import type { Metadata } from "next";
import Link from "next/link";
import { safeJsonLd } from "@/lib/safe-json-ld";
import { SITE_URL } from "@/lib/constants";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { PageHero } from "@/components/layout/page-hero";
import { GuestStar } from "@/components/stock/guest-star";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  // seo-dr-5 (deep-research 641c019): kueri "saham modal 100 ribu utk pemula" 9-18rb/bln —
  // kompetitor = artikel blog statis harga tahun lalu; kita live + filter risiko (gocap/FCA/gorengan).
  title: "Daftar Saham Modal Rp100 Ribu Hari Ini — 1 Lot Terjangkau di BEI | TeknikalID",
  description:
    "Saham dengan modal 1 lot di bawah Rp100.000 di BEI hari ini — sudah disaring dari saham gocap, papan pemantauan khusus, dan saham tidur. Lengkap harga, likuiditas, dan skor sinyal. Gratis.",
  alternates: { canonical: "/saham-modal-100-ribu" },
  openGraph: {
    title: "Saham Modal Rp100 Ribu untuk Pemula — 1 Lot ≤ Rp100.000 | TeknikalID",
    description: "Daftar saham BEI terjangkau 1 lot Rp100 ribu, tersaring risiko — update harian.",
    url: `${SITE_URL}/saham-modal-100-ribu`,
  },
};

export default async function SahamModal100RibuPage() {
  let rows: Awaited<ReturnType<typeof stockMarketService.getStockList>> = [];
  let failed = false;
  try {
    rows = await stockMarketService.getStockList();
  } catch {
    failed = true;
  }

  // Filter ketat: modal 1 lot <= Rp100rb, bukan gocap (<=55), bukan FCA, ada transaksi.
  const affordable = rows
    .filter((r) => r.close !== null && r.close > 55 && r.close <= 1000)
    .filter((r) => r.listingBoard !== "Pemantauan Khusus")
    .filter((r) => (r.volume ?? 0) > 0)
    .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
    .slice(0, 40);
  const midTier = rows
    .filter((r) => r.close !== null && r.close > 1000 && r.close <= 5000)
    .filter((r) => r.listingBoard !== "Pemantauan Khusus")
    .filter((r) => (r.volume ?? 0) > 0)
    .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
    .slice(0, 15);

  const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Daftar Saham Modal Rp100 Ribu di BEI",
        description: "Saham BEI dengan harga 1 lot di bawah Rp100.000, disaring dari risiko gocap dan papan pemantauan khusus.",
        url: `${SITE_URL}/saham-modal-100-ribu`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Beranda", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Saham Modal 100 Ribu", item: `${SITE_URL}/saham-modal-100-ribu` },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Berapa modal minimal beli saham di Indonesia?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Satu lot saham di BEI berisi 100 lembar, jadi modal minimal = 100 × harga per lembar. Ada saham dengan harga Rp60-100 per lembar sehingga 1 lot-nya hanya Rp6.000-100.000. Namun murah di harga belum tentu murah dalam risiko — perhatikan likuiditas dan hindari saham yang nyaris tidak diperdagangkan.",
            },
          },
          {
            "@type": "Question",
            name: "Apakah saham murah otomatis bagus untuk pemula?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Tidak. Harga per lembar yang rendah sering justru tanda masalah: perusahaan besar biasanya berharga ribuan rupiah per lembar. Yang penting adalah likuiditas (mudah dijual kembali), kesehatan tren harga, dan fundamental. Daftar ini menyaring saham yang benar-benar aktif diperdagangkan dan bukan di papan pemantauan khusus.",
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
        title="Daftar Saham Modal Rp100 Ribu untuk Pemula"
        description="Saham BEI yang 1 lot-nya (100 lembar) terjangkau Rp100.000 — disaring dari saham gocap, papan pemantauan khusus, dan saham yang nyaris tidak diperdagangkan."
      />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <p className="rounded-lg bg-bg-hover/60 px-3 py-2 text-[13px] text-text-secondary leading-relaxed">
          Per {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date())},
          terdapat <strong className="text-text-primary">{affordable.length} saham aktif BEI</strong> dengan modal 1 lot
          ≤ Rp100.000 yang lolos saringan risiko kami — diurutkan dari yang paling likuid.
        </p>

        <div className="mt-4 rounded-lg border border-amber-300/50 bg-amber-500/5 p-4 text-sm text-text-secondary leading-relaxed">
          <strong className="text-text-primary">Murah rupiah belum tentu murah risiko.</strong> Harga per lembar
          rendah bukan tanda "saham murah" — perusahaan berkualitas justru biasanya berharga ribuan rupiah per
          lembar. Gunakan daftar ini untuk belajar dengan modal kecil, bukan berburu keuntungan besar dari saham
          serpihan.
        </div>

        {failed ? (
          <p className="mt-6 text-sm text-text-tertiary">Data sedang tidak tersedia. Coba beberapa saat lagi.</p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-bg-hover text-text-tertiary text-xs">
                  <th className="text-left px-3 py-2">Kode</th>
                  <th className="text-left px-3 py-2">Nama Emiten</th>
                  <th className="text-left px-3 py-2">Papan</th>
                  <th className="text-right px-3 py-2">Harga/Lbr</th>
                  <th className="text-right px-3 py-2">Modal 1 Lot</th>
                  <th className="text-right px-3 py-2">Perubahan</th>
                  <th className="text-right px-3 py-2">Skor</th>
                  <th className="text-right px-3 py-2">RSI-14</th>
                  <th className="text-center px-3 py-2">Pantau</th>
                </tr>
              </thead>
              <tbody>
                {affordable.map((r) => (
                  <tr key={r.ticker} className="border-t border-border">
                    <td className="px-3 py-2">
                      <Link href={`/stocks/${r.ticker}`} className="font-mono font-semibold text-accent hover:underline">
                        {r.ticker.replace(".JK", "")}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-text-secondary max-w-[220px] truncate" title={r.name}>{r.name}</td>
                    <td className="px-3 py-2 text-xs text-text-tertiary">{r.listingBoard ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{fmt(r.close!)}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold">{fmt(r.close! * 100)}</td>
                    <td className={`px-3 py-2 text-right font-mono tabular-nums ${(r.changePercent ?? 0) > 0 ? "text-bullish" : (r.changePercent ?? 0) < 0 ? "text-bearish" : "text-text-tertiary"}`}>
                      {r.changePercent !== null ? `${r.changePercent > 0 ? "+" : ""}${r.changePercent.toFixed(2).replace(".", ",")}%` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold">
                      {r.signalScore !== null
                        ? <span className={r.signalScore > 0 ? "text-bullish" : r.signalScore < 0 ? "text-bearish" : "text-text-secondary"}>{r.signalScore.toFixed(2).replace(".", ",")}</span>
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-text-secondary">{r.rsi14 !== null ? r.rsi14.toFixed(0) : "—"}</td>
                    <td className="px-3 py-2 text-center"><GuestStar ticker={r.ticker} compact /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {midTier.length > 0 && (
          <>
            <h2 className="mt-8 text-base font-bold text-text-primary">Alternatif: Saham Unggulan Modal &lt; Rp500 Ribu/Lot</h2>
            <p className="text-xs text-text-tertiary mb-3">Emiten lebih mapan (harga Rp1.000-5.000/lembar) untuk yang sanggup menabung sedikit lebih besar.</p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-bg-hover text-text-tertiary text-xs">
                    <th className="text-left px-3 py-2">Kode</th>
                    <th className="text-left px-3 py-2">Nama Emiten</th>
                    <th className="text-right px-3 py-2">Harga/Lbr</th>
                    <th className="text-right px-3 py-2">Modal 1 Lot</th>
                  </tr>
                </thead>
                <tbody>
                  {midTier.map((r) => (
                    <tr key={r.ticker} className="border-t border-border">
                      <td className="px-3 py-2">
                        <Link href={`/stocks/${r.ticker}`} className="font-mono font-semibold text-accent hover:underline">
                          {r.ticker.replace(".JK", "")}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-text-secondary max-w-[240px] truncate" title={r.name}>{r.name}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{fmt(r.close!)}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold">{fmt(r.close! * 100)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="mt-8 space-y-3 text-sm leading-relaxed text-text-secondary">
          <p>
            <strong className="text-text-primary">1 lot = 100 lembar</strong> — satuan beli minimal di Bursa Efek
            Indonesia. Pemula sering mengira bisa membeli sekadar harga per lembar (misal Rp200), padahal situs
            sekuritas selalu memproses kelipatan lot. Kolom "Modal 1 Lot" di atas menghitung 100 × harga terakhir.
          </p>
          <p>
            Setelah menemukan kandidat terjangkau, langkah paling penting adalah memeriksa{" "}
            <Link href="/screener" className="text-accent hover:underline">kesehatan trennya lewat saringan sinyal</Link>{" "}
            dan membaca analisa lengkap di halaman sahamnya — gratis tanpa login.
          </p>
        </div>
      </div>
    </>
  );
}
