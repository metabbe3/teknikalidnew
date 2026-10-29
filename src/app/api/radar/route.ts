import { NextResponse } from "next/server";
import { readFile, readdir } from "fs/promises";
import path from "path";
import os from "os";

export const dynamic = "force-dynamic";

interface RadarItem {
  ticker: string; // stripped, no .JK
  name?: string;
  cat: "value" | "cross" | "foreign";
  signalLabel?: string | null;
  signalScore?: number | null;
  pe?: string | null;
  note?: string;
}

/** Radar Sinyal — kandidat scanner analyst (data fisik ~/.hermes/data/teknikalid-growth/analyst/).
 *  Read-only, single source = scan JSON (SATU PINTU: tidak menghitung ulang). */
export async function GET() {
  try {
    // container: volume ro dari host; dev lokal: path host langsung
    const candidates = ["/var/lib/teknikal-analyst", path.join(os.homedir(), ".hermes", "data", "teknikalid-growth", "analyst")];
    let dir: string | null = null;
    for (const c of candidates) { try { await readdir(c); dir = c; break; } catch {} }
    if (!dir) return NextResponse.json({ radar: [], generatedWib: null, session: null });
    const files = (await readdir(dir)).filter(f => /^\d{4}-\d{2}-\d{2}-(pagi|sore)-scan\.json$/.test(f)).sort();
    if (!files.length) return NextResponse.json({ radar: [], generatedWib: null, session: null });
    const raw = JSON.parse(await readFile(path.join(dir, files[files.length - 1]), "utf-8"));
    const radar: RadarItem[] = [];
    for (const x of raw.candidates_value ?? [])
      radar.push({ ticker: String(x.ticker).replace(".JK", ""), name: x.name, cat: "value", signalLabel: x.signalLabel, signalScore: Number(x.signalScore) || null, pe: x.pe ?? null });
    for (const x of raw.ema_cross_baru ?? [])
      radar.push({ ticker: String(x.ticker).replace(".JK", ""), cat: "cross", signalLabel: "EMA cross", signalScore: Number(x.signalScore) || null, pe: x.pe ?? null, note: x.emaCrossDate ? `cross ${String(x.emaCrossDate).slice(5)}` : undefined });
    for (const x of raw.foreign_accumulation ?? [])
      radar.push({ ticker: String(x.ticker).replace(".JK", ""), cat: "foreign", signalLabel: "Akumulasi asing", signalScore: Number(x.signalScore) || null });
    return NextResponse.json({ radar, generatedWib: raw.generatedWib ?? null, session: raw.session ?? null });
  } catch {
    return NextResponse.json({ radar: [], generatedWib: null, session: null });
  }
}
