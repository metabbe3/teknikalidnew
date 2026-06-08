import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error";
import { agentHubService } from "@/domains/agent-hub/agent-hub.service";
import { agentHubRepository } from "@/domains/agent-hub/agent-hub.repository";
import { withCronLogging } from "@/domains/cron-monitoring/with-cron-logging";
import type { AgentType } from "@/domains/agent-hub/agent-hub.types";

/**
 * Generate Articles — Queue-based dispatch
 *
 * Instead of generating all articles in one long request, this endpoint
 * now dispatches individual jobs to the AgentJob queue. The worker picks
 * them up one at a time, ensuring no timeout issues.
 *
 * Each gen_* agent has an onComplete() hook that chains content_quality
 * review jobs for newly created DRAFT articles automatically.
 *
 * Old monolithic flow (20+ min) → New queue-based (5 jobs, ~5 min each)
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  const url = new URL(request.url);
  const countOverride = Number(url.searchParams.get("count")) || 5;
  const batchSize = Number(process.env.AI_DAILY_BATCH) || 2;
  const faqCount = Number(process.env.AI_DAILY_FAQ) || 3;

  try {
    const { status, body } = await withCronLogging("generate-articles", async () => {
      const dispatched: string[] = [];
      const skipped: string[] = [];

      // Build job list based on schedule
      const jobs: Array<{ agentType: AgentType; payload: Record<string, unknown>; priority: number }> = [];

      // 1. Snapshots — weekdays only
      if (!isWeekend) {
        jobs.push({ agentType: "gen_snapshots" as AgentType, payload: {}, priority: 3 });
      } else {
        skipped.push("gen_snapshots: weekend");
      }

      // 2. Sourced news from RSS
      jobs.push({ agentType: "gen_sourced_news" as AgentType, payload: { count: countOverride }, priority: 5 });

      // 3. AI trending news
      jobs.push({ agentType: "gen_trending_news" as AgentType, payload: { count: countOverride }, priority: 5 });

      // 4. Evergreen IDX40 analysis
      jobs.push({ agentType: "gen_evergreen" as AgentType, payload: { batchSize }, priority: 6 });

      // 5. FAQ generation
      jobs.push({ agentType: "gen_faq" as AgentType, payload: { count: faqCount }, priority: 7 });

      // Dispatch all jobs to the queue
      for (const jobSpec of jobs) {
        // Skip if already has a pending/running job of this type
        const isRunning = await agentHubRepository.hasRunningJob(jobSpec.agentType);
        if (isRunning) {
          skipped.push(`${jobSpec.agentType}: already running`);
          continue;
        }

        const job = await agentHubService.createJob({
          agentType: jobSpec.agentType,
          payload: jobSpec.payload,
          priority: jobSpec.priority,
        });
        dispatched.push(`${jobSpec.agentType}: ${job.id}`);
      }

      return {
        status: 200,
        body: {
          data: {
            mode: "queue",
            dispatched: dispatched.length,
            jobs: dispatched,
            skipped,
            note: "Jobs dispatched to AgentJob queue. Worker will process them one at a time. content_quality jobs are auto-chained via onComplete().",
          },
        } as Record<string, unknown>,
      };
    });
    return NextResponse.json(body, { status });
  } catch (error) {
    return handleApiError(error, "article generation dispatch");
  }
}
