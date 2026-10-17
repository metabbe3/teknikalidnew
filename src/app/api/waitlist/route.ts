import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/ip-asn";

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

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,24}$/;

/** Normalisasi nomor WA Indonesia -> hash (privasi: nomor plain tidak disimpan
 *  untuk channel wa; email disimpan plain karena diperlukan utk kirim). */
function normalizeWa(raw: string): { ok: boolean; hashed?: string; pretty?: string } {
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  if (!digits.startsWith("62")) digits = "62" + digits;
  if (!/^62\d{8,13}$/.test(digits)) return { ok: false };
  const hashed = createHash("sha256").update(digits).digest("hex");
  return { ok: true, hashed, pretty: "+" + digits };
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

  let body: { channel?: string; value?: string };
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
      data: { channel, value: stored, source: "waitlist-landing" },
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
