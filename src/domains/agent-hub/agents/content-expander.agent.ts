import { BaseAgent, type ChainedJobSpec } from "./base-agent";
import type { AgentType, AgentJobPayload, AgentJobResult } from "../agent-hub.types";
import { prisma } from "@/lib/prisma";

/**
 * Content Expander
 *
 * Generates content to fill gaps:
 * - mode "faq": Generate FAQ questions about saham/IDX
 * - mode "glossary": Generate istilah saham glossary entries
 * - mode "educational": Generate educational articles (text-only, no images)
 *
 * All content is TEXT-ONLY — no image generation needed.
 */
export class ContentExpanderAgent extends BaseAgent {
  readonly type: AgentType = "content_expander" as AgentType;
  readonly label = "Content Expander";

  async execute(payload: AgentJobPayload): Promise<AgentJobResult> {
    const mode = (payload.mode as string) || "faq";
    const count = (payload.count as number) || 5;

    switch (mode) {
      case "faq":
        return await this.expandFaq(count);
      case "glossary":
        return await this.expandGlossary(count);
      case "educational":
        return await this.expandEducational(count);
      default:
        return { summary: `Unknown mode: ${mode}`, generated: 0, errors: 0 };
    }
  }

  private async expandFaq(count: number): Promise<AgentJobResult> {
    const generated: string[] = [];
    const errors: string[] = [];

    // Get existing FAQ topics to avoid duplicates
    const existing = await prisma.question.findMany({
      select: { question: true },
    });
    const existingQuestions = new Set(existing.map((q) => q.question.toLowerCase()));

    const topics = [
      "apa itu lot dan fraksi harga saham", "cara hitung capital gain saham", "perbedaan saham dan obligasi",
      "apa itu IPO saham", "cara membaca laporan keuangan emiten", "dividen saham cara kerjanya",
      "apa itu rights issue", "stock split efeknya apa", "cara analisa teknikal saham pemula",
      "perbedaan market order dan limit order", "apa itu short selling di BEI", "cara diversifikasi portofolio saham",
      "indeks saham apa saja di IDX", "apa itu auto rejection BEI", "cara membaca candlestick chart",
      "margin trading syarat dan risikonya", "perbedaan saham blue chip dan second liner",
      "apa itu treasury stock", "cara menghitung PBV dan PER saham", "reksadana saham vs saham langsung",
      "apa itu repo saham", "cara kerja jual beli saham online", "jam trading BEI dan sesi pasar",
      "apa itu board lot dan odd lot", "perbedakan investasi dan trading saham",
      "cara membaca depth order book", "apa itu EPS dan cara menghitungnya",
      "saham growth vs value investing", "apa itu ESG investing di Indonesia",
      "cara pakai moving average untuk saham", "apa itu RSI dan cara menggunakannya",
      "volatilitas saham cara mengukurnya", "apa itu beta saham",
      "index futures dan opsi di Indonesia", "apa itu carbon trading di BEI",
      "cara membaca indikator MACD", "support dan resistance cara menentukan",
      "apa itu volume spread analysis", "cara backtest strategi trading saham",
      "apa itu sector rotation strategy", "pengaruh suku bunga BI ke saham",
      "cara membaca annual report emiten", "apa itu ROE dan ROA saham",
      "deviden yield cara menghitung dan interpretasi", "apa itu komisi broker saham",
      "perbedaan fundamental dan teknikal analisis", "cara val saham dengan DCF",
      "apa itu book building IPO", "saham KPI dan cara mengevaluasinya",
    ];

    // Filter out existing topics
    const newTopics = topics.filter((t) => !existingQuestions.has(t.toLowerCase()));
    const toGenerate = newTopics.slice(0, count);

    // Find system user for author
    const systemUser = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    for (const topic of toGenerate) {
      try {
        const response = await this.callAI(
          `Kamu adalah ahli keuangan Indonesia. Buat FAQ tentang pasar saham Indonesia dalam Bahasa Indonesia.
WAJIB: jawab HANYA dengan JSON object tunggal, tanpa teks lain sebelum/sesudahnya.
Format: {"question":"...","shortAnswer":"...","longAnswer":"...","category":"...","tags":["..."],"relatedTickers":["..."]}
Kategori: dasar, teknikal, fundamental, portofolio, regulasi, glosarium
RelatedTickers: kosongkan jika tidak spesifik.`,
          `Tentang: ${topic}`,
          2000,
        );

        let parsed = this.parseJsonResponse(response);
        
        // Retry with stricter prompt if parse fails
        if (!parsed || !parsed.question) {
          const retryResponse = await this.callAI(
            `Konversi teks berikut menjadi JSON object valid. WAJIB HANYA JSON, tanpa markdown atau teks lain.
Format: {"question":"...","shortAnswer":"...","longAnswer":"...","category":"...","tags":["..."],"relatedTickers":["..."]}`,
            response,
            2000,
          );
          parsed = this.parseJsonResponse(retryResponse);
        }

        if (!parsed || !parsed.question) {
          errors.push(`Parse failed for: ${topic}`);
          continue;
        }

        // Skip if already exists
        if (existingQuestions.has((parsed.question as string).toLowerCase())) continue;

        const slug = this.slugify(parsed.question as string);
        await prisma.question.create({
          data: {
            question: (parsed.question as string).slice(0, 500),
            shortAnswer: (parsed.shortAnswer as string).slice(0, 1000),
            longAnswer: (parsed.longAnswer as string) || "",
            category: (parsed.category as string) || "dasar",
            format: "FAQ",
            source: "AI_GENERATED",
            status: "ANSWERED",
            tags: (parsed.tags as string[]) || [],
            relatedTickers: (parsed.relatedTickers as string[]) || [],
            slug,
            submittedById: systemUser?.id,
          },
        });
        generated.push(slug);
        existingQuestions.add((parsed.question as string).toLowerCase());
      } catch (e) {
        errors.push(`Error: ${topic} — ${e instanceof Error ? e.message : "unknown"}`);
      }
    }

    return {
      summary: `Content expander (faq): ${generated.length} generated, ${errors.length} errors`,
      generated,
      errors,
    };
  }

