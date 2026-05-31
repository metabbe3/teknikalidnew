import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { articleService } from "@/domains/article/article.service";
import { imageGenService } from "@/domains/image-gen/image-gen.service";

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
    const generateImage = body.generateImage !== false;

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

    // Auto-generate cover image in the background
    if (generateImage) {
      const ticker = body.type === "stock_analysis" ? body.ticker : undefined;
      imageGenService
        .startGeneration(admin.id, {
          source: "auto",
          content: result.title,
          tickerTag: ticker,
        })
        .then(({ jobId }) =>
          waitForImageAndAttach(jobId, result.id, admin.id)
        )
        .catch(() => {
          // Image generation failure is non-blocking
        });
    }

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "generate article");
  }
}

async function waitForImageAndAttach(
  jobId: string,
  articleId: string,
  userId: string
) {
  const maxAttempts = 30; // 60 seconds max
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const status = await imageGenService.getJobStatus(jobId, userId);
      if (status.status === "completed" && status.imageUrl) {
        await articleService.updateCoverImage(articleId, status.imageUrl);
        return;
      }
      if (status.status === "failed") return;
    } catch {
      return;
    }
  }
}
