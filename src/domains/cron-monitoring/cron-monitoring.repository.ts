import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export const cronMonitoringRepository = {
  async createLog(data: {
    jobName: string;
    status: string;
    startedAt: Date;
    durationMs: number;
    result?: Record<string, unknown>;
    errorMessage?: string;
    triggeredBy: string;
  }) {
    return prisma.cronLog.create({
      data: {
        jobName: data.jobName,
        status: data.status,
        startedAt: data.startedAt,
        durationMs: data.durationMs,
        result: data.result as Prisma.InputJsonValue ?? undefined,
        errorMessage: data.errorMessage,
        triggeredBy: data.triggeredBy,
      },
    });
  },

  async getRecentLogs(limit = 100) {
    return prisma.cronLog.findMany({
      orderBy: { startedAt: "desc" },
      take: limit,
    });
  },

  async getLastRun(jobName: string) {
    return prisma.cronLog.findFirst({
      where: { jobName },
      orderBy: { startedAt: "desc" },
    });
  },

  async getJobStats(jobName: string, since: Date) {
    const [total, successes, avgResult] = await Promise.all([
      prisma.cronLog.count({ where: { jobName, startedAt: { gte: since } } }),
      prisma.cronLog.count({ where: { jobName, status: "success", startedAt: { gte: since } } }),
      prisma.cronLog.aggregate({
        where: { jobName, status: "success", startedAt: { gte: since } },
        _avg: { durationMs: true },
      }),
    ]);
    return { total, successes, avgDurationMs: avgResult._avg.durationMs };
  },

  async getLogsByJob(jobName: string, limit = 50) {
    return prisma.cronLog.findMany({
      where: { jobName },
      orderBy: { startedAt: "desc" },
      take: limit,
    });
  },

  async getOverviewStats(since: Date) {
    const [total, successes, avgResult] = await Promise.all([
      prisma.cronLog.count({ where: { startedAt: { gte: since } } }),
      prisma.cronLog.count({ where: { status: "success", startedAt: { gte: since } } }),
      prisma.cronLog.aggregate({
        where: { status: "success", startedAt: { gte: since } },
        _avg: { durationMs: true },
      }),
    ]);
    return {
      total,
      successes,
      failed: total - successes,
      successRate: total > 0 ? Math.round((successes / total) * 100) : 0,
      avgDurationMs: avgResult._avg.durationMs,
    };
  },

  async getDistinctJobNames(since: Date) {
    const results = await prisma.cronLog.findMany({
      where: { startedAt: { gte: since } },
      select: { jobName: true },
      distinct: ["jobName"],
    });
    return results.map((r) => r.jobName);
  },

  async deleteOldLogs(olderThan: Date) {
    return prisma.cronLog.deleteMany({
      where: { startedAt: { lt: olderThan } },
    });
  },
};
