"use client";

export interface AiThinkingProps {
  label?: string;
  className?: string;
}

const BARS = [
  { heightClass: "h-2", delayClass: "[animation-delay:0ms]" },
  { heightClass: "h-3.5", delayClass: "[animation-delay:140ms]" },
  { heightClass: "h-4", delayClass: "[animation-delay:280ms]" },
  { heightClass: "h-3", delayClass: "[animation-delay:420ms]" },
  { heightClass: "h-2.5", delayClass: "[animation-delay:560ms]" },
] as const;

export function AiThinking({
  label = "Menganalisis...",
  className = "",
}: AiThinkingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2.5 ${className}`.trim()}
    >
      <div
        className="flex h-4 items-center gap-1 motion-reduce:hidden"
        aria-hidden="true"
      >
        {BARS.map((bar, idx) => (
          <span
            key={idx}
            className={`w-1 rounded-full bg-accent origin-center animate-[ai-eq-bar_1s_ease-in-out_infinite] motion-reduce:hidden ${bar.heightClass} ${bar.delayClass}`}
          />
        ))}
      </div>
      <span className="text-xs text-text-tertiary">{label}</span>
    </div>
  );
}
