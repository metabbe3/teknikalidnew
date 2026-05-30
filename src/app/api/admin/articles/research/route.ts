import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { articleService } from "@/domains/article/article.service";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();

    if (!body.query) {
      return NextResponse.json({ error: "Provide a query/topic to research" }, { status: 400 });
    }

    const result = await articleService.researchTopic(body.query, body.context);
    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error, "research keywords");
  }
}
