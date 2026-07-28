import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { isBlocked, block as blockIp } from "@/lib/ip-blocklist";
import { recordApiRequest } from "@/lib/api-traffic-log";

const cspScriptSrc = process.env.NODE_ENV === "production"
  ? "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com";

const securityHeaders = {
  "Content-Security-Policy": [
    "default-src 'self'",
    cspScriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' ws: wss:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; "),
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
} as const;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 120;
const RATE_WINDOW = 60_000;
const MAX_ENTRIES = 10_000;

const authRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const AUTH_RATE_LIMIT = 10;
const AUTH_RATE_WINDOW = 60_000;

const registerRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const REGISTER_RATE_LIMIT = 5;  // 5 registrations per hour per IP
const REGISTER_RATE_WINDOW = 60 * 60_000;

// Stricter limit on scrape-prone stock data APIs + repeat-offender IP cooldown
const stockApiRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const STOCK_API_RATE_LIMIT = 60; // req/min/IP on /api/stocks/* etc.
const stockApiViolations = new Map<string, { count: number; resetAt: number }>();
const STOCK_API_VIOLATION_WINDOW = 10 * 60_000; // track repeat offenders over 10 min
const STOCK_API_BLOCK_WINDOW = 60 * 60_000; // 1h cooldown after 3 violations
const blockedIps = new Map<string, number>(); // ip → unblockAt (ms)

// Rate-limit + blocklist for the public /stocks/* HTML pages (the scrape surface).
const stockPageRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const STOCK_PAGE_RATE_LIMIT = 180; // req/min/IP — generous for humans/NAT, catches enumeration
const stockPageViolations = new Map<string, { count: number; resetAt: number }>();
const STOCK_PAGE_VIOLATION_WINDOW = 10 * 60_000; // track repeat offenders over 10 min
const STOCK_PAGE_BLOCK_WINDOW = 60 * 60_000; // 1h cooldown after 3 violations

// Dev/member scrape whitelist: IPs listed here (anon dev scripts) bypass the /stocks/*
// IP block. Logged-in users bypass it too (see the gate in proxy()). Comma-split env.
const WHITELIST_IPS = new Set(
  (process.env.SCRAPER_WHITELIST_IPS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

const PROTECTED_PREFIXES = ["/watchlist", "/profile"];
const ADMIN_LOGIN_ROUTE = "/admin/login";

// Old dashboard routes → new public routes
const DASHBOARD_REDIRECTS: Record<string, string> = {
  "/dashboard/billing": "/billing",
  "/dashboard/bottom-fishing": "/bottom-fishing",
  "/dashboard/market-structure": "/market-structure",
  "/dashboard/settings": "/settings",
  "/dashboard/trading-plan": "/trading-plan",
};

function rateLimited(map: Map<string, { count: number; resetAt: number }>, ip: string, limit: number, window: number): boolean {
  const now = Date.now();

  if (map.size > MAX_ENTRIES) {
    for (const [key, val] of map) {
      if (now > val.resetAt) map.delete(key);
    }
  }

  const entry = map.get(ip);

  if (!entry || now > entry.resetAt) {
    map.set(ip, { count: 1, resetAt: now + window });
    return false;
  }

  entry.count++;
  return entry.count > limit;
}

function isAuthRoute(pathname: string): boolean {
  return pathname.startsWith("/api/auth/") && !pathname.includes("session");
}

/**
 * Canonical URL enforcement — ensures all traffic resolves to a single
 * origin (https://teknikal.id) to prevent duplicate-content issues in
 * Google's index. Acts as defense-in-depth alongside Cloudflare redirects.
 *
 * Order: www→apex first, then http→https, so at most one redirect hop.
 */
const CANONICAL_HOST = "teknikal.id";

function buildCanonicalUrl(request: NextRequest): URL | null {
  const { hostname, pathname, search, port } = request.nextUrl;
  // Use x-forwarded-host (set by Cloudflare) — falls back to request hostname
  const forwardedHost = request.headers.get("x-forwarded-host");
  const effectiveHost = forwardedHost ?? hostname;
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");

  // Skip canonical enforcement for non-production hosts (localhost, Docker container IDs, etc.)
  const isProdHost = effectiveHost === CANONICAL_HOST || effectiveHost === `www.${CANONICAL_HOST}`;
  if (!isProdHost) return null;

  const isWww = effectiveHost.startsWith("www.");
  const isHttp = proto === "http";

  // No redirect needed if already canonical + https
  if (!isWww && !isHttp) return null;

  const targetHost = isWww ? effectiveHost.slice(4) : effectiveHost; // strip "www."
  const url = new URL(`${pathname}${search}`, `https://${targetHost}`);
  return url;
}

export async function proxy(request: NextRequest) {
  // ── Canonical redirect (www→apex, http→https) ──
  const canonicalUrl = buildCanonicalUrl(request);
  if (canonicalUrl) {
    return NextResponse.redirect(canonicalUrl, 308); // permanent
  }

  const response = NextResponse.next();

  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }

  const pathname = request.nextUrl.pathname;

  // CSRF protection: verify Origin/Referer for state-changing requests
  // Allow same-origin requests, reject cross-site POST/PUT/PATCH/DELETE
  const method = request.method.toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const host = request.headers.get("host");
    const allowedHosts = [host, "teknikal.id", "www.teknikal.id"];

    const isAllowed = (checkUrl: string | null) => {
      if (!checkUrl) return false;
      try {
        const parsed = new URL(checkUrl);
        return allowedHosts.some(h => h && parsed.host === h);
      } catch {
        return false;
      }
    };

    // Skip CSRF for payment webhooks (verified by signature), auth callbacks,
    // and cron endpoints (verified by Bearer CRON_SECRET, not cookies)
    const isExempt = pathname.startsWith("/api/payment/notification") ||
                     pathname.startsWith("/api/auth/") ||
                     pathname.startsWith("/api/cron/");

    if (!isExempt && !isAllowed(origin) && !isAllowed(referer)) {
      return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
    }
  }

  // Cache immutable static assets (fonts, images with hashes)
  if (pathname.match(/\.\w{8,}\.(js|css|woff2?|ttf|ico|png|jpg|svg|webp)$/)) {
    response.headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }

  // CDN cache for public HTML pages (5 min shared, stale-while-revalidate 10 min)
  // Browsers always revalidate (no max-age) but CDNs like Cloudflare cache aggressively
  const isHtmlPage = !pathname.startsWith("/api/") && !pathname.startsWith("/_next/") && !pathname.includes(".");
  const isAdminPage = pathname.startsWith("/admin") || pathname.startsWith("/profile/edit");
  if (isHtmlPage && !isAdminPage) {
    response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  }

  const ip = request.headers.get("cf-connecting-ip")?.trim()
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";

  if (isAuthRoute(request.nextUrl.pathname)) {
    if (rateLimited(authRateLimitMap, ip, AUTH_RATE_LIMIT, AUTH_RATE_WINDOW)) {
      return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
    }
  }

  // Stricter rate limit for registration endpoint
  if (request.nextUrl.pathname === "/api/auth/register") {
    if (rateLimited(registerRateLimitMap, ip, REGISTER_RATE_LIMIT, REGISTER_RATE_WINDOW)) {
      return NextResponse.json({ error: "Too many registration attempts" }, { status: 429 });
    }
  }

  if (request.nextUrl.pathname.startsWith("/api/") && !request.nextUrl.pathname.includes("/api/auth/session")) {
    if (rateLimited(rateLimitMap, ip, RATE_LIMIT, RATE_WINDOW)) {
      recordApiRequest(ip, request.nextUrl.pathname, 429);
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    recordApiRequest(ip, request.nextUrl.pathname, 200);
  }

  // Blocked-IP gate (DB-backed cache) — banned scrapers + escalated HTML violators.
  const isStockRoute = pathname.startsWith("/stocks/") || pathname.startsWith("/api/stocks/") || pathname.startsWith("/api/screener");
  if (isStockRoute && (await isBlocked(ip))) {
    // Dev/member whitelist: forgive a blocked IP if it's allowlisted (anon dev scripts)
    // or the request is authenticated (devs/members). Authed scrapers are still caught
    // by the pageview route's account-ban; the session revalidates from DB within ~60s.
    if (!WHITELIST_IPS.has(ip ?? "")) {
      const session = await auth();
      if (!session?.user) return new NextResponse(null, { status: 403 });
    }
  }

  // Stricter limit on scrape-prone stock data endpoints (+ IP cooldown for repeat offenders)
  const isStockApi = pathname.startsWith("/api/stocks/") || pathname.startsWith("/api/screener");
  if (isStockApi) {
    const blockedUntil = blockedIps.get(ip);
    if (blockedUntil && blockedUntil > Date.now()) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    if (blockedUntil) blockedIps.delete(ip); // expired block — clean up
    if (rateLimited(stockApiRateLimitMap, ip, STOCK_API_RATE_LIMIT, RATE_WINDOW)) {
      // record violation; escalate to a 1h block on 3 violations within 10 min
      const now = Date.now();
      const v = stockApiViolations.get(ip);
      const entry = !v || now > v.resetAt
        ? { count: 1, resetAt: now + STOCK_API_VIOLATION_WINDOW }
        : { count: v.count + 1, resetAt: v.resetAt };
      stockApiViolations.set(ip, entry);
      if (entry.count >= 3) {
        blockedIps.set(ip, now + STOCK_API_BLOCK_WINDOW);
      }
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  }

  // Rate-limit public /stocks/* HTML pages per IP (the scrape surface — previously unlimited).
  if (pathname.startsWith("/stocks/")) {
    if (rateLimited(stockPageRateLimitMap, ip, STOCK_PAGE_RATE_LIMIT, RATE_WINDOW)) {
      const now = Date.now();
      const v = stockPageViolations.get(ip);
      const entry = !v || now > v.resetAt
        ? { count: 1, resetAt: now + STOCK_PAGE_VIOLATION_WINDOW }
        : { count: v.count + 1, resetAt: v.resetAt };
      stockPageViolations.set(ip, entry);
      if (entry.count >= 3) {
        blockedIps.set(ip, now + STOCK_PAGE_BLOCK_WINDOW);
        blockIp(ip, "auto: stock-page scrape escalation", undefined, new Date(now + STOCK_PAGE_BLOCK_WINDOW)).catch(() => {});
      }
      return new NextResponse(null, { status: 429 });
    }
  }

  // Protected user routes — redirect to login if no session
  if (PROTECTED_PREFIXES.some(p => request.nextUrl.pathname.startsWith(p))) {
    const sessionToken =
      request.cookies.get("authjs.session-token") ??
      request.cookies.get("__Secure-authjs.session-token");
    if (!sessionToken) {
      const signInUrl = new URL("/auth/signin", request.url);
      signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Admin routes — check NextAuth session + ADMIN role
  const isAdminRoute =
    request.nextUrl.pathname.startsWith("/admin") &&
    request.nextUrl.pathname !== ADMIN_LOGIN_ROUTE;

  const isAdminApi =
    request.nextUrl.pathname.startsWith("/api/admin");

  if (isAdminRoute || isAdminApi) {
    const session = await auth();

    if (!session?.user) {
      if (request.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    // Always verify role from DB (JWT may be stale after role changes)
    if (session.user.role !== "ADMIN") {
      const { prisma } = await import("@/lib/prisma");
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      });
      if (!dbUser || dbUser.role !== "ADMIN") {
        if (request.nextUrl.pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        const denyUrl = new URL("/admin/login?error=access_denied", request.url);
        return NextResponse.redirect(denyUrl);
      }
    }

    // Enforce session timeout based on rememberMe choice
    // Admin sessions expire after 4 hours regardless of rememberMe
    const su = session.user as { loginAt?: number; rememberMe?: boolean };
    const loginAt = su.loginAt;
    const rememberMe = su.rememberMe;
    if (loginAt) {
      const maxMs = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 4 * 60 * 60 * 1000;
      if (Date.now() - loginAt > maxMs) {
        if (request.nextUrl.pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        return NextResponse.redirect(new URL("/admin/login", request.url));
      }
    }
  }

  // ── Stock page canonical: force /stocks/{TICKER}.JK (IDX only) ──
  // Crypto now lives under /crypto/*; a crypto ticker landing at /stocks/{X} is caught by
  // findStockByTicker's .JK-strip fallback + redirected to /crypto/{X} at the page level.
  const stockMatch = pathname.match(/^\/stocks\/([A-Z]{2,5})(\.(JK))?$/i);
  if (stockMatch) {
    const ticker = stockMatch[1].toUpperCase();
    const hasSuffix = !!stockMatch[2];
    const isCanonical = hasSuffix && stockMatch[1] === ticker && stockMatch[2] === ".JK";
    if (!isCanonical) {
      const url = request.nextUrl.clone();
      url.pathname = `/stocks/${ticker}.JK`;
      return NextResponse.redirect(url, 301);
    }
  }

  // Redirect old /dashboard/* routes → new public routes (308 permanent)
  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    return NextResponse.redirect(new URL("/", request.url), 308);
  }
  const dashTarget = DASHBOARD_REDIRECTS[pathname];
  if (dashTarget) {
    return NextResponse.redirect(new URL(dashTarget, request.url), 308);
  }
  // Catch-all: any other legacy /dashboard/* (e.g. /dashboard/portfolio) → home.
  // Without this, old indexed dashboard URLs that aren't in DASHBOARD_REDIRECTS 404.
  if (pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/", request.url), 308);
  }

  // Redirect old date-based snapshot URLs → evergreen (301 permanent)
  const redirectMatch = request.nextUrl.pathname.match(/^\/berita\/saham-([a-z]+)-\d+-[a-z]+-\d{4}$/);
  if (redirectMatch) {
    const url = request.nextUrl.clone();
    url.pathname = `/berita/saham-${redirectMatch[1]}`;
    return NextResponse.redirect(url, 301);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
