import { signalLabelId } from "@/lib/signal-label-id";
import type { Metadata } from "next";
import { RadarSection } from "./radar-section";
import Link from "next/link";
import { StockLogo } from "@/components/stock/stock-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHero } from "@/components/layout/page-hero";
import dynamicImport from "next/dynamic";

// Owner 30 Okt: tanya AI langsung dari /pasar (halaman traffic #1) — mode MARKET
const ScreenerAiButton = dynamicImport(
  () => import("@/components/screener/screener-ai-modal").then((m) => ({ default: m.ScreenerAiButton })),
  { loading: () => <span className="inline-block h-[34px] w-[120px] animate-pulse rounded-full" /> },
);
import { pasarLiveService, isLiveWindow, isMarketHours, wibNow, wibHHMM, type PasarTopSignal, type PasarForeignItem, isWibWeekday } from "@/domains/stock/pasar-live.service";
import { marketSnapshotService } from "@/domains/stock/market-snapshot.service";
import { dateLabel, formatPrice, formatPercent, formatVolume, stripJk  } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { WibClock } from "./wib-clock";
import { AlertTriangle, Clock, Moon, Newspaper, TrendingDown, TrendingUp, Zap } from "lucide-react";

/**
 * /pasar — Koran Saham Live (PRD prd-pasar-live-01).
 * HARI INI saja: snapshot market live, bukan arsip. Sebelum 06:30 / off-hours
 * tampil "pasar belum buka" + rekap kemarin. Recap permanen = artikel
 * brief-pasar-YYYY-MM-DD (jalur existing), bukan halaman ini.
 *
 * SEO policy: NOINDEX — konten berubah tiap jam, tidak ada keyword stabil.
 * /pasar = retention, artikel = acquisition (spec.seo_policy).
 *
 * Tuning 28 Okt (deploy owner-directed): ISR DICOBA lalu DIBATALKAN — build gagal
 * (prerender butuh DB) + RCA 17 Okt: ISR di stack ini tak beregenerasi di prod.
 * Optimasi jalan: cache data 60s di pasar-live.service (lihat cachedSnapshot),
 * halaman tetap force-dynamic — TTFB turun tanpa risiko halaman beku.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Koran Saham Live — Pasar IDX Hari Ini",
  description:
    "Pasar IDX real-time hari ini: IHSG live, watchlist sinyal teknikal, top movers, dan berita emiten — update sepanjang sesi.",
  alternates: { canonical: "/pasar" },
  robots: { index: false, follow: true },
};

function ChangeBadge({ pct, className }: { pct: number | null; className?: string }) {
  if (pct === null) return <span className={cn("text-sm tabular-nums text-text-tertiary", className)}>—</span>;
  return (
    <span className={cn("text-sm font-semibold tabular-nums", pct >= 0 ? "text-bullish" : "text-bearish", className)}>
      {formatPercent(pct)}
    </span>
  );
}

export default async function PasarPage() {
  const live = isLiveWindow();
  const marketOpen = isMarketHours();
  const nowWib = wibNow();
  const preOpen = !live && wibHHMM(nowWib) < 630;  // 00:00-06:29 = pre-open (fix: 06:00-06:29 sempat jatuh ke 'weekend')
  const weekend = !live && !preOpen && !isWibWeekday(nowWib);
  // Pasca-close hari bursa (Jumat 18:30–24:00 dst.): data rekap = sesi HARI INI, bukan "belum buka".
  const afterClose = !live && isWibWeekday(nowWib) && wibHHMM(nowWib) >= 1830;

  // ── Pre-open / weekend: rekap kemarin (cheap path, no news fetch) ──
  if (!live) {
    const recap = await pasarLiveService.getYesterdayRecap();
    // Extreme-session badge (ceo-idea 17 Okt) — same criteria as /saham-oversold.
    // code-audit-tk-1: SATU PINTU marketSnapshotService (dulu inline duplikat).
    const oversoldCountWeekend = await marketSnapshotService.getOversoldCount();
    return (
      <>
        <PageHero
          eyebrow="Live"
          title="Koran Saham Live"
          description={
            weekend
              ? "Akhir pekan — bursa tutup. Rekap sesi Jumat terakhir di bawah ini."
              : afterClose
                ? "Pasar sudah tutup — rekap sesi hari ini di bawah ini."
                : "Pasar belum buka — rekap sesi terakhir di bawah ini. Live update mulai 06:30 WIB."
          }
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg px-3 py-1 text-sm font-medium">
              <Moon className="inline h-4 w-4" /> {weekend ? "Bursa tutup (akhir pekan)" : afterClose ? "Pasar sudah tutup" : "Pasar belum buka"}
            </span>
            <WibClock />
            <span className="text-text-tertiary text-sm">·</span>
            <span className="text-sm text-text-tertiary">
              Tanya kondisi pasar? <ScreenerAiButton />
            </span>
            {oversoldCountWeekend >= 150 && (
              <Link
                href="/saham-oversold"
                className="inline-flex items-center gap-1.5 rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1 text-sm font-semibold text-red-600 hover:bg-red-500/15 transition-colors"
              >
                <Zap className="inline h-4 w-4" /> Sesi Ekstrem: {oversoldCountWeekend} saham oversold
              </Link>
            )}
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
          {afterClose && (
            <Card>
              <CardContent className="text-sm text-muted-foreground py-4">
                Pasar sudah tutup hari ini — berikut rekap sesi terakhir.
              </CardContent>
            </Card>
          )}
          <RecapBlock
            ihsg={recap.ihsg}
            topSignals={recap.topSignals}
            foreign={recap.foreign}
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
  // Extreme-session badge (ceo-idea 17 Okt) — same criteria as /saham-oversold.
  // code-audit-tk-1: SATU PINTU marketSnapshotService (dulu inline duplikat).
  const oversoldCount = await marketSnapshotService.getOversoldCount();

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
            {marketOpen ? "● PASAR BUKA" : "○ di luar sesi"}
          </span>
          <WibClock />
          <span className="text-text-tertiary text-sm">·</span>
          <span className="text-sm text-text-tertiary">
            Bingung sama pasar? <ScreenerAiButton />
          </span>
          {oversoldCount >= 150 && (
            <Link
              href="/saham-oversold"
              className="inline-flex items-center gap-1.5 rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1 text-sm font-semibold text-red-600 hover:bg-red-500/15 transition-colors"
            >
              <Zap className="inline h-4 w-4" /> Sesi Ekstrem: {oversoldCount} saham oversold
            </Link>
          )}
          {snap.sessionDate && (
            <span className="text-sm text-text-tertiary font-mono">sesi data {dateLabel(snap.sessionDate)}</span>
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
            <span className="text-xs text-text-tertiary">sinyal teknikal non-gorengan · likuiditas ≥ Rp1 miliar</span>
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

        {/* ── Top-20 Skor Sinyal (usp-2026-10-24-02) ── */}
        <TopSignalsSection items={snap.topSignals} sessionDate={snap.sessionDate} />

        {/* ── Radar Sinyal (retention-2026-10-28) ── */}
        <RadarSection />

        {/* ── Aliran Dana Asing (usp-2026-10-24-04) ── */}
        <ForeignFlowSection foreign={snap.foreign} />

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
                  <StockLogo name={m.name} ticker={m.ticker} size={22} />
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
  topSignals,
  foreign,
  gainers,
  losers,
  sessionDate,
}: {
  ihsg: { close: number | null; changePercent: number | null; change: number | null };
  topSignals: PasarTopSignal[];
  foreign: { netBuy: PasarForeignItem[]; netSell: PasarForeignItem[] };
  gainers: { ticker: string; close: number | null; changePercent: number | null; volumeShares: number | null; name: string }[];
  losers: { ticker: string; close: number | null; changePercent: number | null; volumeShares: number | null; name: string }[];
  sessionDate: string | null;
}) {
  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">IHSG — sesi {dateLabel(sessionDate)}</CardTitle>
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
        <MoversCard title={`Gainers — sesi ${sessionDate ? new Date(sessionDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "terakhir"}`} icon={<TrendingUp className="h-4 w-4 text-bullish" />} items={gainers} />
        <MoversCard title={`Losers — sesi ${sessionDate ? new Date(sessionDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "terakhir"}`} icon={<TrendingDown className="h-4 w-4 text-bearish" />} items={losers} />
      </div>
      <TopSignalsSection items={topSignals} sessionDate={sessionDate} />

        {/* ── Radar Sinyal (retention-2026-10-28) ── */}
        <RadarSection />
      <ForeignFlowSection foreign={foreign} />
    </>
  );
}

