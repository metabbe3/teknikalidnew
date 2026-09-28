import { createAIClient, type AIClient } from "@/lib/ai-client";
import { extractFirstH2, passesTitleGuard, findTitleViolation } from "./title-guard";

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
  discoverTrendingTopics(marketData?: string, recentTitles?: string[]): Promise<TrendingTopic[]>;
  generateImagePrompt(context: string, instruction: string): Promise<string>;
  checkArticleSimilarity(newTitle: string, existingTitles: string[]): Promise<{ isDuplicate: boolean; similarityScore: number; similarTo: string | null }>;
  readonly name: string;
}

/**
 * Detect whether the AI response is a JSON-shaped response (which the prompt forbids).
 * Returns the raw JSON string if so (for attempted parsing), or null otherwise.
 */
function detectJsonResponse(text: string): string | null {
  const trimmed = text.trim();
  // Case 1: response starts with `{` or `[`
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return trimmed;
  }
  // Case 2: response contains a ```json fenced block
  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (fencedMatch) {
    return fencedMatch[1];
  }
  return null;
}

/**
 * Attempt to safely extract JSON from the text. Returns parsed object or null.
 */
function tryParseJson(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Strip a leading JSON block from `text` to recover the underlying markdown content.
 * Used when AI wraps its response in JSON (despite being told not to).
 */
function stripJsonWrapper(text: string, parsed: Record<string, unknown>): string {
  const contentField = (parsed.content as string) || (parsed.konten as string);
  if (typeof contentField === "string" && contentField.trim().length > 0) {
    return contentField;
  }
  // Fall back to removing the JSON block from the raw text.
  return text
    .replace(/```json\s*[\s\S]*?```/, "")
    .replace(/^\s*\{[\s\S]*\}\s*$/m, "")
    .trim();
}

/**
 * Build a slug from a title (lowercase, alphanumeric + dash, capped at 100 chars).
 */
function buildSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 100);
}

/**
 * Find the first non-heading, non-empty paragraph of content to use as excerpt.
 */
function extractExcerpt(content: string): string {
  const lines = content.split(/\r?\n/);
  const excerptLine = lines.find((l) => {
    const trimmed = l.trim();
    return trimmed.length > 20 && !trimmed.startsWith("#") && !trimmed.startsWith(":::");
  });
  if (!excerptLine) return "";
  // Strip markdown formatting so previews render as plain text
  const plain = excerptLine
    .replace(/\*\*(.+?)\*\*/g, "$1")   // **bold**
    .replace(/\*(.+?)\*/g, "$1")       // *italic*
    .replace(/__(.+?)__/g, "$1")       // __bold__
    .replace(/_(.+?)_/g, "$1")         // _italic_
    .replace(/~~(.+?)~~/g, "$1")       // ~~strikethrough~~
    .replace(/`([^`]+)`/g, "$1")       // `code`
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [text](url)
    .trim();
  return plain.slice(0, 200);
}

/**
 * Parse the AI's article-generation response.
 *
 * Resolution order (most trustworthy first):
 *   1. Markdown content's first H2 → that's what the user reads as the headline.
 *   2. JSON's title field — ONLY if it passes the title guard (no AI meta-text).
 *   3. Empty title (service layer substitutes a safe fallback).
 *
 * Why H2 first: our system prompt mandates starting the response with `## `.
 * A response that starts with anything else (including JSON) is non-compliant and
 * its `title` field is suspect — the AI may have leaked conversational text there.
 */
