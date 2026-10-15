import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHero } from "@/components/layout/page-hero";
import { pasarLiveService, isLiveWindow, isMarketHours, wibNow, wibHHMM } from "@/domains/stock/pasar-live.service";
import { formatPrice, formatPercent, formatVolume, stripJk } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Newspaper, AlertTriangle, Clock } from "lucide-react";

/**
 * /pasar — Koran Saham Live (PRD prd-pasar-live-01).
 * HARI INI saja: snapshot market live, bukan arsip. Sebelum 06:30 / off-hours
 * tampil "pasar belum buka" + rekap kemarin. Recap permanen = artikel
 * brief-pasar-YYYY-MM-DD (jalur existing), bukan halaman ini.
 *
 * SEO policy: NOINDEX — konten berubah tiap jam, tidak ada keyword stabil.
 * /pasar = retention, artikel = acquisition (spec.seo_policy).
 *
 * Revalidate 60s saat jam pasar (isMarketHours true on request) — saat tutup,
 * ISR default 15 menit sudah cukup (rekap kemarin jarang berubah).
 */
export const dynamic = "force-dynamic";  // SSR per-request; build tak butuh DB (pola page.tsx utama)

export const metadata: Metadata = {
  title: "Koran Saham Live — Pasar IDX Hari Ini",
  description:
    "Pasar IDX real-time hari ini: IHSG live, watchlist sinyal teknikal, top movers, dan berita emiten — update sepanjang sesi.",
  alternates: { canonical: "/pasar" },
  robots: { index: false, follow: true },
};

function WibClock() {
  const now = wibNow();
  return (
    <span className="inline-flex items-center gap-1.5 text-text-tertiary text-sm font-mono">
      <Clock className="h-3.5 w-3.5" aria-hidden />
      {now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} WIB
    </span>
  );
}

function ChangeBadge({ pct, className }: { pct: number | null; className?: string }) {
  if (pct === null) return <span className={cn("text-sm tabular-nums text-text-tertiary", className)}>—</span>;
  return (
    <span className={cn("text-sm font-semibold tabular-nums", pct >= 0 ? "text-bullish" : "text-bearish", className)}>
      {pct >= 0 ? "+" : ""}
      {formatPercent(pct)}
    </span>
  );
}

