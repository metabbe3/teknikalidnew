import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getClientIp } from "@/lib/ip-asn";
import {
  isValidActivationEvent,
  sanitizeActivationProps,
} from "@/lib/activation-events";

export const dynamic = "force-dynamic";

/**
 * Rate limit in-memory Map:
 * Max 60 event/anonId/menit (Wave-7 Item 2).
 */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_EVENTS = 60;
const MAX_RATE_ENTRIES = 5000;

interface RateBucket {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, RateBucket>();

function gcRateBuckets(now: number): void {
  if (rateBuckets.size < MAX_RATE_ENTRIES) return;
  for (const [k, v] of rateBuckets) {
    if (v.resetAt < now) rateBuckets.delete(k);
  }
  if (rateBuckets.size >= MAX_RATE_ENTRIES) {
    const sorted = [...rateBuckets.entries()].sort(
      (a, b) => a[1].resetAt - b[1].resetAt,
    );
    for (let i = 0; i < Math.floor(sorted.length / 2); i++) {
      rateBuckets.delete(sorted[i][0]);
    }
  }
}

export function checkActivationRateLimit(
  key: string,
  limit: number = RATE_LIMIT_MAX_EVENTS,
  windowMs: number = RATE_LIMIT_WINDOW_MS,
): boolean {
  const now = Date.now();
  gcRateBuckets(now);

  let bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + windowMs };
    rateBuckets.set(key, bucket);
  }

  bucket.count += 1;
  return bucket.count <= limit;
}

/** Reset rate limit buckets (digunakan untuk selftest) */
export function _resetActivationRateLimitBuckets(): void {
  rateBuckets.clear();
}

/**
 * Ekstraksi anonId dari body, header x-anon-id, atau cookie eng_anon
 * Pola regex selaras dengan validation.ts dan /api/ai/stock
 */
function extractAnonId(req: NextRequest, bodyAnonId?: unknown): string | null {
  const candidates = [
    typeof bodyAnonId === "string" ? bodyAnonId : null,
    req.headers.get("x-anon-id"),
    req.cookies.get("eng_anon")?.value,
  ];

  for (const cand of candidates) {
    if (!cand) continue;
    const trimmed = cand.trim();
    if (/^(qa-[a-z0-9-]+|[a-f0-9-]{8,36})$/i.test(trimmed)) {
      return trimmed;
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  let rawBody: Record<string, unknown>;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Body JSON tidak valid" },
      { status: 400 },
    );
  }

  const { event, props, anonId: bodyAnonId } = rawBody;

  // 1. Validasi event string di whitelist ACTIVATION_EVENTS (reject lain, 400)
  if (!isValidActivationEvent(event)) {
    return NextResponse.json(
      { error: "Event tidak valid atau tidak terdaftar dalam whitelist" },
      { status: 400 },
    );
  }

  // 2. Ekstraksi identitas & rate-limit check
  const anonId = extractAnonId(req, bodyAnonId);
  const ip = getClientIp(req.headers) || "unknown";
  const rateKey = anonId ? `a:${anonId}` : `ip:${ip}`;

  if (!checkActivationRateLimit(rateKey)) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan event (rate limit 60/menit)" },
      { status: 429 },
    );
  }

  // 3. User session (jika terautentikasi)
  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session?.user?.id ?? null;
  } catch {
    // Auth fail-soft untuk event tracking
  }

  // 4. Sanitasi props (0 PII, max 5 key)
  const cleanProps = sanitizeActivationProps(props);

  // 5. Simpan ke ActivationEvent table
  try {
    await prisma.activationEvent.create({
      data: {
        event,
        props: cleanProps
          ? (cleanProps as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        anonId,
        userId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[track/activation] error:", err);
    return NextResponse.json(
      { error: "Gagal menyimpan event aktivasi" },
      { status: 500 },
    );
  }
}
