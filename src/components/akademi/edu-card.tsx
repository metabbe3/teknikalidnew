/**
 * EduCard — funnel /stocks → akademi (owner 24 Okt: "funelling dari stocks / per ticker").
 * Kontekstual dulu (RSI overbought/oversold, MACD), fallback rotasi HARIAN
 * deterministik (bukan random per-view — cache friendly).
 */
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { suggestEduForIndicator, dailyRotation } from "@/lib/akademi/learning-path";

export function EduCard({ rsi14, macdSignal }: { rsi14: number | null; macdSignal?: string | null }) {
  const contextual = suggestEduForIndicator({ rsi14, macdSignal });
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  const suggestion = contextual ?? dailyRotation(dayIndex);

  return (
    <Link
      href={`/akademi/${suggestion.slug}`}
      className="group flex items-start gap-3 p-4 rounded-xl bg-bg-card border border-border hover:border-accent/40 depth-shadow transition-all"
      aria-label={`Belajar: ${suggestion.title}`}
      data-engagement="funnel_edu"
    >
      <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent/10 text-accent shrink-0">
        <GraduationCap className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-accent">Belajar 5 menit</p>
        <p className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors leading-tight">
          {suggestion.title}
        </p>
        <p className="text-xs text-text-tertiary mt-1 leading-relaxed">{suggestion.reason}</p>
      </div>
    </Link>
  );
}
