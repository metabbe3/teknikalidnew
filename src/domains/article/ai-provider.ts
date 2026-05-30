import Anthropic from "@anthropic-ai/sdk";

export interface ArticleGenerationResult {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  tags: string[];
}

export interface KeywordResearch {
  suggestedKeywords: string[];
  trendingAngles: string[];
  relatedTopics: string[];
}

export interface TrendingTopic {
  title: string;
  angle: string;
  keywords: string[];
  priority: "high" | "medium" | "low";
}

export interface AIProvider {
  generateArticle(systemPrompt: string, userPrompt: string): Promise<ArticleGenerationResult>;
  researchKeywords(topic: string, context?: string): Promise<KeywordResearch>;
  discoverTrendingTopics(): Promise<TrendingTopic[]>;
  readonly name: string;
}

function parseAIResponse(text: string): ArticleGenerationResult {
  // Try to extract JSON from the response
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1] ?? jsonMatch[0]);
      return {
        title: parsed.title ?? parsed.judul ?? "",
        slug: parsed.slug ?? "",
        excerpt: parsed.excerpt ?? parsed.ringkasan ?? "",
        content: parsed.content ?? parsed.konten ?? "",
        tags: parsed.tags ?? [],
      };
    } catch {
      // Fall through to raw content mode
    }
  }

  // Fallback: treat entire response as content
  const lines = text.split("\n");
  const title = lines.find((l) => l.startsWith("## "))?.replace(/^## /, "") ?? lines.find((l) => l.startsWith("# "))?.replace(/^# /, "") ?? "Untitled Article";
  const slug = title.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 100);
  const excerpt = lines.find((l) => l.trim().length > 20 && !l.startsWith("#"))?.slice(0, 200) ?? "";
  return { title, slug, excerpt, content: text, tags: [] };
}

export class ClaudeProvider implements AIProvider {
  readonly name = "claude";
  private client: Anthropic;
  private model: string;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
      baseURL: process.env.ANTHROPIC_BASE_URL,
      timeout: Number(process.env.API_TIMEOUT_MS) || 120_000,
    });
    this.model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
  }

  async generateArticle(systemPrompt: string, userPrompt: string): Promise<ArticleGenerationResult> {
    if (!process.env.ANTHROPIC_AUTH_TOKEN) {
      throw new Error("ANTHROPIC_AUTH_TOKEN is not configured. Set it in your environment variables.");
    }

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return parseAIResponse(text);
  }

  async researchKeywords(topic: string, context?: string): Promise<KeywordResearch> {
    const systemPrompt = `Kamu adalah SEO researcher Indonesia yang ahli dalam content strategy untuk website analisa teknikal saham (teknikalid.com).
Kamu memahami Google search patterns investor ritel Indonesia dan tren pasar saham BEI.
Respond ONLY with valid JSON, no other text.`;

    const userPrompt = `Riset keyword SEO untuk topik: "${topic}"
${context ? `Konteks tambahan: ${context}` : ""}
${`Bulan ini: ${new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" })}`}

Berikan output JSON dengan format:
{
  "suggestedKeywords": ["keyword1", "keyword2", ...],
  "trendingAngles": ["angle1", "angle2", ...],
  "relatedTopics": ["topic1", "topic2", ...]
}

Aturan:
- suggestedKeywords: 8-12 keyword SEO utama dan sekunder (bahasa Indonesia) yang punya search volume potensial
- trendingAngles: 3-5 sudut pandang menarik yang sedang trending untuk topik ini di konteks pasar saham Indonesia
- relatedTopics: 3-5 topik terkait yang bisa jadi ide artikel berikutnya`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1] ?? jsonMatch[0]);
        return {
          suggestedKeywords: parsed.suggestedKeywords ?? [],
          trendingAngles: parsed.trendingAngles ?? [],
          relatedTopics: parsed.relatedTopics ?? [],
        };
      } catch {
        // fall through
      }
    }

    return { suggestedKeywords: [], trendingAngles: [], relatedTopics: [] };
  }

  async discoverTrendingTopics(): Promise<TrendingTopic[]> {
    const date = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const systemPrompt = `Kamu adalah jurnalis keuangan Indonesia yang menulis untuk TeknikalID (teknikalid.com) — platform analisa teknikal saham BEI.
Kamu memahami tren pasar saham Indonesia, sentimen investor ritel, dan topik yang sedang viral.
Respond ONLY with valid JSON array, no other text.`;

    const userPrompt = `Hari ini ${date}. Berikan 10 topik berita/tren pasar saham Indonesia yang paling relevan untuk ditulis hari ini.

Format output: JSON array dengan structure:
[
  {
    "title": "Judul artikel yang SEO-friendly",
    "angle": "Sudut pandang unik atau hook untuk artikel ini",
    "keywords": ["keyword1", "keyword2", "keyword3"],
    "priority": "high"
  }
]

Prioritas: topik yang sedang trending, sentimen pasar, data ekonomi, saham yang bergerak signifikan, sektor yang sedang dalam sorotan.
Variasi: campuran antara berita pasar, analisa sektor, saham spesifik, dan edukasi yang relevan dengan kondisi pasar hari ini.

Hanya berikan topik yang BENAR-BENAR relevan dan bisa ditulis secara informatif. Jangan buat topik yang tidak ada dasarnya.`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1] ?? jsonMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed.map((t: Record<string, unknown>) => ({
            title: String(t.title ?? ""),
            angle: String(t.angle ?? ""),
            keywords: Array.isArray(t.keywords) ? t.keywords.map(String) : [],
            priority: t.priority === "high" || t.priority === "medium" ? t.priority : "low",
          }));
        }
      } catch {
        // fall through
      }
    }

    return [];
  }
}

export function createAIProvider(): AIProvider {
  return new ClaudeProvider();
}
