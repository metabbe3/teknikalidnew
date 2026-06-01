import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { portfolioService } from "@/domains/portfolio/portfolio.service";

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { isPublic } = body;

    if (typeof isPublic !== "boolean") {
      return NextResponse.json(
        { error: "isPublic harus boolean" },
        { status: 400 },
      );
    }

    await portfolioService.setPrivacy(user.id, isPublic);
    return NextResponse.json({ data: { isPublic } });
  } catch (error) {
    return handleApiError(error, "update portfolio settings");
  }
}
