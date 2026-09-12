import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { subDays } from "date-fns";
import { ChevronRight, Activity, Lock, TrendingUp } from "lucide-react";
import { stockRepository } from "@/domains/stock/stock.repository";
import { StockNotFoundError } from "@/domains/stock/stock.errors";
import { decimalToNumber } from "@/lib/serialize";
import { SITE_URL } from "@/lib/constants";
import { summarizeVerdict, toSnapshot, type Outlook } from "@/lib/verdict-prose";

export const revalidate = 3600; // ISR — past rows immutable, latest day refreshes hourly

interface IndicatorRow {
  date: Date;
  signalLabel: string | null;
  rsi14: unknown;
  macdHist: unknown;
  smaCrossSignal: string | null;
  emaCrossSignal: string | null;
  obvTrend: string | null;
  sma20: unknown; sma50: unknown; sma200: unknown; stochK: unknown; adx: unknown;
}

function outlookFromLabel(label: string | null | undefined): Outlook {
  if (!label) return "Neutral";
  const l = label.toLowerCase();
  if (l.includes("bullish")) return "Bullish";
  if (l.includes("bearish")) return "Bearish";
  return "Neutral";
}

const OUTLOOK_COLOR: Record<Outlook, string> = {
  Bullish: "text-bullish",
  Bearish: "text-bearish",
  Neutral: "text-muted-foreground",
};

