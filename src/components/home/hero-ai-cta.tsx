"use client";

import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { useUhu } from "@/components/uhu/uhu-provider";
import {
  ACTIVATION_EVENTS,
  trackActivationEvent,
} from "@/lib/activation-events";

/**
 * HeroAiCta (Wave-2 Item 4 + Wave-7 Item 3):
 * CTA sekunder Tanya AI di hero beranda publik.
 * - Klik membuka panel Tanya AI langsung via state context.
 * - Instrumentasi event HERO_AI_CTA.
 * - Fallback / SSR link mengarah ke /stocks.
 * - Style serasi dengan tombol hero di sekitarnya (tanpa warna purple/indigo).
 */
export function HeroAiCta() {
  const { openUhu } = useUhu();

  return (
    <Link
      href="/stocks"
      onClick={(e) => {
        trackActivationEvent(ACTIVATION_EVENTS.HERO_AI_CTA, { path: "/" });
        if (typeof window !== "undefined") {
          e.preventDefault();
          openUhu("/");
        }
      }}
      title="Tanya AI — tanya apa saja soal saham, gratis"
      className="inline-flex items-center gap-2 rounded-xl border border-border bg-bg-primary px-6 py-3 font-semibold text-text-primary hover:border-accent/40 hover:text-accent transition-colors press-scale"
    >
      <MessageCircle className="h-4 w-4 text-accent shrink-0" aria-hidden="true" />
      <span>Tanya AI — tanya apa saja soal saham, gratis</span>
    </Link>
  );
}
