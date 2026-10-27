import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/stocks/[ticker]/feedback — vote 👍/👎 anonymous pada kartu verdict.
 * Owner 27 Okt: micro-feedback pasif (bukan popup). Pola FAQ vote.
 * Dedup: 1 vote per ipHash per ticker per hari (reset harian, tanpa akun).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  try {
    const { ticker: raw } = await params;
    const ticker = raw.toUpperCase();
    const body = await request.json().catch(() => ({}));
    const { isAccurate } = body ?? {};
    if (typeof isAccurate !== "boolean") {
      return NextResponse.json({ error: "isAccurate harus boolean" }, { status: 400 });
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";
    const ua = request.headers.get("user-agent") ?? "";
    const ipHash = createHash("sha256").update(`${ip}|${ua}`).digest("hex").slice(0, 32);

    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
    // satu vote per hari per ticker — yang terbaru menang (upsert semantics sederhana)
    const existing = await prisma.signalFeedback.findFirst({
      where: { ticker, ipHash, createdAt: { gte: dayAgo } },
      orderBy: { createdAt: "desc" },
    });
    if (existing) {
      await prisma.signalFeedback.update({
        where: { id: existing.id },
        data: { isAccurate },
      });
    } else {
      await prisma.signalFeedback.create({
        data: { ticker, isAccurate, ipHash },
      });
    }

    const agg = await prisma.signalFeedback.aggregate({
      where: { ticker },
      _count: { _all: true },
    });
    return NextResponse.json({ data: { ok: true, total: agg._count._all } });
  } catch (error) {
    return handleApiError(error, "signal feedback vote");
  }
}
