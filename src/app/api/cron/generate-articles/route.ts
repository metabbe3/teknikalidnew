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

      // 2. gen_trending_news DISABLED — AI news articles drove ~1 external view vs 32 for
      //    the free DAILY_SNAPSHOT templates (see analytics audit). AgentConfig.isEnabled
      //    is also false. To re-enable: restore the dispatch below + flip isEnabled to true.
      skipped.push("gen_trending_news: disabled (low-ROI AI content)");

      // 3. gen_movement_analysis DISABLED 2026-09-10 — 490 AI-generated articles
      //    earned 1 human view all-time (PageView data) while eating the worker
      //    queue for ~15 min/day. The daily brief + free templates cover it.
      //    To re-enable: restore dispatch + AgentConfig row.
      skipped.push("gen_movement_analysis: disabled (1 view / 490 articles)");

      // 4. Dispatch gen_daily_brief — market-wide brief featured on /berita.
      //    generateDailyBrief self-dedupes per WIB day, so double dispatch is safe.
      const isBriefRunning = await agentHubRepository.hasRunningJob("gen_daily_brief" as AgentType);
      if (isBriefRunning) {
        skipped.push("gen_daily_brief: already running");
      } else {
        const briefJob = await agentHubService.createJob({
          agentType: "gen_daily_brief" as AgentType,
          payload: {},
          priority: 4,
        });
        dispatched.push(`gen_daily_brief: ${briefJob.id}`);
      }

      return {
        status: 200,
        body: {
          data: {
            mode: "queue",
            dispatched: dispatched.length,
            jobs: dispatched,
            skipped,
            note: "DAILY_SNAPSHOT + Movement Analysis. Old snapshots auto-deleted at 01:30.",
          },
        } as Record<string, unknown>,
      };
    });
    return NextResponse.json(body, { status });
  } catch (error) {
    return handleApiError(error, "article generation dispatch");
  }
}
