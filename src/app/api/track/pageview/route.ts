import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SKIP_PREFIXES = ["/admin", "/api", "/_next", "/auth"];

export async function POST(request: NextRequest) {
  try {
    const { path, referrer } = await request.json();

    if (!path || typeof path !== "string") {
      return new NextResponse(null, { status: 204 });
    }

    // Skip internal / admin paths
    if (SKIP_PREFIXES.some((prefix) => path.startsWith(prefix))) {
      return new NextResponse(null, { status: 204 });
    }

    // Get user ID from session (nullable for anonymous visitors)
    const session = await auth();
    const userId = session?.user?.id ?? null;

    // Extract IP from headers
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim()
      ?? request.headers.get("x-real-ip")
      ?? null;

    // Extract user agent
    const userAgent = request.headers.get("user-agent") ?? null;

    await prisma.pageView.create({
      data: {
        path,
        referrer: referrer ?? null,
        userId,
        ip,
        userAgent,
      },
    });
  } catch {
    // Fire-and-forget: never expose errors to the client
  }

  return new NextResponse(null, { status: 204 });
}
