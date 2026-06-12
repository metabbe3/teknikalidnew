"use client";

import { usePageView } from "@/hooks/use-page-view";

export function PageViewTracker() {
  usePageView();
  return null;
}
