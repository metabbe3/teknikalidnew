import { agentHubRepository } from "./agent-hub.repository";
import { AGENT_TYPES, AGENT_META } from "./agent-hub.types";
import type { AgentType, AgentJobPayload, AgentHubStats, AgentConfigRow } from "./agent-hub.types";
import { InvalidAgentTypeError, AgentJobNotFoundError, AgentAlreadyRunningError } from "./agent-hub.errors";

function validateAgentType(type: string): asserts type is AgentType {
  if (!AGENT_TYPES.includes(type as AgentType)) {
    throw new InvalidAgentTypeError(type);
  }
}

export const agentHubService = {
  createJob(params: {
    agentType: string;
    priority?: number;
    payload?: AgentJobPayload;
    maxAttempts?: number;
    parentJobId?: string;
  }) {
    validateAgentType(params.agentType);
    return agentHubRepository.createJob({
      agentType: params.agentType,
      priority: params.priority,
      payload: params.payload ?? {},
      maxAttempts: params.maxAttempts,
      parentJobId: params.parentJobId,
    });
  },

  async triggerAgent(agentType: string, payload?: AgentJobPayload) {
    validateAgentType(agentType);

    const isRunning = await agentHubRepository.hasRunningJob(agentType);
    if (isRunning) {
      throw new AgentAlreadyRunningError(agentType);
    }

    return agentHubRepository.createJob({
      agentType,
      priority: 3, // manual triggers get higher priority
      payload: payload ?? {},
    });
  },

  async cancelJob(id: string) {
    const job = await agentHubRepository.getJobById(id);
    if (!job) throw new AgentJobNotFoundError(id);
    if (job.status !== "pending" && job.status !== "running") {
      throw new Error(`Cannot cancel job with status: ${job.status}`);
    }
    await agentHubRepository.cancelJob(id);
  },

  async getJob(id: string) {
    const job = await agentHubRepository.getJobById(id);
    if (!job) throw new AgentJobNotFoundError(id);
    return job;
  },

  async getJobs(params: { agentType?: string; status?: string; limit?: number; offset?: number }) {
    if (params.agentType) validateAgentType(params.agentType);
    return agentHubRepository.getJobs(params as { agentType?: AgentType; status?: string; limit?: number; offset?: number });
  },

  async getHubStats(): Promise<AgentHubStats> {
    const stats = await agentHubRepository.getStats();

    const agents = await Promise.all(
      AGENT_TYPES.map(async (type) => {
        const agentStats = await agentHubRepository.getAgentStats(type);
        const meta = AGENT_META[type];
        return {
          type,
          label: meta.label,
          lastRun: agentStats.lastRun,
          lastStatus: agentStats.lastStatus as AgentHubStats["agents"][number]["lastStatus"],
          successRate: agentStats.totalRuns > 0
            ? Math.round((agentStats.successCount / agentStats.totalRuns) * 100)
            : 0,
          totalRuns: agentStats.totalRuns,
        };
      }),
    );

    const recentJobsResult = await agentHubRepository.getJobs({ limit: 10 });
    const configs = await agentHubRepository.getAllConfigs();

    return {
      ...stats,
      agents,
      recentJobs: recentJobsResult.jobs,
      configs,
    };
  },

  async getAgentDetail(agentType: string) {
    validateAgentType(agentType);
    const meta = AGENT_META[agentType];
    const agentStats = await agentHubRepository.getAgentStats(agentType);
    const lastJob = await agentHubRepository.getLatestJobByType(agentType);
    const isRunning = await agentHubRepository.hasRunningJob(agentType);
    const config = await agentHubRepository.getConfig(agentType);

    return {
      ...meta,
      ...agentStats,
      successRate: agentStats.totalRuns > 0
        ? Math.round((agentStats.successCount / agentStats.totalRuns) * 100)
        : 0,
      lastResult: lastJob?.result ?? null,
      lastError: lastJob?.error ?? null,
      isRunning,
      config,
    };
  },

  // ── Config management ──────────────────────────────────────────

  async getConfig(agentType: string): Promise<AgentConfigRow | null> {
    validateAgentType(agentType);
    return agentHubRepository.getConfig(agentType);
  },

  async updateConfig(agentType: string, updates: {
    isEnabled?: boolean;
    systemPrompt?: string | null;
    scheduleCron?: string | null;
    scheduleMeta?: Record<string, unknown> | null;
    config?: Record<string, unknown> | null;
  }): Promise<AgentConfigRow> {
    validateAgentType(agentType);
    return agentHubRepository.upsertConfig({ agentType, ...updates });
  },

  async resetPrompt(agentType: string): Promise<AgentConfigRow> {
    validateAgentType(agentType);
    return agentHubRepository.upsertConfig({ agentType, systemPrompt: null });
  },

  // ── Chaining ───────────────────────────────────────────────────

  async createChainedJob(params: {
    parentJobId: string;
    agentType: AgentType;
    payload: AgentJobPayload;
    priority?: number;
  }) {
    validateAgentType(params.agentType);
    return agentHubRepository.createJob({
      agentType: params.agentType,
      payload: params.payload,
      parentJobId: params.parentJobId,
      priority: params.priority ?? 5,
    });
  },

  async cleanup(daysOld?: number) {
    return agentHubRepository.cleanupOldJobs(daysOld);
  },
};
