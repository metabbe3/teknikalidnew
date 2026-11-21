"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useUhu } from "@/components/uhu/uhu-provider";
import {
  ACTIVATION_EVENTS,
  trackActivationEvent,
} from "@/lib/activation-events";

/**
 * HargaFreeCta (Pola hero-ai-cta.tsx W2):
 * Client component kecil untuk kartu Free di halaman /harga.
 * - Klik membuka panel Tanya AI langsung jika di browser.
 * - Melacak event HERO_AI_CTA dengan path /harga.
 * - Fallback / SSR link mengarah ke /stocks.
 */
export function HargaFreeCta() {
  const { openUhu } = useUhu();

  return (
    <Link
      href="/stocks"
      onClick={(e) => {
        trackActivationEvent(ACTIVATION_EVENTS.HERO_AI_CTA, { path: "/harga" });
        if (typeof window !== "undefined") {
          e.preventDefault();
          openUhu("/harga");
        }
      }}
      title="Coba Tanya AI Web — Gratis"
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:border-accent hover:text-accent press-scale"
    >
      <MessageCircle className="h-4 w-4 text-accent shrink-0" aria-hidden="true" />
      <span>Coba Tanya AI Web — Gratis</span>
    </Link>
  );
}
