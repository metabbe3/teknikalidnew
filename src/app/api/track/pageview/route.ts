import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp, lookupAsn, isDatacenter } from "@/lib/ip-asn";
import { detectBot } from "@/lib/bot-detect";
import { isBlocked } from "@/lib/ip-blocklist";
import { moderationService } from "@/domains/moderation/moderation.service";
import { parseBody, schemas } from "@/lib/validation";

export const dynamic = "force-dynamic";

// /auth is tracked (signin/register/complete-profile) so the conversion funnel is measurable.
const SKIP_PREFIXES = ["/admin", "/api", "/_next"];

// ─── Bot Detection ───────────────────────────────────────────────────────────

// detectBot + BOT_UA_PATTERNS moved to @/lib/bot-detect (shared with /api/track/share).

/**
 * Distinct /stocks/ paths hit by an identity (userId OR ip) within a window.
 * De-dupes the beacon's double-fire so we measure a scraper's breadth, not its replay.
 */
async function distinctStockPaths(
  scope: { userId: string } | { ip: string },
  windowMs: number,
): Promise<number> {
  const rows = await prisma.pageView.findMany({
    where: {
      path: { startsWith: "/stocks/" },
      createdAt: { gte: new Date(Date.now() - windowMs) },
      ...scope,
    },
    select: { path: true },
    take: 200,
  });
  return new Set(rows.map((r) => r.path)).size;
}

// Scraping thresholds for the logged-in auto-suspend only.
// >6 distinct stocks in 5min OR (datacenter-flagged AND >15 distinct in 24h).
// Anonymous browsing is no longer auto-blocklisted — see POST() below.
const SCRAPE_BURST_LIMIT = 6;
const SCRAPE_DAILY_LIMIT = 15;

/**
 * On a logged-in user's pageview: backfill signupIp/Asn (flag if datacenter),
 * and auto-suspend datacenter-flagged accounts that scrape stock pages.
 * Fire-and-forget, fail-soft. Covers credentials + Google-OAuth signups.
 */
async function enrichSignupOrigin(userId: string, ip: string, path: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { signupIp: true, flaggedAt: true, bannedAt: true },
  });
  if (!user || user.bannedAt) return;

  // Backfill signup origin once
  let flagged = !!user.flaggedAt;
  if (!user.signupIp) {
    const info = await lookupAsn(ip);
    flagged = isDatacenter(info);
    await prisma.user.update({
      where: { id: userId },
      data: { signupIp: ip, signupAsn: info.asn, ...(flagged ? { flaggedAt: new Date() } : {}) },
    });
  }

  // Auto-suspend scrapers. A fast stock-page sweep (burst) bans ANY account
  // regardless of signup ASN — catches residential-proxy fleets that register with
  // clean IPs (e.g. the 2404:c0 accounts). The daily threshold stays datacenter-
  // gated: legit engaged users browse ~10 distinct tickers/day, so banning on daily
  // breadth alone risks false positives without the datacenter corroboration.
  if (path.startsWith("/stocks/")) {
    const [burst, daily] = await Promise.all([
      distinctStockPaths({ userId }, 5 * 60_000),
      distinctStockPaths({ userId }, 24 * 60 * 60_000),
    ]);
    if (burst > SCRAPE_BURST_LIMIT || (flagged && daily > SCRAPE_DAILY_LIMIT)) {
      await moderationService.banUser(
        userId,
        `auto: scraping (${burst} distinct stocks/5min, ${daily}/24h)`,
        ip,
      );
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const [data, error] = await parseBody(request, schemas.pageview);
    if (error) return error;

    // Skip internal / admin paths
    if (SKIP_PREFIXES.some((prefix) => data.path.startsWith(prefix))) {
      return new NextResponse(null, { status: 204 });
    }

    // Get user ID from session (nullable for anonymous visitors)
    const session = await auth();
    const userId = session?.user?.id ?? null;

    // Extract IP from headers (prefer Cloudflare's true client IP)
    const ip = getClientIp(request.headers);

    // Extract user agent
    const userAgent = request.headers.get("user-agent") ?? null;

    // Detect bot (async: includes a cached ASN lookup). Blocklisted IPs (e.g. the
    // 2404:c0 fleet) are tagged too — their beacons still fire on client-side nav
    // even when the data requests 403, which used to pollute human stats.
    const [{ isBot }, blocked] = await Promise.all([
      detectBot(userAgent, ip),
      ip ? isBlocked(ip) : Promise.resolve(false),
    ]);

    await prisma.pageView.create({
      data: {
        path: data.path,
        referrer: data.referrer ?? null,
        userId,
        ip,
        userAgent,
        isBot: isBot || blocked,
      },
    });

    // Auto-suspend scrapers (fire-and-forget). Only logged-in fast-sweepers are
    // banned; anonymous stock-page browsing is left alone to avoid false-positive
    // locks on real visitors. Residual bot protection: proxy rate limits + the
    // 2404:c0 prefix block in ip-blocklist.ts.
    if (userId && ip) {
      enrichSignupOrigin(userId, ip, data.path).catch(() => {});
    }
  } catch {
    // Fire-and-forget: never expose errors to the client
  }

  return new NextResponse(null, { status: 204 });
}
