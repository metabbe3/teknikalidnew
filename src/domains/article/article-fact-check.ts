import Anthropic from "@anthropic-ai/sdk";
import { IDX40 } from "@/lib/constants";
import { decimalToNumber, bigIntToNumber } from "@/lib/serialize";
import { stockRepository } from "@/domains/stock/stock.repository";
import { fetchQuote } from "@/lib/yahoo-finance";

// ── Types ──

export interface MarketContext {
  date: string;
  ihsg: { level: number | null; changePercent: number | null };
  usdIdr: number | null;
  topStocks: Array<{
    ticker: string;
    name: string;
    close: number | null;
    changePercent: number | null;
  }>;
  relatedStocks: Array<{
    ticker: string;
    name: string;
    close: number | null;
    changePercent: number | null;
    sector: string;
  }>;
}

interface ExtractedClaim {
  claim: string;
  type: "stock_price" | "index_level" | "exchange_rate" | "percentage" | "other";
  ticker?: string;
  value: number;
}

export interface FactCheckResult {
  passed: boolean;
  mismatches: Array<{
    claim: string;
    statedValue: number;
    actualValue: number;
    description: string;
  }>;
  correctedContent: string | null;
  correctedTitle: string | null;
  meta: {
    claimsChecked: number;
    checkedAt: string;
  };
}

// ── Ticker extraction ──

const TICKER_REGEX = /\b([A-Z]{2,5})\b/g;

// Common Indonesian words to filter out (not stock tickers)
const COMMON_WORDS = new Set([
  "IHSG", "BEI", "OJK", "BI", "JKT", "IDX", "RSS", "API", "URL", "JSON",
  "THE", "AND", "FOR", "NOT", "BUT", "ARE", "WAS", "HAS", "HAD", "HIS",
  "HER", "ITS", "CAN", "WILL", "ALL", "USD", "IDR", "JPY", "EUR",
  "GDP", "CPI", "FOMC", "IPO", "ROE", "EPS", "PER", "PBV", "DER",
  "RUPISH", "RUPIAH", "BULAN", "TAHUN", "MINGGU", "HARI", "PAGI", "SORE",
]);

function extractTickersFromText(text: string): string[] {
  const matches = text.match(TICKER_REGEX) || [];
  const knownTickers = new Set(IDX40.map((s) => s.ticker.replace(".JK", "")));
  const found = new Set<string>();

  for (const m of matches) {
    if (!COMMON_WORDS.has(m) && knownTickers.has(m)) {
      found.add(m);
    }
  }

  return [...found];
}

// ── Market context gathering ──

export async function gatherMarketContext(tickers?: string[]): Promise<MarketContext> {
  const date = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Fetch IHSG (^JKSE) quote
  let ihsg: MarketContext["ihsg"] = { level: null, changePercent: null };
  try {
    const ihsgQuote = await fetchQuote("^JKSE");
    ihsg = {
      level: ihsgQuote.regularMarketPrice ?? null,
      changePercent: ihsgQuote.regularMarketChangePercent ?? null,
    };
  } catch (err) {
    console.error("[FactCheck] Failed to fetch IHSG:", err instanceof Error ? err.message : err);
  }

  // Fetch USD/IDR exchange rate
  let usdIdr: number | null = null;
  try {
    const fxQuote = await fetchQuote("IDR=X");
    usdIdr = fxQuote.regularMarketPrice ?? null;
  } catch (err) {
    console.error("[FactCheck] Failed to fetch USD/IDR:", err instanceof Error ? err.message : err);
  }

  // Fetch top IDX40 stocks from DB (fast, already synced)
  const topTickers = IDX40.slice(0, 10).map((s) => s.ticker);
  const topStocksData = await stockRepository.findStocksByTickersWithIndicators(topTickers);

  const topStocks: MarketContext["topStocks"] = topStocksData.map((s) => {
    const latest = s.prices[0];
    const prev = s.prices[1];
    const close = latest ? decimalToNumber(latest.close) : null;
    const prevClose = prev ? decimalToNumber(prev.close) : null;
    const changePercent =
      close !== null && prevClose !== null && prevClose !== 0
        ? ((close - prevClose) / prevClose) * 100
        : null;

    return {
      ticker: s.ticker.replace(".JK", ""),
      name: s.name,
      close,
      changePercent,
    };
  });

  // Fetch related stocks if specific tickers mentioned
  let relatedStocks: MarketContext["relatedStocks"] = [];
  if (tickers && tickers.length > 0) {
    const relatedTickers = tickers
      .map((t) => (t.endsWith(".JK") ? t : `${t}.JK`))
      .filter((t) => !topTickers.includes(t));

    if (relatedTickers.length > 0) {
      const relatedData = await stockRepository.findStocksByTickersWithIndicators(relatedTickers);
      relatedStocks = relatedData.map((s) => {
        const latest = s.prices[0];
        const prev = s.prices[1];
        const close = latest ? decimalToNumber(latest.close) : null;
        const prevClose = prev ? decimalToNumber(prev.close) : null;
        const changePercent =
          close !== null && prevClose !== null && prevClose !== 0
            ? ((close - prevClose) / prevClose) * 100
            : null;

        return {
          ticker: s.ticker.replace(".JK", ""),
          name: s.name,
          close,
          changePercent,
          sector: s.sector,
        };
      });
    }
  }

  return { date, ihsg, usdIdr, topStocks, relatedStocks };
}

