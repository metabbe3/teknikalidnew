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
          className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold text-text-tertiary hover:text-text-secondary hover:bg-bg-hover transition-colors ${className ?? ""}`}
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
