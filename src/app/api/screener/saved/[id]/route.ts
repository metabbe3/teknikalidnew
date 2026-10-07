import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { screenerService } from "@/domains/screener/screener.service";
import { savedScreenerFiltersSchema } from "@/lib/validation";

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

    // AC2 (PRD idea-2026-10-03-1): same whitelist + cap on the update path
    let validatedFilters: Record<string, string> | undefined;
    if (filters !== undefined) {
      const parsedFilters = savedScreenerFiltersSchema.safeParse(filters);
      if (!parsedFilters.success) {
        return NextResponse.json(
          {
            error: "Invalid filters",
            details: parsedFilters.error.issues.map((i) => ({
              field: i.path.join("."),
              message: i.message,
            })),
          },
          { status: 400 },
        );
      }
      validatedFilters = parsedFilters.data;
    }

    const data = await screenerService.updateSaved(user.id, id, {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() }),
      ...(validatedFilters !== undefined && { filters: validatedFilters }),
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