/**
 * Aliran dana asing sesi terakhir (usp-2026-10-24-04): Top-10 net beli + net jual.
 * Net = beli − jual (Rp). Edukasi: jejak asing = konteks, bukan sinyal beli/jual.
 */
function ForeignFlowSection({ foreign }: { foreign: { netBuy: PasarForeignItem[]; netSell: PasarForeignItem[] } }) {
  if (foreign.netBuy.length === 0 && foreign.netSell.length === 0) return null;
  const fmtRp = (n: number) => {
    const abs = Math.abs(n);
    const s = abs >= 1_000_000_000_000 ? `${(abs / 1_000_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} T`
      : abs >= 1_000_000_000 ? `${(abs / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} mlr`
      : `${(abs / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 0 })} jt`;
    return `${n < 0 ? "−" : ""}Rp${s}`;
  };
  const Row = ({ t }: { t: PasarForeignItem }) => (
    <li>
      <Link href={`/stocks/${t.ticker}`} className="flex items-center gap-3 py-2 group">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold group-hover:text-accent">{stripJk(t.ticker)}</span>
          <span className="block text-xs text-text-tertiary truncate">{t.name}</span>
        </span>
        <span className={`text-sm font-mono tabular-nums ${t.netValue >= 0 ? "text-bullish" : "text-bearish"}`}>{fmtRp(t.netValue)}</span>
      </Link>
    </li>
  );
  return (
    <section aria-labelledby="foreign-heading">
      <div className="flex items-baseline justify-between mb-3">
        <h2 id="foreign-heading" className="text-lg font-semibold">Aliran Dana Asing</h2>
        <span className="text-xs text-text-tertiary">net beli − jual · sesi terakhir</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Top Net Beli Asing 🟢</CardTitle></CardHeader>
          <CardContent><ul className="divide-y divide-border">{foreign.netBuy.map((t) => <Row key={t.ticker} t={t} />)}</ul></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Top Net Jual Asing 🔴</CardTitle></CardHeader>
          <CardContent><ul className="divide-y divide-border">{foreign.netSell.map((t) => <Row key={t.ticker} t={t} />)}</ul></CardContent>
        </Card>
      </div>
      <p className="mt-2 text-xs text-text-tertiary">
        Net asing = nilai beli asing − jual asing per sesi. Jejak dana institusi asing adalah konteks informasi — bukan rekomendasi beli/jual.
      </p>
    </section>
  );
}

