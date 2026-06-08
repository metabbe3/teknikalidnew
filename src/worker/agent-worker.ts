/**
 * Agent Worker — Background process that polls the AgentJob queue and executes agents.
 *
 * Run: npx tsx src/worker/agent-worker.ts
 * Or via LaunchAgent: scripts/com.teknikalid.agent-worker.plist
 */

import { prisma } from "@/lib/prisma";
import { getAgent } from "@/domains/agent-hub/agents";
import { agentHubRepository } from "@/domains/agent-hub/agent-hub.repository";
import type { AgentType } from "@/domains/agent-hub/agent-hub.types";

const POLL_INTERVAL_MS = 10_000; // 10 seconds
const STUCK_JOB_TIMEOUT_MIN = 30; // Mark running jobs as failed after 30 min
const RECOVERY_INTERVAL_MS = 5 * 60_000; // Check for stuck jobs every 5 min

async function recoverStuckJobs() {
  try {
    const recovered = await agentHubRepository.recoverStuckJobs(STUCK_JOB_TIMEOUT_MIN);
    if (recovered > 0) {
      console.log(`[Worker] Recovered ${recovered} stuck job(s)`);
    }
  } catch (error) {
    console.error(`[Worker] Stuck job recovery failed:`, error);
  }
}

async function pollAndExecute() {
  try {
    const job = await agentHubRepository.findAndClaim();
    if (!job) return;

    const agentType = job.agentType as AgentType;
    const timeoutMin =
      agentType === "market_intel" ? 15 :
      agentType === "seo_optimizer" ? 20 :
      agentType === "gen_sourced_news" ? 15 :
      agentType === "gen_trending_news" ? 15 :
      agentType === "gen_evergreen" ? 15 :
      agentType === "content_expander" ? 15 :
      agentType === "seo_auditor" ? 10 :
      agentType === "growth_orchestrator" ? 5 :
      agentType === "internal_linker" ? 10 :
      agentType === "schema_builder" ? 5 :
      agentType === "growth_monitor" ? 5 :
      10;
    console.log(`[Worker] Picked up job ${job.id} (${agentType})`);

    // Execute with timeout
    const result = await Promise.race([
      (async () => {
        const agent = getAgent(agentType);
        return agent.execute(job.payload);
      })(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Agent ${agentType} timed out after ${timeoutMin}min`)), timeoutMin * 60_000)
      ),
    ]);

    await agentHubRepository.updateJobDone(job.id, result);
    console.log(`[Worker] Completed job ${job.id} (${agentType})`);

    // Post-completion chaining: check if agent defines onComplete()
    const agent = getAgent(agentType);
    if (agent.onComplete) {
      try {
        const chainSpecs = await agent.onComplete(result, job.id);
        if (chainSpecs && chainSpecs.length > 0) {
          for (const spec of chainSpecs) {
            const chainedJob = await agentHubRepository.createJob({
              agentType: spec.agentType,
              payload: spec.payload,
              parentJobId: job.id,
              priority: spec.priority ?? 5,
            });
            console.log(`[Worker] Chained job ${chainedJob.id} (${spec.agentType}) from parent ${job.id}`);
          }
        }
      } catch (chainError) {
        console.error(`[Worker] Chaining error for job ${job.id}:`, chainError);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Worker] Error:`, message);

    // Try to find the running job and mark it failed
    try {
      const runningJobs = await prisma.agentJob.findMany({
        where: { status: "running" },
        orderBy: { startedAt: "desc" },
        take: 1,
      });
      if (runningJobs[0]) {
        await agentHubRepository.updateJobFailed(runningJobs[0].id, message);
        console.log(`[Worker] Marked job ${runningJobs[0].id} as failed`);
      }
    } catch (updateError) {
      console.error(`[Worker] Failed to update job status:`, updateError);
    }
  }
}

async function main() {
  console.log("[Worker] Agent Worker started. Polling for jobs...");
  console.log(`[Worker] Poll interval: ${POLL_INTERVAL_MS / 1000}s`);
  console.log(`[Worker] Stuck job timeout: ${STUCK_JOB_TIMEOUT_MIN}min`);

  // Recover any stuck jobs from previous crash
  await recoverStuckJobs();

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n[Worker] Received ${signal}. Shutting down gracefully...`);
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  // Periodic stuck job recovery
  const recoveryTimer = setInterval(recoverStuckJobs, RECOVERY_INTERVAL_MS);
  recoveryTimer.unref(); // Don't prevent process exit

  // Main polling loop
  while (true) {
    await pollAndExecute();
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

main().catch((error) => {
  console.error("[Worker] Fatal error:", error);
  process.exit(1);
});
