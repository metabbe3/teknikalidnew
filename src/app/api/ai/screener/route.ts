import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { technicalAnalysisService } from "@/domains/stock/technical-analysis.service";
import { pasarLiveService } from "@/domains/stock/pasar-live.service";
import { withTicket, singleFlight, QueueFullError, configurePool } from "@/domains/ai/ai-gate.service";

// MLX serial ±7s/request — gate FIFO + single-flight (ref-2026-10-17-04)
configurePool("mlx", { maxConcurrent: 1, maxQueueDepth: 6, maxWaitMs: 25_000 });

/**
 * AI screener chat — user tanya bahasa manusia ("saham apa yang lagi oke?"),
 * server ambil hasil screener preset dr DB (fresh), kirim ke MLX lokal
 * utk dijawab dgn narasi + ticker link [BBCA](/stocks/BBCA.JK).
 * Angka dari DB, model cuma merangkai → halusinasi minim.
 */

const MLX_URL = process.env.MLX_AI_URL ?? "http://host.docker.internal:8765";

const RATE_LIMIT = 300; // per jam (owner 16 Okt: jangan limit browsing)
const buckets = new Map<string, { count: number; resetAt: number }>();

/**
 * Answer cache: pertanyaan serupa + data screener sama → jawaban cached,
 * AI (MLX) tidak dijalankan ulang. Key = preset + hash isi data.
 * Data berubah (update 5 mnt) → hash beda → cache baru. Max 64 entri (LRU-ish).
 */
type CachedAnswer = { text: string; presetLabel: string; matched: number; stocks: unknown[]; at: number };
const answerCache = new Map<string, CachedAnswer>();
const CACHE_MAX = 64;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 mnt — selaras refresh data intraday

function dataSignature(rows: Record<string, unknown>[]): string {
  // ticker + close + skor = cukup utk deteksi perubahan data
  return rows.map((r) => `${r.ticker}:${r.close}:${r.signalScore}`).join("|").slice(0, 4000);
}

function cacheGet(key: string): CachedAnswer | null {
  const hit = answerCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    answerCache.delete(key);
    return null;
  }
  return hit;
}

function cacheSet(key: string, val: CachedAnswer): void {
  if (answerCache.size >= CACHE_MAX) {
    // hapus entri terlama
    const oldest = [...answerCache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) answerCache.delete(oldest[0]);
  }
  answerCache.set(key, val);
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + 3600_000 });
    return false;
  }
  b.count += 1;
  return b.count > RATE_LIMIT;
}

/** Map pertanyaan bebas → preset screener (heuristik kata kunci). */
const QUESTION_PRESETS: { match: RegExp; preset: string; label: string }[] = [
  { match: /overbought|mahal|panas|euphor/i, preset: "rsi_overbought", label: "Overbought (RSI>70)" },
  { match: /oversold|murah|turun banget|bottom|bawah|diskon|turun terlalu jauh|kejatuhan/i, preset: "rsi_oversold", label: "Oversold (RSI<30)" },
  { match: /golden cross|gc|tren baru|mulai naik|baru mulai|awal naik/i, preset: "golden_cross", label: "Golden Cross" },
  { match: /bullish|naik|oke|bagus|kuat|mantap|sehat/i, preset: "macd_bullish", label: "Sinyal Bullish" },
  { match: /death cross|bearish|turun terus|lemah/i, preset: "death_cross", label: "Death Cross" },
  { match: /ema cross|ema12|ema 12/i, preset: "ema_cross", label: "EMA Cross" },
  { match: /volume|spike|ramai|aktif|banyak diperdagangkan|sering dibeli/i, preset: "volume_spike_low", label: "Volume Spike" },
  { match: /squeeze|volatil|akan bergerak/i, preset: "bb_squeeze", label: "Bollinger Squeeze" },
  { match: /dividen|dividend|payout|pasif|bagi hasil|cuan rutin/i, preset: "high_dividend", label: "Dividen Tinggi" },
  { match: /blue chip|besar|aman|likuid|large cap|perbankan inti|perusahaan besar|rugi rugi dikit|amal|paling stabil/i, preset: "blue_chip", label: "Blue Chip" },
  { match: /fundamental|undervalued|murah secara|valuasi|wajar/i, preset: "undervalued", label: "Undervalued" },
  { match: /tumbuh|growth|cuan jangka panjang|fundamental kuat/i, preset: "value_growth", label: "Value Growth" },
  { match: /pullback|koreksi|entry|beli saat turun|turun sebentar/i, preset: "pullback_sma20", label: "Pullback SMA20" },
  { match: /accumulation|dikumpulin|diam2|smart money/i, preset: "obv_accumulation", label: "OBV Accumulation" },
  { match: /trend kuat|adx|trending|arah jelas|digerakkan kuat/i, preset: "adx_trending", label: "ADX Trending" },
  { match: /supertrend|stop and reverse/i, preset: "supertrend_bullish", label: "Supertrend Bullish" },
  { match: /stochastic|stoch/i, preset: "stoch_oversold", label: "Stochastic Oversold" },
  { match: /di atas sma200|long term|jangka panjang teknikal/i, preset: "above_sma200", label: "Above SMA200" },
  { match: /hype|viral|heboh|sorotan/i, preset: "hype_alert", label: "Hype Alert" },
  { match: /menyentuh bollinger bawah|bollinger lower/i, preset: "bb_lower_touch", label: "Bollinger Lower Touch" },
];

