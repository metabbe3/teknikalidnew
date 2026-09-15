import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { decimalToNumber, bigIntToNumber } from "@/lib/serialize";

// Fixed signal list — order = display priority. Links are always-valid preset
// pages; staleness (fallback links for non-contextual signals) OK by design.
const SIGNALS = [
  { key: "golden_cross", href: "/saham-golden-cross", label: "Saham Golden Cross Hari Ini", desc: "MA50 baru memotong ke atas MA200 — momentum bullish jangka menengah." },
  { key: "oversold", href: "/saham-oversold", label: "Saham Oversold Hari Ini", desc: "RSI di bawah 30 — kandidat rebound teknikal." },
  { key: "volume_spike", href: "/saham-volume-spike", label: "Saham Volume Spike Hari Ini", desc: "Volume meledak >3× rata-rata 20 hari." },
  { key: "pullback_sma20", href: "/saham-pullback-sma20", label: "Saham Pullback MA20", desc: "Harga bergerak dekat MA20 — area menarik swing trader." },
] as const;

export async function RelatedSignals({ ticker }: { ticker: string | null }) {
  try {
    if (!ticker) return null;

    const stock = await prisma.stock.findUnique({ where: { ticker }, select: { id: true } });
    if (!stock) return null;

    const indicator = await prisma.stockIndicator.findFirst({
      where: { stockId: stock.id, interval: "1d" },
      orderBy: { date: "desc" },
    });
    if (!indicator) return null;

    // Latest price on the indicator's date (close for pullback, anchor for volume baseline)
    const latestPrice = await prisma.stockPrice.findFirst({
      where: { stockId: stock.id, date: indicator.date },
      orderBy: { date: "desc" },
      select: { date: true, close: true, volume: true },
    });

    const rsi14 = decimalToNumber(indicator.rsi14);
    const sma20 = decimalToNumber(indicator.sma20);
    const close = latestPrice ? decimalToNumber(latestPrice.close) : null;

    let volumeSpike = false;
    if (latestPrice) {
      const priorDates = await prisma.stockPrice.findMany({
        where: { stockId: stock.id, date: { lt: latestPrice.date } },
        orderBy: { date: "desc" },
        take: 20,
        select: { date: true },
      });
      if (priorDates.length === 20) {
        const agg = await prisma.stockPrice.aggregate({
          where: { stockId: stock.id, date: { gte: priorDates[19].date, lt: latestPrice.date } },
          _avg: { volume: true },
        });
        const avgVolume = agg._avg.volume;
        if (avgVolume && avgVolume > 0) {
          const latestVolume = bigIntToNumber(latestPrice.volume);
          volumeSpike = latestVolume !== null && latestVolume > avgVolume * 3;
        }
      }
    }

    const contextual: Record<string, boolean> = {
      golden_cross: indicator.smaCrossSignal === "golden_cross",
      oversold: rsi14 !== null && rsi14 < 30,
      volume_spike: volumeSpike,
      pullback_sma20: close !== null && sma20 !== null && Math.abs(close - sma20) / sma20 * 100 <= 3,
    };

    const keys = SIGNALS.map((s) => s.key);
    const selected = keys.filter((k) => contextual[k]).slice(0, 3);
    for (const k of keys) {
      if (selected.length >= 2) break;
      if (!selected.includes(k)) selected.push(k);
    }

    return (
      <div className="mt-8 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Sinyal Terkait</p>
        <div className="space-y-2">
          {selected.map((k) => {
            const s = SIGNALS.find((x) => x.key === k)!;
            return (
              <Link key={k} href={s.href} className="group block bg-bg-card rounded-xl depth-shadow p-4 hover:depth-shadow-hover transition-all">
                <p className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">{s.label}</p>
                <p className="text-sm text-text-secondary mt-1">{s.desc}</p>
              </Link>
            );
          })}
          <Link href="/stocks" className="group block bg-bg-card rounded-xl depth-shadow p-4 hover:depth-shadow-hover transition-all border border-border">
            <p className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">Screener Saham — semua sinyal real-time</p>
          </Link>
        </div>
      </div>
    );
  } catch {
    return null;
  }
}
