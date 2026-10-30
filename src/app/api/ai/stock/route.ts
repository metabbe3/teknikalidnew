import { aiRateCheck } from "@/lib/ai-rate-limit";
import { auth } from "@/lib/auth";
import { buildPasarContext } from "@/lib/ai-pasar-context";
import { prisma } from "@/lib/prisma";
import { isPlausibleTicker, extractTickersRanked } from "@/lib/ai-ticker-guard";
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
  "SO WHAT (wajib): setiap rangkuman angka HARUS diikuti implikasinya — 'harga -9,6% di bawah SMA20' lanjut 'artinya tren jangka pendek masih turun, entry konfirmasi tunggu di atas SMA'. Angka tanpa implikasi = jawaban setengah jadi.",
  "premiseCheck di data = premis user SALAH vs data: luruskan di KALIMAT PERTAMA ('Lurusin dulu: hari ini justru naik +X%'), baru lanjut analisis penyebab yang benar (mis. tren 20 hari).",
  "posisiUser.bepGapPct = persen kenaikan yang dibutuhkan buat balik modal; posisiUser.avgDown1to1 = rata-rata baru kalau averaging lot sama di harga sekarang. distToSupportPct/distToResistPct = jarak % ke level kunci. Semua sudah dihitung server — pakai langsung, jangan hitung ulang.",
  "Arus asing: bandingkan antar-emiten dalam RUPIAH (estimasiNet5Rp / sesi × harga), BUKAN lembar — harga per lembar beda jauh.",
  "Kalau ditanya status halal/syariah dan data tidak memuat status DES/ISSI, JANGAN menebak — jelaskan bahwa cek daftar resmi DES OJK / ISSI BEI diperlukan.",
  "Untuk detail rasio/harga tebus right issue / IPO / stock split yang tidak ada di recentArticles, jelaskan mekanismenya edukatif dan arahkan ke keterbukaan informasi BEI — DILARANG mengarang angka rasio.",
  "Jawab Bahasa Indonesia, ringkas, jelas untuk trader retail pemula-menengah; angka format ribuan Indonesia (8.200).",
  "FORMAT BILA MODE SUMMARIZE (kartu): judul '## <TICKER> — <tema 2-4 kata>', bagian '###' (Tren, Momentum, Volume & Asing, Level Kunci), bullet '-' dengan **bold** angka penting.",
  "FORMAT BILA MODE ASK / OBROLAN (CONVERSATIONAL PYRAMID — jangan pakai heading '##'/'###'): (1) buka 1-2 kalimat santai yang LANGSUNG menjawab inti pertanyaan; (2) maksimal 3-4 bullet pendek dengan **bold** angka kunci (tabel hanya bila duel 2 saham); (3) tutup 1 kalimat poin pantauan paling krusial + pengingat ringan 'kerangka data edukasi, bukan saran beli/jual' — jangan ulang disclaimer panjang tiap turn.",
  "KUALIFIKASI + ANGKA: jangan sebut istilah kabur tanpa angka (salah: 'RSI udah rendah'; benar: 'RSI di **31,4**, mepet jenuh jual 30').",
  "LABEL WAKTU JUJUR (juri Claude 30 Okt): data harga/indikator = EOD. WAJIB tulis 'close <tanggal dari data>' sekali di awal; DILARANG bilang 'hari ini' untuk angka EOD. Gunakan tanggal aktual hari ini (dari DATA asOf/tanggal) sebagai acuan.",
  "METRIK TURUNAN WAJIB (juri Claude): sebelum bilang 'data tidak tersedia', HITUNG dulu dari angka yang ada: tanya dividen → payout ratio = DPS/EPS (dan sebut hasilnya, mis. 'payout ~117% — dividen lebih besar dari laba'); user nyangkut → %minus sekarang + %naik yang dibutuhkan untuk BEP; bandingkan → selisih % antar saham. Angka turunan tandai dengan '±' bila pembulatan.",
  "KRITERIA DULU (juri Claude): kata sifat subjektif (sehat, kuat, murah, risiko tinggi) WAJIB diikuti kriterianya di kalimat yang sama atau berikutnya (mis. 'profil risiko tinggi: volatilitas ekstrem + volume lonjak tanpa berita'). DILARANG melabel emiten spesifik dengan kata 'gorengan' — pakai 'profil risiko tinggi (kriteria: ...)'.",
  "GLOSARIUM SATUAN (juri Claude): aliran asing = 'Rp X miliar' (bukan 'M'), volume = 'juta lembar', desimal pakai koma maksimal 2 angka (3,49 bukan 3,4912), harga pakai titik ribuan (Rp4.940). Konsisten satu format di seluruh jawaban.",
  "BAHASA: santai tapi JANGAN paksa gaul — kalau ragu dengan sebuah kata gaul, pakai bahasa Indonesia baku sehari-hari (larangan: 'tuang', 'kelola besar', 'kepenjeblokan', 'serok'). Typos = bot murahan.",
  "EMPATI NYANGKUT: bila ada posisiUser minus atau kata nyangkut/boncos, buka dengan 1 kalimat validasi emosi manusiawi sebelum angka; jangan menggurui.",
  "BARIS PALING AKHIR WAJIB: '[FOLLOWUPS] Pertanyaan 1? | Pertanyaan 2? | Pertanyaan 3?' — 3 ide lanjutan singkat (<40 karakter, relevan konteks barusan).",
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
    system: GLM_SYSTEM, // sudah string (join " " di deklarasi) — Z.ai: system WAJIB string tunggal
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

  // v2 (owner 30 Okt): authed dari SESSION server (anti-spoof) + dua lapis jam/hari + pesan konversi
  let authed = false;
  try { authed = !!(await auth()).user; } catch { authed = false; }
  const rd = aiRateCheck(ip, authed);
  if (rd.limited) {
    return NextResponse.json(
      { error: rd.hit === "day" ? (rd.authed ? "Kuota harian AI kamu (150 pertanyaan) sudah habis - kembali besok ya" : "Kuota gratis harian kamu sudah habis (50 pertanyaan). Login biar dapat 3x lipat - 150 pertanyaan/hari") : "Kecepatan tanya kena batas sementara - istirahat sebentar, coba lagi dalam beberapa menit ya." },
      { status: 429 },
    );
  }

  let body: (StockAiContext & { question?: string; history?: unknown; anonId?: string; userId?: string }) & { mode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
  }

  // G1 (juri Claude 30 Okt): question tanpa mode → ask (bukan summarize dgn context kosong)
  const hasQuestion = typeof body.question === "string" && body.question.trim().length > 0;
  const mode = body.mode === "summarize" && !hasQuestion ? "summarize" : body.mode === "summarize" || hasQuestion ? (body.mode === "summarize" ? "summarize" : "ask") : "summarize";
  const question = hasQuestion ? (body.question as string).slice(0, 500) : "";

  if (mode === "ask" && !question.trim()) {
    return NextResponse.json({ error: "Pertanyaan kosong" }, { status: 400 });
  }

  // Strip non-context fields before forwarding (RT-02 red-team: whitelist + DB menang atas client)
  const { mode: _m, question: _q, history: _h, anonId: _a, userId: _u, ...clientContext } = body;
  // whitelist key yang diizinkan dari client (cukup identitas + posisi user — ANGKA RESMI DARI DB)
  const CLIENT_ALLOWED = new Set(["ticker", "name", "buyPrice"]);
  const safeClientCtx = Object.fromEntries(
    Object.entries(clientContext).filter(([k]) => CLIENT_ALLOWED.has(k) && k !== "ticker" || k === "ticker"),
  );

  // G1 (juri Claude 30 Okt): client modal tanpa ticker → cari dari teks pertanyaan
  if (!clientContext.ticker && question) {
    const ranked = extractTickersRanked(question);
    if (ranked.length > 0) clientContext.ticker = ranked[0];
  }

  // Client modal hanya kirim {ticker,name} → lengkapi dari DB supaya AI tidak
  // mengarang angka (RCA bug "support/resistance semua 8000": prompt kosong).
  let context = clientContext;
  if (typeof clientContext.ticker === "string" && clientContext.ticker) {
    const dbCtx = await buildStockAiContext(clientContext.ticker);
    if (Object.keys(dbCtx).length > 0) {
      context = stripNulls({ ...safeClientCtx, ...dbCtx }); // RT-02: DB wajib menang atas client (anti-spoofing harga/indikator)
    }
  }
  const __t0 = Date.now();
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
  // G1c (juri 30 Okt): jalankan utk SEMUA mode — summarize dgn pertanyaan posisi juga butuh ini
  if (question && typeof context.close === "number" && context.close > 0) {
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
  // G1c (juri 30 Okt): compare juga jalan di summarize (bug id 51/48: "bandingin" buntu)
  if (question) {
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

  // ── G3 (juri Claude 30 Okt): lapisan "so what" dihitung SERVER, bukan dikarang model ──
  {
    const ctx = context as Record<string, unknown>;
    const close = typeof ctx.close === "number" ? (ctx.close as number) : null;
    // posisiUser enrichment: BEP gap + average-down 1:1
    const pos = ctx.posisiUser as ({ hargaBeliRata?: number } & Record<string, unknown>) | undefined;
    if (pos && typeof pos.hargaBeliRata === "number" && close && close > 0) {
      const bep = pos.hargaBeliRata;
      pos.bepGapPct = Math.round(((bep - close) / close) * 1000) / 10; // butuh naik % utk balik modal
      pos.avgDown1to1 = Math.round(((bep + close) / 2) * 100) / 100;  // rata baru bila lot sama di harga skrg
    }
    // jarak ke support/resistance %
    const s1 = typeof ctx.support1 === "number" ? (ctx.support1 as number) : null;
    const r1 = typeof ctx.resistance1 === "number" ? (ctx.resistance1 as number) : null;
    if (close && close > 0) {
      if (s1 && s1 > 0) ctx.distToSupportPct = Math.round(((close - s1) / close) * 1000) / 10;
      if (r1 && r1 > 0) ctx.distToResistPct = Math.round(((r1 - close) / close) * 1000) / 10;
    }
    // premiseCheck: user bilang turun/naik padahal data bilang sebaliknya → wajib diluruskan di kalimat pertama
    if (question && typeof ctx.changePercent === "number") {
      const chg = ctx.changePercent as number;
      const bilangTurun = /\b(turun|anjlok|melemah|drop|turunya)\b/i.test(question);
      const bilangNaik = /\b(naik|rally|menguat|naiknya)\b/i.test(question);
      if (bilangTurun && chg > 0.05) ctx.premiseCheck = `PERHATIAN: user bilang turun, tapi data close hari ini ${chg > 0 ? "+" : ""}${chg}% — luruskan premis di kalimat PERTAMA sebelum analisis.`;
      else if (bilangNaik && chg < -0.05) ctx.premiseCheck = `PERHATIAN: user bilang naik, tapi data close hari ini ${chg}% — luruskan premis di kalimat PERTAMA sebelum analisis.`;
    }
  }

  try {
    // Provider chain (owner 30 Okt): glm-5.3-flash PRIMARY (cepat, paralel) → MLX FALLBACK.
    // RT-01 red-team 30 Okt: glmCall TIDAK lagi terkunci withTicket("mlx") (serial maxConcurrent=1
    // → seluruh chat saham antre 1-per-1 + 429 QueueFull saat 1 request lambat). GLM cloud = paralel;
    // withTicket hanya utk jalur MLX fallback (serial di Mac mini).
    const data = await (async (): Promise<{ ok: boolean; text: string; ms: number; provider?: string }> => {
      let glmErr: string | null = null;
      if (mode === "ask" || mode === "summarize") {
        try {
          // juri Claude 30 Okt: konteks pasar + tanggal wajib — saham tidak hidup sendirian
          const pasarCtx = await buildPasarContext().catch(() => null);
          const ctx = { ...context, marketContext: pasarCtx ? { ihsg: pasarCtx.ihsg, asingNetSellTop: pasarCtx.foreignNetSell, asingNetBuyTop: pasarCtx.foreignNetBuy } : null, asOf: new Date().toISOString().slice(0, 10) };
          const text = await glmCall(ctx, mode, question, chatHistory);
          // flywheel (owner 30 Okt): log QA fire-and-forget
          prisma.aiChatLog
            .create({ data: { route: "stock", mode, ticker: String(clientContext.ticker ?? "").replace(/\.JK$/i, ""), question: question.slice(0, 500), answer: text.slice(0, 8000), provider: "glm-flash", latencyMs: Date.now() - __t0, anonId: (body as Record<string, unknown>).anonId as string | undefined ?? null, userId: (body as Record<string, unknown>).userId as string | undefined ?? null } })
            .catch(() => {});
          return { ok: true, text, ms: 0, provider: "glm-flash" };
        } catch (e) {
          glmErr = e instanceof Error ? e.message : "glm error";
          console.warn(`[ai/stock] GLM flash gagal (${glmErr}) → fallback MLX`);
        }
      }
      return withTicket(`mlx`, async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60_000);
        try {
          const res = await fetch(`${MLX_URL}/${mode}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...context, question }),
            signal: controller.signal,
          });
          if (!res.ok) {
            const errText = await res.text().catch(() => "");
            throw new Error(`AI server error (${res.status}) ${errText.slice(0, 200)}`);
          }
          const j = (await res.json()) as { ok?: boolean; text?: string; ms?: number; provider?: string };
          return { ok: Boolean(j.ok), text: String(j.text ?? ""), ms: Number(j.ms ?? 0), provider: j.provider };
        } finally {
          clearTimeout(timeout); // RT-01: clearTimeout di finally
        }
      });
    })();
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
