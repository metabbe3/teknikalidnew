import { NextRequest, NextResponse } from "next/server";
import { articleRepository } from "@/domains/article/article.repository";
import { handleApiError } from "@/lib/api-error";
import { parseQuery, schemas } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const [data, error] = parseQuery(request.nextUrl.searchParams, schemas.articlesList);
    if (error) return error;

    const rows = await articleRepository.findPublishedPaginated({
      cursor: data.cursor,
      limit: data.limit,
      tag: data.tag,
      articleType: data.type ?? "DAILY_SNAPSHOT",
    });

    const hasMore = rows.length > data.limit;
    const items = hasMore ? rows.slice(0, data.limit) : rows;

    return NextResponse.json({
      data: items,
      nextCursor: hasMore && items.length > 0 ? items[items.length - 1].id : null,
    });
  } catch (error) {
    return handleApiError(error, "fetch articles");
  }
}