// ── Format market context for prompt injection ──

export function formatMarketContextForPrompt(ctx: MarketContext): string {
  const lines: string[] = [];

  lines.push("## DATA PASAR TERKINI (WAJIB GUNAKAN DATA INI, JANGAN MEMBUAT ANGKA SENDIRI)");
  lines.push("");

  if (ctx.ihsg.level !== null) {
    const change = ctx.ihsg.changePercent !== null
      ? ` (${ctx.ihsg.changePercent >= 0 ? "+" : ""}${ctx.ihsg.changePercent.toFixed(2)}%)`
      : "";
    lines.push(`- **IHSG**: ${ctx.ihsg.level.toLocaleString("id-ID")}${change}`);
  }

  if (ctx.usdIdr !== null) {
    lines.push(`- **Rupiah/USD**: Rp ${ctx.usdIdr.toLocaleString("id-ID")}`);
  }

  lines.push("");
  lines.push("**Harga Saham IDX40 Terkini**:");
  for (const s of ctx.topStocks) {
    const price = s.close !== null ? `Rp ${s.close.toLocaleString("id-ID")}` : "N/A";
    const change = s.changePercent !== null
      ? ` (${s.changePercent >= 0 ? "+" : ""}${s.changePercent.toFixed(2)}%)`
      : "";
    lines.push(`- ${s.ticker} (${s.name}): ${price}${change}`);
  }

  if (ctx.relatedStocks.length > 0) {
    lines.push("");
    lines.push("**Saham Terkait Artikel**:");
    for (const s of ctx.relatedStocks) {
      const price = s.close !== null ? `Rp ${s.close.toLocaleString("id-ID")}` : "N/A";
      const change = s.changePercent !== null
        ? ` (${s.changePercent >= 0 ? "+" : ""}${s.changePercent.toFixed(2)}%)`
        : "";
      lines.push(`- ${s.ticker} (${s.name}, Sektor: ${s.sector}): ${price}${change}`);
    }
  }

  lines.push("");
  lines.push("**PENTING**:");
  lines.push("- Gunakan HANYA data di atas untuk semua angka harga saham, IHSG, dan kurs rupiah.");
  lines.push("- Jangan membuat angka sendiri. Jika tidak yakin tentang angka tertentu, gunakan frasa \"berdasarkan data terkini\" tanpa menyebutkan angka spesifik.");
  lines.push("- Jika berita menyebutkan angka yang berbeda dari data di atas, gunakan data di atas sebagai referensi dan catat bahwa berita sebelumnya menyebutkan angka berbeda.");

  return lines.join("\n");
}

// ── Fact-check article against market data ──

