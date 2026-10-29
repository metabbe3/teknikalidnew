"use client";

import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { INDICATOR_TIPS } from "@/lib/indicator-translations";

interface IndicatorTooltipProps {
  indicator: string;
  className?: string;
}

export function IndicatorTooltip({ indicator, className }: IndicatorTooltipProps) {
  const tip = INDICATOR_TIPS[indicator];
  if (!tip) return null;

  return (
    <TooltipProvider delay={200}>
      <Tooltip>
        <TooltipTrigger
          // product-audit-2026-10-29 QW5: 14×14px → area sentuh 32×32px (visual tetap kecil via -m/p trick)
          className={`inline-flex items-center justify-center w-8 h-8 -m-2.5 p-2 rounded-full text-[10px] font-bold text-text-tertiary hover:text-text-secondary hover:bg-bg-hover transition-colors ${className ?? ""}`}
          aria-label={`Penjelasan ${indicator}`}
        >
          ?
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px] text-left leading-relaxed">
          <span className="font-semibold">{indicator}</span>
          <br />
          {tip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
