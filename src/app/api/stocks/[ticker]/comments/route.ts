import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/domains/auth/auth.service";
import { communityService } from "@/domains/community/community.service";
import { handleApiError } from "@/lib/api-error";
import { parseQuery, parseBody, schemas } from "@/lib/validation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const [data, error] = parseQuery(request.nextUrl.searchParams, schemas.stockComments);
    if (error) return error;

    const result = await communityService.getStockTickerComments(
      ticker,
      data.cursor || undefined,
      data.limit
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
    const [data, error] = await parseBody(request, schemas.createStockComment);
    if (error) return error;

    const comment = await communityService.createStockComment(
      user.id,
      ticker,
      { content: data.content, parentId: data.parentId }
    );
    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "create stock comment");
  }
}
