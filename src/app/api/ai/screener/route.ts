import { NextRequest, NextResponse } from "next/server";
import { technicalAnalysisService } from "@/domains/stock/technical-analysis.service";

/**
 * AI screener chat — user tanya bahasa manusia ("saham apa yang lagi oke?"),
 * server ambil hasil screener preset dr DB (fresh), kirim ke MLX lokal
 * utk dijawab dgn narasi + ticker link [BBCA](/stocks/BBCA.JK).
 * Angka dari DB, model cuma merangkai → halusinasi minim.
 */

const MLX_URL = process.env.MLX_AI_URL ?? "http://host.docker.internal:8765";

const RATE_LIMIT = 20; // per jam
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
  { match: /bullish|naik|oke|bagus|kuat|mantap|sehat/i, preset: "macd_bullish", label: "Sinyal Bullish" },
  { match: /oversold|murah|turun banget|bottom|bawah/i, preset: "rsi_oversold", label: "Oversold (RSI<30)" },
  { match: /golden cross|gc|tren baru/i, preset: "golden_cross", label: "Golden Cross" },
  { match: /volume|spike|ramai|aktif/i, preset: "volume_spike_low", label: "Volume Spike" },
  { match: /squeeze|volatil|akan bergerak/i, preset: "bb_squeeze", label: "Bollinger Squeeze" },
];

function pickPreset(question: string): { preset: string; label: string } {
  for (const q of QUESTION_PRESETS) {
    if (q.match.test(question)) return { preset: q.preset, label: q.label };
  }
  return { preset: "macd_bullish", label: "Sinyal Bullish" };
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

  let body: { question?: string; preset?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
  }

  const question = (body.question ?? "").slice(0, 500).trim();
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
  const cacheKey = `${chosen.preset}::${sig}`;
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
      return NextResponse.json(
        { error: `AI server error (${res.status})`, detail: errText.slice(0, 200) },
        { status: 502 },
      );
    }

    const data = (await res.json()) as { ok?: boolean; text?: string; ms?: number };
    const payload = {
      ok: true,
      text: data.text ?? "",
      preset: chosen.preset,
      presetLabel: chosen.label,
      matched: stocks.length,
      stocks, // tabel: sama dengan data screener, client render
      ms: data.ms ?? null,
    };
    cacheSet(cacheKey, { text: payload.text, presetLabel: payload.presetLabel, matched: payload.matched, stocks, at: Date.now() });
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      { error: "AI lokal tidak merespons — coba lagi sebentar." },
      { status: 504 },
    );
  }
}
