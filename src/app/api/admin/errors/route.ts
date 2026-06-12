import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = request.nextUrl;
    const source = searchParams.get("source") ?? "all";
    const period = searchParams.get("period") ?? "24h";
    const search = searchParams.get("search")?.trim();
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);

    // Compute `since` based on period
    const now = new Date();
    const since = new Date(now);
    if (period === "7d") {
      since.setDate(since.getDate() - 7);
    } else if (period === "30d") {
      since.setDate(since.getDate() - 30);
    } else {
      // default: 24h
      since.setDate(since.getDate() - 1);
    }

    // Query CronLog and AgentJob in parallel
    const [cronLogs, agentJobs] = await Promise.all([
      prisma.cronLog.findMany({
        where: {
          status: "failed",
          startedAt: { gte: since },
        },
        orderBy: { startedAt: "desc" },
      }),
      prisma.agentJob.findMany({
        where: {
          status: "failed",
          createdAt: { gte: since },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Build unified error entries from CronLog
    const cronErrors = cronLogs.map((log) => ({
      id: String(log.id),
      source: "cron" as const,
      sourceName: log.jobName,
      message: log.errorMessage ?? "Unknown error",
      severity: "error" as const,
      createdAt: log.startedAt.toISOString(),
      context: {
        durationMs: log.durationMs,
        triggeredBy: log.triggeredBy,
      },
    }));

    // Build unified error entries from AgentJob
    const agentErrors = agentJobs.map((job) => ({
      id: job.id,
      source: "agent" as const,
      sourceName: job.agentType,
      message: job.error ?? "Unknown error",
      severity: "error" as const,
      createdAt: job.createdAt.toISOString(),
      context: {
        priority: job.priority,
      },
    }));

    // Merge into single array
    let errors = [...cronErrors, ...agentErrors];

    // Apply source filter
    if (source !== "all") {
      errors = errors.filter((e) => e.source === source);
    }

    // Apply search filter on message
    if (search) {
      const q = search.toLowerCase();
      errors = errors.filter((e) => e.message.toLowerCase().includes(q));
    }

    // Sort by createdAt descending
    errors.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    // Apply limit
    errors = errors.slice(0, limit);

    // Compute overview KPIs
    const totalErrors = cronErrors.length + agentErrors.length;
    const overview = {
      totalErrors,
      cronErrors: cronErrors.length,
      agentErrors: agentErrors.length,
    };

    return NextResponse.json({ data: { overview, errors } });
  } catch (error) {
    return handleApiError(error, "fetch admin errors");
  }
}
