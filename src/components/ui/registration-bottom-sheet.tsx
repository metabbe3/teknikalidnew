"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRegistrationPrompt } from "@/hooks/use-registration-prompt";

export function RegistrationBottomSheet() {
  const { status } = useSession();
  const {
    trackPageView,
    shouldShowBottomSheet,
    dismissBottomSheet,
  } = useRegistrationPrompt();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setDismissed(true);
    dismissBottomSheet();
  }, [dismissBottomSheet]);

  useEffect(() => {
    // Don't show for authenticated users
    if (status === "authenticated" || status === "loading") return;

    trackPageView();

    const timer = setTimeout(() => {
      if (shouldShowBottomSheet()) {
        setVisible(true);
      }
    }, 30_000);

    return () => clearTimeout(timer);
  }, [status, trackPageView, shouldShowBottomSheet]);

  // Don't render anything for authenticated users or if already dismissed
  if (status === "authenticated" || dismissed) return null;

  return (
    <>
      {/* Backdrop */}
      {visible && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300"
          onClick={handleDismiss}
          aria-hidden="true"
        />
      )}

      {/* Bottom sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-500 ease-out ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
        role="dialog"
        aria-label="Daftar gratis"
      >
        <div className="mx-auto max-w-md rounded-t-2xl bg-card p-6 ring-1 ring-foreground/10 depth-shadow">
          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
            aria-label="Tutup"
          >
            <svg
              width="16"
              height="16"
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

          {/* Content */}
          <div className="text-center">
            <h3 className="font-heading text-lg font-semibold text-text-primary mb-1.5">
              Suka fitur analisa teknikal ini?
            </h3>
            <p className="text-sm text-text-secondary mb-5">
              Simpan saham favorit Anda dan buat trading plan gratis.
            </p>

            {/* Google OAuth button */}
            <Link
              href="/auth/register"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-white hover:bg-accent/90 transition-colors press-scale"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Daftar dengan Google
            </Link>

            {/* Email link */}
            <Link
              href="/auth/register"
              className="mt-3 inline-block text-xs text-text-secondary hover:text-accent transition-colors"
            >
              Daftar dengan email
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