/**
 * Top-20 Skor Sinyal harian (usp-2026-10-24-02, owner-directed 24 Okt).
 * Ranking skor sinyal teknikal universe non-gorengan + liquidity floor Rp1B —
 * pola "skor komposit" kompetitor, tapi dari skor sendiri yang bisa ditelusuri
 * ke halaman saham. Edukasi: skor = rangkuman indikator, bukan rekomendasi.
 */
function TopSignalsSection({ items, sessionDate }: { items: PasarTopSignal[]; sessionDate: string | null }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="topsignals-heading">
      <div className="flex items-baseline justify-between mb-3">
        <h2 id="topsignals-heading" className="text-lg font-semibold">Top-20 Skor Sinyal</h2>
        <span className="text-xs text-text-tertiary">sesi {dateLabel(sessionDate)} · non-gorengan · likuid ≥ Rp1 miliar</span>
      </div>
      <Card>
        <CardContent className="py-2">
          <ul className="divide-y divide-border">
            {items.map((t, i) => (
              <li key={t.ticker}>
                <Link href={`/stocks/${t.ticker}`} className="flex items-center gap-3 py-2.5 group">
                  <span className="w-5 text-xs text-text-tertiary tabular-nums">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold group-hover:text-accent">{stripJk(t.ticker)}</span>
                    <span className="block text-xs text-text-tertiary truncate">{t.name}</span>
                  </span>
                  <span className="text-right">
                    <span className="block text-sm font-mono tabular-nums">{t.close !== null ? formatPrice(t.close) : "—"}</span>
                    {t.volumeShares !== null && <span className="block text-xs text-text-tertiary">vol {formatVolume(t.volumeShares)}</span>}
                  </span>
                  <ChangeBadge pct={t.changePercent} className="w-20 text-right" />
                  <span
                    className="w-24 text-right text-xs font-semibold tabular-nums"
                    title={`Skor sinyal ${t.signalScore !== null ? t.signalScore.toFixed(2) : "—"} — rangkuman indikator teknikal, bukan rekomendasi. Catatan: skor teknikal ≠ pergerakan harga hari ini — saham bisa turun hari ini walau skornya kuat.`}
                  >
                    {t.signalScore !== null ? t.signalScore.toFixed(2) : "—"}
                    {t.signalLabel && <span className="block text-[10px] font-normal text-text-tertiary">{signalLabelId(t.signalLabel)}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <p className="mt-2 text-xs text-text-tertiary">
        Skor sinyal (−1 s.d. +1) adalah rangkuman otomatis indikator teknikal — bukan rekomendasi beli. Klik emiten untuk melihat rincian indikator di balik skornya.
      </p>
    </section>
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
