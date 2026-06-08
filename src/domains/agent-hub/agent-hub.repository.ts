import { prisma } from "@/lib/prisma";
import type { AgentType, AgentJobRow, AgentJobPayload, AgentJobResult, AgentConfigRow } from "./agent-hub.types";

function toRow(row: Record<string, unknown>): AgentJobRow {
  return row as unknown as AgentJobRow;
}

export const agentHubRepository = {
  async createJob(params: {
    agentType: AgentType;
    priority?: number;
    payload: AgentJobPayload;
    maxAttempts?: number;
    parentJobId?: string;
  }): Promise<AgentJobRow> {
    const job = await prisma.agentJob.create({
      data: {
        agentType: params.agentType,
        priority: params.priority ?? 5,
        payload: params.payload as any,
        maxAttempts: params.maxAttempts ?? 3,
        parentJobId: params.parentJobId,
      },
    });
    return toRow(job);
  },

  async findAndClaim(): Promise<AgentJobRow | null> {
    // PostgreSQL FOR UPDATE SKIP LOCKED for safe concurrent worker polling
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      UPDATE "AgentJob"
      SET status = 'running', "startedAt" = NOW(), attempts = attempts + 1, "updatedAt" = NOW()
      WHERE id = (
        SELECT id FROM "AgentJob"
        WHERE status = 'pending'
        ORDER BY priority ASC, "createdAt" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `;
    return rows.length > 0 ? toRow(rows[0]!) : null;
  },

  async updateJobDone(id: string, result: AgentJobResult): Promise<void> {
    await prisma.agentJob.update({
      where: { id },
      data: {
        status: "done",
        result: result as any,
        completedAt: new Date(),
      },
    });
  },

  async updateJobFailed(id: string, error: string): Promise<void> {
    const job = await prisma.agentJob.findUnique({ where: { id } });
    if (!job) return;

    const shouldRetry = job.attempts < job.maxAttempts;
    await prisma.agentJob.update({
      where: { id },
      data: {
        status: shouldRetry ? "pending" : "failed",
        error,
        completedAt: shouldRetry ? null : new Date(),
      },
    });
  },

  async cancelJob(id: string): Promise<void> {
    await prisma.agentJob.update({
      where: { id },
      data: { status: "cancelled", completedAt: new Date() },
    });
  },

  async getJobById(id: string): Promise<AgentJobRow | null> {
    const job = await prisma.agentJob.findUnique({ where: { id } });
    return job ? toRow(job) : null;
  },

  async getJobs(params: {
    agentType?: AgentType;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: AgentJobRow[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (params.agentType) where.agentType = params.agentType;
    if (params.status) where.status = params.status;

    const [jobs, total] = await Promise.all([
      prisma.agentJob.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: params.limit ?? 50,
        skip: params.offset ?? 0,
      }),
      prisma.agentJob.count({ where }),
    ]);

    return { jobs: jobs.map(toRow), total };
  },

  async getStats(): Promise<{
    totalJobs: number;
    pendingJobs: number;
    runningJobs: number;
    completedJobs: number;
    failedJobs: number;
  }> {
    const [totalJobs, pendingJobs, runningJobs, completedJobs, failedJobs] = await Promise.all([
      prisma.agentJob.count(),
      prisma.agentJob.count({ where: { status: "pending" } }),
      prisma.agentJob.count({ where: { status: "running" } }),
      prisma.agentJob.count({ where: { status: "done" } }),
      prisma.agentJob.count({ where: { status: "failed" } }),
    ]);
    return { totalJobs, pendingJobs, runningJobs, completedJobs, failedJobs };
  },

  async getLatestJobByType(agentType: AgentType): Promise<AgentJobRow | null> {
    const job = await prisma.agentJob.findFirst({
      where: { agentType, status: { in: ["done", "failed"] } },
      orderBy: { completedAt: "desc" },
    });
    return job ? toRow(job) : null;
  },

  async getAgentStats(agentType: AgentType): Promise<{
    totalRuns: number;
    successCount: number;
    lastRun: Date | null;
    lastStatus: string | null;
  }> {
    const [totalRuns, successResult, lastJob] = await Promise.all([
      prisma.agentJob.count({ where: { agentType, status: { in: ["done", "failed"] } } }),
      prisma.agentJob.count({ where: { agentType, status: "done" } }),
      prisma.agentJob.findFirst({
        where: { agentType, status: { in: ["done", "failed"] } },
        orderBy: { completedAt: "desc" },
      }),
    ]);

    return {
      totalRuns,
      successCount: successResult,
      lastRun: lastJob?.completedAt ?? null,
      lastStatus: lastJob?.status ?? null,
    };
  },

  async hasRunningJob(agentType: AgentType): Promise<boolean> {
    const count = await prisma.agentJob.count({
      where: { agentType, status: "running" },
    });
    return count > 0;
  },

  /**
   * Recover jobs that have been stuck in "running" state for too long.
   * These are jobs where the worker crashed mid-execution.
   */
  async recoverStuckJobs(timeoutMinutes: number = 30): Promise<number> {
    const cutoff = new Date();
    cutoff.setMinutes(cutoff.getMinutes() - timeoutMinutes);

    const result = await prisma.agentJob.updateMany({
      where: {
        status: "running",
        startedAt: { lt: cutoff },
      },
      data: {
        status: "failed",
        error: `Job timed out: stuck in "running" for >${timeoutMinutes}min (auto-recovered)`,
        completedAt: new Date(),
      },
    });
    return result.count;
  },

  async cleanupOldJobs(daysOld: number = 30): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);

    const result = await prisma.agentJob.deleteMany({
      where: {
        status: { in: ["done", "failed", "cancelled"] },
        completedAt: { lt: cutoff },
      },
    });
    return result.count;
  },

  // ── AgentConfig CRUD ──────────────────────────────────────────

  async getConfig(agentType: AgentType): Promise<AgentConfigRow | null> {
    const config = await prisma.agentConfig.findUnique({ where: { agentType } });
    if (!config) return null;
    return config as unknown as AgentConfigRow;
  },

  async getAllConfigs(): Promise<AgentConfigRow[]> {
    const configs = await prisma.agentConfig.findMany();
    return configs as unknown as AgentConfigRow[];
  },

  async upsertConfig(params: {
    agentType: AgentType;
    isEnabled?: boolean;
    systemPrompt?: string | null;
    scheduleCron?: string | null;
    scheduleMeta?: Record<string, unknown> | null;
    config?: Record<string, unknown> | null;
  }): Promise<AgentConfigRow> {
    const result = await prisma.agentConfig.upsert({
      where: { agentType: params.agentType },
      update: {
        ...(params.isEnabled !== undefined ? { isEnabled: params.isEnabled } : {}),
        ...(params.systemPrompt !== undefined ? { systemPrompt: params.systemPrompt } : {}),
        ...(params.scheduleCron !== undefined ? { scheduleCron: params.scheduleCron } : {}),
        ...(params.scheduleMeta !== undefined ? { scheduleMeta: params.scheduleMeta as any } : {}),
        ...(params.config !== undefined ? { config: params.config as any } : {}),
      },
      create: {
        agentType: params.agentType,
        isEnabled: params.isEnabled ?? true,
        systemPrompt: params.systemPrompt ?? null,
        scheduleCron: params.scheduleCron ?? null,
        scheduleMeta: params.scheduleMeta as any ?? null,
        config: params.config as any ?? null,
      },
    });
    return result as unknown as AgentConfigRow;
  },

  async getEnabledAgents(): Promise<AgentConfigRow[]> {
    const configs = await prisma.agentConfig.findMany({ where: { isEnabled: true } });
    return configs as unknown as AgentConfigRow[];
  },
};
