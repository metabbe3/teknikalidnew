"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function usePageView() {
  const pathname = usePathname();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    // Only fire once per path change
    if (lastTracked.current === pathname) return;
    lastTracked.current = pathname;

    const payload = JSON.stringify({
      path: pathname,
      referrer: typeof document !== "undefined" ? document.referrer : undefined,
    });

    // Prefer sendBeacon for reliability (survives page navigations)
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/track/pageview", payload);
    } else {
      // Fallback to fetch — fire and forget
      fetch("/api/track/pageview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {
        // Silently ignore failures
      });
    }
  }, [pathname]);
}
