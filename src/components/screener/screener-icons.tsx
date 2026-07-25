import React from "react";
import type { PresetDef } from "./screener-types";

// ── Bookmark Icon Component ──

export function BookmarkIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg className={className ?? "w-4 h-4"} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// ── Icon Components ──

export function PresetIcon({ type, className }: { type: PresetDef["icon"]; className?: string }) {
  const cls = className ?? "w-5 h-5";
  switch (type) {
    case "radar":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
          <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
        </svg>
      );
    case "rsi":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          <path d="M4 20 C4 20 8 4 12 12 C16 20 20 4 20 4" />
        </svg>
      );
    case "stoch":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          <path d="M4 6h6v12H4zM14 6h6v12h-6z" /><line x1="7" y1="10" x2="7" y2="18" /><line x1="17" y1="6" x2="17" y2="14" />
        </svg>
      );
    case "bb":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          <path d="M2 12 Q6 4 12 12 Q18 20 22 12" /><path d="M2 12 Q6 18 12 12 Q18 6 22 12" />
        </svg>
      );
    case "vol":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="10" width="5" height="12" rx="1" /><rect x="9.5" y="6" width="5" height="16" rx="1" /><rect x="17" y="2" width="5" height="20" rx="1" />
        </svg>
      );
    case "macd":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          <line x1="6" y1="18" x2="6" y2="10" /><line x1="10" y1="18" x2="10" y2="6" /><line x1="14" y1="18" x2="14" y2="12" /><line x1="18" y1="18" x2="18" y2="4" />
          <path d="M3 14 Q9 8 15 12 Q21 16 22 10" strokeWidth="1.5" />
        </svg>
      );
    case "cross":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          <path d="M2 20 L8 14 L12 18 L22 4" /><circle cx="8" cy="14" r="2.5" strokeWidth="1.5" />
        </svg>
      );
    case "trend":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
        </svg>
      );
    case "super":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          <path d="M4 14 Q8 8 12 14 Q16 20 20 10" /><path d="M4 16 Q8 10 12 16 Q16 22 20 12" strokeDasharray="3 3" />
        </svg>
      );
    case "obv":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          <polyline points="2 18 6 14 10 16 14 10 18 12 22 6" />
        </svg>
      );
    case "hype":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      );
    case "adx":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      );
    case "ema":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          <path d="M3 18 Q8 6 12 12 Q16 18 21 6" /><path d="M3 16 Q8 10 12 14 Q16 18 21 4" strokeDasharray="3 3" />
        </svg>
      );
    case "fund":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          <rect x="2" y="3" width="20" height="18" rx="2" /><line x1="8" y1="7" x2="16" y2="7" /><line x1="8" y1="11" x2="16" y2="11" /><line x1="8" y1="15" x2="12" y2="15" />
        </svg>
      );
    case "sliders":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
          <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
        </svg>
      );
    default:
      return null;
  }
}