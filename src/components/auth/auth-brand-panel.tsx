import { CandlestickChart, Gauge, ScanLine, Target, ShieldCheck } from "lucide-react";

const VALUE_BULLETS = [
  { icon: Gauge, title: "Sinyal otomatis", desc: "12 indikator teknikal dihitung otomatis jadi satu skor sinyal." },
  { icon: ScanLine, title: "Screener 956+ saham", desc: "Golden cross, oversold, volume spike — tersaring dalam detik." },
  { icon: Target, title: "Trading plan siap pakai", desc: "Entry, stop loss, dan take profit dari pivot & ATR." },
  { icon: CandlestickChart, title: "Paper trading gratis", desc: "Latihan trading tanpa risiko uang asli." },
];

/**
 * AuthBrandPanel — editorial value-remind panel for the auth split layout.
 * Turns a bare form-in-void into a conversion experience: benefit headline,
 * value bullets, trust signals, and a stylized signal-card preview.
 */
export function AuthBrandPanel() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-text-primary text-white p-8 sm:p-10 h-full flex flex-col justify-between">
      {/* texture */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        aria-hidden
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)", backgroundSize: "20px 20px" }}
      />
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-bullish/20 blur-3xl pointer-events-none" aria-hidden />

      <div className="relative">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-white/60">
          <span className="h-1.5 w-1.5 rounded-full bg-bullish animate-pulse" aria-hidden />
          TeknikalID
        </div>
        <h2 className="mt-5 font-serif text-3xl sm:text-4xl font-semibold leading-[1.08] tracking-tight">
          Analisa teknikal saham IDX yang bikin trading makin{" "}
          <span className="text-bullish">tajam.</span>
        </h2>
        <p className="mt-3 text-sm text-white/70 max-w-md leading-relaxed">
          Ribuan trader Indonesia pakai TeknikalID untuk menemukan peluang dan menghindari jebakan — tanpa nebak-nebak.
        </p>

        <ul className="mt-8 space-y-4">
          {VALUE_BULLETS.map((v) => (
            <li key={v.title} className="flex items-start gap-3">
              <span className="shrink-0 mt-0.5 grid place-items-center h-8 w-8 rounded-lg bg-white/10 border border-white/10">
                <v.icon className="h-4 w-4 text-white/80" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold leading-tight">{v.title}</p>
                <p className="text-xs text-white/60 mt-0.5 leading-relaxed">{v.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Stylized signal-card preview */}
      <div className="relative mt-8 rounded-xl bg-white/[0.06] border border-white/10 p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-sm font-bold">BBCA</p>
            <p className="text-[11px] text-white/50">Bank Central Asia</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-bullish/20 text-bullish">
            <span className="h-1.5 w-1.5 rounded-full bg-bullish" /> Bullish
          </span>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="font-mono text-xl font-bold tabular-nums">9.575</p>
            <p className="font-mono text-xs font-semibold text-bullish">▲ +2.34%</p>
          </div>
          <div className="flex items-end gap-[3px] h-8" aria-hidden>
            {[40, 55, 48, 62, 58, 70, 65, 80, 76, 92].map((h, i) => (
              <span key={i} className="w-[3px] rounded-full bg-bullish/60" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>

      <div className="relative mt-6 flex items-center gap-2 text-xs text-white/60">
        <ShieldCheck className="h-4 w-4 text-white/80" aria-hidden />
        Gratis · Tanpa kartu kredit · Kami tidak menjual data Anda.
      </div>
    </div>
  );
}
