import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error";
import { requireAdmin } from "@/lib/auth-guard";
import { agentHubService } from "@/domains/agent-hub/agent-hub.service";

export async function GET() {
  try {
    await requireAdmin(); // security-audit 28 Okt: in-route guard (bukan cuma proxy gate)
    const stats = await agentHubService.getHubStats();
    return NextResponse.json({ data: stats });
  } catch (error) {
    return handleApiError(error, "fetch agent hub stats");
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(); // security-audit 28 Okt
    const body = await request.json();
    const { agentType, payload, priority } = body;

    if (!agentType) {
      return NextResponse.json({ error: "agentType is required" }, { status: 400 });
    }

    const job = await agentHubService.triggerAgent(agentType, payload);
    return NextResponse.json({ data: job }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "create agent job");
  }
}
