import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/ip-asn";
import { sanitizeWaitlistSource, normalizeWa, EMAIL_RE } from "@/lib/waitlist";

export const dynamic = "force-dynamic";

// In-memory rate limit (pola /api/public/engagement) — form publik.
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

export async function POST(req: NextRequest) {
  // CSRF: POST wajib same-origin (doctrine site).
  const origin = req.headers.get("origin");
  if (origin && !origin.startsWith("https://teknikal.id") && !origin.startsWith("http://localhost")) {
    return NextResponse.json({ ok: false, reason: "origin" }, { status: 403 });
  }
  const ip = getClientIp(req.headers);
  if (ip && rateLimited(ip)) {
    return NextResponse.json({ ok: false, reason: "rate" }, { status: 429 });
  }

  let body: { channel?: string; value?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  const channel = body.channel === "wa" ? "wa" : body.channel === "email" ? "email" : null;
  const value = String(body.value ?? "").trim();
  if (!channel || value.length < 5 || value.length > 255) {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  let stored: string;
  if (channel === "email") {
    if (!EMAIL_RE.test(value)) {
      return NextResponse.json({ ok: false, reason: "email" }, { status: 400 });
    }
    stored = value.toLowerCase();
  } else {
    const wa = normalizeWa(value);
    if (!wa.ok) {
      return NextResponse.json({ ok: false, reason: "wa" }, { status: 400 });
    }
    stored = wa.hashed!; // nomor plain tidak pernah disimpan
  }

  // AC2: attribution UTM — client kirim utm_source dari URL params; server
  // whitelist-sanitize (tidak trust client). Tanpa/invalid → "direct".
  const source = sanitizeWaitlistSource(body.source);

  try {
    const existing = await prisma.waitlistSubscriber.findUnique({ where: { value: stored } });
    if (existing) {
      const position = await prisma.waitlistSubscriber.count({ where: { createdAt: { lte: existing.createdAt } } });
      return NextResponse.json(
        { ok: false, reason: "duplicate", position },
        { status: 409 },
      );
    }
    const created = await prisma.waitlistSubscriber.create({
      data: { channel, value: stored, source },
    });
    const position = await prisma.waitlistSubscriber.count();
    return NextResponse.json({ ok: true, position, id: created.id });
  } catch {
    return NextResponse.json({ ok: false, reason: "server" }, { status: 500 });
  }
}

export async function GET() {
  // Public: posisi antrean utk social proof (angka saja, tanpa data pribadi).
  const count = await prisma.waitlistSubscriber.count().catch(() => 0);
  return NextResponse.json({ ok: true, count, goal: 300 });
}
