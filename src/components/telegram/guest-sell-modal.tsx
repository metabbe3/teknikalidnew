"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useAgentCtx } from "@/components/telegram/subscribe-cta";

const SESSION_KEY = "sellmodal_seen";

function hasSeenInSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeenInSession(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* ignore storage restrictions */
  }
}

export function GuestSellModal({ isAuthed = false }: { isAuthed?: boolean }) {
  const { status } = useSession();
  const { mem } = useAgentCtx();
  const effectiveAuthed =
    isAuthed || status === "authenticated" || Boolean(mem?.email);

  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const closeModal = useCallback(() => {
    markSeenInSession();
    setOpen(false);
    if (previousFocusRef.current && typeof previousFocusRef.current.focus === "function") {
      previousFocusRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (status === "loading" || effectiveAuthed) return;
    if (hasSeenInSession()) return;

    let triggered = false;

    const triggerModal = () => {
      if (triggered || hasSeenInSession()) return;
      triggered = true;
      markSeenInSession();
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      setOpen(true);
    };

    const timer = window.setTimeout(triggerModal, 12_000);

    const onScroll = () => {
      const docHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      );
      const maxScrollable = Math.max(1, docHeight - window.innerHeight);
      if (
        window.scrollY > maxScrollable * 0.5 ||
        window.scrollY > docHeight * 0.5
      ) {
        triggerModal();
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [status, effectiveAuthed]);

  // ESC close + lightweight focus trap
  useEffect(() => {
    if (!open) return;

    const dialogEl = dialogRef.current;
    const focusables = dialogEl
      ? Array.from(
          dialogEl.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        )
      : [];

    if (focusables.length > 0) {
      focusables[0].focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeModal();
        return;
      }
      if (e.key === "Tab" && focusables.length > 0) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeModal]);

  if (effectiveAuthed || !open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      data-testid="guest-sell-modal"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={closeModal}
        aria-hidden="true"
      />

      {/* Dialog container: bottom-sheet on <sm, center dialog on >=sm */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-sell-modal-title"
        className="relative z-10 w-full max-w-md rounded-t-2xl border border-border bg-bg-card p-5 shadow-xl sm:rounded-2xl sm:p-6"
      >
        <button
          type="button"
          onClick={closeModal}
          aria-label="Tutup"
          className="absolute top-3.5 right-3.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-bg-hover hover:text-text-primary"
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

        <div className="space-y-3 pr-6">
          <h2
            id="guest-sell-modal-title"
            className="text-base font-semibold text-text-primary"
          >
            Saham ini bisa dibeli?
          </h2>
          <p className="text-sm text-text-secondary">
            Tanya Agent — analisis lengkap 30 detik.
          </p>
        </div>

        <div className="mt-4 space-y-2.5">
          <Link
            href="/agent"
            onClick={closeModal}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
          >
            Tanya Agent — Gratis 3x/hari
          </Link>
          <p className="text-center text-xs text-text-secondary">
            Night Trader Rp29rb/bln · Pro Rp79rb/bln
          </p>
          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={closeModal}
              className="text-xs font-medium text-text-tertiary transition-colors hover:text-text-secondary"
            >
              Nanti saja
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
