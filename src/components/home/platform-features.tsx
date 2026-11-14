import Link from "next/link";

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
    title: "Radar Saham Diskon",
    description: "Deteksi saham oversold dengan potensi reversal. RSI, Stochastic, dan volume spike otomatis.",
    href: "/bottom-fishing",
    stat: "Live",
    statLabel: "monitoring",
  },
  {
    title: "Chart Interaktif",
    description: "Candlestick + 9 indikator teknikal real-time. SMA, EMA, RSI, MACD, Bollinger Bands, dan lainnya.",
    href: "/stocks",
    stat: "9",
    statLabel: "indikator",
  },
];

export function PlatformFeatures() {
  return (
    <details className="group rounded-xl border border-border bg-bg-card p-6">
      <summary className="cursor-pointer list-none flex items-center justify-between text-text-primary font-semibold text-lg [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight text-text-primary">
            Fitur Platform
          </h2>
          <span className="text-xs text-text-tertiary font-normal">(Screener, Chart &amp; Analisa)</span>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-text-tertiary transition-transform duration-200 group-open:rotate-180 shrink-0 ml-2"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </summary>
      <div className="mt-4 pt-4 border-t border-border space-y-4">
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
        <div className="pt-2 text-center">
          <Link href="/stocks?view=screener" className="text-xs font-medium text-accent hover:underline">
            Lihat semua fitur →
          </Link>
        </div>
      </div>
    </details>
  );
}
