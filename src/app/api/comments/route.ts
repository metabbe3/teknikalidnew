import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/domains/auth/auth.service";
import { communityService } from "@/domains/community/community.service";
import { handleApiError } from "@/lib/api-error";

export async function POST(request: NextRequest) {
  try {
    const user = await authService.requireAuth();
    const body = await request.json();
    const { content, postId, stockTicker, parentId } = body;

    if (stockTicker) {
      const comment = await communityService.createStockComment(
        user.id,
        stockTicker,
        { content, parentId }
      );
      return NextResponse.json({ data: comment }, { status: 201 });
    }

    if (!postId) {
      return NextResponse.json(
        { error: "Either postId or stockTicker must be provided" },
        { status: 400 }
      );
    }

    const comment = await communityService.createPostComment(user.id, {
      content,
      postId,
      parentId,
    });
    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "create comment");
  }
}
