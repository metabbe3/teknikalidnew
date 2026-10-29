/**
 * Fire a share-click beacon to /api/track/share (first-party DB; replaces Plausible).
 * sendBeacon preferred (survives page unload); fetch + keepalive fallback.
 */
export function trackShare(target: string, context: string, path: string) {
  if (typeof window === "undefined") return;
  // tracking-audit G7: bawa anonId — ShareEvent kini join-able ke PageView/EngagementEvent
  let anon: string | undefined;
  try { anon = localStorage.getItem("eng_anon") ?? undefined; } catch { /* silent */ }
  const body = JSON.stringify({ target, context, path, anonId: anon });
  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/track/share", body);
      return;
    }
  } catch {
    // fall through to fetch
  }
  fetch("/api/track/share", { method: "POST", body, keepalive: true }).catch(() => {});
}