function pickPreset(question: string): { preset: string; label: string } {
  for (const q of QUESTION_PRESETS) {
    if (q.match.test(question)) return { preset: q.preset, label: q.label };
  }
  return { preset: "macd_bullish", label: "Sinyal Bullish" };
}

// ─── Provider glm-5.3-flash (owner 30 Okt, riset Argon P0-3): primary, MLX fallback ───
const GLM_MODEL = process.env.GLM_FLASH_MODEL ?? "glm-5.3-flash";

const GLM_SYSTEM = [
  "Kamu 'Tanya AI' — sahabat analisa saham Indonesia di platform TeknikalID: santai, to-the-point, ngobrol kayak teman trading (boleh 'nih', 'tuh', 'cuan', 'nyangkut'), TAPI angka harus presisi dan tidak menggurui.",
  "GAYA CONVERSATIONAL: jawab langsung intinya dulu (1 kalimat pembuka yang menjawab pertanyaan), baru rincian. Kalau user nanya pendek, jawab pendek. Ikuti alur obrolan dari HISTORY — user bilang 'kalau BBRI gimana?' artinya lanjutan topik sebelumnya, jangan ulang semua dari nol.",
  "ATURAN KERAS: HANYA gunakan ticker & angka dari DATA yang diberikan; DILARANG mengarang ticker/harga;",
  "Jawab Bahasa Indonesia santai-profesional 2-4 kalimat: pola umum + 2-3 ticker paling menonjol",
  "dalam format PERSIS [TICKER](/stocks/TICKER.JK) langsung setelah kalimat — tanpa kata 'link', tanpa path terpisah;",
  "Kalau ada DATA PASAR (IHSG/breadth/asing), pakai untuk konteks; sebut angkanya apa adanya;",
  "JANGAN daftar semua saham — tabel sudah menampilkannya. Akhiri satu kalimat disclaimer: data teknikal, bukan rekomendasi beli.",
  "FORMAT: teks naratif pendek 2-4 kalimat dengan **bold** pada nama/ticker penting; ticker WAJIB format Markdown link [TICKER](/stocks/TICKER.JK); boleh bullet '-' bila menonjolkan 2-3 poin; JANGAN tabel (tabel sudah dirender aplikasi).",
  "Jika daftar kosong, jawab jujur: tidak ada saham yang lolos kriteria itu hari ini.",
  "BARIS PALING AKHIR WAJIB: '[FOLLOWUPS] Pertanyaan 1? | Pertanyaan 2? | Pertanyaan 3?' — 3 ide pertanyaan lanjutan singkat (<40 karakter, relevan konteks pasar/ticker barusan).",
].join(" ");

type ChatTurn = { role: "user" | "ai"; text: string };

