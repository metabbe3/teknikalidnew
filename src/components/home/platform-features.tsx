import Link from "next/link";

const features = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
      </svg>
    ),
    title: "Screener Teknikal",
    description: "30+ strategi dari RSI Oversold hingga Golden Cross. Filter 900+ saham dalam hitungan detik.",
    href: "/screener",
    color: "#2563eb",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    ),
    title: "Trading Plan",
    description: "Entry, TP, dan Stop Loss otomatis berdasarkan Pivot Points & ATR. Sudah disesuaikan fraksi harga BEI.",
    href: "/stocks/BBCA.JK",
    color: "#0d9488",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
      </svg>
    ),
    title: "Bottom Fishing Radar",
    description: "Deteksi saham oversold dengan potensi reversal. RSI, Stochastic, dan volume spike otomatis.",
    href: "/screener",
    color: "#8b5cf6",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: "Chart Interaktif",
    description: "Candlestick + 12 indikator teknikal real-time. SMA, EMA, RSI, MACD, Bollinger Bands, dan lainnya.",
    href: "/stocks",
    color: "#f59e0b",
  },
];

export function PlatformFeatures() {
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-1 h-6 bg-accent rounded-full" aria-hidden="true" />
        <h2 className="text-lg font-semibold tracking-tight">Fitur Platform</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger-grid">
        {features.map((f, i) => (
          <Link
            key={f.title}
            href={f.href}
            style={{ "--stagger-i": i, "--card-accent": f.color } as React.CSSProperties}
            className="feature-card depth-shadow p-5 block"
          >
            <div className="flex items-start gap-3.5">
              <div
                className="p-2 rounded-lg shrink-0"
                style={{ background: `${f.color}12`, color: f.color }}
              >
                {f.icon}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-text-primary">{f.title}</h3>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">{f.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
