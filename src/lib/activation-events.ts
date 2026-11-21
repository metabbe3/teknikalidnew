import { getAnonIdSafe } from "@/lib/anon-id-safe";

/**
 * Wave-7: Activation Funnel Events (Argon & Opus directive 21 Nov 2026).
 * "Yang tak terukur tak bisa dioptimasi."
 *
 * Whitelist event aktivasi resmi untuk melacak funnel adopsi fitur AI dan registrasi.
 */
export const ACTIVATION_EVENTS = {
  GUEST_CHAT_OPEN: "guest_chat_open",
  GUEST_FIRST_QUESTION: "guest_first_question",
  GUEST_QUOTA_WALL: "guest_quota_wall",
  REGISTER_CLICK_FROM_CHAT: "register_click_from_chat",
  ANALYSIS_BLOCK_SEEN: "analysis_block_seen",
  ANALYSIS_BLOCK_CTA: "analysis_block_cta",
  HERO_AI_CTA: "hero_ai_cta",
} as const;

export type ActivationEventName =
  (typeof ACTIVATION_EVENTS)[keyof typeof ACTIVATION_EVENTS];

export const ACTIVATION_EVENT_LIST: readonly ActivationEventName[] =
  Object.values(ACTIVATION_EVENTS);

const ACTIVATION_EVENT_SET = new Set<string>(ACTIVATION_EVENT_LIST);

/**
 * Pure function: validasi apakah event name masuk dalam whitelist ACTIVATION_EVENTS.
 */
export function isValidActivationEvent(
  event: unknown,
): event is ActivationEventName {
  return typeof event === "string" && ACTIVATION_EVENT_SET.has(event);
}

// Pola PII guard untuk props
const PII_KEY_REGEX =
  /(password|token|secret|email|phone|auth|credential|cookie|session|apikey)/i;

/**
 * Pure function: sanitasi props event.
 * Aturan:
 * - Maksimal 5 key
 * - Key string pendek (<= 32 karakter)
 * - Value string pendek (<= 100 karakter), number, atau boolean
 * - Filter out key sensitif / PII
 */
export function sanitizeActivationProps(
  props?: unknown,
): Record<string, string | number | boolean> | undefined {
  if (!props || typeof props !== "object" || Array.isArray(props)) {
    return undefined;
  }

  const out: Record<string, string | number | boolean> = {};
  const entries = Object.entries(props as Record<string, unknown>).slice(0, 5);

  for (const [rawKey, rawVal] of entries) {
    if (!rawKey || typeof rawKey !== "string") continue;
    const cleanKey = rawKey.trim().slice(0, 32);
    if (!cleanKey || PII_KEY_REGEX.test(cleanKey)) continue;

    if (typeof rawVal === "string") {
      out[cleanKey] = rawVal.trim().slice(0, 100);
    } else if (typeof rawVal === "number") {
      if (Number.isFinite(rawVal)) {
        out[cleanKey] = rawVal;
      }
    } else if (typeof rawVal === "boolean") {
      out[cleanKey] = rawVal;
    }
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Client helper untuk mencatat activation event ke /api/track/activation.
 * - Fire-and-forget: tidak memblok UI, no await
 * - Catch diam: tidak pernah melempar exception ke pemanggil
 * - 0 PII: hanya nama event, props tersanitasi, dan anonId
 */
export function trackActivationEvent(
  name: ActivationEventName | string,
  props?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;

  try {
    const anonId = getAnonIdSafe();
    const cleanProps = sanitizeActivationProps(props);

    const payload = JSON.stringify({
      event: name,
      props: cleanProps,
      anonId,
    });

    fetch("/api/track/activation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // Fire-and-forget catch diam
    });
  } catch {
    // Catch diam (mis. private mode / quota storage / restricted environment)
  }
}