  private async expandGlossary(count: number): Promise<AgentJobResult> {
    const generated: string[] = [];
    const errors: string[] = [];

    const existing = await prisma.question.findMany({
      where: { category: "glosarium" },
      select: { question: true },
    });
    const existingTerms = new Set(existing.map((q) => q.question.toLowerCase()));

    const terms = [
      "AUM (Asset Under Management)", "Backdoor Listing", "Capital Gain", "Cut Loss",
      "Diversifikasi", "Emiten", "Flipping", "Go Public", "Holding Company",
      "Initial Public Offering (IPO)", "Junk Bond", "Klep harga", "Leverage",
      "Market Cap", "Naked Short Selling", "Order Book", "Price Earning Ratio",
      "Quarterly Report", "Rights Issue", "Stock Split", "Tender Offer",
      "Underwriter", "Volume Weighted Average Price (VWAP)", "Warranty Saham",
      "Yield", "Zero Coupon Bond", "Book Value", "Delisting", "Ex-Date",
      "Fractional Share", "Grey Market", "Insider Trading", "Locked-in Period",
      "Margin Call", "Private Placement", "Rights Shares", "Seasoned Equity Offering",
      "Treasury Stock", "Waran", "Cum Dividend", "Bonus Issue",
      "Buyback Saham", "Crossing", "Dark Pool", "Enhanced Index",
      "Free Float", "Index Rebalancing", "Liquidity Provider",
    ];

    const newTerms = terms.filter((t) => !existingTerms.has(t.toLowerCase()));
    const toGenerate = newTerms.slice(0, count);

    const systemUser = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    for (const term of toGenerate) {
      try {
        const response = await this.callAI(
          `Kamu adalah ahli keuangan Indonesia. Buat entri glosarium istilah pasar saham dalam Bahasa Indonesia.
WAJIB: jawab HANYA dengan JSON object tunggal, tanpa teks lain sebelum/sesudahnya.
Format: {"question":"Apa itu TERM?","shortAnswer":"definisi singkat 1-2 kalimat","longAnswer":"penjelasan lengkap 3-5 paragraf","tags":["tag1","tag2"]}`,
          `Istilah: ${term}`,
          1500,
        );

        const parsed = this.parseJsonResponse(response);
        if (!parsed || !parsed.question) {
          errors.push(`Parse failed: ${term}`);
          continue;
        }

        const slug = this.slugify(parsed.question as string);
        
        // Skip if slug already exists (from previous run)
        const existing = await prisma.question.findUnique({ where: { slug } });
        if (existing) continue;

        await prisma.question.create({
          data: {
            question: (parsed.question as string).slice(0, 500),
            shortAnswer: (parsed.shortAnswer as string).slice(0, 1000),
            longAnswer: (parsed.longAnswer as string) || "",
            category: "glosarium",
            format: "FAQ",
            source: "AI_GENERATED",
            status: "ANSWERED",
            tags: (parsed.tags as string[]) || ["glosarium"],
            relatedTickers: [],
            slug,
            submittedById: systemUser?.id,
          },
        });
        generated.push(slug);
      } catch (e) {
        errors.push(`Error: ${term} — ${e instanceof Error ? e.message : "unknown"}`);
      }
    }

    return {
      summary: `Content expander (glossary): ${generated.length} generated, ${errors.length} errors`,
      generated,
      errors,
    };
  }

