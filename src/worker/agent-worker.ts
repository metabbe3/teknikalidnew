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

async function pollAndExecute() {
  try {
    const job = await agentHubRepository.findAndClaim();
    if (!job) return;

    const agentType = job.agentType as AgentType;
    console.log(`[Worker] Picked up job ${job.id} (${agentType})`);

    const agent = getAgent(agentType);
    const result = await agent.execute(job.payload);

    await agentHubRepository.updateJobDone(job.id, result);
    console.log(`[Worker] Completed job ${job.id} (${agentType})`);

    // Post-completion chaining: check if agent defines onComplete()
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

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n[Worker] Received ${signal}. Shutting down gracefully...`);
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

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