export async function factCheckArticle(
  content: string,
  marketContext: MarketContext,
  title?: string,
): Promise<FactCheckResult> {
  // Build lookup map from market context
  const priceLookup = new Map<string, { close: number | null; changePercent: number | null }>();

  for (const s of marketContext.topStocks) {
    priceLookup.set(s.ticker, { close: s.close, changePercent: s.changePercent });
  }
  for (const s of marketContext.relatedStocks) {
    priceLookup.set(s.ticker, { close: s.close, changePercent: s.changePercent });
  }

  const indexLookup: { level: number | null; changePercent: number | null } = marketContext.ihsg;
  const fxLookup: { rate: number | null } = { rate: marketContext.usdIdr };

  // Use AI to extract verifiable claims from content + title
  const combinedText = title ? `${title}\n\n${content}` : content;
  const claims = await extractClaimsFromArticle(combinedText);

  if (claims.length === 0) {
    // Even if combined text has no claims, check title independently
    if (title) {
      const titleClaims = await extractClaimsFromArticle(title);
      const titleMismatches: FactCheckResult["mismatches"] = [];
      for (const claim of titleClaims) {
        const mismatch = verifyClaim(claim, priceLookup, indexLookup, fxLookup);
        if (mismatch) titleMismatches.push(mismatch);
      }
      if (titleMismatches.length > 0) {
        const correctedTitle = await correctTitleErrors(title, titleMismatches);
        return {
          passed: false,
          mismatches: titleMismatches,
          correctedContent: null,
          correctedTitle,
          meta: { claimsChecked: titleClaims.length, checkedAt: new Date().toISOString() },
        };
      }
    }
    return {
      passed: true,
      mismatches: [],
      correctedContent: null,
      correctedTitle: null,
      meta: { claimsChecked: 0, checkedAt: new Date().toISOString() },
    };
  }

  // Cross-check claims against real data
  const mismatches: FactCheckResult["mismatches"] = [];

  for (const claim of claims) {
    const mismatch = verifyClaim(claim, priceLookup, indexLookup, fxLookup);
    if (mismatch) {
      mismatches.push(mismatch);
    }
  }

  const passed = mismatches.length === 0;

  // If there are mismatches, do a correction pass
  let correctedContent: string | null = null;
  let correctedTitle: string | null = null;
  if (!passed) {
    correctedContent = await correctArticleErrors(content, mismatches);
    if (title) {
      correctedTitle = await correctTitleErrors(title, mismatches);
    }
  }

  return {
    passed,
    mismatches,
    correctedContent,
    correctedTitle,
    meta: { claimsChecked: claims.length, checkedAt: new Date().toISOString() },
  };
}

// ── AI claim extraction ──

async function extractClaimsFromArticle(content: string): Promise<ExtractedClaim[]> {
  if (!process.env.ANTHROPIC_AUTH_TOKEN) return [];

  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
      baseURL: process.env.ANTHROPIC_BASE_URL,
      timeout: Number(process.env.API_TIMEOUT_MS) || 120_000,
    });

    const systemPrompt = `Kamu adalah fact-checker untuk artikel keuangan Indonesia.
Tugas: Ekstrak semua klaim angka yang bisa diverifikasi dari artikel.
Respond ONLY with valid JSON array, no other text.`;

    const userPrompt = `Dari artikel berikut, ekstrak SEMUA klaim yang berisi angka spesifik yang bisa diverifikasi:
- Harga saham (contoh: "BBCA di Rp 9.800", "saham TLKM seharga 3.500")
- Level IHSG (contoh: "IHSG di 7.200", "indeks menyentuh 6.800 poin")
- Kurs rupiah (contoh: "rupiah di 15.500", "Rp 16.000 per USD")
- Persentase perubahan harga saham spesifik (contoh: "BBRI naik 3.5%")

JANGAN ekstrak:
- Persentase umum tanpa ticker (contoh: "inflasi naik 3%")
- Angka volume tanpa ticker
- Angka yang bukan harga/level/nilai tukar

ARTIKEL:
${content.slice(0, 5000)}

Output JSON array:
[{"claim": "BBCA di Rp 9.800", "type": "stock_price", "ticker": "BBCA", "value": 9800}]
[{"claim": "IHSG di 7.200", "type": "index_level", "ticker": null, "value": 7200}]
[{"claim": "rupiah di 15.500", "type": "exchange_rate", "ticker": null, "value": 15500}]

Jika tidak ada klaim yang bisa diverifikasi, output: []`;

    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((c: Record<string, unknown>) => c.claim && c.value != null)
          .map((c: Record<string, unknown>) => ({
            claim: String(c.claim),
            type: (["stock_price", "index_level", "exchange_rate", "percentage", "other"].includes(c.type as string)
              ? c.type
              : "other") as ExtractedClaim["type"],
            ticker: c.ticker ? String(c.ticker) : undefined,
            value: Number(c.value),
          }));
      }
    }
  } catch (err) {
    console.error("[FactCheck] Claim extraction failed:", err instanceof Error ? err.message : err);
  }

  return [];
}

// ── Claim verification ──

