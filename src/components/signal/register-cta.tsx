"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

type SignalSlug = "saham-oversold" | "saham-golden-cross" | "saham-volume-spike";

const COPY: Record<SignalSlug, { title: string; body: string }> = {
  "saham-oversold": {
    title: "Simpan rebound watchlist Anda",
    body: "Daftar gratis untuk menyimpan saham oversold ke watchlist dan pantau RSI-nya setiap hari.",
  },
  "saham-golden-cross": {
    title: "Dapatkan alert golden cross",
    body: "Daftar gratis untuk alert saat MA50 memotong ke atas MA200 di saham yang Anda ikuti.",
  },
  "saham-volume-spike": {
    title: "Sinyal volume spike real-time",
    body: "Daftar gratis dan ikuti saham favorit untuk notifikasi begitu volumenya spike.",
  },
};

/**
 * Register URL with ai-search referral attribution (PRD idea-2026-10-13-2 AC2).
 * utm_source=ai-search + utm_medium=referral — the /auth/register beacon keeps
 * UTM (extractPageviewAttribution) so signup-intent from AI referrals is
 * measurable. All values pass parseUtmParam's [a-z0-9_-]{1,32} gate.
 */
export function registerCtaHref(slug: SignalSlug): string {
  return `/auth/register?utm_source=ai-search&utm_medium=referral&utm_campaign=${slug}`;
}

/**
 * Register CTA for preset signal pages. Client component, hidden for
 * authenticated users (AC4: no CTA when logged in). SSR renders it hidden then
 * reveals for anonymous visitors — mirrors GatedContent's mount pattern to
 * avoid a logged-in flash without hurting anonymous SEO/first paint.
 */
export function RegisterCta({ slug }: { slug: SignalSlug }) {
  const { status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Authenticated: no CTA (AC4)
  if (status === "authenticated") return null;

  // SSR + pre-hydration: render but visually hidden (no layout shift, no
  // logged-in flash). Revealed client-side only for anonymous visitors.
  const visible = mounted && status !== "loading";

  const copy = COPY[slug];
  return (
    <div
      aria-hidden={!visible}
      className={`mt-6 rounded-xl border border-accent/25 bg-accent/5 p-5 transition-opacity duration-300 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <p className="text-sm font-semibold text-text-primary">{copy.title}</p>
      <p className="mt-0.5 text-xs text-text-tertiary">{copy.body}</p>
      <Link
        href={registerCtaHref(slug)}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-white bg-accent hover:bg-accent/90 rounded-lg px-4 py-2"
      >
        Daftar Gratis <ArrowUpRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}
