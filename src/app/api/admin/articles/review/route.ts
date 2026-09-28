import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { articleService } from "@/domains/article/article.service";
import { handleApiError } from "@/lib/api-error";

// GET /api/admin/articles/review — PUBLISHED articles awaiting editor sign-off.
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const data = await articleService.listPendingReview();
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error, "list pending article reviews");
  }
}

// POST /api/admin/articles/review { id } — record a real human editor approval.
// Sets reviewedById => byline flips to "Diproduksi oleh sistem TeknikalID · Ditinjau oleh [editor]".
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const { id } = await request.json();
    if (typeof id !== "string" || !id) {
      return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });
    }
    await articleService.approveArticle(id, session.user.id);
    return NextResponse.json({ data: { id, reviewed: true } });
  } catch (error) {
    return handleApiError(error, "approve article review");
  }
}
