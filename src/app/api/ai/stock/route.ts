import { NextRequest, NextResponse } from "next/server";
import { buildStockAiContext } from "./context";
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
  "Kamu analis teknikal retail Indonesia di platform TeknikalID.",
  "ATURAN KERAS: hanya gunakan ANGKA dari DATA yang diberikan user; DILARANG mengarang harga, level, atau angka yang tidak ada di data;",
  "Kalau ditanya 'layak dibeli / bagus / oke / harus apa', JANGAN bilang beli/jangan-beli:",
  "jawab dengan KERANGKA DATA — kondisi tren (posisi vs SMA), momentum (RSI/MACD), jarak ke support/resistance, valuasi (PE/PB) bila ada, arus asing (foreign flow) bila ada, lalu beri skenario 'kalau pegang: level invalidation X' / 'kalau mau masuk: tunggu konfirmasi Y'. Satu kalimat penutup bahwa ini edukasi teknikal, bukan rekomendasi beli/jual.",
  "Kalau ditanya 'kenapa naik/turun', gunakan changePercent + volume vs avgVol20 + foreignFlow5.state + headline recentArticles sebagai kandidat penjelas, dan katakan mana yang didukung data.",
  "Jawab Bahasa Indonesia, ringkas, jelas untuk trader retail pemula-menengah; angka format ribuan Indonesia (8.200).",
].join(" ");

async function glmCall(
  context: Record<string, unknown>,
  mode: "summarize" | "ask",
  question: string,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_AUTH_TOKEN;
  if (!apiKey) throw new Error("GLM key missing");
  const body: Record<string, unknown> = {
    model: GLM_MODEL,
    max_tokens: 900,
    thinking: { type: "disabled" },
    system: GLM_SYSTEM,
    messages: [
      {
        role: "user",
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

  try {
    // Provider chain (owner 30 Okt): glm-5.3-flash PRIMARY (cepat, paralel) → MLX FALLBACK.
    // withTicket pool "mlx" tetap dipakai utk jalur MLX fallback (serial di Mac mini).
    const data = await withTicket(`mlx`, async () => {
      let glmErr: string | null = null;
      if (mode === "ask" || mode === "summarize") {
        try {
          const text = await glmCall(context, mode, question);
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
