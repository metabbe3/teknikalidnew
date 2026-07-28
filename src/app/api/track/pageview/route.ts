import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp, lookupAsn, isDatacenter } from "@/lib/ip-asn";
import { detectBot } from "@/lib/bot-detect";
import { block as blockIp } from "@/lib/ip-blocklist";
import { moderationService } from "@/domains/moderation/moderation.service";
import { parseBody, schemas } from "@/lib/validation";

export const dynamic = "force-dynamic";

const SKIP_PREFIXES = ["/admin", "/api", "/_next", "/auth"];

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

// Scraping thresholds shared by the logged-in auto-suspend and the anon auto-block.
// >6 distinct stocks in 5min OR >15 distinct in 24h.
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

  // Auto-suspend: flagged account scraping stock pages.
  if (flagged && path.startsWith("/stocks/")) {
    const [burst, daily] = await Promise.all([
      distinctStockPaths({ userId }, 5 * 60_000),
      distinctStockPaths({ userId }, 24 * 60 * 60_000),
    ]);
    if (burst > SCRAPE_BURST_LIMIT || daily > SCRAPE_DAILY_LIMIT) {
      await moderationService.banUser(
        userId,
        `auto: scraping (${burst} distinct stocks/5min, ${daily}/24h)`,
        ip,
      );
    }
  }
}

/**
 * Anonymous datacenter IP scraping stock pages → blocklist. Same thresholds as the
 * logged-in auto-suspend. The proxy already enforces isBlocked on /stocks/ +
 * /api/stocks/ + /api/screener, so the next request from this IP is 403'd. Catches
 * slow anonymous cloud crawlers (e.g. the Hetzner stock scraper) that stay under
 * the proxy's per-minute rate limit. Fire-and-forget, fail-soft.
 */
async function blockAnonDatacenterScraper(ip: string, path: string) {
  if (!path.startsWith("/stocks/")) return;
  const [burst, daily] = await Promise.all([
    distinctStockPaths({ ip }, 5 * 60_000),
    distinctStockPaths({ ip }, 24 * 60 * 60_000),
  ]);
  if (burst > SCRAPE_BURST_LIMIT || daily > SCRAPE_DAILY_LIMIT) {
    await blockIp(
      ip,
      `auto: anon datacenter scrape (${burst} distinct stocks/5min, ${daily}/24h)`,
    );
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

    // Detect bot (async: includes a cached ASN lookup for datacenter detection)
    const { isBot, datacenter } = await detectBot(userAgent, ip);

    await prisma.pageView.create({
      data: {
        path: data.path,
        referrer: data.referrer ?? null,
        userId,
        ip,
        userAgent,
        isBot,
      },
    });

    // Capture signup origin + auto-suspend datacenter-flagged scrapers (fire-and-forget).
    // For anonymous datacenter IPs, auto-blocklist on stock-page enumeration.
    if (userId && ip) {
      enrichSignupOrigin(userId, ip, data.path).catch(() => {});
    } else if (!userId && ip && datacenter) {
      blockAnonDatacenterScraper(ip, data.path).catch(() => {});
    }
  } catch {
    // Fire-and-forget: never expose errors to the client
  }

  return new NextResponse(null, { status: 204 });
}
