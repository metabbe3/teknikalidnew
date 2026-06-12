"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRegistrationPrompt } from "@/hooks/use-registration-prompt";

interface RegistrationInlinePromptProps {
  ticker: string;
}

export function RegistrationInlinePrompt({
  ticker,
}: RegistrationInlinePromptProps) {
  const { status } = useSession();
  const {
    shouldShowInlinePrompt,
    dismissInlinePrompt,
  } = useRegistrationPrompt();

  // Only show for unauthenticated users when criteria are met
  if (status !== "unauthenticated") return null;
  if (!shouldShowInlinePrompt(ticker)) return null;

  const handleDismiss = () => {
    dismissInlinePrompt(ticker);
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-accent/20 bg-accent/5 px-4 py-2.5">
      <p className="flex-1 text-xs text-text-secondary">
        Anda sering melihat{" "}
        <span className="font-semibold text-text-primary">{ticker}</span>.
        Pantau dengan daftar pantauan gratis.
      </p>
      <Link
        href="/auth/signin"
        className="shrink-0 text-xs font-semibold text-accent hover:text-accent/80 transition-colors"
      >
        Daftar Gratis
      </Link>
      <button
        onClick={handleDismiss}
        className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
        aria-label="Tutup"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
