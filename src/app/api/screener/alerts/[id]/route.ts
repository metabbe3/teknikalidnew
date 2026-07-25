import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { screenerService } from "@/domains/screener/screener.service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const alert = await screenerService.updateAlert(user.id, id, body);
    return NextResponse.json({ data: alert });
  } catch (error) {
    return handleApiError(error, "update screener alert");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    await screenerService.deleteAlert(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "delete screener alert");
  }
}
