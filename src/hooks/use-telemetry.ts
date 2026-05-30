"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { trackEvent } from "@/lib/telemetry";

export function useTelemetry() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const loadTime = useRef(Date.now());

  useEffect(() => {
    loadTime.current = Date.now();
  }, [pathname]);

  useEffect(() => {
    const durationSeconds = (Date.now() - loadTime.current) / 1000;
    trackEvent("page_view", {}, {
      userId: session?.user?.id,
      path: pathname,
      durationSeconds: Math.round(durationSeconds * 100) / 100,
    });
  }, [pathname, session?.user?.id]);
}
