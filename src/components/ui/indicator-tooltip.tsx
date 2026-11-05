"use client";

/* eslint-disable @typescript-eslint/no-unused-vars */
export interface IndicatorTooltipProps {
  indicator?: string;
  className?: string;
}

/**
 * Ambiguous '?' tooltip button removed in UX Wave-2.
 * Component retained with no-op render to avoid breaking call sites.
 */
export function IndicatorTooltip(props?: IndicatorTooltipProps) {
  return null;
}
