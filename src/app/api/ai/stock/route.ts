import { isPlausibleTicker } from "@/lib/ai-ticker-guard";
import { NextRequest, NextResponse } from "next/server";
import { buildStockAiContext } from "./context";
import { stockRepository } from "@/domains/stock/stock.repository";
import { withTicket, QueueFullError, configurePool } from "@/domains/ai/ai-gate.service";

// MLX serial ±7s/request — gate FIFO (ref-2026-10-17-04)
configurePool("mlx", { maxConcurrent: 1, maxQueueDepth: 6, maxWaitMs: 25_000 });

/**
 * AI ringkasan saham — proxy ke model MLX lokal (gemma-3-4b-it-4bit) di Mac mini host.
 * Server MLX: ~/.hermes/scripts/mlx_stock_ai_server.py (127.0.0.1:8765, dari container = host.docker.internal).
 * Semua ANGKA dikirim dari data server (indikator DB) — model hanya merangkai narasi,
 * tidak memanggil data eksternal → halusinasi minim.
 *
 * Rate limit ringan per IP: 30 request/jam (in-memory bucket, cukup untuk MVP).
 */

const MLX_URL = process.env.MLX_AI_URL ?? "http://host.docker.internal:8765";

// ─── Provider GLM flash (owner 30 Okt): glm-5.3-flash via Z.ai = primary utk AI user-facing ───
// Latency ~3,5s & paralel (vs MLX serial 7s). MLX lokal = fallback otomatis kalau Z.ai
// gangguan/timeout → AI user-facing tidak pernah mati total. Prompt & anti-halusinasi
// rule sama (angka 100% dari DB context — model hanya merangkai narasi).
const GLM_MODEL = process.env.GLM_FLASH_MODEL ?? "glm-5.3-flash";

const GLM_SYSTEM = [
  "Kamu 'Tanya AI' — sahabat analisa saham Indonesia di platform TeknikalID: santai, to-the-point, ngobrol kayak teman trading (boleh 'nih', 'tuh', 'nyangkut'), TAPI angka presisi dan tidak menggurui. Jawab intinya dulu, baru rincian.",
  "ATURAN KERAS: hanya gunakan ANGKA dari DATA yang diberikan user; DILARANG mengarang harga, level, atau angka yang tidak ada di data;",
  "Kalau ditanya 'layak dibeli / bagus / oke / harus apa', JANGAN bilang beli/jangan-beli:",
  "jawab dengan KERANGKA DATA — kondisi tren (posisi vs SMA), momentum (RSI/MACD), jarak ke support/resistance, valuasi (PE/PB) bila ada, arus asing (foreign flow) bila ada, lalu beri skenario 'kalau pegang: level invalidation X' / 'kalau mau masuk: tunggu konfirmasi Y'. Satu kalimat penutup bahwa ini edukasi teknikal, bukan rekomendasi beli/jual.",
  "Kalau ditanya 'kenapa naik/turun', gunakan changePercent + volume vs avgVol20 + foreignFlow5.state + headline recentArticles sebagai kandidat penjelas, dan katakan mana yang didukung data.",
  "Kalau ada field posisiUser (harga beli + floating P/L sudah dihitung server), gunakan angka itu persis saat membahas dilema hold/cut loss: sebut floating %, jarak ke support/invalidation, dan kerangka skenario — tanpa menyuruh cut loss atau hold.",
  "Kalau user menyebut ticker LAIN untuk dibandingkan ('bandingin sama BBRI'), gunakan DATA_PERBANDINGAN yang disediakan: sajikan trade-off objektif (valuasi PE/PB, dividen, tren SMA, skor sinyal, arus asing) dua sisi — jangan memihak salah satu.",
  "Kalau ditanya status halal/syariah dan data tidak memuat status DES/ISSI, JANGAN menebak — jelaskan bahwa cek daftar resmi DES OJK / ISSI BEI diperlukan.",
  "Untuk detail rasio/harga tebus right issue / IPO / stock split yang tidak ada di recentArticles, jelaskan mekanismenya edukatif dan arahkan ke keterbukaan informasi BEI — DILARANG mengarang angka rasio.",
  "Jawab Bahasa Indonesia, ringkas, jelas untuk trader retail pemula-menengah; angka format ribuan Indonesia (8.200).",
  "FORMAT WAJIB Markdown rapi dan TERSTRUKTUR (dirender sebagai kartu di aplikasi): mulai judul '## <TICKER> — <tema 2-4 kata>', lalu bagian bertajuk '###' (mis. Tren, Momentum, Volume & Asing, Level Kunci), poin pakai bullet '-' dengan **bold** untuk angka penting; kalau membandingkan dua saham pakai tabel Markdown; TIDAK ada '#' ganda tanpa isi, TIDAK paragraf tembok >3 kalimat.",
].join(" ");

