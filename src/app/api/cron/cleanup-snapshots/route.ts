import { NextRequest, NextResponse } from "next/server";
import { articleService } from "@/domains/article/article.service";
import { withCronLogging } from "@/domains/cron-monitoring/with-cron-logging";

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { status, body } = await withCronLogging("cleanup-snapshots", async () => {
      const result = await articleService.cleanupOldSnapshots();
      return { status: 200, body: { data: result } as Record<string, unknown> };
    });
    return NextResponse.json(body, { status });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}