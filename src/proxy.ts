import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

const cspScriptSrc = process.env.NODE_ENV === "production"
  ? "script-src 'self' 'unsafe-inline' https://plausible.teknikal.id https://static.cloudflareinsights.com"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://plausible.teknikal.id https://static.cloudflareinsights.com";

const securityHeaders = {
  "Content-Security-Policy": [
    "default-src 'self'",
    cspScriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' ws: wss: https://plausible.teknikal.id",
    "frame-ancestors 'none'",
  ].join("; "),
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
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

const PROTECTED_PREFIXES = ["/dashboard", "/watchlist", "/profile"];
const ADMIN_LOGIN_ROUTE = "/admin/login";

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

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();

  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }

  // Cache immutable static assets (fonts, images with hashes)
  const pathname = request.nextUrl.pathname;
  if (pathname.match(/\.\w{8,}\.(js|css|woff2?|ttf|ico|png|jpg|svg|webp)$/)) {
    response.headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }

  // CDN cache for public HTML pages (5 min shared, stale-while-revalidate 10 min)
  // Browsers always revalidate (no max-age) but CDNs like Cloudflare cache aggressively
  const isHtmlPage = !pathname.startsWith("/api/") && !pathname.startsWith("/_next/") && !pathname.includes(".");
  const isAdminPage = pathname.startsWith("/admin") || pathname.startsWith("/dashboard") || pathname.startsWith("/profile/edit");
  if (isHtmlPage && !isAdminPage) {
    response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";

  if (isAuthRoute(request.nextUrl.pathname)) {
    if (rateLimited(authRateLimitMap, ip, AUTH_RATE_LIMIT, AUTH_RATE_WINDOW)) {
      return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
    }
  }

  if (request.nextUrl.pathname.startsWith("/api/") && !request.nextUrl.pathname.includes("/api/auth/session")) {
    if (rateLimited(rateLimitMap, ip, RATE_LIMIT, RATE_WINDOW)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
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
    const loginAt = (session.user as any).loginAt as number | undefined;
    const rememberMe = (session.user as any).rememberMe as boolean;
    if (loginAt) {
      const maxMs = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
      if (Date.now() - loginAt > maxMs) {
        if (request.nextUrl.pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        return NextResponse.redirect(new URL("/admin/login", request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
