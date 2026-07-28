import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { subDays } from "date-fns";
import { ChevronRight, Activity, Lock } from "lucide-react";
import { stockRepository } from "@/domains/stock/stock.repository";
import { StockNotFoundError } from "@/domains/stock/stock.errors";
import { decimalToNumber } from "@/lib/serialize";
import { SITE_URL } from "@/lib/constants";
import { summarizeVerdict, computeOutlook, toSnapshot } from "@/lib/verdict-prose";

export const revalidate = 3600; // ISR — past-date rows are immutable, latest date refreshes hourly
export const dynamicParams = true;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface ArchiveData {
  tickerJK: string;
  tickerClean: string;
  name: string;
  date: Date;
  dateKey: string;
  close: number | null;
  outlook: "Bullish" | "Bearish" | "Neutral";
  prose: string;
  row: NonNullable<Awaited<ReturnType<typeof stockRepository.findIndicatorByStockAndDate>>>;
  spark: { date: Date; rsi: number | null }[];
  prevDate: Date | null;
  nextDate: Date | null;
}

async function loadArchive(tickerRaw: string, dateStr: string): Promise<ArchiveData | null> {
  if (!DATE_RE.test(dateStr)) return null;
  const date = new Date(dateStr + "T00:00:00.000Z");
  if (Number.isNaN(date.getTime())) return null;

  const tickerUpper = tickerRaw.toUpperCase();
  const tickerJK = tickerUpper.endsWith(".JK") ? tickerUpper : `${tickerUpper}.JK`;
  const tickerClean = tickerUpper.replace(/\.JK$/, "");

  const stock = await stockRepository.findStockByTicker(tickerJK);
  if (!stock) throw new StockNotFoundError(tickerJK);

  const [row, price, series] = await Promise.all([
    stockRepository.findIndicatorByStockAndDate(stock.id, date),
    stockRepository.findPriceByStockAndDate(stock.id, date),
    stockRepository.findIndicatorSeries(stock.id, subDays(date, 60)),
  ]);
  if (!row) return null;

  const snapshot = toSnapshot(row);
  const close = price ? decimalToNumber(price.close) : null;
  const outlook = computeOutlook(snapshot, close);
  const prose = summarizeVerdict(snapshot, outlook, close);

  const before = series.filter((s) => s.date.getTime() < date.getTime());
  const after = series.filter((s) => s.date.getTime() > date.getTime());
  const spark = [...before, row].slice(-30).map((s) => ({
    date: s.date,
    rsi: decimalToNumber(s.rsi14),
  }));

  return {
    tickerJK,
    tickerClean,
    name: stock.name,
    date,
    dateKey: dateStr,
    close,
    outlook,
    prose,
    row,
    spark,
    prevDate: before.length ? before[before.length - 1].date : null,
    nextDate: after.length ? after[0].date : null,
  };
}

const OUTLOOK_TONE: Record<ArchiveData["outlook"], { color: string; label: string }> = {
  Bullish: { color: "text-bullish", label: "Bullish" },
  Bearish: { color: "text-bearish", label: "Bearish" },
  Neutral: { color: "text-muted-foreground", label: "Netral" },
};