export function parseAIResponse(text: string): ArticleGenerationResult {
  if (!text || !text.trim()) {
    return { title: "", slug: "", excerpt: "", content: "", tags: [] };
  }

  // ── Step 1: try to recover markdown content ──
  const jsonRaw = detectJsonResponse(text);
  let parsedJson: Record<string, unknown> | null = null;
  if (jsonRaw) {
    parsedJson = tryParseJson(jsonRaw);
  }

  // Determine the actual markdown body we'll work with
  let content: string;
  if (parsedJson) {
    // AI returned JSON despite being forbidden. Extract embedded markdown content if present.
    content = stripJsonWrapper(text, parsedJson);
  } else {
    content = text;
  }

  // ── Step 2: extract title — prefer H2 from markdown body ──
  let title: string = "";
  const h2Title = extractFirstH2(content);
  if (h2Title && passesTitleGuard(h2Title)) {
    title = h2Title;
  } else if (parsedJson) {
    // Fallback: try JSON title/judul field, but ONLY if it passes guard.
    const jsonTitle = (parsedJson.title as string) || (parsedJson.judul as string) || "";
    if (jsonTitle && passesTitleGuard(jsonTitle)) {
      title = jsonTitle;
    }
  }

  // ── Step 3: if title is still empty, try H1 (last resort) ──
  if (!title) {
    const lines = content.split(/\r?\n/);
    const h1Line = lines.find((l) => /^#\s+/.test(l));
    if (h1Line) {
      const h1 = h1Line.replace(/^#\s+/, "").trim();
      if (passesTitleGuard(h1)) {
        title = h1;
      }
    }
  }

  // ── Step 4: slug, excerpt, tags ──
  const slug = buildSlug(title || "untitled");
  const excerpt = parsedJson?.excerpt
    ? String(parsedJson.excerpt)
    : parsedJson?.ringkasan
      ? String(parsedJson.ringkasan)
      : extractExcerpt(content);
  const tags = Array.isArray(parsedJson?.tags)
    ? (parsedJson!.tags as unknown[]).map((t) => String(t))
    : [];

  // ── Step 5: log if AI leaked (for monitoring) ──
  if (jsonRaw && parsedJson) {
    const leakedTitle = (parsedJson.title as string) || (parsedJson.judul as string) || "";
    if (leakedTitle && findTitleViolation(leakedTitle)) {
      console.warn(
        `[parseAIResponse] AI returned JSON with leaked title (rejected). Title replaced with H2: "${title.slice(0, 60)}..."`,
      );
    }
  }

  return { title, slug, excerpt, content, tags };
}

export class ClaudeProvider implements AIProvider {
  readonly name = "claude";
  private client: AIClient;
  private model: string;

  constructor() {
    this.client = createAIClient();
    this.model = process.env.ANTHROPIC_MODEL || "qd/qmodel_latest";
  }

  async generateArticle(systemPrompt: string, userPrompt: string): Promise<ArticleGenerationResult> {
    if (!process.env.ANTHROPIC_AUTH_TOKEN) {
      throw new Error("ANTHROPIC_AUTH_TOKEN is not configured. Set it in your environment variables.");
    }

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 8000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    if (!response.choices || response.choices.length === 0) {
      // Router returned an error body (e.g. no credentials / model_not_found) instead
      // of a completion. Surface it clearly instead of crashing on choices[0].
      throw new Error(`AI returned no choices (check router credentials/model): ${JSON.stringify(response).slice(0, 300)}`);
    }
    const text = response.choices[0]?.message?.content ?? "";

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

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 2000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const text = response.choices[0]?.message?.content ?? "";

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

  async discoverTrendingTopics(marketData?: string, recentTitles?: string[]): Promise<TrendingTopic[]> {
    const date = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const systemPrompt = `Kamu adalah jurnalis keuangan Indonesia yang menulis untuk TeknikalID (teknikalid.com) — platform analisa teknikal saham BEI.
Kamu memahami tren pasar saham Indonesia, sentimen investor ritel, dan topik yang sedang viral.
Respond ONLY with valid JSON array, no other text. Tulis HANYA dalam Bahasa Indonesia, jangan gunakan karakter non-Latin.`;

    const recentSection = recentTitles && recentTitles.length > 0
      ? `\n## ARTIKEL YANG SUDAH DIPUBLIKASIKAN (JANGAN ULANGI TOPIK INI)\n\n${recentTitles.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\nATURAN DIVERSITAS (SANGAT PENTING):\n- JANGAN buat topik tentang saham/ticker yang sudah ada di daftar di atas. Jika TLKM sudah dibahas, jaksa TLKM lagi.\n- JANGAN ulang tema yang sama (mis. jika sudah ada 3 artikel tentang "IHSG merah", jangan buat topik IHSG lagi).\n- PILIH saham, sektor, dan tema yang BERBEDA dari yang sudah dipublikasikan.\n- Maksimal 1 topik per ticker. Maksimal 2 topik per sektor. Maksimal 2 topik tentang IHSG/Rupiah secara gabungan.\n- Cari sudut pandang yang belum dibahas: IPO baru, dividen, laporan keuangan, arus asing, rebalancing indeks, komoditas, dll.`
      : "";

    const userPrompt = `Hari ini ${date}. Berikan 10 topik berita/tren pasar saham Indonesia yang paling relevan untuk ditulis hari ini.
${recentSection}
${marketData ? `## DATA PASAR TERKINI
${marketData}

Gunakan data di atas sebagai dasar untuk memilih topik. Pilih saham yang benar-benar bergerak signifikan berdasarkan data di atas. Jangan menyebutkan angka spesifik di judul topik — biarkan angka diisi saat penulisan artikel.
` : ""}
Format output: JSON array dengan structure:
[
  {
    "title": "Judul artikel yang SEO-friendly",
    "angle": "Sudut pandang unik atau hook untuk artikel ini",
    "keywords": ["keyword1", "keyword2", "keyword3"],
    "priority": "high"
  }
]

Prioritas: topik yang sedang trending, sentimen pasar, data ekonomi, saham yang bergerak signifikan${marketData ? " (berdasarkan data di atas)" : ""}, sektor yang sedang dalam sorotan.
Variasi: WAJIB campuran dari minimal 5 sektor berbeda. Setiap ticker hanya boleh muncul di 1 topik. Jangan lebih dari 2 topik tentang tema yang sama (IHSG, kurs, perbankan).

Hanya berikan topik yang BENAR-BENAR relevan dan bisa ditulis secara informatif. Jangan buat topik yang tidak ada dasarnya.`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 3000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const text = response.choices[0]?.message?.content ?? "";

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

  async generateImagePrompt(context: string, instruction: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 500,
      messages: [
        { role: "user", content: `${instruction}\n\n${context}` },
      ],
    });

    return (response.choices[0]?.message?.content ?? "").trim();
  }

  async checkArticleSimilarity(newTitle: string, existingTitles: string[]): Promise<{ isDuplicate: boolean; similarityScore: number; similarTo: string | null }> {
    if (existingTitles.length === 0) {
      return { isDuplicate: false, similarityScore: 0, similarTo: null };
    }

    try {
      const titlesList = existingTitles.map((t, i) => `${i + 1}. ${t}`).join("\n");

      const systemPrompt = `Kamu adalah editor yang mengecek apakah judul artikel baru terlalu mirip dengan artikel yang sudah pernah dipublikasikan.
Respond ONLY with valid JSON, no other text.`;

      const userPrompt = `Judul artikel baru: "${newTitle}"

Artikel yang sudah pernah dipublikasikan:
${titlesList}

Apakah judul artikel baru di atas terlalu mirip (membahas topik yang sama dengan sudut pandang yang sama) dengan salah satu artikel di atas?

Output JSON:
{
  "isDuplicate": true/false,
  "similarityScore": 0-100,
  "similarTo": "judul artikel yang paling mirip, atau null jika tidak ada"
}

Aturan:
- isDuplicate = true jika similarityScore >= 65
- similarityScore = tingkat kemiripan topik dan sudut pandang (bukan kesamaan kata persis)
- "sama topik tapi beda sudut pandang" = similarityScore 50-60 (bukan duplicate)
- "sama topik, beda persentase tapi sama narasi" = similarityScore 70-85 (duplicate)`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 200,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const text = response.choices[0]?.message?.content ?? "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          isDuplicate: Boolean(parsed.isDuplicate),
          similarityScore: Number(parsed.similarityScore) || 0,
          similarTo: parsed.similarTo ? String(parsed.similarTo) : null,
        };
      }
    } catch (err) {
      console.error("[DedupCheck] Similarity check failed:", err instanceof Error ? err.message : err);
    }

    return { isDuplicate: false, similarityScore: 0, similarTo: null };
  }
}

export function createAIProvider(): AIProvider {
  return new ClaudeProvider();
}
