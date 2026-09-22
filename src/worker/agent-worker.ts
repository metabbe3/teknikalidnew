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
const STUCK_JOB_TIMEOUT_MIN = 20; // Mark running jobs as failed after 20 min
const RECOVERY_INTERVAL_MS = 3 * 60_000; // Check for stuck jobs every 3 min

const AGENT_TIMEOUTS: Record<string, number> = {
  market_intel: 15,
  seo_optimizer: 20,
  gen_sourced_news: 20,
  gen_trending_news: 25,
  gen_evergreen: 20,
  content_expander: 20,
  seo_auditor: 15,
  growth_orchestrator: 5,
  internal_linker: 10,
  schema_builder: 5,
  growth_monitor: 5,
  // Movement batch takes 8-10+ min when many stocks move >3% — 10min cap was
  // killing 3/4 runs. 18 stays under STUCK_JOB_TIMEOUT_MIN (20).
  gen_movement_analysis: 18,
};

// Liveness heartbeat for the docker healthcheck (ops-2026-09-22-01).
// setInterval keeps firing while the event loop is healthy — agent jobs are
// async/await, so even a long LLM run never blocks it (no false kills).
function touchHeartbeat() {
  try {
    require("fs").writeFileSync("/tmp/worker-heartbeat", String(Date.now()));
  } catch {}
}

async function recoverStuckJobs() {
  try {
    await agentHubRepository.recoverStuckJobs(STUCK_JOB_TIMEOUT_MIN);
  } catch (error) {
    console.error(`[Worker] Stuck job recovery failed:`, error);
  }
}

async function pollAndExecute() {
  let job: Awaited<ReturnType<typeof agentHubRepository.findAndClaim>> = null;
  let agentType = "";

  try {
    job = await agentHubRepository.findAndClaim();
    if (!job) return;

    agentType = job.agentType;
    const timeoutMin = AGENT_TIMEOUTS[agentType] ?? 10;

    // Execute with timeout
    const result = await Promise.race([
      (async () => {
        const agent = getAgent(agentType as AgentType);
        if (!agent) {
          throw new Error(
            `Unknown agent type "${agentType}" — no agent registered. ` +
            `Remove any scheduled triggers for it.`
          );
        }
        return agent.execute(job!.payload as Record<string, unknown>);
      })(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Agent ${agentType} timed out after ${timeoutMin}min`)),
          timeoutMin * 60_000,
        ),
      ),
    ]);

    await agentHubRepository.updateJobDone(job.id, result);

    // Post-completion chaining: check if agent defines onComplete()
    const completedAgent = getAgent(agentType as AgentType);
    if (completedAgent?.onComplete) {
      try {
        const chainSpecs = await completedAgent.onComplete(result, job.id);
        if (chainSpecs && chainSpecs.length > 0) {
          for (const spec of chainSpecs) {
            await agentHubRepository.createJob({
              agentType: spec.agentType,
              payload: spec.payload,
              parentJobId: job.id,
              priority: spec.priority ?? 5,
            });
          }
        }
      } catch (chainError) {
        console.error(`[Worker] Chaining error for job ${job.id}:`, chainError);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[Worker] Error processing job ${job?.id ?? "unknown"} (${agentType || "unknown"}):`,
      message,
    );

    // Mark the specific job that was claimed as failed
    if (job) {
      try {
        await agentHubRepository.updateJobFailed(job.id, message);
      } catch (updateError) {
        console.error(`[Worker] Failed to update job ${job.id} status:`, updateError);
      }
    }
  }
}

async function main() {
  // Recover any stuck jobs from previous crash
  await recoverStuckJobs();

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    process.stderr.write(`\n[Worker] Received ${signal}. Shutting down gracefully...\n`);
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  // Periodic stuck job recovery
  const recoveryTimer = setInterval(recoverStuckJobs, RECOVERY_INTERVAL_MS);
  recoveryTimer.unref(); // Don't prevent process exit

  // Liveness heartbeat — see touchHeartbeat
  touchHeartbeat();
  const hbTimer = setInterval(touchHeartbeat, 60_000);
  hbTimer.unref(); // Don't prevent process exit

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
