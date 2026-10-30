// AI QA Evaluator (owner 30 Okt: "test agy argon / claude liat resultnya sudah oke / blm")
// POST { route, ticker?, mode?, question, answer?, history? } → jalankan 1 pertanyaan bila answer tak disertakan,
// lalu 3 judge paralel (GLM self, via Z.ai) menilai: akurasi-routing, kualitas-jawaban, kelayakan-user.
// Output: skor 0-10 per dimensi + verdict + saran konkret. GET → ringkasan run terakhir (cache 5 menit).
import { NextResponse } from "next/server";
import { detectTickerInText, extractTickersRanked } from "@/lib/ai-ticker-guard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MODEL = process.env.GLM_FLASH_MODEL ?? "glm-5.3-flash";
const BASE = process.env.ANTHROPIC_BASE_URL ?? "https://api.z.ai/api/anthropic";

type JudgeDim = "routing" | "kualitas" | "kelayakan";
const RUBRIC: Record<JudgeDim, string> = {
  routing: `Kamu juri ROUTING jawaban chatbot saham Indonesia bernama Tanya AI. Tugas: baca pertanyaan user dan jawaban AI, nilai apakah jawaban menargetkan pertanyaan yang benar (bukan topik lain / tidak mengarang ticker yang tidak diminta / tidak salah saham). Skala 0-10: 10 tepat sasaran, 5 sebagian relevan, 0 salah total. Setelah menimbang, tulis SATU BARIS terakhir berformat JSON persis: {"score": <angka>, "saran": "<masukan konkret ≤120 karakter, isi "oke" bila sempurna>"}`,
  kualitas: `Kamu juri KUALITAS jawaban chatbot saham Indonesia bernama Tanya AI, standar analis senior. Tugas: nilai (a) kepadatan angka spesifik vs basa-basi, (b) struktur mudah dibaca, (c) format konsisten (bold, link ticker, chips follow-up utuh), (d) tidak menolak menjawab padahal data tersedia. Skala 0-10. Setelah menimbang, tulis SATU BARIS terakhir berformat JSON persis: {"score": <angka>, "saran": "<masukan konkret ≤120 karakter, isi "oke" bila sempurna>"}`,
  kelayakan: `Kamu juri KELAYAKAN jawaban chatbot saham Indonesia bernama Tanya AI untuk pengguna retail (patuh aturan OJK). Tugas: nilai (a) bahasa santai mudah dipahami, (b) TIDAK ada rekomendasi beli/jual langsung (wajib framing edukasi/disclaimer), (c) empati bila user cerita posisi minus, (d) panjang proporsional utk chat (bukan tembok teks). Skala 0-10. Setelah menimbang, tulis SATU BARIS terakhir berformat JSON persis: {"score": <angka>, "saran": "<masukan konkret ≤120 karakter, isi "oke" bila sempurna>"}`,
};

async function glmJudge(dim: JudgeDim, question: string, answer: string): Promise<{ score: number; saran: string }> {
  const apiKey = process.env.ANTHROPIC_AUTH_TOKEN;
  if (!apiKey) return { score: -1, saran: "evaluator tanpa API key" };
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(`${BASE}/v1/messages`, {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000, // glm-5.3-flash = thinking model: butuh ruang; JSON final di akhir output
        system: RUBRIC[dim] + `\nWAJIB jawab HANYA JSON: {"score": <0-10>, "saran": "<teks>"}`,
        messages: [{ role: "user", content: `PERTANYAAN USER:\n<q>\n${question}\n</q>\n\nJAWABAN YANG DINILAI:\n<a>\n${answer.slice(0, 3500)}\n</a>` }],
      }),
    });
    clearTimeout(to);
    if (!res.ok) return { score: -1, saran: `judge HTTP ${res.status}` };
    const j = (await res.json()) as { content?: Array<{ text?: string }> };
    const raw = (j.content ?? []).map((c) => c.text ?? "").join("").replace(/```json|```/g, "").trim();
    // ambil JSON TERAKHIR (model kadang menulis penjelasan dulu)
    const matches = raw.match(/\{[\s\S]*?\}/g);
    const m = matches && matches.length ? matches[matches.length - 1] : null;
    if (!m) return { score: -1, saran: `judge output: ${raw.slice(0, 60)}` };
    let parsed: { score?: number; saran?: string };
    try {
      parsed = JSON.parse(m) as { score?: number; saran?: string };
    } catch {
      return { score: -1, saran: `judge JSON rusak: ${m.slice(0, 60)}` };
    }
    return { score: Math.max(0, Math.min(10, Number(parsed.score ?? -1))), saran: String(parsed.saran ?? "").slice(0, 140) };
  } catch {
    clearTimeout(to);
    return { score: -1, saran: "judge timeout/error" };
  }
}

// jalankan pertanyaan bila answer tidak disertakan (reuse internal fetch agar cache/log jalan seperti user nyata)
async function runQuestion(route: string, body: Record<string, unknown>): Promise<{ answer: string; ms: number }> {
  const t0 = Date.now();
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:3000";
  const res = await fetch(`${base}/api/ai/${route === "stock" ? "stock" : "screener"}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = (await res.json()) as { text?: string };
  return { answer: String(j.text ?? ""), ms: Date.now() - t0 };
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const question = String(body.question ?? "").slice(0, 500);
  if (!question) return NextResponse.json({ ok: false, error: "question wajib" }, { status: 400 });
  const route = body.route === "stock" || detectTickerInText(question) ? "stock" : "screener";
  const ticker = route === "stock" ? String(body.ticker ?? detectTickerInText(question) ?? "BBCA") : undefined;

  const inner: Record<string, unknown> = { question, ...(body.history ? { history: body.history } : {}) };
  if (route === "stock") inner.mode = body.mode ?? "ask", inner.ticker = `${ticker}.JK`;

  let answer = String(body.answer ?? "");
  let ms = 0;
  if (!answer) {
    try {
      const r = await runQuestion(route, inner);
      answer = r.answer; ms = r.ms;
    } catch (e) {
      return NextResponse.json({ ok: false, error: `run gagal: ${e instanceof Error ? e.message : "err"}` }, { status: 502 });
    }
  }

  const [routing, kualitas, kelayakan] = await Promise.all([
    glmJudge("routing", question, answer),
    glmJudge("kualitas", question, answer),
    glmJudge("kelayakan", question, answer),
  ]);

  const dims = { routing, kualitas, kelayakan };
  const valid = Object.values(dims).filter((d) => d.score >= 0);
  const avg = valid.length ? valid.reduce((s, d) => s + d.score, 0) / valid.length : -1;
  const verdict = avg >= 8 ? "LAYAK" : avg >= 6 ? "CUKUP" : avg >= 0 ? "KURANG" : "ERROR";

  // simpan run utk tren (best-effort)
  prisma.aiEvalRun
    .create({ data: { question: question.slice(0, 500), route, ticker: ticker ?? null, answer: answer.slice(0, 4000), routingScore: routing.score, qualityScore: kualitas.score, fitScore: kelayakan.score, notes: JSON.stringify({ saran: [routing.saran, kualitas.saran, kelayakan.saran], ms }) } })
    .catch(() => {});

  return NextResponse.json({ ok: true, question, route, ticker, ms, dims, avg: Number(avg.toFixed(2)), verdict });
}
