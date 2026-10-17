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
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
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
    // Waiting room (ref-2026-10-17-04): slot MLX via gate FIFO — bukan hit
    // MLX bersamaan. summarize ticker sama = single-flight utk dedupe.
    const data = await withTicket(`mlx`, async () => {
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
      return (await res.json()) as { ok: boolean; text?: string; ms?: number };
    });
    if (!data.ok || !data.text) {
      return NextResponse.json({ error: "AI tidak menghasilkan jawaban" }, { status: 502 });
    }
    return NextResponse.json({ ok: true, text: data.text, ms: data.ms });
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
