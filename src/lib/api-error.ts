import { NextResponse } from "next/server";
import { DomainError } from "@/lib/domain-error";

// tracking-audit G10: dynamic import — api-error dipakai luas, prisma tidak boleh cyclic
async function await_import_prisma() {
  const m = await import("@/lib/prisma");
  return { prisma: m.prisma };
}

export async function handleApiError(error: unknown, context: string): Promise<NextResponse> {
  if (error instanceof DomainError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }
  // Log full error server-side, return generic message to client in production
  console.error(`[API Error] ${context}:`, error instanceof Error ? error.stack ?? error.message : error);

  // tracking-audit G10: first-party error log (Rp0) — fire-and-forget, jangan pernah gagalkan response
  try {
    const { prisma } = await await_import_prisma();
    const msg = (error instanceof Error ? error.message : String(error)).slice(0, 500);
    const fp = `${context}:${msg}`.slice(0, 64);
    await prisma.appErrorLog.upsert({
      where: { fingerprint: fp },
      create: { fingerprint: fp, kind: "api", path: context.slice(0, 255), message: msg },
      update: { count: { increment: 1 }, updatedAt: new Date() },
    });
  } catch { /* silent — error log tak boleh bikin error baru */ }
  const message = process.env.NODE_ENV === "production"
    ? `Failed to ${context}`
    : error instanceof Error ? error.message : `Failed to ${context}`;
  return NextResponse.json({ error: message }, { status: 500 });
}
