import Link from "next/link";

const features = [
  {
    title: "Screener Teknikal",
    description: "30+ strategi dari RSI Oversold hingga Golden Cross. Filter 900+ saham dalam hitungan detik.",
    href: "/screener",
    color: "#2563eb",
    stat: "30+",
    statLabel: "strategi",
  },
  {
    title: "Trading Plan",
    description: "Entry, TP, dan Stop Loss otomatis berdasarkan Pivot Points & ATR. Sudah disesuaikan fraksi harga BEI.",
    href: "/stocks/BBCA.JK",
    color: "#0d9488",
    stat: "Auto",
    statLabel: "kalkulasi",
  },
  {
    title: "Bottom Fishing Radar",
    description: "Deteksi saham oversold dengan potensi reversal. RSI, Stochastic, dan volume spike otomatis.",
    href: "/screener",
    color: "#8b5cf6",
    stat: "Live",
    statLabel: "monitoring",
  },
  {
    title: "Chart Interaktif",
    description: "Candlestick + 12 indikator teknikal real-time. SMA, EMA, RSI, MACD, Bollinger Bands, dan lainnya.",
    href: "/stocks",
    color: "#f59e0b",
    stat: "12",
    statLabel: "indikator",
  },
];

export function PlatformFeatures() {
  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-text-primary">Fitur Platform</h2>
        <Link href="/screener" className="text-xs font-medium text-accent hover:underline">
          Lihat semua fitur →
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger-grid">
        {features.map((f, i) => (
          <Link
            key={f.title}
            href={f.href}
            style={{ "--stagger-i": i, "--card-accent": f.color } as React.CSSProperties}
            className="feature-card depth-shadow p-5 block group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
                  {f.title}
                </h3>
                <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">{f.description}</p>
              </div>
              <div className="text-right shrink-0 pt-0.5">
                <p className="text-lg font-bold font-mono tabular-nums" style={{ color: f.color }}>
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
