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

/** Register CTA for preset signal pages — static server component, always visible. */
export function RegisterCta({ slug }: { slug: SignalSlug }) {
  const copy = COPY[slug];
  return (
    <div className="mt-6 rounded-xl border border-accent/25 bg-accent/5 p-5">
      <p className="text-sm font-semibold text-text-primary">{copy.title}</p>
      <p className="mt-0.5 text-xs text-text-tertiary">{copy.body}</p>
      <Link
        href={`/auth/register?utm_source=signal_page&utm_medium=cta&utm_campaign=${slug}`}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-white bg-accent hover:bg-accent/90 rounded-lg px-4 py-2"
      >
        Daftar Gratis <ArrowUpRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}
