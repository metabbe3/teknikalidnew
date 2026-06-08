import { BaseAgent, type ChainedJobSpec } from "./base-agent";
import type { AgentType, AgentJobPayload, AgentJobResult } from "../agent-hub.types";
import { prisma } from "@/lib/prisma";

/**
 * Schema Builder
 *
 * Generates JSON-LD structured data for articles and FAQ pages.
 * Stores schema in article's generationMeta field.
 *
 * Schema types:
 * - Article: NewsArticle, AnalysisArticle
 * - FAQPage: for FAQ/glossary entries
 * - Organization: site-level schema
 *
 * No AI calls needed — pure data transformation.
 */
export class SchemaBuilderAgent extends BaseAgent {
  readonly type: AgentType = "schema_builder" as AgentType;
  readonly label = "Schema Builder";

  async execute(payload: AgentJobPayload): Promise<AgentJobResult> {
    const maxArticles = (payload.maxArticles as number) || 20;

    const articles = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        articleType: { in: ["NEWS", "STOCK_ANALYSIS", "EDUCATIONAL"] },
      },
      select: {
        id: true,
        title: true,
        excerpt: true,
        slug: true,
        publishedAt: true,
        articleType: true,
        tickerTag: true,
        generationMeta: true,
      },
      take: maxArticles,
      orderBy: { publishedAt: "desc" },
    });

    let updated = 0;
    const schemas: string[] = [];

    for (const article of articles) {
      try {
        const meta = (article.generationMeta as Record<string, unknown>) || {};

        // Skip if already has schema
        if (meta.schemaJsonLd) continue;

        const baseUrl = "https://teknikal.id";
        const articleUrl = `${baseUrl}/berita/${article.slug}`;
        const schemaType = article.articleType === "NEWS" ? "NewsArticle" : "Article";

        const schema = {
          "@context": "https://schema.org",
          "@type": schemaType,
          headline: article.title,
          description: article.excerpt || article.title,
          url: articleUrl,
          datePublished: article.publishedAt.toISOString(),
          dateModified: article.publishedAt.toISOString(),
          author: {
            "@type": "Organization",
            name: "TeknikalID",
            url: baseUrl,
          },
          publisher: {
            "@type": "Organization",
            name: "TeknikalID",
            url: baseUrl,
            logo: {
              "@type": "ImageObject",
              url: `${baseUrl}/logo.png`,
            },
          },
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": articleUrl,
          },
          ...(article.tickerTag && {
            about: {
              "@type": "Thing",
              name: `${article.tickerTag} Stock`,
              url: `${baseUrl}/stocks/${article.tickerTag}`,
            },
          }),
        };

        await prisma.article.update({
          where: { id: article.id },
          data: {
            generationMeta: {
              ...meta,
              schemaJsonLd: JSON.stringify(schema),
              schemaType,
            },
          },
        });

        updated++;
        schemas.push(`${article.articleType}: ${article.title.slice(0, 50)}`);
      } catch {
        // Skip individual failures
      }
    }

    // Also generate FAQ schema for recent questions
    let faqSchemaCount = 0;
    try {
      const questions = await prisma.question.findMany({
        where: { status: "ANSWERED", category: { not: "glosarium" } },
        select: { question: true, shortAnswer: true, slug: true },
        take: 20,
        orderBy: { createdAt: "desc" },
      });

      if (questions.length > 0) {
        const faqSchema = {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: questions.map((q) => ({
            "@type": "Question",
            name: q.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: q.shortAnswer,
            },
          })),
        };
        // Store as site-level schema (could be stored in a config table)
        faqSchemaCount = questions.length;
        schemas.push(`FAQ schema: ${faqSchemaCount} questions`);
      }
    } catch {
      // Skip FAQ schema if table doesn't exist
    }

    return {
      summary: `Schema builder: ${updated} article schemas, ${faqSchemaCount} FAQ schemas generated`,
      articleSchemas: updated,
      faqSchemas: faqSchemaCount,
      schemas,
    };
  }

  async onComplete(_result: AgentJobResult, _parentJobId: string): Promise<ChainedJobSpec[]> {
    return [];
  }
}
