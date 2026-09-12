import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/layout/page-hero";
import { MarketBreathStrip } from "@/components/ui/market-breath-strip";
import { weeklyReportService, toMonday } from "@/domains/stock/weekly-report.service";
import { formatPrice, formatPercent, stripJk, changeColor } from "@/lib/utils";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 3600;

function parseWeekParam(minggu: string): Date | null {
  // URL shape /laporan-pasar/minggu-YYYY-MM-DD — the segment captures the whole
  // "minggu-2026-08-31" chunk, so strip the prefix before validating.
  const raw = minggu.startsWith("minggu-") ? minggu.slice("minggu-".length) : minggu;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(`${raw}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export async function generateMetadata(
  { params }: { params: Promise<{ minggu: string }> },
): Promise<Metadata> {
  const { minggu } = await params;
  const d = parseWeekParam(minggu);
  if (!d) return { title: "Laporan Pasar" };
  const mon = toMonday(d);
  const title = `Laporan Pasar Saham IDX Minggu ${mon.getUTCDate()} ${MONTHS_ID[mon.getUTCMonth()]} ${mon.getUTCFullYear()} — IHSG & Sinyal`;
  // minggu already includes the "minggu-" prefix (it's the full path chunk).
  return {
    title,
    description: `Ringkasan pasar saham Indonesia minggu ${mon.getUTCDate()} ${MONTHS_ID[mon.getUTCMonth()]}: pergerakan IHSG, market breadth, sektor terkuat-terlemah, top movers, dan sinyal golden cross / death cross.`,
    alternates: { canonical: `/laporan-pasar/${minggu}` },
    openGraph: {
      title: `${title} | TeknikalID`,
      description: `Data asli TeknikalID: IHSG, breadth, sektor, movers, dan sinyal SMA minggu ${mon.getUTCDate()} ${MONTHS_ID[mon.getUTCMonth()]} ${mon.getUTCFullYear()}.`,
      url: `${SITE_URL}/laporan-pasar/${minggu}`,
      images: [{ url: `${SITE_URL}/api/og?title=${encodeURIComponent(`Laporan Pasar IDX — Minggu ${mon.getUTCDate()} ${MONTHS_ID[mon.getUTCMonth()]}`)}&type=berita`, width: 1200, height: 630 }],
    },
  };
}

export default async function LaporanMingguPage({
  params,
}: {
  params: Promise<{ minggu: string }>;
}) {
  const { minggu } = await params;
  const parsed = parseWeekParam(minggu);
  if (!parsed) notFound();

  // Sync future-week rejection BEFORE any DB await — after streaming starts,
  // notFound() can only produce a soft-404 (200 + 404 body).
  if (toMonday(parsed).getTime() > Date.now()) notFound();

  // Non-Monday dates silently rendered the week's Monday page with a mismatched
  // canonical — normalize to the Monday slug (308, keeps one URL per edition).
  // Non-Monday dates are 308'd to the Monday slug in proxy.ts (real status code —
  // redirect() here would only emit an in-band meta-refresh after streaming starts).

  const report = await weeklyReportService.getWeeklyReport(parsed);
  if (!report) notFound();

  // Past week with zero price rows = data gap (pre-launch, holiday anomalies) —
  // an empty "report" would render as thin 200 content. 404 instead.
  if (report.breadth.total === 0 && report.ihsg.weekClose === null) notFound();

  // Static schema markup (no user input), rendered as a plain script child.
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: `Laporan Pasar Saham IDX — Minggu ${report.label}`,
        description: report.prose.intro,
        datePublished: report.weekStart.toISOString(),
        publisher: { "@type": "Organization", name: "TeknikalID", url: SITE_URL },
        mainEntityOfPage: `${SITE_URL}/laporan-pasar/${minggu}`,
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Apa itu laporan pasar mingguan TeknikalID?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Ringkasan pasar saham IDX setiap minggu yang dihitung langsung dari data harga dan indikator teknikal TeknikalID — pergerakan IHSG, market breadth, sektor, top movers, dan sinyal golden cross / death cross. Bukan opini, murni data.",
            },
          },
          {
            "@type": "Question",
            name: "Bagaimana golden cross mingguan dihitung?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Saham masuk daftar golden cross jika SMA50-nya berada di bawah SMA200 pada awal minggu dan menembus ke atasnya pada penutupan minggu berjalan. Death cross adalah kebalikannya.",
            },
          },
        ],
      },
    ],
  });

  const prevWeek = new Date(report.weekStart);
  prevWeek.setUTCDate(prevWeek.getUTCDate() - 7);
  const prevSlug = `minggu-${prevWeek.toISOString().slice(0, 10)}`;

  return (
    <>
      <script type="application/ld+json">{jsonLd}</script>

      <PageHero
        eyebrow="Data asli TeknikalID"
        title={`Laporan Pasar Minggu ${report.label}`}
        description="Ringkasan pasar saham IDX dihitung dari data harga & indikator TeknikalID — bukan opini, murni angka."
      />
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">

        {/* Intro prose */}
        <p className="text-base leading-relaxed text-text-secondary">{report.prose.intro}</p>

        {/* IHSG (or market-average fallback) + breadth */}
        <div className="rounded-xl border border-border bg-bg-card p-4">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            {report.ihsg.weekClose !== null ? (
              <>
                <span className="text-sm font-semibold text-text-primary">IHSG mingguan</span>
                <span className="font-mono text-xl font-bold tabular-nums text-text-primary">
                  {formatPrice(report.ihsg.weekClose)}
                  {report.ihsg.changePercent !== null && (
                    <span className={`ml-2 text-base ${changeColor(report.ihsg.changePercent)}`}>
                      {formatPercent(report.ihsg.changePercent)}
                    </span>
                  )}
                </span>
              </>
            ) : (
              <>
                <span className="text-sm font-semibold text-text-primary">Rata-rata saham mingguan</span>
                <span className={`font-mono text-xl font-bold tabular-nums ${changeColor(report.marketAvgChange)}`}>
                  {formatPercent(report.marketAvgChange)}
                </span>
              </>
            )}
          </div>
          <div className="mt-3 border-t border-border pt-3">
            <MarketBreathStrip
              data={{
                advancersCount: report.breadth.advancers,
                declinersCount: report.breadth.decliners,
                unchangedCount: report.breadth.unchanged,
                ihsg: null,
              }}
            />
          </div>
        </div>

        {/* Sectors */}
        <section>
          <h2 className="text-lg font-bold text-text-primary mb-1">Performa Sektor</h2>
          <p className="text-sm text-text-secondary mb-3">{report.prose.sectors}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 pr-4 font-semibold text-text-primary">Sektor</th>
                  <th className="py-2 pr-4 font-semibold text-text-primary">Rata-rata Mingguan</th>
                  <th className="py-2 pr-4 font-semibold text-text-primary">Saham</th>
                </tr>
              </thead>
              <tbody>
                {report.sectors.map((s) => (
                  <tr key={s.sector} className="border-b border-border">
                    <td className="py-2 pr-4 text-text-primary">{s.sector}</td>
                    <td className={`py-2 pr-4 font-mono tabular-nums ${changeColor(s.avgChange)}`}>
                      {formatPercent(s.avgChange)}
                    </td>
                    <td className="py-2 pr-4 text-text-secondary">{s.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Movers */}
        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Top Movers Minggu Ini</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {([
              { title: "Penguat Terbesar", rows: report.topGainers },
              { title: "Pelemah Terbesar", rows: report.topLosers },
            ]).map((block) => (
              <div key={block.title} className="rounded-xl border border-border bg-bg-card p-4">
                <p className="text-sm font-semibold text-text-primary mb-2">{block.title}</p>
                <div className="space-y-1.5">
                  {block.rows.map((r) => (
                    <Link
                      key={r.ticker}
                      href={`/stocks/${r.ticker}`}
                      className="flex items-center justify-between gap-2 rounded px-1 py-1 hover:bg-bg-hover transition-colors"
                    >
                      <span className="min-w-0">
                        <span className="font-mono text-sm font-semibold text-text-primary">{stripJk(r.ticker)}</span>
                        <span className="ml-2 text-xs text-text-tertiary truncate">{r.name}</span>
                      </span>
                      <span className={`font-mono text-sm font-bold tabular-nums shrink-0 ${changeColor(r.changePercent)}`}>
                        {formatPercent(r.changePercent)}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Signals */}
        <section>
          <h2 className="text-lg font-bold text-text-primary mb-1">Sinyal Teknikal Minggu Ini</h2>
          <p className="text-sm text-text-secondary mb-4">{report.prose.signals}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-bg-card p-4">
              <p className="text-sm font-semibold text-bullish mb-2">Golden Cross ({report.goldenCrosses.length})</p>
              {report.goldenCrosses.length === 0 ? (
                <p className="text-xs text-text-tertiary">Tidak ada golden cross minggu ini.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {report.goldenCrosses.map((g) => (
                    <Link key={g.ticker} href={`/stocks/${g.ticker}`} className="rounded-full bg-bullish/10 px-2.5 py-1 text-xs font-mono font-semibold text-bullish hover:bg-bullish/20 transition-colors">
                      {stripJk(g.ticker)}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-xl border border-border bg-bg-card p-4">
              <p className="text-sm font-semibold text-bearish mb-2">Death Cross ({report.deathCrosses.length})</p>
              {report.deathCrosses.length === 0 ? (
                <p className="text-xs text-text-tertiary">Tidak ada death cross minggu ini.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {report.deathCrosses.map((g) => (
                    <Link key={g.ticker} href={`/stocks/${g.ticker}`} className="rounded-full bg-bearish/10 px-2.5 py-1 text-xs font-mono font-semibold text-bearish hover:bg-bearish/20 transition-colors">
                      {stripJk(g.ticker)}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Cross-links + prev week */}
        <div className="flex flex-wrap gap-3 border-t border-border pt-6">
          <Link href="/saham-golden-cross" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-bg-hover">
            📈 Saham Golden Cross Hari Ini
          </Link>
          <Link href="/saham-oversold" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-bg-hover">
            💎 Saham Oversold
          </Link>
          <Link href={`/laporan-pasar/${prevSlug}`} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-bg-hover">
            ← Laporan minggu sebelumnya
          </Link>
        </div>
      </div>
    </>
  );
}
