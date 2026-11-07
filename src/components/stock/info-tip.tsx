"use client";

import { useState } from "react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * InfoTip — icon ⓘ yang BISA diklik/tap (owner 7 Nov: title-native mati di mobile).
 * Click/tap = toggle open (garansi jalan di touch device — tidak bergantung simulasi
 * hover browser yang tidak konsisten di iOS Safari). Hover desktop tetap jalan via
 * behavior native Tooltip base-ui (onOpenChange menyatukan state keduanya).
 */
export function InfoTip({
  label,
  text,
  className,
}: {
  label: string;
  text: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger
        aria-label={`${label}: ${text}`}
        className={cn(
          "inline-flex items-center justify-center w-4 h-4 rounded-full border border-border text-[10px] font-serif font-bold text-text-tertiary hover:text-text-primary hover:border-text-secondary transition-colors select-none align-middle cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          className
        )}
        onClick={() => setOpen((v) => !v)}
      >
        ⓘ
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[300px] text-left leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
