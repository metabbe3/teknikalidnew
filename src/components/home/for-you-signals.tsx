import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/serialize";
import { weeklySignalService } from "@/domains/stock/weekly-signal.service";
import type { Prisma } from "@/generated/prisma/client";

/**
 * First-Session Welcome Loop — day-2+ surface (PRD idea-2026-10-02-2 AC3).
 *
 * For returning logged-in users: current technical signal for each watchlist
 * ticker (same predicates as related-signals.tsx f75dd7d), falling back to
 * 3 signal-page links + weekly widget numbers when the watchlist is empty.
 *
 * Query budget (AC5): 1 watchlist read + 1 indicators read (take = 2× watchlist
 * size, capped by take 10 on watchlist) + 1 weekly-counts call (5-min cache).
 */

const SIGNAL_PAGES = [
  { href: "/saham-golden-cross", label: "Saham Golden Cross Hari Ini", desc: "MA50 baru memotong ke atas MA200 — momentum bullish." },
  { href: "/saham-oversold", label: "Saham Oversold Hari Ini", desc: "RSI di bawah 30 — kandidat rebound." },
  { href: "/saham-volume-spike", label: "Saham Volume Spike Hari Ini", desc: "Volume >3× rata-rata 20 hari." },
] as const;

type Tone = "bull" | "bear" | "neutral";
type IndicatorRow = Prisma.StockIndicatorGetPayload<{ select: { smaCrossSignal: true; rsi14: true } }>;

function signalFor(
  ind: IndicatorRow | null
): { label: string; tone: Tone } | null {
  if (!ind) return null;
  if (ind.smaCrossSignal === "golden_cross")
    return { label: "Golden Cross", tone: "bull" };
  if (ind.smaCrossSignal === "death_cross")
    return { label: "Death Cross", tone: "bear" };
  const rsi = decimalToNumber(ind.rsi14);
  if (rsi !== null && rsi < 30) return { label: "Oversold", tone: "neutral" };
  return null;
}

type ForYouData =
  | { kind: "watchlist"; rows: { ticker: string; signal: { label: string; tone: Tone } | null }[] }
  | { kind: "fallback"; weekly: { gcCount: number; dcCount: number } | null };

async function deriveForYou(userId: string): Promise<ForYouData | null> {
  const rows = await prisma.watchlist.findMany({
    where: { userId },
    select: { stockTicker: true, stock: { select: { id: true } } },
    take: 10,
    orderBy: { createdAt: "asc" },
  });

  if (rows.length === 0) {
    const weekly = await weeklySignalService
      .getWeeklySignalCounts()
      .catch(() => null);
    return {
      kind: "fallback",
      weekly: weekly ? { gcCount: weekly.gcCount, dcCount: weekly.dcCount } : null,
    };
  }

  // Latest 1d indicator per watched stock (orderBy date desc + first-wins dedupe).
  const indicators = await prisma.stockIndicator.findMany({
    where: { stockId: { in: rows.map((r) => r.stock.id) }, interval: "1d" },
    orderBy: [{ stockId: "asc" }, { date: "desc" }],
    select: { stockId: true, smaCrossSignal: true, rsi14: true },
    take: rows.length * 2, // head-room; dedupe below keeps first (newest) per stock
  });
  const latestByStock = new Map<number, IndicatorRow>();
  for (const ind of indicators) {
    if (!latestByStock.has(ind.stockId)) latestByStock.set(ind.stockId, ind);
  }

  return {
    kind: "watchlist",
    rows: rows.map((r) => ({
      ticker: r.stockTicker,
      signal: signalFor(latestByStock.get(r.stock.id) ?? null),
    })),
  };
}

export async function ForYouSignals({ userId }: { userId: string }) {
  // Derive inside try/catch (data only, no JSX); render below is pure.
  let data: ForYouData | null = null;
  try {
    data = await deriveForYou(userId);
  } catch {
    data = null;
  }

  // Empty-state guarantee: any derive failure hides the panel, never errors the home page.
  if (!data) return null;

  if (data.kind === "fallback") {
    return (
      <section aria-label="Sinyal untukmu" className="rounded-xl border border-border bg-bg-card p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-1">Sinyal untukmu</h3>
        <p className="text-xs text-text-tertiary mb-4">
          Tambahkan saham ke watchlist untuk sinyal personal.
          {data.weekly ? (
            <>
              {" "}Minggu ini:{" "}
              <Link href="/saham-golden-cross" className="font-semibold text-bullish hover:underline">
                {data.weekly.gcCount} golden cross
              </Link>
              {" / "}
              <Link href="/saham-death-cross" className="font-semibold text-bearish hover:underline">
                {data.weekly.dcCount} death cross
              </Link>
              .
            </>
          ) : null}
        </p>
        <ul className="space-y-2">
          {SIGNAL_PAGES.map((s) => (
            <li key={s.href}>
              <Link href={s.href} className="group block rounded-lg px-3 py-2.5 bg-bg-hover/60 hover:bg-bg-hover transition-all">
                <span className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors">{s.label}</span>
                <span className="block text-xs text-text-secondary mt-0.5">{s.desc}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section aria-label="Sinyal untukmu" className="rounded-xl border border-border bg-bg-card p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-3">Sinyal untukmu</h3>
      <ul className="space-y-2">
        {data.rows.map((r) => (
          <li key={r.ticker}>
            <Link href={`/stocks/${r.ticker}`} className="group flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 bg-bg-hover/60 hover:bg-bg-hover transition-all">
              <span className="font-mono text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
                {r.ticker.replace(".JK", "")}
              </span>
              {r.signal ? (
                <span
                  className={`text-xs font-semibold ${
                    r.signal.tone === "bull" ? "text-bullish" : r.signal.tone === "bear" ? "text-bearish" : "text-text-secondary"
                  }`}
                >
                  {r.signal.label}
                </span>
              ) : (
                <span className="text-xs text-text-tertiary">Netral — lihat chart</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-text-tertiary">
        <Link href="/watchlist" className="text-accent hover:underline">Kelola watchlist →</Link>
      </p>
    </section>
  );
}
