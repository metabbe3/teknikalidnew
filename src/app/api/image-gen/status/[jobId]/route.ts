import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/domains/auth/auth.service";
import { imageGenService } from "@/domains/image-gen/image-gen.service";
import { handleApiError } from "@/lib/api-error";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await authService.requireAuth();
    const { jobId } = await params;

    const result = await imageGenService.getJobStatus(jobId, user.id);
    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error, "check image status");
  }
}
