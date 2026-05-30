interface TelemetryEvent {
  eventName: string;
  timestamp: string;
  userId?: string | null;
  path?: string;
  durationSeconds?: number;
  metadata: Record<string, unknown>;
}

function transport(event: TelemetryEvent) {
  console.log(`[Telemetry] ${JSON.stringify(event)}`);
}

export function trackEvent(
  eventName: string,
  metadata: Record<string, unknown> = {},
  opts?: { userId?: string | null; path?: string; durationSeconds?: number }
) {
  transport({
    eventName,
    timestamp: new Date().toISOString(),
    userId: opts?.userId ?? null,
    path: opts?.path ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
    durationSeconds: opts?.durationSeconds,
    metadata,
  });
}
