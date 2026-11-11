import { readFile, readdir } from "fs/promises";
import path from "path";
import os from "os";
import { IDX_STOCKS } from "@/lib/constants";

export interface RadarItem {
  ticker: string; // stripped, no .JK
  name?: string;
  cat: "value" | "cross" | "foreign";
  signalLabel?: string | null;
  signalScore?: number | null;
  pe?: string | null;
  note?: string;
}

export interface RadarScanResult {
  radar: RadarItem[];
  generatedWib: string | null;
  session: string | null;
}

const STOCK_NAME_MAP = new Map<string, string>(
  IDX_STOCKS.map((s) => [s.ticker.replace(/\.JK$/, ""), s.name]),
);

/**
 * Radar Scanner Service — single source of truth for analyst scan JSON.
 * Physical location: /var/lib/teknikal-analyst (docker/prod) or ~/.hermes/data/teknikalid-growth/analyst (local dev).
 */
export async function getRadarScanData(): Promise<RadarScanResult> {
  try {
    const candidates = [
      "/var/lib/teknikal-analyst",
      path.join(os.homedir(), ".hermes", "data", "teknikalid-growth", "analyst"),
    ];
    let dir: string | null = null;
    for (const c of candidates) {
      try {
        await readdir(c);
        dir = c;
        break;
      } catch {}
    }
    if (!dir) return { radar: [], generatedWib: null, session: null };

    const files = (await readdir(dir))
      .filter((f) => /^\d{4}-\d{2}-\d{2}-(pagi|sore)-scan\.json$/.test(f))
      .sort();
    if (!files.length) return { radar: [], generatedWib: null, session: null };

    const raw = JSON.parse(await readFile(path.join(dir, files[files.length - 1]), "utf-8"));
    const radar: RadarItem[] = [];

    for (const x of raw.candidates_value ?? []) {
      const ticker = String(x.ticker).replace(/\.JK$/, "");
      radar.push({
        ticker,
        name: x.name ?? STOCK_NAME_MAP.get(ticker),
        cat: "value",
        signalLabel: x.signalLabel ?? "Value Saham",
        signalScore: Number(x.signalScore) || null,
        pe: x.pe ?? null,
      });
    }

    for (const x of raw.ema_cross_baru ?? []) {
      const ticker = String(x.ticker).replace(/\.JK$/, "");
      radar.push({
        ticker,
        name: x.name ?? STOCK_NAME_MAP.get(ticker),
        cat: "cross",
        signalLabel: x.emaCrossSignal === "bullish" ? "EMA Bullish Cross" : x.emaCrossSignal === "bearish" ? "EMA Bearish Cross" : "EMA Cross",
        signalScore: Number(x.signalScore) || null,
        pe: x.pe ?? null,
        note: x.emaCrossDate ? `Cross ${String(x.emaCrossDate).slice(5)}` : undefined,
      });
    }

    for (const x of raw.foreign_accumulation ?? []) {
      const ticker = String(x.ticker).replace(/\.JK$/, "");
      radar.push({
        ticker,
        name: x.name ?? STOCK_NAME_MAP.get(ticker),
        cat: "foreign",
        signalLabel: "Akumulasi Asing",
        signalScore: Number(x.signalScore) || null,
        pe: x.pe ?? null,
        note: x.net_b ? `Net Buy ${x.net_b}T` : undefined,
      });
    }

    return {
      radar,
      generatedWib: raw.generatedWib ?? null,
      session: raw.session ?? null,
    };
  } catch {
    return { radar: [], generatedWib: null, session: null };
  }
}
