import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error";
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
