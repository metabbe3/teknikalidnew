import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/domains/auth/auth.service";
import { communityService } from "@/domains/community/community.service";
import { handleApiError } from "@/lib/api-error";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "20", 10),
      50
    );

    const result = await communityService.getStockTickerComments(
      ticker,
      cursor || undefined,
      limit
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "fetch stock comments");
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const user = await authService.requireAuth();
    const { ticker } = await params;
    const body = await request.json();
    const { content, parentId } = body;

    const comment = await communityService.createStockComment(
      user.id,
      ticker,
      { content, parentId }
    );
    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "create stock comment");
  }
}
