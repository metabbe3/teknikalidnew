import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { morningDeltaService } from "@/domains/stock/morning-delta.service";

export async function GET() {
  try {
    const user = await requireAuth();
    const data = await morningDeltaService.getMorningDelta(user.id);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error, "fetch morning delta");
  }
}
