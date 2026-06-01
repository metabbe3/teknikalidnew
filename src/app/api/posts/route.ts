import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/domains/auth/auth.service";
import { communityService } from "@/domains/community/community.service";
import { auth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "20", 10),
      50
    );
    const sort = searchParams.get("sort") as "trending" | null;
    const filter = searchParams.get("filter") as "following" | null;
    const q = searchParams.get("q");
    const ticker = searchParams.get("ticker");
    const tag = searchParams.get("tag");

    const session = await auth();
    const userId = session?.user?.id;

    const result = q
      ? await communityService.searchPosts({
          userId,
          query: q,
          ticker: ticker || undefined,
          cursor: cursor || undefined,
          limit,
        })
      : tag
      ? await communityService.getFeedByTag({
          tag,
          userId,
          cursor: cursor || undefined,
          limit,
        })
      : await communityService.getFeed({
          userId,
          cursor: cursor || undefined,
          limit,
          sort: sort || undefined,
          filter: filter || undefined,
        });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "fetch posts");
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authService.requireAuth();
    const body = await request.json();
    const { content, tickerTag, predictionDirection, predictionTarget, imageUrl, pollOptions } = body;

    const post = await communityService.createPost(user.id, {
      content,
      tickerTag,
      predictionDirection,
      predictionTarget,
      imageUrl,
    });

    if (pollOptions && pollOptions.length >= 2) {
      await communityService.createPoll(post.id, pollOptions);
    }

    return NextResponse.json({ data: post }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "create post");
  }
}
