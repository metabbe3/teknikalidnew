import { QuestionStatus, QuestionSource, QuestionFormat } from "@/generated/prisma/client";
import Anthropic from "@anthropic-ai/sdk";
import { faqRepository } from "./faq.repository";
import { QuestionNotFoundError, FAQGenerationError } from "./faq.errors";
import { buildFAQPrompt, type FAQGeneratedOutput } from "./faq-prompts";
import { ALL_FAQ_TOPICS } from "./faq-topics";
import { fetchIndonesianStockTrends } from "./google-trends";

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

export const faqService = {
  getPublishedQuestions(opts: {
    category?: string;
    tag?: string;
    ticker?: string;
    cursor?: string;
    limit?: number;
  }) {
    return faqRepository.findPublished(opts);
  },

  async getQuestionBySlug(slug: string) {
    const question = await faqRepository.findPublishedBySlug(slug);
    if (!question) throw new QuestionNotFoundError();

    // Increment views asynchronously (fire-and-forget)
    faqRepository.incrementViews(question.id).catch(() => {});

    return question;
  },

  getQuestionsByTicker(ticker: string, limit: number = 5) {
    return faqRepository.findPublishedByTicker(ticker, limit);
  },

  getTrending(limit: number = 10) {
    return faqRepository.findTrending(limit);
  },

  searchQuestions(query: string) {
    return faqRepository.searchPublished(query);
  },

  async submitQuestion(
    userId: string,
    questionText: string,
    category?: string,
  ) {
    let slug = generateSlug(questionText);

    // Ensure slug uniqueness by appending random suffix if needed
    if (await faqRepository.slugExists(slug)) {
      slug = `${slug}-${randomSuffix()}`;
    }

    return faqRepository.create({
      slug,
      question: questionText,
      shortAnswer: "",
      longAnswer: "",
      format: QuestionFormat.FAQ,
      category: category ?? "umum",
      tags: [],
      relatedTickers: [],
      source: QuestionSource.USER_SUBMITTED,
      status: QuestionStatus.PENDING,
      submittedBy: { connect: { id: userId } },
    });
  },

  async approveQuestion(
    id: string,
    shortAnswer: string,
    longAnswer?: string,
    format?: QuestionFormat,
    metaDescription?: string,
  ) {
    return faqRepository.update(id, {
      shortAnswer,
      ...(longAnswer ? { longAnswer } : {}),
      ...(format ? { format } : {}),
      ...(metaDescription ? { metaDescription } : {}),
      status: QuestionStatus.ANSWERED,
      publishedAt: new Date(),
    });
  },

  async rejectQuestion(id: string) {
    return faqRepository.update(id, {
      status: QuestionStatus.REJECTED,
    });
  },

  async voteOnQuestion(questionId: string, userId: string, isHelpful: boolean) {
    return faqRepository.vote(questionId, userId, isHelpful);
  },

  // --- AI Generation ---

  async generateFAQ(
    question: string,
    category: string,
    format: QuestionFormat,
    relatedTickers?: string[],
  ): Promise<{ id: string; slug: string }> {
    const { system, user } = buildFAQPrompt({ question, category, format, relatedTickers });

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
      baseURL: process.env.ANTHROPIC_BASE_URL,
      timeout: 60_000,
    });

    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      max_tokens: format === "MINI_ARTICLE" ? 4000 : 1000,
      system,
      messages: [{ role: "user", content: user }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new FAQGenerationError("No JSON in AI response");

    let parsed: FAQGeneratedOutput;
    try {
      parsed = JSON.parse(jsonMatch[1] ?? jsonMatch[0]);
    } catch {
      throw new FAQGenerationError("Invalid JSON from AI response");
    }

    if (!parsed.shortAnswer || !parsed.slug) {
      throw new FAQGenerationError("Missing required fields in AI response");
    }

    let slug = parsed.slug.replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").slice(0, 100);
    if (await faqRepository.slugExists(slug)) {
      slug = `${slug}-${randomSuffix()}`;
    }

    const result = await faqRepository.create({
      slug,
      question: parsed.question || question,
      shortAnswer: parsed.shortAnswer,
      ...(parsed.longAnswer ? { longAnswer: parsed.longAnswer } : {}),
      format: format === "MINI_ARTICLE" ? QuestionFormat.MINI_ARTICLE : QuestionFormat.FAQ,
      category,
      tags: parsed.tags ?? [],
      relatedTickers: relatedTickers ?? [],
      source: QuestionSource.AI_GENERATED,
      status: QuestionStatus.ANSWERED,
      aiProvider: "claude",
      metaDescription: parsed.metaDescription,
      generationMeta: { model: process.env.ANTHROPIC_MODEL, timestamp: new Date().toISOString() },
    });

    return { id: result.id, slug: result.slug };
  },

  async runDailyGeneration(count: number = 3): Promise<{ generated: string[]; errors: string[] }> {
    const generated: string[] = [];
    const errors: string[] = [];

    // 1. Find topics not yet covered
    const existing = await faqRepository.findPublished({});
    const existingQuestions = new Set(existing.items.map((q) => q.question.toLowerCase().trim()));

    const uncovered = ALL_FAQ_TOPICS.filter(
      (t) => !existingQuestions.has(t.question.toLowerCase().trim()),
    );

    // 2. Pick N random uncovered topics
    const shuffled = uncovered.sort(() => Math.random() - 0.5);
    const topics = shuffled.slice(0, count);

    for (const topic of topics) {
      try {
        const result = await faqService.generateFAQ(
          topic.question,
          topic.category,
          topic.format as QuestionFormat,
        );
        generated.push(result.slug);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`${topic.question}: ${msg}`);
      }
    }

    // 3. Try Google Trends for 1 additional FAQ
    try {
      const trending = await fetchIndonesianStockTrends();
      if (trending.length > 0) {
        const trendQuestion = trending[0];
        if (!existingQuestions.has(trendQuestion.toLowerCase().trim())) {
          const result = await faqService.generateFAQ(trendQuestion, "saham", QuestionFormat.FAQ);
          generated.push(result.slug);
        }
      }
    } catch {
      // Trends API failure is non-critical
    }

    return { generated, errors };
  },
};
