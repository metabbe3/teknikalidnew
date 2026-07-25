import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { thesisService } from "@/domains/thesis/thesis.service";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ ticker: string }> }) {
  try {
    const user = await requireAuth();
    const { ticker } = await params;
    await thesisService.deleteThesis(user.id, decodeURIComponent(ticker));
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    return handleApiError(error, "delete thesis");
  }
}