  private async expandEducational(count: number): Promise<AgentJobResult> {
    const generated: string[] = [];
    const errors: string[] = [];

    const existingTitles = await prisma.article.findMany({
      where: { articleType: "EDUCATIONAL" },
      select: { title: true },
    });
    const existingSet = new Set(existingTitles.map((a) => a.title.toLowerCase()));

    const topics = [
      "Panduan Lengkap Cara Beli Saham Pertama Kali untuk Pemula 2025",
      "Cara Membaca dan Memahami Laporan Keuangan Emiten",
      "Strategi Dollar Cost Averaging untuk Investasi Saham IDX",
      "Panduan Memilih Saham Blue Chip di Bursa Efek Indonesia",
      "Cara Diversifikasi Portofolio Saham Ala Investor Profesional",
      "Indikator Teknikal Wajib: RSI, MACD, dan Moving Average",
      "Cara Menghitung dan Interpretasi Valuasi Saham (PER, PBV, ROE)",
      "Pengaruh Suku Bunga Bank Indonesia terhadap Pasar Saham",
      "Mengenal Pasar Modal Indonesia: Struktur, Regulasi, dan Pelaku",
      "Cara Mengelola Risiko dalam Investasi Saham",
    ];

    const systemUser = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    if (!systemUser) return { summary: "No system user found", generated: [], errors: 1 };

    const newTopics = topics.filter((t) => !existingSet.has(t.toLowerCase()));
    const toGenerate = newTopics.slice(0, count);

    for (const topic of toGenerate) {
      try {
        const response = await this.callAI(
          `Kamu adalah penulis keuangan profesional Indonesia. Tulis artikel edukasi tentang pasar saham Indonesia.
ARTIKEL HARUS:
- Minimal 3000 karakter
- Bahasa Indonesia yang mudah dipahami pemula
- Struktur: pendahuluan, isi bertahap (pakai sub-heading ##), kesimpulan
- Contoh konkret menggunakan saham IDX (BBCA, TLKM, BMRI dll)
- TANPA gambar — teks saja, pakai tabel markdown jika perlu
- Sertakan disclaimer di akhir

Format: tulis langsung konten HTML (pakai tag h2, p, ul, li, strong, table)`,
          `Topik: ${topic}`,
          8000,
        );

        const slug = this.slugify(topic);
        
        // Skip if slug already exists
        const existing = await prisma.article.findUnique({ where: { slug } });
        if (existing) continue;

        const excerpt = response.replace(/<[^>]*>/g, "").slice(0, 200).trim();

        await prisma.article.create({
          data: {
            title: topic,
            slug,
            excerpt,
            content: response.trim(),
            authorId: systemUser.id,
            articleType: "EDUCATIONAL",
            status: "PUBLISHED",
            tags: ["edukasi", "pemula", "investasi"],
            aiProvider: "anthropic",
          },
        });
        generated.push(slug);
      } catch (e) {
        errors.push(`Error: ${topic} — ${e instanceof Error ? e.message : "unknown"}`);
      }
    }

    return {
      summary: `Content expander (educational): ${generated.length} generated, ${errors.length} errors`,
      generated,
      errors,
    };
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 200);
  }

  async onComplete(_result: AgentJobResult, _parentJobId: string): Promise<ChainedJobSpec[]> {
    return [];
  }
}
