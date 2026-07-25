import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/domains/auth/auth.service";
import { communityService } from "@/domains/community/community.service";
import { handleApiError } from "@/lib/api-error";
import { parseBody, schemas } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const user = await authService.requireAuth();
    const [data, error] = await parseBody(request, schemas.createComment);
    if (error) return error;

    if (data.stockTicker) {
      const comment = await communityService.createStockComment(
        user.id,
        data.stockTicker,
        { content: data.content, parentId: data.parentId }
      );
      return NextResponse.json({ data: comment }, { status: 201 });
    }

    const comment = await communityService.createPostComment(user.id, {
      content: data.content,
      postId: data.postId!,
      parentId: data.parentId,
    });
    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "create comment");
  }
}