function Sparkline({ points }: { points: { date: Date; rsi: number | null }[] }) {
  const vals = points.map((p) => p.rsi).filter((v): v is number => v !== null);
  if (vals.length < 2) {
    return <p className="text-xs text-muted-foreground">Data RSI tidak cukup untuk grafik.</p>;
  }
  const w = 600;
  const h = 100;
  const pad = 6;
  const xStep = (w - pad * 2) / (vals.length - 1);
  const y = (v: number) => pad + (1 - v / 100) * (h - pad * 2);
  const d = vals.map((v, i) => `${i === 0 ? "M" : "L"}${(pad + i * xStep).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const y30 = y(30);
  const y70 = y(70);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24" preserveAspectRatio="none" aria-hidden>
      <line x1={pad} y1={y70} x2={w - pad} y2={y70} stroke="#dc262655" strokeWidth={1} strokeDasharray="4 4" />
      <line x1={pad} y1={y30} x2={w - pad} y2={y30} stroke="#0d948855" strokeWidth={1} strokeDasharray="4 4" />
      <path d={d} fill="none" stroke="currentColor" strokeWidth={2} className="text-primary" />
    </svg>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string; date: string }>;
}): Promise<Metadata> {
  const { ticker, date } = await params;
  let data: ArchiveData | null;
  try {
    data = await loadArchive(ticker, date);
  } catch {
    return {};
  }
  if (!data) return {};

  const dateDisplay = data.date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const title = `Indikator Teknikal ${data.name} (${data.tickerClean}) ${dateDisplay}`;
  const description = `${data.prose.slice(0, 150)} Riwayat indikator ${data.tickerClean} per ${dateDisplay}.`;

  return {
    title,
    description,
    alternates: { canonical: `/stocks/${data.tickerClean.toLowerCase()}/indikator/${data.dateKey}` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `${SITE_URL}/stocks/${data.tickerClean.toLowerCase()}/indikator/${data.dateKey}`,
    },
    keywords: [
      `indikator teknikal ${data.tickerClean}`,
      `rsi ${data.tickerClean} ${data.dateKey}`,
      `riwayat indikator ${data.tickerClean}`,
      `analisis teknikal ${data.tickerClean} ${dateDisplay}`,
    ],
  };
}

export default async function IndicatorArchivePage({
  params,
}: {
  params: Promise<{ ticker: string; date: string }>;
}) {
  const { ticker, date } = await params;
  let data: ArchiveData | null;
  try {
    data = await loadArchive(ticker, date);
  } catch (e) {
    if (e instanceof StockNotFoundError) notFound();
    throw e;
  }
  if (!data) notFound();

  const { tickerClean, tickerJK, name, date: d, close, outlook, prose, row, spark, prevDate, nextDate } = data;
  const tone = OUTLOOK_TONE[outlook];
  const dateDisplay = d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  const snapshot = toSnapshot(row);
  const rsiZone = snapshot.rsi14 === null ? null
    : snapshot.rsi14 <= 30 ? "Jenuh Jual"
    : snapshot.rsi14 >= 70 ? "Jenuh Beli"
    : "Zona Sehat";
  const macdDir = snapshot.macdHist === null ? null : snapshot.macdHist > 0 ? "Positif" : "Negatif";

  const fmtDateKey = (x: Date) => x.toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <nav className="mx-auto max-w-4xl px-4 py-3 text-sm text-muted-foreground">
        <ol className="flex items-center gap-1.5 flex-wrap">
          <li><Link href="/stocks" className="hover:text-foreground">Saham</Link></li>
          <ChevronRight className="h-3 w-3" />
          <li><Link href={`/stocks/${tickerJK}`} className="hover:text-foreground">{tickerClean}</Link></li>
          <ChevronRight className="h-3 w-3" />
          <li className="text-foreground font-semibold">Indikator {dateDisplay}</li>
        </ol>
      </nav>

      <header className="mx-auto max-w-4xl px-4 pb-4">
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Arsip Indikator Teknikal</p>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight">
          {name} ({tickerClean}) — {dateDisplay}
        </h1>
        {close !== null && (
          <p className="mt-1 text-sm text-muted-foreground">
            Penutupan: <span className="font-mono text-foreground">Rp{close.toLocaleString("id-ID", { minimumFractionDigits: 0 })}</span>
          </p>
        )}
      </header>

      {/* PUBLIC: date-anchored verdict prose + directional chips + sparkline (SEO core, no gated decimals) */}
      <section className="mx-auto max-w-4xl px-4 pb-6">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Verdik Teknikal {dateDisplay}</h2>
            <span className={`ml-auto text-sm font-semibold ${tone.color}`}>{tone.label}</span>
          </div>
          <p className="text-base text-foreground/90 leading-relaxed mb-4">{prose}</p>

          <div className="flex flex-wrap gap-2 mb-4 text-xs">
            {rsiZone && <span className="rounded-full bg-muted px-2.5 py-1">RSI: {rsiZone}</span>}
            {macdDir && <span className="rounded-full bg-muted px-2.5 py-1">MACD: {macdDir}</span>}
            {row.smaCrossSignal && <span className="rounded-full bg-muted px-2.5 py-1">Sinyal SMA: {row.smaCrossSignal === "golden_cross" ? "Golden Cross" : "Death Cross"}</span>}
            {row.emaCrossSignal && <span className="rounded-full bg-muted px-2.5 py-1">Sinyal EMA: {row.emaCrossSignal}</span>}
          </div>

          <div className="rounded-lg bg-background/60 p-3">
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Tren RSI 30 hari terakhir</p>
            <Sparkline points={spark} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground italic">
            Riwayat indikator per tanggal. Bukan rekomendasi transaksi.
          </p>
        </div>
      </section>

      {/* CTA: full numeric indicators live on the stock page (already login-gated there).
          Archive stays public + ISR-cacheable; this drives the freemium signup path. */}
      <section className="mx-auto max-w-4xl px-4 pb-10">
        <Link
          href={`/stocks/${tickerJK}`}
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-5 hover:border-primary/50 transition"
        >
          <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Lihat nilai indikator lengkap &amp; real-time</p>
            <p className="text-sm text-muted-foreground">RSI, MACD, SMA, EMA, Bollinger, Stochastic, ADX, ATR — di halaman saham {tickerClean}.</p>
          </div>
          <span className="text-sm font-semibold text-primary">Buka →</span>
        </Link>
      </section>

      {/* Internal links: prev/next date archive + stock page + kenapa */}
      <section className="mx-auto max-w-4xl px-4 pb-12 flex flex-wrap items-center justify-between gap-3 text-sm">
        {prevDate ? (
          <Link href={`/stocks/${tickerClean.toLowerCase()}/indikator/${fmtDateKey(prevDate)}`} className="text-muted-foreground hover:text-foreground">
            ← {prevDate.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
          </Link>
        ) : <span />}
        <Link href={`/stocks/${tickerJK}`} className="font-semibold text-primary hover:underline">Halaman {tickerClean}</Link>
        {nextDate ? (
          <Link href={`/stocks/${tickerClean.toLowerCase()}/indikator/${fmtDateKey(nextDate)}`} className="text-muted-foreground hover:text-foreground">
            {nextDate.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} →
          </Link>
        ) : <span />}
      </section>
    </div>
  );
}
