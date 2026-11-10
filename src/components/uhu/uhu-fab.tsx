"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { UhuMascot } from "./uhu-mascot";
import { UhuChatPanel } from "./uhu-chat-panel";

const DISMISSED_KEY = "uhu_dismissed";
const APPEAR_DELAY_MS = 2500;

export function UhuFab() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const messageCountRef = useRef(0);

  // Delay 2.5s setelah load agar tidak mengganggu first paint / LCP.
  // Yield ke GuestSellModal (1x/sesi): kalau modal sedang/mungkin muncul,
  // bubble Uhu menunggu sampai sellmodal_seen tersedia (poll ringan, max 20s).
  useEffect(() => {
    let bubbleTimer: ReturnType<typeof setTimeout> | null = null;
    const tryShowBubble = (attempt: number) => {
      let modalBusy = false;
      try {
        modalBusy = !sessionStorage.getItem("sellmodal_seen");
      } catch {
        modalBusy = false;
      }
      if (modalBusy && attempt < 20) {
        setTimeout(() => tryShowBubble(attempt + 1), 1000);
        return;
      }
      let dismissed = true;
      try {
        dismissed = !!sessionStorage.getItem(DISMISSED_KEY);
      } catch {
        dismissed = false;
      }
      if (!dismissed) setShowBubble(true);
    };
    const timer = setTimeout(() => {
      setVisible(true);
      bubbleTimer = null;
      tryShowBubble(0);
    }, APPEAR_DELAY_MS);

    return () => {
      clearTimeout(timer);
      if (bubbleTimer) clearTimeout(bubbleTimer);
    };
  }, []);

  const markBubbleDismissed = useCallback(() => {
    setShowBubble(false);
    try {
      sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // ignore storage error
    }
  }, []);

  const handleClosePanel = useCallback(() => {
    setOpen(false);
    // Kalau user close tanpa chat -> jangan auto-popup bubble lagi sesi ini
    if (messageCountRef.current === 0) {
      markBubbleDismissed();
    } else {
      setShowBubble(false);
    }
  }, [markBubbleDismissed]);

  const handleToggle = useCallback(() => {
    if (open) {
      handleClosePanel();
    } else {
      setShowBubble(false);
      setOpen(true);
    }
  }, [open, handleClosePanel]);

  const handleMessageCountChange = useCallback((count: number) => {
    messageCountRef.current = count;
  }, []);

  if (!visible) return null;

  return (
    <>
      <UhuChatPanel
        open={open}
        onClose={handleClosePanel}
        pageContext={pathname ?? undefined}
        onMessageCountChange={handleMessageCountChange}
      />

      {/* Bubble teks kontekstual sekali-per-sesi (decorative, di atas button) */}
      {showBubble && !open && (
        <div
          aria-hidden="true"
          className="fixed right-4 bottom-[140px] md:bottom-[84px] z-40 flex max-w-[240px] items-start gap-2 rounded-xl border border-border bg-bg-card px-3 py-2 text-xs text-text-primary shadow-md fade-in"
        >
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              setShowBubble(false);
              setOpen(true);
            }}
            className="text-left leading-snug"
          >
            Halo! Aku Uhu 🦉 — tanya apa aja soal saham
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={markBubbleDismissed}
            className="ml-1 shrink-0 text-text-tertiary hover:text-text-primary"
          >
            ✕
          </button>
        </div>
      )}

      {/* Floating Action Button (52px) */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label={open ? "Tutup Uhu" : "Buka Uhu — Analis AI TeknikalID"}
        aria-expanded={open}
        className="fixed right-4 bottom-20 md:bottom-6 z-40 flex h-[52px] w-[52px] items-center justify-center rounded-full border border-border bg-bg-card text-text-primary shadow transition-transform hover:scale-105 active:scale-95"
      >
        {open ? (
          <svg
            width="20"
            height="20"
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
        ) : (
          <UhuMascot size={36} mood="happy" />
        )}
      </button>
    </>
  );
}
