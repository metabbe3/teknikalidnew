"use client";

import { UhuStockTrigger } from "@/components/uhu/uhu-provider";
import {
  ACTIVATION_EVENTS,
  trackActivationEvent,
} from "@/lib/activation-events";

interface DailyAnalysisCtaProps {
  ticker: string;
  cleanTicker: string;
}

/**
 * Wave-7: Mini client child wrapper for "Tanya AI soal {ticker}" CTA
 * di DailyAnalysisBlock (server component).
 *
 * Mengirim event ANALYSIS_BLOCK_CTA saat diklik tanpa memblok navigasi/buka chat.
 */
export function DailyAnalysisCta({
  ticker,
  cleanTicker,
}: DailyAnalysisCtaProps) {
  return (
    <UhuStockTrigger
      ticker={ticker}
      data-engagement="analis_hari_ini_tanya_ai"
      onClick={() => {
        trackActivationEvent(ACTIVATION_EVENTS.ANALYSIS_BLOCK_CTA, {
          ticker: cleanTicker,
        });
      }}
      className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-accent/40 bg-accent/5 px-2.5 py-1 text-xs font-semibold text-accent hover:bg-accent/15 hover:border-accent transition-colors"
    >
      <span>🤖 Tanya AI soal {cleanTicker} →</span>
    </UhuStockTrigger>
  );
}
