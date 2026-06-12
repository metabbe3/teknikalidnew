import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { screenerService } from "@/domains/screener/screener.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const data = await screenerService.getSaved(user.id, id);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error, "fetch saved screener");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { name, description, filters, tradingStyle } = body;

    const data = await screenerService.updateSaved(user.id, id, {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() }),
      ...(filters !== undefined && { filters }),
      ...(tradingStyle !== undefined && { tradingStyle }),
    });

    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error, "update saved screener");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    await screenerService.deleteSaved(user.id, id);
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    return handleApiError(error, "delete saved screener");
  }
}
