import { type Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SITE_URL } from "@/lib/constants";
import { SECTOR_META } from "@/lib/sectors";
import { marketSnapshotService } from "@/domains/stock/market-snapshot.service";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { formatPrice, formatPercentPlain, stripJk, changeColor } from "@/lib/utils";
import { signalBadge } from "@/lib/seo/signal-badge";
import { safeJsonLd } from "@/lib/safe-json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

/**
 * Landing sektor /sektor/[slug] — prd-2026-11-06-02 (P2 GROWTH/SEO).
 *
 * Doctrine SATU PINTU: angka breadth/rata-rata sektor HANYA dari
 * marketSnapshotService.getSnapshot() (market-snapshot.service.ts);
 * DILARANG query SQL pergerakan baru independen (breadth-rule qa-30-01:
 * ranking dari query kanonik, bukan hitung sendiri).
 * Baris tabel saham via stockMarketService.getStockList(sector) —
 * jalur batch existing (pola T2), bukan SQL baru.
 */

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export function generateStaticParams() {
  return SECTOR_META.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const meta = SECTOR_META.find((s) => s.slug === slug);
  if (!meta) return {};

  const title = `Saham Sektor ${meta.name} Hari Ini — Pergerakan & Sinyal Teknikal`;
  const desc = `Pergerakan harga saham sektor ${meta.name.toLowerCase()} hari ini: breadth naik-turun, skor sinyal teknikal, dan daftar emiten lengkap dengan link analisa per saham.`;

  return {
    title,
    description: desc,
    alternates: { canonical: `/sektor/${slug}` },
    openGraph: {
      title,
      description: desc,
      url: `${SITE_URL}/sektor/${slug}`,
    },
  };
}

