import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error";
import { agentHubService } from "@/domains/agent-hub/agent-hub.service";
import { agentHubRepository } from "@/domains/agent-hub/agent-hub.repository";
import { withCronLogging } from "@/domains/cron-monitoring/with-cron-logging";
import type { AgentType } from "@/domains/agent-hub/agent-hub.types";

/**
 * Generate Articles — DAILY_SNAPSHOT + Trending News
 *
 * Generates DAILY_SNAPSHOT for all IDX tickers + trending news articles.
 * Old snapshots auto-deleted daily at 01:30 via cleanup cron.
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

      // 1. Dispatch gen_snapshots (daily snapshot for all tickers)
      const isSnapshotRunning = await agentHubRepository.hasRunningJob("gen_snapshots" as AgentType);
      if (isSnapshotRunning) {
        skipped.push("gen_snapshots: already running");
      } else {
        const job = await agentHubService.createJob({
          agentType: "gen_snapshots" as AgentType,
          payload: {},
          priority: 3,
        });
        dispatched.push(`gen_snapshots: ${job.id}`);
      }

      // 2. Dispatch gen_trending_news (3-5 news articles)
      const isNewsRunning = await agentHubRepository.hasRunningJob("gen_trending_news" as AgentType);
      if (isNewsRunning) {
        skipped.push("gen_trending_news: already running");
      } else {
        const newsJob = await agentHubService.createJob({
          agentType: "gen_trending_news" as AgentType,
          payload: { count: 3 },
          priority: 5,
        });
        dispatched.push(`gen_trending_news: ${newsJob.id}`);
      }

      return {
        status: 200,
        body: {
          data: {
            mode: "queue",
            dispatched: dispatched.length,
            jobs: dispatched,
            skipped,
            note: "DAILY_SNAPSHOT + Trending News (3 articles). Old snapshots auto-deleted at 01:30.",
          },
        } as Record<string, unknown>,
      };
    });
    return NextResponse.json(body, { status });
  } catch (error) {
    return handleApiError(error, "article generation dispatch");
  }
}
