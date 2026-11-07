"use client";

/**
 * GuestInlineUpsell (W1c, plan 2026-11-07):
 * Strip upsell ringan 1 baris di bawah trading plan untuk guest (saat kuota belum habis).
 * Non-blocking, non-modal. Tampil 1x per sesi (sessionStorage guard).
 *
 * Link: https://t.me/TeknikalidAgentBot?start=src_ask_{cleanTicker}
 * CTA click: agent_deeplink_inline
 */

import { useSyncExternalStore } from "react";
import { useSession } from "next-auth/react";
import { normalizeTicker } from "@/lib/guest-quota";

export const SESSION_INLINE_UPSELL_KEY = "tk_upsell_inline_seen";

const emptySubscribe = () => () => {};

/**
 * Helper pure untuk mengecek & menandai sessionStorage (1x per sesi).
 * Mengembalikan true jika ini adalah kemunculan pertama pada sesi saat ini.
 */
export function checkAndMarkInlineUpsell(customStorage?: Storage): boolean {
  let storage: Storage | null = customStorage ?? null;
  if (!storage && typeof window !== "undefined") {
    try {
      storage = window.sessionStorage;
    } catch {
      return false;
    }
  }
  if (!storage) return false;

  try {
    const seen = storage.getItem(SESSION_INLINE_UPSELL_KEY);
    if (!seen) {
      storage.setItem(SESSION_INLINE_UPSELL_KEY, "1");
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function GuestInlineUpsell({
  ticker,
  isOverLimit = false,
  initialShow,
}: {
  ticker: string;
  isOverLimit?: boolean;
  initialShow?: boolean;
}) {
  const { status } = useSession();

  const shouldShow = useSyncExternalStore(
    emptySubscribe,
    () => {
      if (initialShow !== undefined) return initialShow;
      if (status !== "unauthenticated" || isOverLimit) return false;
      return checkAndMarkInlineUpsell();
    },
    () => initialShow ?? false
  );

  if (!shouldShow) return null;

  const cleanTicker = normalizeTicker(ticker);
  const deeplink = `https://t.me/TeknikalidAgentBot?start=src_ask_${cleanTicker}`;

  return (
    <div
      className="mt-3 flex items-center justify-between rounded-lg border border-border/80 bg-bg-card/60 px-3.5 py-2 text-xs"
      data-testid="guest-inline-upsell"
    >
      <a
        href={deeplink}
        target="_blank"
        rel="noopener noreferrer"
        data-engagement="agent_deeplink_inline"
        className="flex items-center gap-1.5 text-text-secondary hover:text-accent font-medium transition-colors w-full"
      >
        <span>
          🤖 Mau tanya &apos;{cleanTicker} layak beli ga?&apos; — Bot Agent jawab instan →
        </span>
      </a>
    </div>
  );
}
