"use client";

interface SaveScreenPromptProps {
  filters: Record<string, string>;
  next: string;
}

export function SaveScreenPrompt({ filters, next }: SaveScreenPromptProps) {
  const handleClick = () => {
    try {
      sessionStorage.setItem("pending_post_register", JSON.stringify({ type: "save_screen", filters, next }));
    } catch {
      // storage full/blocked — still go to register
    }
    window.location.href = "/auth/register?utm_source=stocks_screener&utm_medium=save_prompt";
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border bg-bg-card/50">
      <div className="flex items-center gap-2 text-text-tertiary text-xs">
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
        <span>Simpan filter agar tidak hilang saat ganti tab</span>
      </div>
      <button
        onClick={handleClick}
        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors cursor-pointer whitespace-nowrap"
      >
        Simpan Screen
      </button>
    </div>
  );
}
