import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getClientIp } from "@/lib/ip-asn";
import {
  isValidActivationEvent,
  sanitizeActivationProps,
} from "@/lib/activation-events";
import { checkActivationRateLimit } from "./limiter";

export const dynamic = "force-dynamic";

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
