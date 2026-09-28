"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowUpRight } from "lucide-react";

/** Slim register CTA for content pages (brief/articles) — hidden for signed-in users. */
export function RegisterCtaBar() {
  const { status } = useSession();
  if (status !== "unauthenticated") return null;

  return (
    <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-accent/25 bg-accent/5 p-5">
      <div>
        <p className="text-sm font-semibold text-text-primary">Dapatkan brief pasar seperti ini setiap hari</p>
        <p className="text-xs text-text-tertiary mt-0.5">
          Gratis — chart interaktif, screener 30+ strategi, dan trading plan otomatis.
        </p>
      </div>
      <Link
        href="/auth/register"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-accent hover:bg-accent/90 rounded-lg px-4 py-2 whitespace-nowrap"
      >
        Daftar Gratis <ArrowUpRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}
