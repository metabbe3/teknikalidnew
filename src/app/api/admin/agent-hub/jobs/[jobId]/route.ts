import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error";
import { requireAdmin } from "@/lib/auth-guard";
import { auditService } from "@/domains/audit/audit.service";
import { agentHubService } from "@/domains/agent-hub/agent-hub.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;
    const job = await agentHubService.getJob(jobId);
    return NextResponse.json({ data: job });
  } catch (error) {
    return handleApiError(error, "fetch agent job");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;
    await agentHubService.cancelJob(jobId);
    return NextResponse.json({ data: { cancelled: true } });
  } catch (error) {
    return handleApiError(error, "cancel agent job");
  }
}

// Retry a failed job: flips it back to pending so the worker re-executes it.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const user = await requireAdmin();
    const { jobId } = await params;

    const job = await agentHubService.getJob(jobId); // 404 via AgentJobNotFoundError
    await agentHubService.retryJob(jobId); // 400 if not failed, 409 if attempts exhausted

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    await auditService.log(
      user.id,
      "admin:retry_agent_job",
      { jobId, agentType: job.agentType, attempts: job.attempts },
      ip,
    );

    return NextResponse.json({
      data: { jobId, status: "pending", retriedAt: new Date().toISOString() },
    });
  } catch (error) {
    return handleApiError(error, "retry agent job");
  }
}
