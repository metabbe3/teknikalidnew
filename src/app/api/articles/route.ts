import { NextRequest, NextResponse } from "next/server";
import { articleRepository } from "@/domains/article/article.repository";
import { handleApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor") || undefined;
    const tag = searchParams.get("tag") || undefined;
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "12", 10),
      50
    );

    const rows = await articleRepository.findPublishedPaginated({
      cursor,
      limit,
      tag,
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return NextResponse.json({
      data: items,
      nextCursor: hasMore && items.length > 0 ? items[items.length - 1].id : null,
    });
  } catch (error) {
    return handleApiError(error, "fetch articles");
  }
}