function RsiSparkline({ rows }: { rows: { date: Date; rsi: number | null }[] }) {
  const vals = rows.map((r) => r.rsi).filter((v): v is number => v !== null);
  if (vals.length < 2) return <p className="text-xs text-muted-foreground">Data RSI belum cukup.</p>;
  const w = 600; const h = 80; const pad = 6;
  const xStep = (w - pad * 2) / (vals.length - 1);
  const y = (v: number) => pad + (1 - v / 100) * (h - pad * 2);
  const d = vals.map((v, i) => `${i === 0 ? "M" : "L"}${(pad + i * xStep).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20" preserveAspectRatio="none" aria-hidden>
      <line x1={pad} y1={y(70)} x2={w - pad} y2={y(70)} stroke="#dc262655" strokeWidth={1} strokeDasharray="4 4" />
      <line x1={pad} y1={y(30)} x2={w - pad} y2={y(30)} stroke="#0d948855" strokeWidth={1} strokeDasharray="4 4" />
      <path d={d} fill="none" stroke="currentColor" strokeWidth={2} className="text-primary" />
    </svg>
  );
}

async function loadHistory(tickerRaw: string) {
  const tickerUpper = tickerRaw.toUpperCase();
  const tickerJK = tickerUpper.endsWith(".JK") ? tickerUpper : `${tickerUpper}.JK`;
  const tickerClean = tickerUpper.replace(/\.JK$/, "");

  const stock = await stockRepository.findStockByTicker(tickerJK);
  if (!stock) throw new StockNotFoundError(tickerJK);

  const rows = await stockRepository.findIndicatorSeries(stock.id, subDays(new Date(), 900));
  if (rows.length === 0) return null;

  return { tickerJK, tickerClean, name: stock.name, rows: rows as unknown as IndicatorRow[] };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const { ticker } = await params;
  let data;
  try { data = await loadHistory(ticker); } catch { return {}; }
  if (!data) return {};

  const title = `Riwayat Indikator Teknikal ${data.name} (${data.tickerClean})`;
  const description = `Arsip riwayat indikator teknikal ${data.name} (${data.tickerClean}) — verdik sinyal harian RSI, MACD, SMA, EMA, dan crossing historis.`;
  return {
    title,
    description,
    alternates: { canonical: `/stocks/${data.tickerClean.toLowerCase()}/indikator` },
    openGraph: {
      title, description, type: "article",
      url: `${SITE_URL}/stocks/${data.tickerClean.toLowerCase()}/indikator`,
    },
    keywords: [
      `riwayat indikator ${data.tickerClean}`,
      `histori indikator teknikal ${data.tickerClean}`,
      `arsip rsi ${data.tickerClean}`,
      `sinyal teknikal ${data.tickerClean} hari ini`,
    ],
  };
}

export default async function IndicatorHistoryPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  let data;
  try { data = await loadHistory(ticker); }
  catch (e) { if (e instanceof StockNotFoundError) notFound(); throw e; }
  if (!data) notFound();

  const { tickerClean, tickerJK, name, rows } = data;
  const ordered = [...rows].sort((a, b) => b.date.getTime() - a.date.getTime());
  const earliest = rows[0].date;
  const latest = rows[rows.length - 1].date;
  const spark = rows.map((r) => ({ date: r.date, rsi: decimalToNumber(r.rsi14 as never) }));

  return (
    <div className="min-h-screen bg-background">
      <nav className="mx-auto max-w-4xl px-4 py-3 text-sm text-muted-foreground">
        <ol className="flex items-center gap-1.5 flex-wrap">
          <li><Link href="/stocks" className="hover:text-foreground">Saham</Link></li>
          <ChevronRight className="h-3 w-3" />
          <li><Link href={`/stocks/${tickerJK}`} className="hover:text-foreground">{tickerClean}</Link></li>
          <ChevronRight className="h-3 w-3" />
          <li className="text-foreground font-semibold">Riwayat Indikator</li>
        </ol>
      </nav>

      <header className="mx-auto max-w-4xl px-4 pb-4">
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Arsip Indikator Teknikal</p>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight">Riwayat Indikator {name} ({tickerClean})</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {rows.length} hari · {earliest.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} – {latest.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
        </p>
      </header>

      {/* RSI trajectory (public, visual) */}
      <section className="mx-auto max-w-4xl px-4 pb-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Tren RSI selama tersedia</p>
          <RsiSparkline rows={spark} />
        </div>
      </section>

      {/* Public history table — server-rendered rows, one anchor per date (the SEO core) */}
      <section className="mx-auto max-w-4xl px-4 pb-6">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="font-bold">Verdik Sinyal Harian</h2>
          </div>
          <ul>
            {ordered.map((r) => {
              const snap = toSnapshot({
                rsi14: r.rsi14 as never, macdHist: r.macdHist as never,
                sma20: r.sma20 as never, sma50: r.sma50 as never, sma200: r.sma200 as never,
                stochK: r.stochK as never, adx: r.adx as never,
                obvTrend: r.obvTrend, signalLabel: r.signalLabel,
                smaCrossSignal: r.smaCrossSignal, emaCrossSignal: r.emaCrossSignal,
              });
              const outlook = outlookFromLabel(r.signalLabel);
              const prose = summarizeVerdict(snap, outlook, null);
              const dateKey = r.date.toISOString().slice(0, 10);
              const rsi = decimalToNumber(r.rsi14 as never);
              const macd = decimalToNumber(r.macdHist as never);
              const rsiZone = rsi === null ? null : rsi <= 30 ? "Jenuh Jual" : rsi >= 70 ? "Jenuh Beli" : "Sehat";
              return (
                <li key={dateKey} id={dateKey} className="border-b border-border/60 last:border-0 px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">
                      {r.date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <span className={`text-xs font-semibold ${OUTLOOK_COLOR[outlook]}`}>
                      {r.signalLabel ?? outlook}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90">{prose}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                    {rsiZone && <span className="rounded bg-muted px-1.5 py-0.5">RSI: {rsiZone}</span>}
                    {macd !== null && <span className="rounded bg-muted px-1.5 py-0.5">MACD: {macd > 0 ? "Positif" : "Negatif"}</span>}
                    {r.smaCrossSignal && <span className="rounded bg-muted px-1.5 py-0.5">{r.smaCrossSignal === "golden_cross" ? "Golden Cross" : "Death Cross"}</span>}
                    {r.emaCrossSignal && <span className="rounded bg-muted px-1.5 py-0.5">EMA {r.emaCrossSignal}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Gated CTA — full numeric values live on the stock page (freemium) */}
      <section className="mx-auto max-w-4xl px-4 pb-10">
        <Link
          href={`/stocks/${tickerJK}`}
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-5 hover:border-primary/50 transition"
        >
          <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Lihat nilai numerik indikator lengkap</p>
            <p className="text-sm text-muted-foreground">RSI, MACD, SMA, EMA, Bollinger, Stochastic, ADX real-time di halaman saham {tickerClean}.</p>
          </div>
          <span className="text-sm font-semibold text-primary">Buka →</span>
        </Link>
      </section>

      {/* Internal links */}
      <section className="mx-auto max-w-4xl px-4 pb-12 flex flex-wrap gap-4 text-sm">
        <Link href={`/stocks/${tickerJK}`} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
          <TrendingUp className="h-4 w-4" /> Halaman {tickerClean}
        </Link>
        <Link href={`/saham/${tickerClean.toLowerCase()}/kenapa-naik-hari-ini`} className="text-muted-foreground hover:text-foreground">
          Kenapa naik/turun hari ini →
        </Link>
      </section>
    </div>
  );
}
