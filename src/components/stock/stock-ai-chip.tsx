"use client";

/**
 * StockAiChip — anchor CTA bot yang menempel suffix identitas web
 * (__a_<12hex> dari localStorage eng_anon) SETELAH mount (client-only).
 *
 * Kenapa child client terpisah: StockAiPromptChips adalah SERVER component
 * (SSR SEO) — localStorage tak ada saat render, jadi suffix harus ditambahkan
 * setelah hydration. Tanpa ini, 3 chips CTA kirim ?start=TICKER_JK_entry
 * TANPA __a_ → jembatan funnel web→bot putus (temuan CTO 21 Nov).
 *
 * Pattern sama dengan watch-button.tsx: render awal pakai baseHref (aman
 * tanpa JS), lalu useEffect append tgAnonSuffix(). Suffix 15 char + base
 * ≤48 = ≤63 char — dalam limit Telegram 64.
 */
import { useEffect, useState } from "react";
import { tgAnonSuffix } from "@/lib/tg-deeplink";

interface StockAiChipProps {
  baseHref: string;
  children: React.ReactNode;
  chipKey: string;
  engagement?: string;
  className?: string;
  ariaLabel?: string;
}

export function StockAiChip({
  baseHref,
  children,
  chipKey,
  engagement,
  className,
  ariaLabel,
}: StockAiChipProps) {
  const [href, setHref] = useState(baseHref);

  useEffect(() => {
    const suffix = tgAnonSuffix();
    if (!suffix) return;
    // baseHref: https://t.me/TeknikalidAgentBot?start=<payload (encoded)>
    const marker = "start=";
    const idx = baseHref.indexOf(marker);
    if (idx === -1) return;
    const head = baseHref.slice(0, idx + marker.length);
    const encoded = baseHref.slice(idx + marker.length);
    const payload = decodeURIComponent(encoded) + suffix;
    setHref(head + encodeURIComponent(payload));
  }, [baseHref]);

  return (
    <a
      key={chipKey}
      href={href}
      data-engagement={engagement}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </a>
  );
}

export default StockAiChip;