function verifyClaim(
  claim: ExtractedClaim,
  priceLookup: Map<string, { close: number | null; changePercent: number | null }>,
  indexLookup: { level: number | null; changePercent: number | null },
  fxLookup: { rate: number | null },
): FactCheckResult["mismatches"][number] | null {
  if (claim.type === "stock_price" && claim.ticker) {
    const actual = priceLookup.get(claim.ticker.toUpperCase());
    if (actual?.close !== null && actual?.close !== undefined) {
      const tolerance = 0.05; // 5% tolerance for stock prices
      const diff = Math.abs(claim.value - actual.close) / actual.close;
      if (diff > tolerance) {
        return {
          claim: claim.claim,
          statedValue: claim.value,
          actualValue: actual.close,
          description: `${claim.ticker} seharusnya Rp ${actual.close.toLocaleString("id-ID")}, bukan Rp ${claim.value.toLocaleString("id-ID")}`,
        };
      }
    }
  }

  if (claim.type === "index_level") {
    if (indexLookup.level !== null) {
      const tolerance = 0.05; // 5% tolerance for index
      const diff = Math.abs(claim.value - indexLookup.level) / indexLookup.level;
      if (diff > tolerance) {
        return {
          claim: claim.claim,
          statedValue: claim.value,
          actualValue: indexLookup.level,
          description: `IHSG seharusnya ${indexLookup.level.toLocaleString("id-ID")} poin, bukan ${claim.value.toLocaleString("id-ID")}`,
        };
      }
    }
  }

  if (claim.type === "exchange_rate") {
    if (fxLookup.rate !== null) {
      const tolerance = 0.1; // 10% tolerance for FX (can be volatile)
      const diff = Math.abs(claim.value - fxLookup.rate) / fxLookup.rate;
      if (diff > tolerance) {
        return {
          claim: claim.claim,
          statedValue: claim.value,
          actualValue: fxLookup.rate,
          description: `Kurs USD/IDR seharusnya Rp ${fxLookup.rate.toLocaleString("id-ID")}, bukan Rp ${claim.value.toLocaleString("id-ID")}`,
        };
      }
    }
  }

  return null;
}

// ── Article correction ──

async function correctArticleErrors(
  content: string,
  mismatches: FactCheckResult["mismatches"],
): Promise<string | null> {
  if (!process.env.ANTHROPIC_AUTH_TOKEN) return null;

  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
      baseURL: process.env.ANTHROPIC_BASE_URL,
      timeout: Number(process.env.API_TIMEOUT_MS) || 120_000,
    });

    const errorList = mismatches
      .map((m) => `- ${m.description}`)
      .join("\n");

    const systemPrompt = `Kamu adalah editor artikel keuangan Indonesia.
Tugas: Perbaiki angka-angka yang salah dalam artikel berikut.
PENTING: Hanya ubah angka yang disebutkan di daftar error. Jangan ubah konten lainnya.
Respond with the FULL corrected article. No explanation, no JSON.`;

    const userPrompt = `Perbaiki artikel berikut sesuai daftar error:

ERROR YANG HARUS DIPERBAIKI:
${errorList}

ARTIKEL YANG HARUS DIPERBAIKI:
${content}

Kembalikan artikel lengkap yang sudah diperbaiki. Jangan tambahkan catatan editor.`;

    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return text.trim() || null;
  } catch (err) {
    console.error("[FactCheck] Correction failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

// ── Title correction ──

async function correctTitleErrors(
  title: string,
  mismatches: FactCheckResult["mismatches"],
): Promise<string | null> {
  if (!process.env.ANTHROPIC_AUTH_TOKEN) return null;

  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
      baseURL: process.env.ANTHROPIC_BASE_URL,
      timeout: Number(process.env.API_TIMEOUT_MS) || 120_000,
    });

    const errorList = mismatches
      .map((m) => `- ${m.description}`)
      .join("\n");

    const systemPrompt = `Kamu adalah editor judul artikel keuangan Indonesia.
Tugas: Perbaiki angka-angka yang salah dalam judul artikel.
PENTING: Hanya ubah angka yang salah. Pertahankan gaya bahasa, hook, dan struktur judul yang sama.
Respond with ONLY the corrected title text. No explanation, no quotes, no JSON.`;

    const userPrompt = `Perbaiki judul berikut sesuai daftar error:

ERROR YANG HARUS DIPERBAIKI:
${errorList}

JUDUL YANG HARUS DIPERBAIKI:
${title}

Kembalikan hanya judul yang sudah diperbaiki. Jangan ubah gaya bahasa atau struktur, hanya perbaiki angka yang salah.`;

    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      max_tokens: 200,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    // Basic sanity check: corrected title shouldn't be empty or wildly different in length
    if (!text || text.length < 10 || text.length > title.length * 2) {
      return null;
    }

    return text;
  } catch (err) {
    console.error("[FactCheck] Title correction failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

// ── Utility: extract tickers for the pipeline ──

export { extractTickersFromText };
