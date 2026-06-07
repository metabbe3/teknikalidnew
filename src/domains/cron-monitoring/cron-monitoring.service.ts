import { cronMonitoringRepository } from "./cron-monitoring.repository";
import { CRON_JOB_REGISTRY } from "./cron-registry";

export const cronMonitoringService = {
  async logExecution(params: {
    jobName: string;
    status: "success" | "failed";
    startedAt: Date;
    durationMs: number;
    result?: Record<string, unknown>;
    errorMessage?: string;
    triggeredBy?: string;
  }) {
    try {
      return await cronMonitoringRepository.createLog({
        ...params,
        triggeredBy: params.triggeredBy ?? "cron",
      });
    } catch (err) {
      console.error(`[CronLog] Failed to write log for ${params.jobName}:`, err);
    }
  },

  async getDashboardData() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [overview, recentLogs, distinctJobNames] = await Promise.all([
      cronMonitoringRepository.getOverviewStats(twentyFourHoursAgo),
      cronMonitoringRepository.getRecentLogs(100),
      cronMonitoringRepository.getDistinctJobNames(sevenDaysAgo),
    ]);

    // Build per-job stats by joining registry with DB data
    const jobStats = await Promise.all(
      CRON_JOB_REGISTRY.map(async (job) => {
        const [stats, lastRun] = await Promise.all([
          cronMonitoringRepository.getJobStats(job.jobName, sevenDaysAgo),
          cronMonitoringRepository.getLastRun(job.jobName),
        ]);
        return {
          ...job,
          totalRuns7d: stats.total,
          successRate7d: stats.total > 0 ? Math.round((stats.successes / stats.total) * 100) : 0,
          avgDurationMs: stats.avgDurationMs,
          lastRun: lastRun
            ? {
                status: lastRun.status,
                startedAt: lastRun.startedAt.toISOString(),
                durationMs: lastRun.durationMs,
                triggeredBy: lastRun.triggeredBy,
              }
            : null,
          hasData: distinctJobNames.includes(job.jobName),
        };
      }),
    );

    return { overview, jobStats, recentLogs };
  },

  async getJobHistory(jobName: string) {
    return cronMonitoringRepository.getLogsByJob(jobName, 50);
  },

  async cleanup(olderThanDays = 90) {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    return cronMonitoringRepository.deleteOldLogs(cutoff);
  },
};
