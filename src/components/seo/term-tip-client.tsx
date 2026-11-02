"use client";

import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

/**
 * Client half TermTip — membungkus Tooltip UI existing (@base-ui, AC1: 0 dependency
 * baru; TooltipProvider global ada di root layout). Trigger = <button> focusable
 * (keyboard + tap-to-open mobile, riset 29 Okt); teks definisi render di HTML
 * via sr-only sehingga crawler/AI-search membaca tanpa JS (AC5).
 * Klik link 'Lihat di Kamus' tercatat nav_click glossary_open via data-nav-label
 * (reuse engagement-instrument, 0 endpoint baru — AC6).
 */
export function TermTipClient({
  slug,
  term,
  definition,
  fallbackText,
}: {
  slug: string;
  term: string;
  definition: string;
  fallbackText: string;
}) {
  return (
    <Tooltip>
      {/* SSR-visible untuk crawler; visually-hidden agar tak dobel dengan trigger */}
      <span className="sr-only">{` (${term}: ${definition})`}</span>
      <TooltipTrigger
        className="inline cursor-help rounded-sm border-b border-dashed border-accent/60 text-accent hover:text-accent/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        aria-label={`Penjelasan istilah ${term}`}
      >
        {fallbackText}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[300px] text-left leading-relaxed">
        <span className="font-semibold">{term}</span>
        <br />
        <span className="block mt-1">{definition}</span>
        <a
          href={`/akademi/glosarium#${slug}`}
          data-nav-label="glossary_open"
          className="mt-2 inline-block text-[11px] underline underline-offset-2 text-background/80 hover:text-background"
        >
          Lihat di Kamus
        </a>
      </TooltipContent>
    </Tooltip>
  );
}
