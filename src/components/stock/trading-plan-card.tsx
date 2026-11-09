import type { TradingPlan } from "@/lib/trading-plan";
import type { McResult } from "@/lib/monte-carlo";
import { formatRp } from "@/lib/utils";

const confidenceStyles = {
  high: "bg-bullish-bg text-bullish",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-bg-hover text-text-tertiary",
};

const confidenceLabels = {
  high: "Tinggi",
  medium: "Sedang",
  low: "Rendah",
};

export function TradingPlanCard({ plan, mc }: { plan: TradingPlan; mc?: McResult | null }) {
  const isBOW = plan.strategy === "BUY_ON_WEAKNESS";
  const isWaitAndSee = plan.strategy === "WAIT_AND_SEE";
  // Audit UI/UX #3b (30 Okt): setup layak = bukan wait&see, R:R ≥ 1, EV ≥ 0 — angka hijau besar
  // hanya utk setup layak; selain itu netral + warning eksplisit (anti-mislead pemula).
  const setupLayak = !isWaitAndSee && plan.riskReward >= 1 && (mc?.evPerShare ?? 0) >= 0;

  const allWarnings: { text: string; isSim?: boolean }[] = [
    ...plan.warnings.map((w) => ({ text: w, isSim: false })),
    ...(mc && !setupLayak
      ? [
          {
            text: `Setup belum layak (Rugi : Untung 1 : ${plan.riskReward.toFixed(1).replace(".", ",")}) — angka peluang di atas hanya simulasi statistik, bukan sinyal entry.`,
            isSim: true,
          },
        ]
      : []),
  ];

  return (
    <div className={`depth-shadow rounded-xl border overflow-hidden ${isWaitAndSee ? "border-bearish/30" : "border-border"}`}>
      <div className="p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Rencana Trading: Area Beli, Target &amp; Cut Loss</h2>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-text-tertiary flex-wrap">
            <span>Sumber: Pivot &amp; ATR</span>
            <span aria-hidden="true">·</span>
            {isWaitAndSee && (
              <>
                <span className="font-semibold text-bearish">Tunggu dulu</span>
                <span aria-hidden="true">·</span>
              </>
            )}
            {isBOW && (
              <>
                <span className="font-semibold text-amber-700 dark:text-amber-400">Antri Beli (BOW)</span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span>
              Keyakinan:{" "}
              <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${confidenceStyles[plan.confidence]}`}>
                {confidenceLabels[plan.confidence]}
              </span>
            </span>
          </div>
        </div>

        {plan.suggestion && (
          <div className={`flex items-start gap-1.5 ${isWaitAndSee ? "bg-bearish/10 -mx-1 px-2.5 py-2 rounded-lg" : isBOW ? "bg-amber-500/10 -mx-1 px-2.5 py-2 rounded-lg" : "bg-bg-hover -mx-1 px-2.5 py-2 rounded-lg"}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`shrink-0 mt-0.5 ${isWaitAndSee ? "text-bearish" : isBOW ? "text-amber-500" : "text-text-tertiary"}`} aria-hidden="true">
              {isWaitAndSee ? (
                <>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </>
              ) : (
                <>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </>
              )}
            </svg>
            <p className={`text-[11px] leading-snug ${isWaitAndSee ? "text-bearish font-medium" : isBOW ? "text-amber-800 font-medium" : "text-text-secondary"}`}>
              {plan.suggestion}
            </p>
          </div>
        )}

        <div className="h-px bg-border/60" />

        {(isBOW || isWaitAndSee) && plan.marketEntryPrice && (
          <div className={`flex items-center justify-between px-1 py-1.5 rounded-md border ${isWaitAndSee ? "bg-red-50 border-red-200/60" : "bg-amber-50 border-amber-200/60"}`}>
            <span className={`text-[10px] ${isWaitAndSee ? "text-red-700" : "text-amber-700"}`}>Harga pasar saat ini</span>
            <span className={`text-[11px] font-mono font-semibold ${isWaitAndSee ? "text-red-800" : "text-amber-800"}`}>{formatRp(plan.marketEntryPrice)}</span>
          </div>
        )}

        <div className={`space-y-2 ${isWaitAndSee ? "opacity-50" : ""}`}>
          {/* owner 10 Nov: Entry/TP/SL dipadatkan jadi grid 3 kolom — 1 lihat, angka besar berwarna */}
          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded-lg bg-accent/10 border border-accent/40 px-2 py-2 flex flex-col items-center justify-center text-center min-h-[56px]">
              <span className="text-[10px] font-medium text-text-secondary leading-tight">Beli di</span>
              <span className="text-[13px] sm:text-sm font-mono tabular-nums font-bold text-accent leading-tight">{formatRp(plan.entry)}</span>
              {plan.entryZone && <span className="text-[9px] text-text-tertiary leading-tight">{plan.entryZone}</span>}
            </div>
            <div className="rounded-lg bg-bullish/15 border border-bullish/40 px-2 py-2 flex flex-col items-center justify-center text-center min-h-[56px]">
              <span className="text-[10px] font-medium text-text-secondary leading-tight">Target</span>
              <span className="text-[13px] sm:text-sm font-mono tabular-nums font-bold text-bullish leading-tight">{formatRp(plan.tp1)}</span>
              {plan.tp2 ? (
                <span className="text-[9px] text-text-tertiary leading-tight">TP2 {formatRp(plan.tp2)}</span>
              ) : (
                <span className="text-[9px] text-text-tertiary leading-tight">{plan.tp1Source}</span>
              )}
            </div>
            <div className="rounded-lg bg-bearish/15 border border-bearish/40 px-2 py-2 flex flex-col items-center justify-center text-center min-h-[56px]">
              <span className="text-[10px] font-medium text-text-secondary leading-tight">Stop Loss</span>
              <span className="text-[13px] sm:text-sm font-mono tabular-nums font-bold text-bearish leading-tight">{formatRp(plan.sl)}</span>
              <span className="text-[9px] text-text-tertiary leading-tight">{plan.slSource}</span>
            </div>
          </div>
        </div>

        {mc && (
          <>
            <div className="h-px bg-border/60" />
            <details className="group rounded-lg bg-bg-hover px-3 py-2.5">
              <summary className="flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <span className="text-[11px] font-semibold text-text-secondary">Peluang kena TP duluan</span>
                <span className="flex items-center gap-2">
                  <span className={`text-lg font-mono font-bold tabular-nums ${!setupLayak ? "text-text-tertiary" : mc.winRate >= 0.5 ? "text-bullish" : "text-bearish"}`}>
                    {(mc.winRate * 100).toFixed(0)}%
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-text-tertiary transition-transform group-open:rotate-180" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </summary>
              <div className="space-y-2 pt-2.5 mt-2.5 border-t border-border/60">
              {/* Stacked bar: TP | SL | keduanya tidak dalam horizon */}
              <div className="h-2 rounded-full overflow-hidden flex" role="img" aria-label={`Kena TP duluan ${Math.round(mc.winRate * 100)}%, kena Stop Loss duluan ${Math.round(mc.slRate * 100)}%, tidak keduanya ${Math.round(mc.neitherRate * 100)}%`}>
                <div className="bg-bullish" style={{ width: `${mc.winRate * 100}%` }} />
                <div className="bg-bearish" style={{ width: `${mc.slRate * 100}%` }} />
                <div className="bg-border" style={{ width: `${mc.neitherRate * 100}%` }} />
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-bullish">● TP duluan {(mc.winRate * 100).toFixed(0)}%</span>
                <span className="text-bearish">● Stop Loss {(mc.slRate * 100).toFixed(0)}%</span>
                <span className="text-text-tertiary">● Tak keduanya {(mc.neitherRate * 100).toFixed(0)}%</span>
              </div>
              <div className="text-[10px] text-text-tertiary leading-snug pt-0.5 border-t border-border/60">
                Simulasi Monte Carlo {mc.simulations.toLocaleString("id-ID")}× jalur harga ({mc.horizonDays} hari ke depan) dari pergerakan historis · Rata-rata hasil {mc.evPerShare >= 0 ? "+" : "−"}{formatRp(Math.abs(Math.round(mc.evPerShare)))}/lembar jika TP/SL disiplin dijalankan
              </div>
              </div>
            </details>
          </>
        )}

        <div className="h-px bg-border/60" />

        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Rugi : Untung</span>
          <span className={`text-sm font-bold tabular-nums ${isWaitAndSee ? "text-bearish" : ""}`}>
            1 : {plan.riskReward.toFixed(1).replace(".", ",")}
          </span>
        </div>

        {allWarnings.length > 0 && (
          <details
            data-engagement="trading_plan_warnings_buka"
            className="group rounded-lg bg-amber-500/10 border border-amber-500/25 px-2.5 py-1.5 text-[11px]"
          >
            <summary className="flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden select-none">
              <span className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <span aria-hidden="true">⚠️</span>
                <span>{allWarnings.length} catatan risiko</span>
              </span>
              <span className="text-[10px] text-amber-700/80 dark:text-amber-400/80 flex items-center gap-1 shrink-0 ml-2">
                <span className="group-open:hidden">lihat</span>
                <span className="hidden group-open:inline">tutup</span>
                <span className="transition-transform duration-200 group-open:rotate-180" aria-hidden="true">▾</span>
              </span>
            </summary>
            <div className="space-y-1.5 pt-2 mt-2 border-t border-amber-500/20">
              {allWarnings.map((w, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  {w.isSim ? (
                    <span className="text-xs shrink-0 mt-0.5 leading-none select-none" aria-hidden="true">
                      🔬
                    </span>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-500 shrink-0 mt-0.5" aria-hidden="true">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  )}
                  <p className="text-[11px] text-text-secondary leading-snug">{w.text}</p>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      <div className="bg-bg-primary/60 px-4 py-2 border-t border-border/60">
        <p className="text-[10px] text-text-tertiary leading-snug">
          Edukatif, bukan rekomendasi jual/beli — keputusan ada di tangan Anda.
        </p>
        {/* Teks lengkap tetap di DOM (legal/SEO), hanya tidak ditampilkan */}
        <p className="hidden" aria-hidden="true">
          Perhitungan ini bersifat edukatif berdasarkan indikator teknikal. Bukan rekomendasi membeli atau menjual saham. Keputusan investasi sepenuhnya menjadi tanggung jawab Anda. Selalu pertimbangkan risiko dan konsultasikan dengan pihak berlisensi.
        </p>
      </div>
    </div>
  );
}

