import RSSParser from "rss-parser";
import Anthropic from "@anthropic-ai/sdk";
import { ArticleStatus, ArticleType } from "@/generated/prisma/client";
import { articleRepository } from "./article.repository";
import { createAIProvider } from "./ai-provider";
import { gatherMarketContext, formatMarketContextForPrompt, factCheckArticle, extractTickersFromText } from "./article-fact-check";

const RSS_FEEDS = [
  { name: "Detik Finance", url: "https://finance.detik.com/rss" },
  { name: "CNBC Indonesia", url: "https://www.cnbcindonesia.com/news/rss" },
  { name: "Kontan", url: "https://www.kontan.co.id/rss" },
  { name: "Bisnis.com", url: "https://rss.bisnis.com/" },
];

const parser = new RSSParser({
  timeout: 10000,
  maxRedirects: 3,
});

interface NewsItem {
  source: string;
  title: string;
  link: string;
  snippet: string;
  pubDate: string;
}

export const newsSourceService = {
  async fetchHeadlines(): Promise<NewsItem[]> {
    const allItems: NewsItem[] = [];

    for (const feed of RSS_FEEDS) {
      try {
        const result = await parser.parseURL(feed.url);
        const items: NewsItem[] = (result.items || []).slice(0, 15).map((item) => ({
          source: feed.name,
          title: item.title || "",
          link: item.link || "",
          snippet: (item.contentSnippet || item.content || "").slice(0, 300),
          pubDate: item.pubDate || item.isoDate || "",
        }));
        allItems.push(...items);
      } catch (err) {
        console.error(`[NewsSource] Failed to fetch ${feed.name}:`, err instanceof Error ? err.message : err);
      }
    }

    // Sort by date, newest first
    allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    // Deduplicate by similar titles
    const seen = new Set<string>();
    return allItems.filter((item) => {
      const key = item.title.toLowerCase().replace(/[^\w\s]/g, "").trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },

  async generateArticlesFromSources(maxArticles: number = 5): Promise<{ generated: string[]; errors: string[]; skipped: number }> {
    const generated: string[] = [];
    const errors: string[] = [];

    if (!process.env.ANTHROPIC_AUTH_TOKEN) {
      console.log("[NewsSource] Skipping — ANTHROPIC_AUTH_TOKEN not set");
      return { generated, errors, skipped: 0 };
    }

    // 1. Fetch headlines from all sources
    const headlines = await this.fetchHeadlines();
    if (headlines.length === 0) {
      console.log("[NewsSource] No headlines fetched");
      return { generated, errors, skipped: 0 };
    }

    console.log(`[NewsSource] Fetched ${headlines.length} headlines from ${RSS_FEEDS.length} sources`);

    // 2. Ask AI to filter only stock-market-impacting news
    const provider = createAIProvider();
    const impactful = await this.filterImpactfulHeadlines(provider, headlines, maxArticles);

    if (impactful.length === 0) {
      console.log("[NewsSource] No impactful headlines found");
      return { generated, errors, skipped: headlines.length };
    }

    console.log(`[NewsSource] AI selected ${impactful.length} impactful headlines`);

    // 3. Generate an article for each impactful headline
    const adminUser = await articleRepository.findAdminUserId();
    if (!adminUser) {
      console.error("[NewsSource] No admin user found");
      return { generated, errors: ["No admin user"], skipped: 0 };
    }

    for (const item of impactful) {
      try {
        // Step 1: Gather real market context
        const mentionedTickers = extractTickersFromText(`${item.title} ${item.snippet}`);
        const marketCtx = await gatherMarketContext(mentionedTickers);
        const marketDataSection = formatMarketContextForPrompt(marketCtx);

        const systemPrompt = `Kamu adalah jurnalis keuangan Indonesia yang menulis untuk TeknikalID (teknikalid.com) — platform analisa teknikal saham BEI.
Kamu menulis artikel berita pasar yang aktual, data-driven, dan SEO-friendly dalam bahasa Indonesia.
Gaya tulis: jurnalistik tapi mudah dipahami, fokus pada fakta dan dampak ke pasar saham Indonesia.

AKURASI DATA: Gunakan HANYA data pasar yang disediakan. Jangan membuat angka harga saham, level IHSG, atau kurs rupiah sendiri.`;

        const userPrompt = `Tulis artikel berita berdasarkan headline berikut:

**Headline**: ${item.title}
**Sumber**: ${item.source}
**Ringkasan**: ${item.snippet}

${marketDataSection}

## FORMAT

Tulis artikel dalam format Markdown:
1. Gunakan H2 (##) untuk section. Jangan H1 (#).
2. Panjang: 800-1500 kata.
3. Bahasa: Bahasa Indonesia formal tapi mudah dipahami.

## STRUKTUR

1. **Ringkasan Berita** — Apa yang terjadi dan mengapa penting untuk investor
2. **Dampak ke Pasar Saham** — Saham/sektor mana yang terdampak dan bagaimana
3. **Analisa & Konteks** — Data dan perbandingan yang relevan
4. **Outlook** — Apa yang mungkin terjadi selanjutnya dan langkah investor
5. **Kesimpulan** — Takeaway utama

## PENTING

- Fokus pada DAMPAK ke pasar saham IDX / investor Indonesia
- Sebutkan saham atau sektor spesifik yang terdampak jika relevan
- Gunakan HANYA data pasar yang disediakan di atas untuk angka harga, IHSG, dan kurs
- Jangan gunakan emoji
- Jangan tulis "disclaimer" atau "sebagai AI"
- Target keyword: gunakan keyword natural terkait berita ini

Respond with ONLY the article markdown content. No JSON, no code blocks.`;

        // Step 2: Generate article with real data
        const result = await provider.generateArticle(systemPrompt, userPrompt);

        const slug = result.slug || `berita-${item.title.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 80)}`;

        // Check for duplicate slug
        const existing = await articleRepository.findBySlug(slug);
        if (existing) {
          console.log(`[NewsSource] Skipping duplicate: ${slug}`);
          continue;
        }

        // Step 3: Fact-check before publishing
        let finalContent = result.content;
        let finalTitle = result.title || item.title;
        const factCheck = await factCheckArticle(result.content, marketCtx, finalTitle);
        if (!factCheck.passed && factCheck.correctedContent) {
          finalContent = factCheck.correctedContent;
          if (factCheck.correctedTitle) {
            finalTitle = factCheck.correctedTitle;
          }
          console.log(`[NewsSource] Fact-check corrected ${factCheck.mismatches.length} errors in: ${item.title}`);
        } else if (factCheck.passed) {
          console.log(`[NewsSource] Fact-check passed for: ${item.title} (${factCheck.meta.claimsChecked} claims checked)`);
        }

        const article = await articleRepository.create({
          slug,
          title: finalTitle,
          excerpt: result.excerpt?.slice(0, 500) || item.snippet.slice(0, 500),
          content: finalContent,
          authorId: adminUser.id,
          tags: result.tags.length > 0 ? result.tags : ["berita", "pasar-saham"],
          status: ArticleStatus.PUBLISHED,
          articleType: ArticleType.NEWS,
          aiProvider: provider.name,
          generationMeta: {
            sourceUrl: item.link,
            sourceName: item.source,
            originalTitle: item.title,
            provider: provider.name,
            timestamp: new Date().toISOString(),
            factCheckPassed: String(factCheck.passed),
            factCheckClaimsChecked: String(factCheck.meta.claimsChecked),
            factCheckErrors: String(factCheck.mismatches.length),
            factCheckCorrected: String(!factCheck.passed && !!factCheck.correctedContent),
          } as Record<string, string>,
        });

        generated.push(`${item.source}: ${article.title}`);
        console.log(`[NewsSource] Generated: ${article.title}`);

        // Rate limit between articles
        await new Promise((r) => setTimeout(r, 3000));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed";
        errors.push(`${item.source} — ${item.title}: ${msg}`);
        console.error(`[NewsSource] Failed: ${item.title}:`, msg);
      }
    }

    return { generated, errors, skipped: headlines.length - impactful.length };
  },

  async filterImpactfulHeadlines(
    _provider: ReturnType<typeof createAIProvider>,
    headlines: NewsItem[],
    maxCount: number,
  ): Promise<NewsItem[]> {
    if (!process.env.ANTHROPIC_AUTH_TOKEN) {
      return headlines.slice(0, maxCount);
    }

    const headlineList = headlines
      .slice(0, 50)
      .map((h, i) => `${i + 1}. [${h.source}] ${h.title}`)
      .join("\n");

    const systemPrompt = `Kamu adalah editor berita keuangan Indonesia untuk platform analisa teknikal saham (teknikalid.com).
Tugas: Pilih headline yang LANGSUNG berdampak ke harga saham IDX atau sentimen investor.
Respond ONLY with valid JSON, no other text.`;

    const userPrompt = `Dari daftar headline berikut, pilih MAKSIMAL ${maxCount} yang paling berdampak ke pasar saham Indonesia (IDX).

KRITERIA — pilih yang:
- Dampak langsung ke harga saham (rate hike, earnings, dividen, rights issue, delisting)
- Sentimen pasar besar (rupiah, IHSG, arus asing, geopolitik yang impact market)
- Saham spesifik yang bergerak signifikan
- Kebijakan regulator (OJK, BI) yang impact market

JANGAN pilih yang:
- Berita politik murni tanpa dampak pasar
- Berita konsumer/lifestyle
- Berita yang tidak relevan ke investor saham Indonesia

DAFTAR HEADLINE:
${headlineList}

Output JSON dengan nomor headline yang dipilih:
{"indices": [1, 5, 12]}`;

    try {
      const client = new Anthropic({
        apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
        baseURL: process.env.ANTHROPIC_BASE_URL,
        timeout: 30_000,
      });

      const response = await client.messages.create({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n");

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.indices)) {
          return parsed.indices
            .filter((i: number) => i >= 1 && i <= headlines.length)
            .map((i: number) => headlines[i - 1])
            .slice(0, maxCount);
        }
      }
    } catch (err) {
      console.error("[NewsSource] AI filtering failed, using first headlines:", err instanceof Error ? err.message : err);
    }

    // Fallback: return first maxCount headlines
    return headlines.slice(0, maxCount);
  },
};
