import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { geoLookup } from "@/lib/geo-prefixes";
import { requireAdmin } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/views-geo?days=7 — country breakdown of human pageviews.
 * LABEL-ONLY by design (owner decision 2026-09-27): no filtering/discard,
 * unknown stays "??" — data reliability over guessing (NORTH STAR).
 */
export async function GET(request: NextRequest) {
  await requireAdmin();
  const days = Math.min(Math.max(Number(request.nextUrl.searchParams.get("days")) || 7, 1), 90);
  const rows = await prisma.$queryRaw<{ ip: string; n: bigint }[]>`
    SELECT ip, count(*) AS n
    FROM "PageView"
    WHERE "isBot" = false
      AND "createdAt" >= (now() - (${days} || ' days')::interval)
    GROUP BY ip
  `;
  const byCountry = new Map<string, number>();
  for (const r of rows) {
    const cc = geoLookup(r.ip);
    byCountry.set(cc, (byCountry.get(cc) ?? 0) + Number(r.n));
  }
  const breakdown = [...byCountry.entries()]
    .map(([country, views]) => ({ country, views }))
    .sort((a, b) => b.views - a.views);
  const total = breakdown.reduce((s, b) => s + b.views, 0);
  return NextResponse.json({
    days,
    total,
    breakdown: breakdown.map((b) => ({ ...b, pct: Number(((b.views / total) * 100).toFixed(1)) })),
  });
}
