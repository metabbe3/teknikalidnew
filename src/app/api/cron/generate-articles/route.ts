import { NextRequest, NextResponse } from "next/server";

/**
 * Generate Articles — DISABLED
 * Article generation (snapshots, news, evergreen, FAQ) is turned off.
 * Cron still hits this endpoint but it returns immediately.
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ data: { disabled: true, message: "Article generation is disabled" } });
}
