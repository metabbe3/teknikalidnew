import { cronMonitoringService } from "./cron-monitoring.service";

type CronHandlerResult = {
  status: number;
  body: Record<string, unknown>;
};

export async function withCronLogging(
  jobName: string,
  handler: () => Promise<CronHandlerResult>,
  options?: { triggeredBy?: string },
): Promise<CronHandlerResult> {
  const startedAt = new Date();
  const startMs = Date.now();

  try {
    const result = await handler();
    const durationMs = Date.now() - startMs;

    // Fire-and-forget logging — never block or fail the response
    cronMonitoringService.logExecution({
      jobName,
      status: result.status < 400 ? "success" : "failed",
      startedAt,
      durationMs,
      result: result.body,
      triggeredBy: options?.triggeredBy ?? "cron",
    });

    return result;
  } catch (error) {
    const durationMs = Date.now() - startMs;
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Fire-and-forget logging
    cronMonitoringService.logExecution({
      jobName,
      status: "failed",
      startedAt,
      durationMs,
      errorMessage,
      triggeredBy: options?.triggeredBy ?? "cron",
    });

    throw error;
  }
}
