import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error";
import { communityAgentService } from "@/domains/community-agent/community-agent.service";
import { withCronLogging } from "@/domains/cron-monitoring/with-cron-logging";

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  if (isWeekend) {
    return NextResponse.json({ data: { skipped: "weekend" } });
  }

  // Active hours: 08:00-21:00 WIB = 01:00-14:00 UTC
  const utcHour = now.getUTCHours();
  if (utcHour < 1 || utcHour >= 14) {
    return NextResponse.json({ data: { skipped: "outside active hours (08:00-21:00 WIB)" } });
  }

  try {
    const { status, body } = await withCronLogging("community-agent", async () => {
      const result = await communityAgentService.runAgent();
      return { status: 200, body: { data: result } as Record<string, unknown> };
    });
    return NextResponse.json(body, { status });
  } catch (error) {
    return handleApiError(error, "community agent run");
  }
}
