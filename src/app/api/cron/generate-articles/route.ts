import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error";
import { agentHubService } from "@/domains/agent-hub/agent-hub.service";
import { agentHubRepository } from "@/domains/agent-hub/agent-hub.repository";
import { withCronLogging } from "@/domains/cron-monitoring/with-cron-logging";
import type { AgentType } from "@/domains/agent-hub/agent-hub.types";

/**
 * Generate Articles — DAILY_SNAPSHOT only
 *
 * Only generates DAILY_SNAPSHOT articles for all IDX tickers.
 * Other generators (news, evergreen, FAQ) remain disabled.
 * Old snapshots are auto-deleted daily at 01:30 via cleanup cron.
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;

  try {
    const { status, body } = await withCronLogging("generate-articles", async () => {
      const dispatched: string[] = [];
      const skipped: string[] = [];

      // Skip weekends — no stock data
      if (isWeekend) {
        return {
          status: 200,
          body: {
            data: { mode: "queue", dispatched: 0, jobs: [], skipped: ["weekend"], note: "Skipped — weekend" },
          } as Record<string, unknown>,
        };
      }

      // Only dispatch gen_snapshots
      const isRunning = await agentHubRepository.hasRunningJob("gen_snapshots" as AgentType);
      if (isRunning) {
        skipped.push("gen_snapshots: already running");
      } else {
        const job = await agentHubService.createJob({
          agentType: "gen_snapshots" as AgentType,
          payload: {},
          priority: 3,
        });
        dispatched.push(`gen_snapshots: ${job.id}`);
      }

      return {
        status: 200,
        body: {
          data: {
            mode: "queue",
            dispatched: dispatched.length,
            jobs: dispatched,
            skipped,
            note: "DAILY_SNAPSHOT only. Old articles auto-deleted at 01:30.",
          },
        } as Record<string, unknown>,
      };
    });
    return NextResponse.json(body, { status });
  } catch (error) {
    return handleApiError(error, "article generation dispatch");
  }
}
