export interface FAQPromptData {
  question: string;
  category: string;
  format: "FAQ" | "MINI_ARTICLE";
  relatedTickers?: string[];
}

export interface FAQGeneratedOutput {
  question: string;
  shortAnswer: string;
  longAnswer?: string;
  slug: string;
  tags: string[];
  metaDescription: string;
}

const BASE_SYSTEM_PROMPT = `Kamu adalah edukator keuangan Indonesia yang menulis untuk TeknikalID (teknikalid.com) — platform analisa teknikal saham BEI.

Tone: Edukatif, ringkas, langsung ke poin. Professional tapi mudah dipahami investor pemula.
Vocabulary: Gunakan istilah trader Indonesia secara natural: cuan, nyangkut, breakout, gorengan, jenuh beli/jual, akumulasi, bandarmologi.
Akurasi: Jawaban harus factually accurate. Jangan mengarang angka atau data pasar.
Lokalisasi: Konteks erat dengan pasar saham Indonesia (BEI/OJK). Gunakan contoh dari saham IDX40 seperti BBCA, BBRI, TLKM, ASII jika relevan.

PENTING: Respond ONLY with valid JSON. No markdown code blocks, no commentary, no extra text.`;

const FAQ_FORMAT_INSTRUCTION = `Format jawaban:
- Jawab dengan 2-3 paragraf singkat (maks 500 karakter). Langsung ke poin.
- Gunakan bahasa yang mudah dipahami pemula.
- Jika menyebutkan istilah teknis, jelaskan singkat dalam kurung.`;

const MINI_ARTICLE_FORMAT_INSTRUCTION = `Format jawaban:
- Jawab dengan konten markdown yang lebih mendalam (800-1500 kata).
- Gunakan H2 (##) untuk section.
- Berikan contoh dari saham IDX40 (BBCA, BBRI, TLKM, ASII, dll).
- Sertakan tips praktis yang bisa langsung diterapkan trader Indonesia.
- Gunakan bullet points untuk daftar.`;

function buildTickerContext(tickers?: string[]): string {
  if (!tickers || tickers.length === 0) return "";
  return `\n\nSaham terkait yang bisa dijadikan contoh: ${tickers.join(", ")}`;
}

export function buildFAQPrompt(data: FAQPromptData): { system: string; user: string } {
  const formatInstruction = data.format === "FAQ" ? FAQ_FORMAT_INSTRUCTION : MINI_ARTICLE_FORMAT_INSTRUCTION;

  const system = BASE_SYSTEM_PROMPT;

  const user = `## PERTANYAAN
${data.question}

## KATEGORI
${data.category}

## FORMAT
${formatInstruction}
${buildTickerContext(data.relatedTickers)}

## OUTPUT JSON
Respond with ONLY a valid JSON object (no code blocks, no extra text) dengan format:
{
  "question": "${data.question}",
  "shortAnswer": "Jawaban singkat 2-3 paragraf, maks 500 karakter",
  ${data.format === "MINI_ARTICLE" ? `"longAnswer": "Konten markdown mendalam 800-1500 kata dengan H2, contoh IDX40, dan tips praktis",` : `"longAnswer": null,`}
  "slug": "slug-url-friendly-dari-pertanyaan",
  "tags": ["tag1", "tag2", "tag3"],
  "metaDescription": "Meta description SEO-friendly, maks 160 karakter"
}

Aturan:
- slug: gunakan huruf kecil, pisahkan dengan tanda hubung, maks 80 karakter, dalam bahasa Indonesia
- tags: 3-7 tag relevan yang bisa dipakai untuk grouping dan SEO
- metaDescription: ringkasan singkat yang mengandung keyword utama, maks 160 karakter
- shortAnswer: wajib diisi untuk semua format
- longAnswer: hanya diisi untuk format MINI_ARTICLE, null untuk FAQ`;

  return { system, user };
}
