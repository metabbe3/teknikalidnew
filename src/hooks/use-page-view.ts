"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Extract UTM parameters and other tracking data from the current URL.
 */
function getTrackingData(pathname: string) {
  const referrer = typeof document !== "undefined" ? document.referrer : undefined;
  // Append the query string (utm_source etc.) — the API strips it before insert
  // and reads UTM attribution off it for /auth/ pages only.
  const search = typeof window !== "undefined" ? window.location.search : "";

  // Extract UTM params from URL
  let utmSource: string | undefined;
  let utmMedium: string | undefined;
  let utmCampaign: string | undefined;

  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    utmSource = params.get("utm_source") || undefined;
    utmMedium = params.get("utm_medium") || undefined;
    utmCampaign = params.get("utm_campaign") || undefined;

    // Also check for gclid (Google Ads) — treat as paid search
    if (params.get("gclid")) {
      utmSource = utmSource || "google";
      utmMedium = utmMedium || "cpc";
    }
  }

  return {
    path: pathname + search,
    referrer: referrer || undefined,
    // Only include UTM if present (keeps payload small for non-UTM traffic)
    ...(utmSource && { utmSource }),
    ...(utmMedium && { utmMedium }),
    ...(utmCampaign && { utmCampaign }),
  };
}

export function usePageView() {
  const pathname = usePathname();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    // Only fire once per path change
    if (lastTracked.current === pathname) return;
    lastTracked.current = pathname;

    const payload = JSON.stringify(getTrackingData(pathname));

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
