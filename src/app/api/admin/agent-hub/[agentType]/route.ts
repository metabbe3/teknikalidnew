import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error";
import { agentHubService } from "@/domains/agent-hub/agent-hub.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ agentType: string }> },
) {
  try {
    const { agentType } = await params;
    const detail = await agentHubService.getAgentDetail(agentType);
    const jobs = await agentHubService.getJobs({ agentType, limit: 20 });
    return NextResponse.json({ data: { ...detail, jobs } });
  } catch (error) {
    return handleApiError(error, "fetch agent detail");
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ agentType: string }> },
) {
  try {
    const { agentType } = await params;
    const job = await agentHubService.triggerAgent(agentType);
    return NextResponse.json({ data: job }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "trigger agent");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ agentType: string }> },
) {
  try {
    const { agentType } = await params;
    const body = await request.json();

    const updates: Record<string, unknown> = {};

    if (typeof body.isEnabled === "boolean") updates.isEnabled = body.isEnabled;
    if (typeof body.systemPrompt === "string" || body.systemPrompt === null) updates.systemPrompt = body.systemPrompt;
    if (typeof body.scheduleCron === "string" || body.scheduleCron === null) updates.scheduleCron = body.scheduleCron;
    if (body.scheduleMeta !== undefined) updates.scheduleMeta = body.scheduleMeta;
    if (body.config !== undefined) updates.config = body.config;

    // Handle "resetPrompt" action
    if (body.resetPrompt === true) {
      const config = await agentHubService.resetPrompt(agentType);
      return NextResponse.json({ data: config });
    }

    const config = await agentHubService.updateConfig(agentType, updates);
    return NextResponse.json({ data: config });
  } catch (error) {
    return handleApiError(error, "update agent config");
  }
}
