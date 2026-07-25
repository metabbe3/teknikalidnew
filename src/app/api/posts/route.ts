import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/domains/auth/auth.service";
import { communityService } from "@/domains/community/community.service";
import { auth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { parseBody, parseQuery, schemas } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const [data, error] = parseQuery(request.nextUrl.searchParams, schemas.postsFeed);
    if (error) return error;

    const session = await auth();
    const userId = session?.user?.id;

    const result = data.q
      ? await communityService.searchPosts({
          userId,
          query: data.q,
          ticker: data.ticker || undefined,
          cursor: data.cursor || undefined,
          limit: data.limit,
        })
      : data.tag
      ? await communityService.getFeedByTag({
          tag: data.tag,
          userId,
          cursor: data.cursor || undefined,
          limit: data.limit,
        })
      : await communityService.getFeed({
          userId,
          cursor: data.cursor || undefined,
          limit: data.limit,
          sort: data.sort || undefined,
          filter: data.filter || undefined,
        });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "fetch posts");
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authService.requireAuth();
    const [data, error] = await parseBody(request, schemas.createPost);
    if (error) return error;

    const post = await communityService.createPost(user.id, {
      content: data.content,
      tickerTag: data.tickerTag,
      predictionDirection: data.predictionDirection,
      predictionTarget: data.predictionTarget,
      imageUrl: data.imageUrl,
    });

    if (data.pollOptions && data.pollOptions.length >= 2) {
      await communityService.createPoll(post.id, data.pollOptions);
    }

    return NextResponse.json({ data: post }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "create post");
  }
}