export default async function PasarPage() {
  const live = isLiveWindow();
  const marketOpen = isMarketHours();
  const nowWib = wibNow();
  const preOpen = !live && wibHHMM(nowWib) < 630;  // 00:00-06:29 = pre-open (fix: 06:00-06:29 sempat jatuh ke 'weekend')
  const weekend = !live && !preOpen;

  // ── Pre-open / weekend: rekap kemarin (cheap path, no news fetch) ──
  if (!live) {
    const recap = await pasarLiveService.getYesterdayRecap();
    return (
      <>
        <PageHero eyebrow="Live" title="Koran Saham Live" description="Pasar belum buka — rekap sesi terakhir di bawah ini. Live update mulai 06:30 WIB.">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg px-3 py-1 text-sm font-medium">
              🌙 Pasar belum buka
            </span>
            <WibClock />
          </div>
        </PageHero>
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
          {weekend && (
            <Card>
              <CardContent className="text-sm text-muted-foreground py-4">
                Akhir pekan — bursa tutup. Rekap sesi Jumat terakhir:
              </CardContent>
            </Card>
          )}
          <RecapBlock
            ihsg={recap.ihsg}
            gainers={recap.gainers}
            losers={recap.losers}
            sessionDate={recap.sessionDate}
          />
          <Disclaimer />
        </div>
      </>
    );
  }

  // ── Live window (06:30–18:30 WIB weekday) ──
  const snap = await pasarLiveService.getSnapshot(true);
  const ihsg = snap.ihsg;

  return (
    <>
      <PageHero
        eyebrow="Live"
        title="Koran Saham Live"
        description="Satu halaman untuk pantau pasar IDX hari ini — IHSG, watchlist sinyal, movers, dan berita. Update tiap menit saat sesi berjalan."
      >
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium",
              marketOpen ? "border-bullish/30 bg-bullish/10 text-bullish" : "border-border bg-bg text-text-secondary",
            )}
          >
            {marketOpen ? "🟢 PASAR BUKA" : "⚪ di luar sesi"}
          </span>
          <WibClock />
          {snap.sessionDate && (
            <span className="text-sm text-text-tertiary font-mono">sesi data {snap.sessionDate}</span>
          )}
        </div>
      </PageHero>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* ── IHSG header ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">IHSG</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
              <div className="text-4xl font-bold tabular-nums tracking-tight">
                {ihsg.close !== null ? ihsg.close.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
              </div>
              <ChangeBadge pct={ihsg.changePercent} className="text-lg" />
              {ihsg.change !== null && (
                <span className={cn("text-sm tabular-nums", ihsg.change >= 0 ? "text-bullish" : "text-bearish")}>
                  {ihsg.change >= 0 ? "+" : ""}
                  {ihsg.change.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pts
                </span>
              )}
              <span className="ml-auto text-xs text-text-tertiary">
                {ihsg.source === "live" ? "live quote" : ihsg.date ? `close ${ihsg.date}` : "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ── Watchlist Hari Ini ── */}
        <section aria-labelledby="watchlist-heading">
          <div className="flex items-center gap-2 mb-3">
            <h2 id="watchlist-heading" className="text-lg font-semibold">Watchlist Hari Ini</h2>
            <span className="text-xs text-text-tertiary">sinyal teknikal non-gorengan · likuiditas ≥ Rp1 M</span>
          </div>
          {snap.watchlist.length === 0 ? (
            <Card><CardContent className="text-sm text-muted-foreground py-4">Belum ada sinyal fresh yang lolos filter hari ini.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {snap.watchlist.map((w) => (
                <Link key={w.ticker} href={`/stocks/${w.ticker}`} className="group">
                  <Card className="h-full transition-colors group-hover:border-accent/50">
                    <CardContent className="py-4">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-bold text-base group-hover:text-accent">{stripJk(w.ticker)}</span>
                        <ChangeBadge pct={w.changePercent} />
                      </div>
                      <div className="text-xs text-text-tertiary truncate">{w.name}</div>
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="font-mono tabular-nums">{w.close !== null ? formatPrice(w.close) : "—"}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">{w.reason}</span>
                      </div>
                      <div className="mt-1 text-xs text-text-tertiary">
                        {w.volumeShares !== null && <>vol {formatVolume(w.volumeShares)} · </>}
                        {w.rsi14 !== null && <>RSI {w.rsi14.toFixed(0)}</>}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── Top Movers ── */}
        <section aria-labelledby="movers-heading" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MoversCard id="movers-heading" title="Top Gainers" icon={<TrendingUp className="h-4 w-4 text-bullish" />} items={snap.gainers} />
          <MoversCard title="Top Losers" icon={<TrendingDown className="h-4 w-4 text-bearish" />} items={snap.losers} />
        </section>

        {/* ── News Cross-Check ── */}
        <section aria-labelledby="news-heading">
          <div className="flex items-center gap-2 mb-3">
            <Newspaper className="h-4 w-4 text-accent" aria-hidden />
            <h2 id="news-heading" className="text-lg font-semibold">News Cross-Check</h2>
            <span className="text-xs text-text-tertiary">Google News · maks 36 jam</span>
          </div>
          {snap.news.length === 0 ? (
            <Card><CardContent className="text-sm text-muted-foreground py-4">Belum ada berita watchlist dalam 36 jam terakhir.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {snap.news.map((n) => (
                <a key={n.link} href={n.link} rel="noopener noreferrer nofollow" target="_blank" className="group">
                  <Card className="h-full transition-colors group-hover:border-accent/50">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-2 text-xs text-text-tertiary mb-1">
                        <span className="font-bold text-accent">{n.ticker}</span>
                        <span>·</span>
                        <span className="truncate">{n.source}</span>
                      </div>
                      <div className="text-sm font-medium leading-snug group-hover:text-accent">{n.title}</div>
                    </CardContent>
                  </Card>
                </a>
              ))}
            </div>
          )}
        </section>

        <Disclaimer />
      </div>
    </>
  );
}

function MoversCard({
  id,
  title,
  icon,
  items,
}: {
  id?: string;
  title: string;
  icon: React.ReactNode;
  items: { ticker: string; name: string; close: number | null; changePercent: number | null; volumeShares: number | null }[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada data sesi.</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((m, i) => (
              <li key={m.ticker}>
                <Link href={`/stocks/${m.ticker}`} className="flex items-center gap-3 py-2.5 group">
                  <span className="w-5 text-xs text-text-tertiary tabular-nums">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold group-hover:text-accent">{stripJk(m.ticker)}</span>
                    <span className="block text-xs text-text-tertiary truncate">{m.name}</span>
                  </span>
                  <span className="text-right">
                    <span className="block text-sm font-mono tabular-nums">{m.close !== null ? formatPrice(m.close) : "—"}</span>
                    {m.volumeShares !== null && <span className="block text-xs text-text-tertiary">vol {formatVolume(m.volumeShares)}</span>}
                  </span>
                  <ChangeBadge pct={m.changePercent} className="w-20 text-right" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RecapBlock({
  ihsg,
  gainers,
  losers,
  sessionDate,
}: {
  ihsg: { close: number | null; changePercent: number | null; change: number | null };
  gainers: { ticker: string; close: number | null; changePercent: number | null; volumeShares: number | null; name: string }[];
  losers: { ticker: string; close: number | null; changePercent: number | null; volumeShares: number | null; name: string }[];
  sessionDate: string | null;
}) {
  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">IHSG — sesi {sessionDate ?? "terakhir"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
            <div className="text-3xl font-bold tabular-nums">
              {ihsg.close !== null ? ihsg.close.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
            </div>
            <ChangeBadge pct={ihsg.changePercent} className="text-lg" />
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MoversCard title="Gainers kemarin" icon={<TrendingUp className="h-4 w-4 text-bullish" />} items={gainers} />
        <MoversCard title="Losers kemarin" icon={<TrendingDown className="h-4 w-4 text-bearish" />} items={losers} />
      </div>
    </>
  );
}

function Disclaimer() {
  return (
    <Card className="border-dashed">
      <CardContent className="py-4 flex gap-3 items-start">
        <AlertTriangle className="h-4 w-4 text-text-tertiary mt-0.5 shrink-0" aria-hidden />
        <p className="text-xs text-text-tertiary leading-relaxed">
          <strong className="text-text-secondary">Disclaimer:</strong> Halaman ini adalah monitor pasar real-time,{" "}
          <strong className="text-text-secondary">bukan rekomendasi jual beli</strong>. Seluruh angka berasal dari data
          bursa dan indikator teknikal yang dihitung otomatis; keputusan investasi sepenuhnya tanggung jawab Anda.
          Perdagangkan saham mengandung risiko kehilangan modal.
        </p>
      </CardContent>
    </Card>
  );
}
