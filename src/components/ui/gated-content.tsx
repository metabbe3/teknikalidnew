"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface GatedContentProps {
  children: React.ReactNode;
  message: string;
  ctaText?: string;
  blurPx?: number;
}

export function GatedContent({
  children,
  message,
  ctaText = "Daftar Gratis",
  blurPx = 5,
}: GatedContentProps) {
  const { status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Authenticated: render children normally
  if (status === "authenticated") {
    return <>{children}</>;
  }

  // SSR + initial client render: show full content (SEO-friendly, no flash)
  if (!mounted) {
    return (
      <div className="relative" style={{ opacity: 0 }}>
        {children}
      </div>
    );
  }

  // Anonymous client-side: blur + CTA overlay
  return (
    <div className="relative select-none">
      <div
        aria-hidden="true"
        className="pointer-events-none"
        style={{ filter: `blur(${blurPx}px)` }}
      >
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-bg-surface/40 backdrop-blur-[2px] rounded-xl transition-opacity duration-300">
        <div className="text-center px-6 py-4 max-w-xs">
          <p className="text-sm text-text-secondary mb-3">{message}</p>
          <Link
            href="/auth/register"
            className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-bold bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors press-scale"
          >
            {ctaText}
          </Link>
        </div>
      </div>
    </div>
  );
}
