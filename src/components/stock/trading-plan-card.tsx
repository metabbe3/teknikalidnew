import type { TradingPlan } from "@/lib/trading-plan";
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

export function TradingPlanCard({ plan }: { plan: TradingPlan }) {
  const isBOW = plan.strategy === "BUY_ON_WEAKNESS";
  const isWaitAndSee = plan.strategy === "WAIT_AND_SEE";

  return (
    <div className={`depth-shadow rounded-xl border overflow-hidden ${isWaitAndSee ? "border-bearish/30 border-t-2 border-t-bearish/40" : isBOW ? "border-border border-t-2 border-t-amber-400/40" : "border-border border-t-2 border-t-bullish/40"}`}>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Kalkulator Trading Plan</h3>
            <p className="text-[10px] text-text-tertiary mt-0.5">Sumber: Pivot Points & ATR</p>
          </div>
          <div className="flex items-center gap-1.5">
            {isWaitAndSee && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-bearish-bg text-bearish">
                Wait &amp; See
              </span>
            )}
            {isBOW && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Antri Beli (BOW)
              </span>
            )}
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${confidenceStyles[plan.confidence]}`}>
              {confidenceLabels[plan.confidence]}
            </span>
          </div>
        </div>

        <div className="h-px bg-border/60" />

        {(isBOW || isWaitAndSee) && plan.marketEntryPrice && (
          <div className={`flex items-center justify-between px-1 py-1.5 rounded-md border ${isWaitAndSee ? "bg-red-50 border-red-200/60" : "bg-amber-50 border-amber-200/60"}`}>
            <span className={`text-[10px] ${isWaitAndSee ? "text-red-700" : "text-amber-700"}`}>Harga pasar saat ini</span>
            <span className={`text-[11px] font-mono font-semibold ${isWaitAndSee ? "text-red-800" : "text-amber-800"}`}>{formatRp(plan.marketEntryPrice)}</span>
          </div>
        )}

        <div className={`space-y-2 ${isWaitAndSee ? "opacity-50" : ""}`}>
          <Row
            label={isBOW || isWaitAndSee ? "Entry (Limit)" : "Entry"}
            value={formatRp(plan.entry)}
            detail={plan.entryZone}
            valueClass="text-accent"
          />
          <Row label="TP 1" value={formatRp(plan.tp1)} detail={`(${plan.tp1Source})`} valueClass="text-bullish" />
          {plan.tp2 && (
            <Row label="TP 2" value={formatRp(plan.tp2)} detail={`(${plan.tp2Source})`} valueClass="text-bullish" />
          )}
          <Row label="Stop Loss" value={formatRp(plan.sl)} detail={`(${plan.slSource})`} valueClass="text-bearish" />
        </div>

        <div className="h-px bg-border/60" />

        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Risk : Reward</span>
          <span className={`text-sm font-bold tabular-nums ${isWaitAndSee ? "text-bearish" : ""}`}>
            1 : {plan.riskReward.toFixed(1)}
          </span>
        </div>

        {plan.suggestion && (
          <>
            <div className="h-px bg-border/60" />
            <div className={`flex items-start gap-1.5 ${isWaitAndSee ? "bg-red-50/80 -mx-1 px-2.5 py-2 rounded-lg" : isBOW ? "bg-amber-50/60 -mx-1 px-2.5 py-2 rounded-lg" : ""}`}>
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
              <p className={`text-[11px] leading-snug ${isWaitAndSee ? "text-red-800 font-medium" : isBOW ? "text-amber-800 font-medium" : "text-text-secondary"}`}>
                {plan.suggestion}
              </p>
            </div>
          </>
        )}

        {plan.warnings.length > 0 && (
          <>
            <div className="space-y-1.5">
              {plan.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-500 shrink-0 mt-0.5" aria-hidden="true">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <p className="text-[11px] text-text-secondary leading-snug">{w}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="bg-bg-primary/60 px-4 py-2.5 border-t border-border/60">
        <p className="text-[9px] text-text-tertiary leading-relaxed">
          Perhitungan ini bersifat edukatif berdasarkan indikator teknikal. Bukan rekomendasi membeli atau menjual saham. Keputusan investasi sepenuhnya menjadi tanggung jawab Anda. Selalu pertimbangkan risiko dan konsultasikan dengan pihak berlisensi.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, detail, valueClass }: { label: string; value: string; detail: string; valueClass: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-text-secondary">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-[13px] font-mono tabular-nums font-semibold ${valueClass}`}>{value}</span>
        <span className="text-[10px] text-text-tertiary">{detail}</span>
      </div>
    </div>
  );
}