export default async function SectorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const meta = SECTOR_META.find((s) => s.slug === slug);
  if (!meta) notFound();

  // SATU PINTU: snapshot market (cached 60s di service)
  const snapshot = await marketSnapshotService.getSnapshot();
  const sectorStat = snapshot.sectors[meta.en] ?? null;

  // Baris saham sektor — jalur batch existing (cache 5 menit)
  const rows = await stockMarketService.getStockList(meta.en);

  // Breadth sektor DARI SNAPSHOT (SATU PINTU, sesi tunggal) — bukan dari baris
  // getStockList yang bisa memuat harga tanggal campur utk saham suspend
  // (DOM 39/42/24 vs SQL sesi 11-06 38/39/22 sebelum fix ini).
  const sectorBreadth = sectorStat
    ? {
        advancing: sectorStat.advancers,
        declining: sectorStat.decliners,
        unchanged: sectorStat.unchanged,
        total: sectorStat.count,
      }
    : null;
  const advancing = sectorBreadth?.advancing ?? rows.filter((r) => r.changePercent !== null && r.changePercent > 0).length;
  const declining = sectorBreadth?.declining ?? rows.filter((r) => r.changePercent !== null && r.changePercent < 0).length;
  const unchanged = sectorBreadth?.unchanged ?? rows.length - advancing - declining;

  const withScore = rows
    .filter((r) => r.signalScore !== null && !Number.isNaN(r.signalScore))
    .sort((a, b) => (b.signalScore ?? 0) - (a.signalScore ?? 0));
  const topSignals = withScore.slice(0, 12);

  const avgChange =
    sectorStat?.avgChange ??
    (rows.length > 0
      ? Number(
          (
            rows.reduce((acc, r) => acc + (r.changePercent ?? 0), 0) / rows.length
          ).toFixed(2),
        )
      : null);

  const others = SECTOR_META.filter((s) => s.slug !== slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: `Sektor ${meta.name} — Pergerakan Saham Hari Ini`,
        description: meta.description.slice(0, 300),
        url: `${SITE_URL}/sektor/${meta.slug}`,
        breadcrumb: { "@id": `${SITE_URL}/sektor/${meta.slug}#breadcrumb` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${SITE_URL}/sektor/${meta.slug}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Saham", item: `${SITE_URL}/stocks` },
          {
            "@type": "ListItem",
            position: 3,
            name: meta.name,
            item: `${SITE_URL}/sektor/${meta.slug}`,
          },
        ],
      },
      {
        "@type": "ItemList",
        name: `Saham Sektor ${meta.name}`,
        numberOfItems: rows.length,
        itemListElement: topSignals.slice(0, 20).map((s, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: `${stripJk(s.ticker)} — ${s.name}`,
          url: `${SITE_URL}/stocks/${s.ticker}`,
        })),
      },
    ],
  };

  const title = `Saham Sektor ${meta.name} Hari Ini`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <Breadcrumbs
          currentUrl={`/sektor/${slug}`}
          items={[
            { label: "Beranda", href: "/" },
            { label: "Saham", href: "/stocks" },
            { label: meta.name },
          ]}
        />

        {/* ── Hero: nama sektor + breadth hari ini (SATU PINTU) ── */}
        <header className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            {title}
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            {meta.description}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="text-text-tertiary text-xs">
              Sesi {snapshot.sessionDate ?? "—"} WIB
            </span>
            {avgChange !== null && (
              <span
                className={`font-bold font-mono tabular-nums ${changeColor(avgChange)}`}
              >
                {avgChange >= 0 ? "+" : "−"}
                {formatPercentPlain(avgChange)}% rata-rata sektor
              </span>
            )}
            <span className="text-text-tertiary text-xs">
              {(sectorBreadth?.total ?? rows.length)} emiten ·{" "}
              <span className="text-bullish font-semibold">{advancing} naik</span>{" "}
              ·{" "}
              <span className="text-bearish font-semibold">{declining} turun</span>
              {unchanged > 0 && <> · {unchanged} tetap</>}
            </span>
          </div>
          {/* Bar breadth mini */}
          {(sectorBreadth?.total ?? rows.length) > 0 && (
            <div
              className="h-1.5 w-full max-w-md rounded-full overflow-hidden bg-border/60 flex"
              aria-hidden="true"
            >
              <span
                className="h-full bg-bullish"
                style={{ width: `${(advancing / (sectorBreadth?.total ?? rows.length)) * 100}%` }}
              />
              <span
                className="h-full bg-border"
                style={{ width: `${(unchanged / (sectorBreadth?.total ?? rows.length)) * 100}%` }}
              />
              <span
                className="h-full bg-bearish"
                style={{ width: `${(declining / (sectorBreadth?.total ?? rows.length)) * 100}%` }}
              />
            </div>
          )}
        </header>

        {/* ── Tabel top sinyal sektor ── */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-text-primary">
            Sinyal Teknikal Terkuat Sektor {meta.name}
          </h2>
          <p className="text-xs text-text-tertiary">
            Urutan skor sinyal mesin teknikal.id (indikator RSI, MACD, MA, volume).
            Klik saham untuk analisa lengkap.
          </p>
          <div className="rounded-xl border border-border bg-bg-card/40 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-text-tertiary border-b border-border/60">
                  <th className="px-4 py-2.5 font-medium">Saham</th>
                  <th className="px-2 py-2.5 font-medium text-right">Harga</th>
                  <th className="px-2 py-2.5 font-medium text-right">Perubahan</th>
                  <th className="px-4 py-2.5 font-medium text-right hidden sm:table-cell">
                    Sinyal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {topSignals.map((s) => {
                  const badge = s.signalScore !== null ? signalBadge(s.signalScore) : null;
                  return (
                    <tr key={s.ticker} className="hover:bg-bg-card transition-colors">
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/stocks/${s.ticker}`}
                          data-engagement="funnel_sectorToTicker"
                          className="inline-flex flex-col min-h-10 sm:min-h-0"
                        >
                          <span className="font-semibold text-text-primary">
                            {stripJk(s.ticker)}
                          </span>
                          <span className="text-[11px] text-text-tertiary truncate max-w-[180px] sm:max-w-[260px]">
                            {s.name}
                          </span>
                        </Link>
                      </td>
                      <td className="px-2 py-2.5 text-right font-mono tabular-nums text-text-secondary">
                        {s.close !== null ? formatPrice(s.close) : "—"}
                      </td>
                      <td
                        className={`px-2 py-2.5 text-right font-mono tabular-nums font-semibold ${
                          s.changePercent === null
                            ? "text-text-tertiary"
                            : changeColor(s.changePercent)
                        }`}
                      >
                        {s.changePercent === null
                          ? "—"
                          : `${s.changePercent >= 0 ? "+" : "−"}${formatPercentPlain(Math.abs(s.changePercent))}%`}
                      </td>
                      <td className="px-4 py-2.5 text-right hidden sm:table-cell">
                        {badge && (
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge.cls}`}
                          >
                            {badge.label}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-text-tertiary">
            Ingin menelusuri seluruh {rows.length} emiten sektor {meta.name} dengan
            filter lanjutan?{" "}
            <Link
              href="/stocks"
              className="text-accent hover:underline font-medium"
              data-engagement="nav_sectorToScreener"
            >
              Buka Radar Saham
            </Link>
            .
          </p>
        </section>

        {/* ── Sektor lain (10 link internal) ── */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-text-primary">Sektor lain</h2>
          <div className="flex flex-wrap gap-2">
            {others.map((o) => (
              <Link
                key={o.slug}
                href={`/sektor/${o.slug}`}
                data-engagement="nav_sectorToSector"
                className="inline-flex items-center rounded-full border border-border bg-bg-card px-3 py-1.5 text-xs font-semibold text-text-secondary hover:border-accent/40 hover:text-accent transition-colors"
              >
                {o.name}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
