import Link from "next/link";
import { SectionHeading } from "@/components/ui/section-heading";

const features = [
  {
    title: "Screener Teknikal",
    description: "30+ strategi dari RSI Oversold hingga Golden Cross. Filter 950+ saham dalam hitungan detik.",
    href: "/stocks?view=screener",
    stat: "30+",
    statLabel: "strategi",
  },
  {
    title: "Trading Plan",
    description: "Entry, TP, dan Stop Loss otomatis berdasarkan Pivot Points & ATR. Sudah disesuaikan fraksi harga BEI.",
    href: "/stocks/BBCA.JK",
    stat: "Auto",
    statLabel: "kalkulasi",
  },
  {
    title: "Bottom Fishing Radar",
    description: "Deteksi saham oversold dengan potensi reversal. RSI, Stochastic, dan volume spike otomatis.",
    href: "/stocks?view=screener",
    stat: "Live",
    statLabel: "monitoring",
  },
  {
    title: "Chart Interaktif",
    description: "Candlestick + 12 indikator teknikal real-time. SMA, EMA, RSI, MACD, Bollinger Bands, dan lainnya.",
    href: "/stocks",
    stat: "12",
    statLabel: "indikator",
  },
];

export function PlatformFeatures() {
  return (
    <section className="space-y-5">
      <SectionHeading
        title="Fitur Platform"
        action={
          <Link href="/stocks?view=screener" className="text-xs font-medium text-accent hover:underline">
            Lihat semua fitur →
          </Link>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger-grid">
        {features.map((f, i) => (
          <Link
            key={f.title}
            href={f.href}
            style={{ "--stagger-i": i } as React.CSSProperties}
            className="feature-card p-5 block group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
                  {f.title}
                </h3>
                <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">{f.description}</p>
              </div>
              <div className="text-right shrink-0 pt-0.5">
                <p className="text-lg font-bold font-mono tabular-nums text-text-primary">
                  {f.stat}
                </p>
                <p className="text-[10px] text-text-tertiary">{f.statLabel}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
