import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { articleService } from "@/domains/article/article.service";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const parseArray = (val: unknown): string[] => {
      if (Array.isArray(val)) return val;
      if (typeof val === "string") { try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; } }
      return [];
    };
    const keywords = parseArray(body.keywords);
    const trendingAngles = parseArray(body.trendingAngles);

    if (body.type === "stock_analysis" && body.ticker) {
      const result = await articleService.generateStockAnalysis(body.ticker);
      return NextResponse.json({ data: result }, { status: 201 });
    }

    if (body.type === "educational" && body.topicId) {
      const result = await articleService.generateEducational(body.topicId);
      return NextResponse.json({ data: result }, { status: 201 });
    }

    const angles = trendingAngles.length > 0 ? trendingAngles : undefined;

    if (body.type === "news" && body.topic) {
      const result = await articleService.generateNewsArticle(body.topic, keywords, angles, body.context);
      return NextResponse.json({ data: result }, { status: 201 });
    }

    if (body.type === "general" && body.topic) {
      const result = await articleService.generateGeneralArticle(body.topic, keywords, angles, body.style, body.context);
      return NextResponse.json({ data: result }, { status: 201 });
    }

    return NextResponse.json({ error: "Provide type (stock_analysis/educational/news/general) with required params" }, { status: 400 });
  } catch (error) {
    return handleApiError(error, "generate article");
  }
}
