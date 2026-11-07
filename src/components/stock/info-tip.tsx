"use client";

import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function InfoTip({
  label,
  text,
  className,
}: {
  label: string;
  text: string;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={`${label}: ${text}`}
        className={cn(
          "inline-flex items-center justify-center w-4 h-4 rounded-full border border-border text-[10px] font-serif font-bold text-text-tertiary hover:text-text-primary hover:border-text-secondary transition-colors select-none align-middle cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          className
        )}
      >
        ⓘ
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[300px] text-left leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
