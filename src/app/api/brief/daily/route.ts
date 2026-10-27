import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

/**
 * GET /api/brief/daily — brief pasar harian + Q&A chips (owner 27 Okt).
 * Sumber file: ~/.hermes/data/teknikalid-growth/daily-brief/<date>.json
 * (di-generate daily_brief_gen.py dari /api/market — SATU PINTU, angka bukan LLM).
 * Fallback diam: tanggal kemarin (pasar belum buka) → 204.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const base = process.env.BRIEF_DIR || "/var/lib/teknikal-brief";
    const today = new Date();
    const wib = new Date(today.getTime() + 7 * 3600 * 1000); // WIB
    const stamp = wib.toISOString().slice(0, 10);
    for (const d of [stamp, new Date(wib.getTime() - 86400_000).toISOString().slice(0, 10)]) {
      try {
        const raw = await readFile(path.join(base, `${d}.json`), "utf8");
        return NextResponse.json(JSON.parse(raw));
      } catch {
        /* coba tanggal kemarin */
      }
    }
    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