type ChatTurn = { role: "user" | "ai"; text: string };

async function glmCall(
  context: Record<string, unknown>,
  mode: "summarize" | "ask",
  question: string,
  history?: ChatTurn[],
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_AUTH_TOKEN;
  if (!apiKey) throw new Error("GLM key missing");
  const body: Record<string, unknown> = {
    model: GLM_MODEL,
    max_tokens: 900,
    thinking: { type: "disabled" },
    system: GLM_SYSTEM,
    messages: [
      ...(history ?? []).slice(-6).map((h) => ({
        role: h.role === "user" ? ("user" as const) : ("assistant" as const),
        content: h.text.slice(0, 800),
      })),
      {
        role: "user" as const,
        content:
          `DATA saham (semua angka final, jangan dihitung ulang):\n${JSON.stringify(context, null, 1)}\n\n` +
          (mode === "ask"
            ? `PERTANYAAN USER: ${question}\nJawab HANYA dari DATA di atas. Kalau data tidak memuat jawabannya, katakan apa yang bisa disimpulkan dari data yang ada tanpa mengarang angka.`
            : "TUGAS: rangkum kondisi teknikal saham ini 4-6 kalimat (arah harga, tren vs SMA, momentum RSI/MACD, volume, level support/resistance)."),
      },
    ],
  };
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), 45_000);
  try {
    const res = await fetch(`${process.env.ANTHROPIC_BASE_URL ?? "https://api.z.ai/api/anthropic"}/v1/messages`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
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

const RATE_LIMIT = 300; // per jam (owner 16 Okt: jangan limit browsing)
const buckets = new Map<string, { count: number; resetAt: number }>();

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

// Context fields the MLX prompt builder understands — everything optional.
export interface StockAiContext {
  ticker?: string;
  name?: string;
  sector?: string;
  close?: number | null;
  changePercent?: number | null;
  prevClose?: number | null;
  volume?: number | null;
  avgVol20?: number | null;
  rsi14?: number | null;
  macdHist?: number | null;
  sma20?: number | null;
  sma50?: number | null;
  sma200?: number | null;
  support?: number | null;
  resistance?: number | null;
  signalLabel?: string | null;
  high52?: number | null;
  low52?: number | null;
}

function stripNulls(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== ""),
  );
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

  let body: (StockAiContext & { question?: string }) & { mode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
  }

  const mode = body.mode === "ask" ? "ask" : "summarize";
  const question = typeof body.question === "string" ? body.question.slice(0, 500) : "";

  if (mode === "ask" && !question.trim()) {
    return NextResponse.json({ error: "Pertanyaan kosong" }, { status: 400 });
  }

  // Strip non-context fields before forwarding
  const { mode: _m, question: _q, ...clientContext } = body;

  // Client modal hanya kirim {ticker,name} → lengkapi dari DB supaya AI tidak
  // mengarang angka (RCA bug "support/resistance semua 8000": prompt kosong).
  let context = clientContext;
  if (typeof clientContext.ticker === "string" && clientContext.ticker) {
    const dbCtx = await buildStockAiContext(clientContext.ticker);
    if (Object.keys(dbCtx).length > 0) {
      context = { ...dbCtx, ...stripNulls(clientContext) }; // client-explicit menang
    }
  }
  // multi-turn chat (owner 30 Okt): history dari FAB/modal, sanitasi
  const rawHistory = Array.isArray((body as Record<string, unknown>).history)
    ? ((body as Record<string, unknown>).history as unknown[])
    : [];
  const chatHistory = rawHistory
    .filter((h): h is { role: string; text: string } =>
      !!h && typeof h === "object" &&
      typeof (h as Record<string, unknown>).role === "string" && typeof (h as Record<string, unknown>).text === "string")
    .map((h) => ({ role: h.role === "user" ? ("user" as const) : ("ai" as const), text: h.text.slice(0, 800) }))
    .slice(-6);


  // G4 (riset Argon): ekstrak harga beli user ("nyangkut di 5.400" / "beli 5200") → floating P/L dihitung server
  if (mode === "ask" && question && typeof context.close === "number" && context.close > 0) {
    const m =
      question.match(/(?:nyangkut|beli|avg|average|harga beli)\s*(?:di|:|at)?\s*(?:rp\.?\s*)?([0-9][0-9.,]{2,9})/i) ??
      question.match(/([0-9][0-9.,]{2,9})\s*(?:nyangkut|gitu|an|perlembar)/i);
    if (m) {
      const buyPrice = Number(m[1].replace(/[.,](?=\d{3}\b)/g, "").replace(",", "."));
      if (Number.isFinite(buyPrice) && buyPrice > 10 && buyPrice < 1e7) {
        const close = context.close as number;
        (context as Record<string, unknown>).posisiUser = {
          hargaBeliRata: buyPrice,
          hargaSekarang: close,
          floatingPLPercent: ((close - buyPrice) / buyPrice) * 100,
          catatan: "angka final dihitung server — jangan dihitung ulang",
        };
      }
    }
  }

  // COMPARE (riset Argon G1): ticker kedua di pertanyaan → inject ringkasan utk duel A vs B
  if (mode === "ask" && question) {
    const current = String(clientContext.ticker ?? "").replace(/\.JK$/i, "");
    const found = new Set<string>();
    for (const m of question.matchAll(/\b([A-Z]{4})\b/g)) {
      const t = m[1];
      if (isPlausibleTicker(t, question) && t !== current && !found.has(t)) found.add(t);
    }
    if (found.size > 0) {
      const t2 = [...found][0];
      try {
        const st2 = await stockRepository.findStockByTicker(`${t2}.JK`);
        if (st2) {
          const ctx2 = await buildStockAiContext(`${t2}.JK`);
          const c2 = ctx2 as Record<string, unknown>;
          (context as Record<string, unknown>) = {
            ...context,
            DATA_PERBANDINGAN: {
              ticker: c2.ticker,
              close: c2.close,
              changePercent: c2.changePercent,
              sma20: c2.sma20,
              sma50: c2.sma50,
              sma200: c2.sma200,
              rsi14: c2.rsi14,
              signalScore: c2.signalScore,
              signalLabel: c2.signalLabelAi ?? c2.signalLabel,
              pe: (c2.fundamental as Record<string, unknown> | null)?.pe ?? null,
              pb: (c2.fundamental as Record<string, unknown> | null)?.pb ?? null,
              dividendYield: (c2.fundamental as Record<string, unknown> | null)?.dividendYield ?? null,
              foreignFlow5: c2.foreignFlow5,
            },
          };
        }
      } catch { /* best-effort */ }
    }
  }

  try {
    // Provider chain (owner 30 Okt): glm-5.3-flash PRIMARY (cepat, paralel) → MLX FALLBACK.
    // withTicket pool "mlx" tetap dipakai utk jalur MLX fallback (serial di Mac mini).
    const data = await withTicket(`mlx`, async () => {
      let glmErr: string | null = null;
      if (mode === "ask" || mode === "summarize") {
        try {
          const text = await glmCall(context, mode, question, chatHistory);
          return { ok: true as const, text, ms: 0, provider: "glm-flash" };
        } catch (e) {
          glmErr = e instanceof Error ? e.message : "glm error";
          console.warn(`[ai/stock] GLM flash gagal (${glmErr}) → fallback MLX`);
        }
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000);
      const res = await fetch(`${MLX_URL}/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...context, question }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`AI server error (${res.status}) ${errText.slice(0, 200)}`);
      }
      return (await res.json()) as { ok: boolean; text?: string; ms?: number; provider?: string };
    });
    if (!data.ok || !data.text) {
      return NextResponse.json({ error: "AI tidak menghasilkan jawaban" }, { status: 502 });
    }
    return NextResponse.json({ ok: true, text: data.text, ms: data.ms, provider: data.provider ?? "mlx" });
  } catch (e) {
    if (e instanceof QueueFullError) {
      return NextResponse.json(
        { error: "AI sedang melayani antrean — coba lagi sebentar.", retryAfterMs: e.retryAfterMs, queueDepth: e.queueDepth },
        { status: 429, headers: { "Retry-After": String(Math.ceil(e.retryAfterMs / 1000)) } },
      );
    }
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json(
      { error: "AI sedang tidak tersedia (server MLX lokal mati?)", detail: msg.slice(0, 150) },
      { status: 503 },
    );
  }
}
