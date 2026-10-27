import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron-guard";
import { handleApiError } from "@/lib/api-error";
import { communityAgentService } from "@/domains/community-agent/community-agent.service";
import { withCronLogging } from "@/domains/cron-monitoring/with-cron-logging";

export async function POST(request: NextRequest) {
  const denied = requireCronSecret(request);
  if (denied) return denied;

  // ponytail: feature flag off. teknikal_robo was 182 of 183 posts with 0 organic
  // engagement; stopped to cut token cost. To restart: flip to true AND set
  // site_health.autoRemediate.noCommunityPosts back to true.
  const COMMUNITY_AGENT_ENABLED = false;
  if (!COMMUNITY_AGENT_ENABLED) {
    return NextResponse.json({ data: { skipped: "disabled" } });
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
