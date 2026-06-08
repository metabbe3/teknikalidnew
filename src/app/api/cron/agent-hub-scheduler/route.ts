import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error";
import { agentHubService } from "@/domains/agent-hub/agent-hub.service";
import { agentHubRepository } from "@/domains/agent-hub/agent-hub.repository";
import type { AgentType } from "@/domains/agent-hub/agent-hub.types";
import { withCronLogging } from "@/domains/cron-monitoring/with-cron-logging";

/**
 * Check if a cron expression should fire at the current time.
 * Supports basic cron patterns: minute hour dayOfMonth month dayOfWeek
 * This is a simple evaluator — only handles the patterns we use.
 */
function shouldFireNow(cron: string): boolean {
  const now = new Date();
  // Convert to WIB (UTC+7) — use a shifted Date so day rollover is correct
  const wibOffset = 7 * 60; // WIB offset in minutes
  const wibMs = now.getTime() + wibOffset * 60_000;
  const wibDate = new Date(wibMs);
  const wibHour = wibDate.getUTCHours();
  const wibMinute = wibDate.getUTCMinutes();
  const dayOfWeek = wibDate.getUTCDay(); // 0=Sun, 6=Sat (WIB-correct)

  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const [minutePart, hourPart, , , dowPart] = parts;

  // Check day of week
  if (dowPart !== "*") {
    const days = dowPart.split(",").flatMap((d) => {
      if (d.includes("-")) {
        const [start, end] = d.split("-").map(Number);
        const result: number[] = [];
        for (let i = start!; i <= end!; i++) result.push(i);
        return result;
      }
      return [Number(d)];
    });
    if (!days.includes(dayOfWeek)) return false;
  }

  // Check hour
  if (hourPart !== "*") {
    const hours = hourPart.split(",").flatMap((h) => {
      if (h.includes("-")) {
        const [start, end] = h.split("-").map(Number);
        const result: number[] = [];
        for (let i = start!; i <= end!; i++) result.push(i);
        return result;
      }
      return [Number(h)];
    });
    if (!hours.includes(wibHour)) return false;
  }

  // Check minute — handle */N pattern
  if (minutePart.startsWith("*/")) {
    const interval = Number(minutePart.slice(2));
    if (wibMinute % interval !== 0) return false;
  } else if (minutePart !== "*") {
    const minutes = minutePart.split(",").map(Number);
    // Allow ±2 minute tolerance for cron timing
    if (!minutes.some((m) => Math.abs(wibMinute - m) <= 2)) return false;
  }

  return true;
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { status, body } = await withCronLogging("agent-hub-scheduler", async () => {
      const created: string[] = [];
      const skipped: string[] = [];

      // Read enabled agents from AgentConfig
      const configs = await agentHubRepository.getEnabledAgents();

      for (const config of configs) {
        // Skip agents with no schedule (e.g., chained agents like content_quality)
        if (!config.scheduleCron) {
          skipped.push(`${config.agentType}: no schedule (chained/manual)`);
          continue;
        }

        if (!shouldFireNow(config.scheduleCron)) {
          skipped.push(`${config.agentType}: not scheduled for now`);
          continue;
        }

        // Check if agent is already running
        const isRunning = await agentHubRepository.hasRunningJob(config.agentType);
        if (isRunning) {
          skipped.push(`${config.agentType}: already running`);
          continue;
        }

        const job = await agentHubService.createJob({
          agentType: config.agentType as AgentType,
          priority: 5,
        });
        created.push(`${config.agentType}: ${job.id}`);
      }

      return {
        status: 200,
        body: {
          data: {
            scheduled: created.length,
            jobs: created,
            skipped,
          },
        } as Record<string, unknown>,
      };
    });
    return NextResponse.json(body, { status });
  } catch (error) {
    return handleApiError(error, "agent hub scheduler");
  }
}
