import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { screenerService } from "@/domains/screener/screener.service";
import { savedScreenerFiltersSchema } from "@/lib/validation";

export async function GET() {
  try {
    const user = await requireAuth();
    const data = await screenerService.listSaved(user.id);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error, "fetch saved screeners");
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { name, description, filters, tradingStyle } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 },
      );
    }

    if (!filters || typeof filters !== "object") {
      return NextResponse.json(
        { error: "Filters object is required" },
        { status: 400 },
      );
    }

    // AC2 (PRD idea-2026-10-03-1): whitelist screener-param keys + cap 512
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

    const screener = await screenerService.save(user.id, {
      name: name.trim(),
      description: description?.trim(),
      filters: parsedFilters.data,
      tradingStyle,
    });

    return NextResponse.json({ data: screener }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "save screener");
  }
}
