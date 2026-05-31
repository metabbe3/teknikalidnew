import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { articleService } from "@/domains/article/article.service";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const parseArray = (val: unknown): string[] => {
      if (Array.isArray(val)) return val;
      if (typeof val === "string") { try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; } }
      return [];
    };
    const keywords = parseArray(body.keywords);
    const trendingAngles = parseArray(body.trendingAngles);
    let result: { id: string; title: string; slug: string };

    if (body.type === "stock_analysis" && body.ticker) {
      result = await articleService.generateStockAnalysis(body.ticker);
    } else if (body.type === "educational" && body.topicId) {
      result = await articleService.generateEducational(body.topicId);
    } else if (body.type === "news" && body.topic) {
      const angles = trendingAngles.length > 0 ? trendingAngles : undefined;
      result = await articleService.generateNewsArticle(body.topic, keywords, angles, body.context);
    } else if (body.type === "general" && body.topic) {
      const angles = trendingAngles.length > 0 ? trendingAngles : undefined;
      result = await articleService.generateGeneralArticle(body.topic, keywords, angles, body.style, body.context);
    } else {
      return NextResponse.json({ error: "Provide type (stock_analysis/educational/news/general) with required params" }, { status: 400 });
    }

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "generate article");
  }
}
