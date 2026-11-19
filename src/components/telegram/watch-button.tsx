"use client";

import { useEffect, useState } from "react";
import { tgDeepLink, tgAnonSuffix } from "@/lib/tg-deeplink";

/**
 * WatchTelegramButton (PRD prd-2026-11-18-01 AC1): tombol "Pantau via Telegram"
 * di halaman saham — satu pintu tgDeepLink() supaya suffix identitas web
 * (__a_<12hex> dari localStorage eng_anon) IKUT terkirim; server component
 * tidak bisa baca localStorage makanya href lama inline selalu polos.
 *
 * Hydration-safe: render href dasar (tanpa suffix) saat SSR/first paint,
 * perbarui ke href penuh di efek — tanpa mismatch.
 */
export function WatchTelegramButton({
  ticker,
  engagement,
  className,
  children,
  startParam,
}: {
  ticker: string;
  engagement: string;
  className: string;
  children: React.ReactNode;
  /** Base payload tanpa suffix (default: CODE_JK). Utk varian web_CODE. */
  startParam?: string;
}) {
  const baseParam =
    startParam ??
    `${ticker.replace(/\.JK$/, "").toUpperCase()}_JK`;
  const [href, setHref] = useState(
    `https://t.me/TeknikalidAgentBot?start=${encodeURIComponent(baseParam)}`
  );

  useEffect(() => {
    setHref(
      startParam
        ? `https://t.me/TeknikalidAgentBot?start=${encodeURIComponent(
            startParam + tgAnonSuffix()
          )}`
        : tgDeepLink([ticker])
    );
  }, [ticker, startParam]);

  return (
    <a
      href={href}
      data-engagement={engagement}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}