async function glmScreenerChat(
  question: string,
  stocks: unknown,
  pasar?: unknown,
  history?: ChatTurn[],
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_AUTH_TOKEN;
  if (!apiKey) throw new Error("GLM key missing");
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), 45_000);
  try {
    const res = await fetch(`${process.env.ANTHROPIC_BASE_URL ?? "https://api.z.ai/api/anthropic"}/v1/messages`, {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: GLM_MODEL,
        max_tokens: 700,
        thinking: { type: "disabled" },
        system: GLM_SYSTEM,
        messages: [
          // multi-turn: history ringkas (max 6 turn terakhir, dipadatkan client)
          ...(history ?? []).slice(-6).map((h) => ({
            role: h.role === "user" ? ("user" as const) : ("assistant" as const),
            content: h.text.slice(0, 800),
          })),
          {
            role: "user" as const,
            content:
              `PERTANYAAN USER: ${question}\n\n` +
              (pasar ? `DATA PASAR HARI INI (konteks, angka final):\n${JSON.stringify(pasar)}\n\n` : "") +
              `DAFTAR SAHAM hasil screen (ticker, nama, harga, change%, skor):\n${JSON.stringify(stocks)}`,
          },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`GLM ${res.status}`);
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim();
    if (!text) throw new Error("GLM empty");
    return text;
  } finally {
    clearTimeout(to);
  }
}

/** Snapshot pasar ringkas utk konteks MARKET (IHSG, movers, asing, top skor) — SATU PINTU pasar-live. */
async function buildPasarContext(): Promise<Record<string, unknown> | null> {
  try {
    const snap = await pasarLiveService.getSnapshot(false);
    return {
      ihsg: snap.ihsg ?? null,
      topGainers: (snap.gainers ?? []).slice(0, 5).map((m) => ({ ticker: m.ticker, chg: m.changePercent, close: m.close })),
      topLosers: (snap.losers ?? []).slice(0, 5).map((m) => ({ ticker: m.ticker, chg: m.changePercent, close: m.close })),
      foreignNetBuy: (snap.foreign?.netBuy ?? []).slice(0, 5).map((f) => ({ ticker: f.ticker, netRp: f.netValue })),
      foreignNetSell: (snap.foreign?.netSell ?? []).slice(0, 5).map((f) => ({ ticker: f.ticker, netRp: f.netValue })),
      topSignals: (snap.topSignals ?? []).slice(0, 5).map((t) => ({ ticker: t.ticker, skor: t.signalScore, label: t.signalLabel })),
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  // Security-audit 28 Okt: xff[0] bisa dipalsukan client (CF append, [0]=nilai attacker).
  // Prioritaskan cf-connecting-ip (di-set Cloudflare, tak bisa dipalsukan via tunnel).
  const xff = req.headers.get("x-forwarded-for");
  const ip =
    req.headers.get("cf-connecting-ip") ??
    (xff ? xff.split(",").pop()?.trim() : undefined) ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan AI — coba lagi dalam beberapa menit." },
      { status: 429 },
    );
  }

  let body: { question?: string; preset?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
  }

  const question = (body.question ?? "").slice(0, 500).trim();
  // multi-turn chat (owner 30 Okt: FAB harus kayak chatbot): history dari client, sanitasi ketat
  const rawHistory = Array.isArray((body as Record<string, unknown>).history)
    ? ((body as Record<string, unknown>).history as unknown[])
    : [];
  const history = rawHistory
    .filter((h): h is { role: string; text: string } =>
      !!h && typeof h === "object" &&
      typeof (h as Record<string, unknown>).role === "string" && typeof (h as Record<string, unknown>).text === "string")
    .map((h) => ({ role: h.role === "user" ? ("user" as const) : ("ai" as const), text: h.text.slice(0, 800) }))
    .slice(-6);
  if (!question) {
    return NextResponse.json({ error: "Pertanyaan kosong" }, { status: 400 });
  }

  const chosen = body.preset ? { preset: body.preset, label: body.preset } : pickPreset(question);

  // Ambil hasil screener dari DB (reuse service /api/screener)
  let rows: Record<string, unknown>[] = [];
  let presetError: string | null = null;
  try {
    const result = (await technicalAnalysisService.screenerQuery(chosen.preset, undefined)) as
      | Record<string, unknown>[]
      | { error: string };
    if (Array.isArray(result)) rows = result.slice(0, 25);
    else presetError = result.error;
  } catch (e) {
    presetError = e instanceof Error ? e.message : "screener query gagal";
  }

  if (presetError) {
    return NextResponse.json({ error: `Screener error: ${presetError}` }, { status: 502 });
  }

  // Compact rows utk MLX (ticker wajib; angka apa adanya)
  const stocks = rows.map((r) => ({
    ticker: String(r.ticker ?? "").replace(/\.JK$/, ""),
    name: r.name ?? r.shortName ?? "",
    close: r.close ?? r.closePrice ?? null,
    changePercent: r.changePercent ?? null,
    signalScore: r.signalScore ?? null,
  }));

  const sig = dataSignature(rows);
  // Cache per (preset + data + PERTANYAAN) — riset Argon P0-2: cacheKey lama tanpa question
  // membuat jawaban AI pertanyaan A dipakai ulang utk pertanyaan B (bug "responsenya sama terus").
  const qHash = Buffer.from(question).toString("base64url").slice(0, 40);
  const cacheKey = `${chosen.preset}::${sig}::${qHash}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    return NextResponse.json({
      ok: true,
      text: cached.text,
      preset: chosen.preset,
      presetLabel: cached.presetLabel,
      matched: cached.matched,
      stocks: cached.stocks,
      ms: 0,
      cached: true,
    });
  }

  try {
    // Provider chain (owner 30 Okt): glm-5.3-flash PRIMARY + inject PasarSnapshot;
    // MLX fallback bila GLM gagal. single-flight tetap utk dedupe pertanyaan sama.
    const data = await singleFlight(`mlx-sc:${cacheKey}`, async () => {
      let glmText: string | null = null;
      try {
        const pasar = await buildPasarContext();
        glmText = await glmScreenerChat(question, stocks, pasar, history);
        return { ok: true as const, text: glmText, ms: 0, provider: "glm-flash" };
      } catch (e) {
        console.warn(`[ai/screener] GLM flash gagal (${e instanceof Error ? e.message : "err"}) → fallback MLX`);
      }
      return withTicket("mlx", async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60_000);
        const res = await fetch(`${MLX_URL}/screener-chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, stocks }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          throw new Error(`AI server error (${res.status}) ${errText.slice(0, 200)}`);
        }
        return (await res.json()) as { ok?: boolean; text?: string; ms?: number; _queued?: number; provider?: string };
      });
    });

    const payload = {
      ok: true,
      text: data.text ?? "",
      preset: chosen.preset,
      presetLabel: chosen.label,
      matched: stocks.length,
      stocks, // tabel: sama dengan data screener, client render
      ms: data.ms ?? null,
      provider: (data as { provider?: string }).provider ?? "mlx",
    };
    cacheSet(cacheKey, { text: payload.text, presetLabel: payload.presetLabel, matched: payload.matched, stocks, at: Date.now() });

    // flywheel (owner 30 Okt): log QA — fire-and-forget, jangan blok/gagalkan response
    prisma.aiChatLog
      .create({ data: { route: "screener", question: question.slice(0, 500), answer: String(payload.text ?? "").slice(0, 8000), provider: payload.provider ?? null, latencyMs: data.ms ?? null, anonId: (body as Record<string, unknown>).anonId as string | undefined ?? null, userId: (body as Record<string, unknown>).userId as string | undefined ?? null } })
      .catch(() => {});
    return NextResponse.json(payload);
  } catch (e) {
    if (e instanceof QueueFullError) {
      return NextResponse.json(
        { error: "AI sedang melayani antrean — coba lagi sebentar.", retryAfterMs: e.retryAfterMs, queueDepth: e.queueDepth },
        { status: 429, headers: { "Retry-After": String(Math.ceil(e.retryAfterMs / 1000)) } },
      );
    }
    return NextResponse.json(
      { error: "AI lokal tidak merespons — coba lagi sebentar." },
      { status: 504 },
    );
  }
}
