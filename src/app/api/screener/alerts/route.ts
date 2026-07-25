import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { screenerService } from "@/domains/screener/screener.service";

export async function GET() {
  try {
    const user = await requireAuth();
    const data = await screenerService.listAlerts(user.id);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error, "fetch screener alerts");
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { savedScreenerId, frequency } = body;

    if (!savedScreenerId || typeof savedScreenerId !== "string") {
      return NextResponse.json(
        { error: "savedScreenerId is required" },
        { status: 400 },
      );
    }

    const alert = await screenerService.createAlert(user.id, {
      savedScreenerId,
      frequency: frequency || "daily",
    });

    return NextResponse.json({ data: alert }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "create screener alert");
  }
}
