/**
 * Gate replay angka artikel "kenapa-naik/turun-hari-ini" (ops-2026-11-05-01 A).
 * Pure module 0-LLM 0-DB: ekstrak klaim angka format id-ID dari konten artikel,
 * cocokkan dengan ground truth MovementMoverRow (sumber: stock.repository).
 * Angka fiktif / tanggal sesi hilang → fail → artikel diblok generator.
 * Wiring generator menyusul (part B); file ini belum dipakai runtime.
 */
import type { MovementMoverRow } from "@/domains/stock/stock.repository";

// ── Ground truth ──

export interface GroundTruthNumbers {
  prices: number[];
  percents: number[];
  volumesScaled: number[];
  ratios: number[];
  marketCapsScaled: number[];
}

/** Kumpulkan semua angka ground truth yang boleh muncul di prosa artikel. */
export function buildGroundTruthNumbers(mover: MovementMoverRow): GroundTruthNumbers {
  const prices = [
    mover.close,
    mover.prevClose,
    mover.high,
    mover.low,
    mover.open,
    mover.sma20,
    mover.sma50,
    mover.sma200,
    mover.supertrend,
    mover.bbUpper,
    mover.bbLower,
    mover.week52High,
    mover.week52Low,
    mover.eps,
  ].filter((n): n is number => n !== null);

  // Ambang RSI overbought/oversold (70/30) & ADX tren (25) dipakai prompt
  // generator, jadi selalu diizinkan sebagai persen sahih.
  const percents = [
    ...[mover.changePercent, mover.rsi14, mover.dividendYield].filter(
      (n): n is number => n !== null
    ),
    70,
    30,
    25,
  ];

  const volumesScaled =
    mover.volume !== null
      ? [mover.volume, mover.volume / 1e9, mover.volume / 1e6, mover.volume / 1e3]
      : [];

  const ratios =
    mover.volume !== null && mover.avgVolume5d !== null && mover.avgVolume5d > 0
      ? [mover.volume / mover.avgVolume5d]
      : [];

  const marketCapsScaled =
    mover.marketCap !== null
      ? [mover.marketCap, mover.marketCap / 1e12, mover.marketCap / 1e9]
      : [];

  return { prices, percents, volumesScaled, ratios, marketCapsScaled };
}

// ── Parser angka id-ID ──

/**
 * Parser tunggal angka format Indonesia: "9.800"=9800 (titik ribuan),
 * "3,16"=3.16 (koma desimal), "720"=720. Token tak dikenal → null.
 */
function parseIdNumber(token: string): number | null {
  const t = token.replace(/[.,]+$/, "");
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) return Number(t.replace(/\./g, "").replace(",", "."));
  if (/^\d+,\d+$/.test(t)) return Number(t.replace(",", "."));
  if (/^\d+$/.test(t)) return Number(t);
  return null;
}

// ── Replay ──

export interface MovementReplayFailure {
  claim: string;
  kind: string;
  detail: string;
}

export interface MovementReplayResult {
  passed: boolean;
  checked: number;
  failures: MovementReplayFailure[];
}

// Satu regex global — urutan alternatif = prioritas klaim
// (market cap → harga → volume → rasio → persen). matchAll tidak overlap
// (lastIndex maju) = konsumsi token: satu span tak bisa jadi 2 klaim.
// ops-2026-11-05-01 dry-run MKNT: tanda minus ikut ditangkap (bbLower "Rp -9").
// (?![\w-]) menolak nominal kasar "Rp 1.800-an"/"Rp 3.660." (suffix -an/.) —
// bukan klaim harga presisi (dry-run RATU: "area Rp 1.800-an" false-fail).
// ES2017 (tsconfig target): named groups tak didukung → grup bernomor + map nama.
const CLAIM_RE =
  /Rp\s*(-?[\d.,]+?)(?![\w-])(?:\s*(triliun|miliar)\b)?|([\d.,]+)\s*(miliar|juta|ribu)\s+saham|([\d.,]+)\s+saham\b|([\d.,]+)\s*[x×]\s*rata-rata|([+-]?[\d.,]+)\s*(?:%|persen)/gi;
const CLAIM_GROUP_NAMES = ["rp", "capUnit", "vol", "volUnit", "volPlain", "ratio", "pct"];

/**
 * Ekstrak semua angka sahih dari TEKS DATA yang diberikan ke prompt
 * (market context: IHSG, top gainers/losers) — angka ini boleh dikutip
 * artikel karena berasal dari snapshot SATU PINTU yang sama.
 * Nilai mentah + hasil scaling unit dikembalikan keduanya.
 *
 * Catatan format: context memakai desimal TITIK ("+3.38%", "Rp 3.660"),
 * artikel memakai id-ID koma — parser utama id-ID menolak "3.38", jadi
 * di sini ada fallback float dot-desimal (khusus teks SUMBER, bukan artikel;
 * "3.660" tetap ter-parse sebagai 3660 karena pola ribuan dicek lebih dulu).
 */
function parseSourceNumber(token: string): number | null {
  const n = parseIdNumber(token);
  if (n !== null) return n;
  if (/^\d+\.\d+$/.test(token)) return Number(token);
  return null;
}

export function extractAllowedNumbers(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(CLAIM_RE)) {
    const g: Record<string, string | undefined> = {};
    CLAIM_GROUP_NAMES.forEach((name, idx) => {
      if (m[idx + 1] !== undefined) g[name] = m[idx + 1];
    });
    if (g.rp !== undefined) {
      const sign = g.rp.startsWith("-") ? -1 : 1;
      const num = parseSourceNumber(g.rp.replace(/^-/, ""));
      if (num === null) continue;
      out.push(sign * num);
      if (g.capUnit !== undefined) out.push(sign * num * (g.capUnit.toLowerCase() === "triliun" ? 1e12 : 1e9));
    } else if (g.vol !== undefined && g.volUnit !== undefined) {
      const num = parseSourceNumber(g.vol);
      if (num === null) continue;
      const unit = g.volUnit.toLowerCase();
      out.push(num, num * (unit === "miliar" ? 1e9 : unit === "ribu" ? 1e3 : 1e6));
    } else if (g.volPlain !== undefined) {
      const num = parseSourceNumber(g.volPlain);
      if (num !== null) out.push(num);
    } else if (g.ratio !== undefined) {
      const num = parseSourceNumber(g.ratio);
      if (num !== null) out.push(num);
    } else if (g.pct !== undefined) {
      const sign = g.pct.startsWith("-") ? -1 : 1;
      const num = parseSourceNumber(g.pct.replace(/^[+-]/, ""));
      if (num !== null) out.push(sign * num, num);
    }
  }
  return out;
}

function relOk(claimed: number, truths: number[], tol: number): boolean {
  return truths.some((t) => Math.abs(claimed - t) <= tol * Math.abs(t));
}

function absOk(claimed: number, truths: number[], tol: number): boolean {
  return truths.some((t) => Math.abs(claimed - t) <= tol);
}

/** Replay semua klaim angka di konten artikel vs ground truth mover. */
export function replayMovementNumbers(
  content: string,
  mover: MovementMoverRow,
  opts: { asOfLong: string; asOfShort: string; allowedNumbers?: number[] },
): MovementReplayResult {
  const gt = buildGroundTruthNumbers(mover);
  const allowed = opts.allowedNumbers ?? [];
  // Harga: toleransi abs 0,5 — price() di prompt membulatkan ke rupiah utuh
  // (dry-run 6 Nov: sma20 8,37 ditulis AI "Rp 8" sesuai data yang diberikan;
  // pembulatan sendiri tak boleh jadi false-fail). Klaim fiktif jauh (>0,5).
  const priceOk = (num: number) =>
    allowed.some((t) => Math.abs(num - t) <= 0.005 * Math.abs(t)) ||
    gt.prices.some((t) => Math.abs(num - t) <= 0.005 * Math.abs(t) || Math.abs(num - t) <= 0.5);
  const pctOk = (num: number) => allowed.some((t) => Math.abs(num - t) <= 0.06) || absOk(num, gt.percents, 0.06);
  const volOk = (num: number) => allowed.some((t) => Math.abs(num - t) <= 0.02 * Math.abs(t)) || relOk(num, gt.volumesScaled, 0.02);
  const capOk = (num: number) => allowed.some((t) => Math.abs(num - t) <= 0.02 * Math.abs(t)) || relOk(num, gt.marketCapsScaled, 0.02);
  const ratioOk = (num: number) => allowed.some((t) => Math.abs(num - t) <= 0.011) || absOk(num, gt.ratios, 0.011);
  const failures: MovementReplayFailure[] = [];
  let checked = 0;

  for (const m of content.matchAll(CLAIM_RE)) {
    const g: Record<string, string | undefined> = {};
    CLAIM_GROUP_NAMES.forEach((name, idx) => {
      if (m[idx + 1] !== undefined) g[name] = m[idx + 1];
    });
    const text = m[0];

    if (g.rp !== undefined) {
      const sign = g.rp.startsWith("-") ? -1 : 1;
      const num = parseIdNumber(g.rp.replace(/^-/, ""));
      if (num === null) continue;
      checked++;
      const claimed = sign * num;
      if (g.capUnit !== undefined) {
        const capClaimed = claimed * (g.capUnit.toLowerCase() === "triliun" ? 1e12 : 1e9);
        if (!capOk(capClaimed)) {
          failures.push({
            claim: text,
            kind: "market_cap",
            detail: `${capClaimed} di luar market cap ground truth (toleransi rel 2%)`,
          });
        }
      } else if (!priceOk(claimed)) {
        failures.push({
          claim: text,
          kind: "price",
          detail: `${claimed} di luar harga ground truth (toleransi rel 0,5% atau abs 0,01)`,
        });
      }
    } else if (g.vol !== undefined && g.volUnit !== undefined) {
      const num = parseIdNumber(g.vol);
      if (num === null) continue;
      checked++;
      const unit = g.volUnit.toLowerCase();
      const claimed = num * (unit === "miliar" ? 1e9 : unit === "ribu" ? 1e3 : 1e6);
      if (!volOk(claimed)) {
        failures.push({
          claim: text,
          kind: "volume",
          detail: `${claimed} di luar volume ground truth (toleransi rel 2%)`,
        });
      }
    } else if (g.volPlain !== undefined) {
      const num = parseIdNumber(g.volPlain);
      if (num === null) continue;
      // Skip tahun (1900-2100 tanpa pemisah): "sejak awal 2026, saham MKNT…"
      // bukan klaim volume (dry-run 6 Nov: false-fail "2026, saham").
      if (num >= 1900 && num <= 2100 && !/\.\d{3}/.test(g.volPlain)) continue;
      checked++;
      // Ribuan bertitik ("125.000 saham") dikali 1.000; selain itu apa adanya.
      const thousandDot = /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(g.volPlain.replace(/[.,]+$/, ""));
      const claimed = thousandDot ? num * 1000 : num;
      if (!volOk(claimed)) {
        failures.push({
          claim: text,
          kind: "volume",
          detail: `${claimed} di luar volume ground truth (toleransi rel 2%)`,
        });
      }
    } else if (g.ratio !== undefined) {
      const num = parseIdNumber(g.ratio);
      if (num === null) continue;
      checked++;
      if (!ratioOk(num)) {
        failures.push({
          claim: text,
          kind: "ratio",
          detail: `${num} di luar rasio volume/avg ground truth (toleransi abs 0,011)`,
        });
      }
    } else if (g.pct !== undefined) {
      const sign = g.pct.startsWith("-") ? -1 : 1;
      const num = parseIdNumber(g.pct.replace(/^[+-]/, ""));
      if (num === null) continue;
      checked++;
      const claimed = sign * num;
      if (!pctOk(claimed)) {
        failures.push({
          claim: text,
          kind: "percent",
          detail: `${claimed} di luar persen ground truth (toleransi abs 0,06)`,
        });
      }
    }
  }

  // Angka di footer/disclaimer/CTA tetap dicek (tanpa pengecualian);
  // tanggal sesi WAJIB disebut supaya artikel tidak basi diam-diam.
  if (!content.includes(opts.asOfLong) && !content.includes(opts.asOfShort)) {
    failures.push({
      claim: opts.asOfLong,
      kind: "as_of_missing",
      detail: "tanggal sesi data tidak disebut",
    });
  }

  return { passed: failures.length === 0, checked, failures };
}

// ── Pilot ──

/** Kandidat pilot generator: buang gorengan, ambil sebatas kuota tersisa. */
export function selectPilotCandidates(
  movers: MovementMoverRow[],
  opts: { quotaRemaining: number }
): MovementMoverRow[] {
  return movers.filter((m) => m.isGorengan !== true).slice(0, Math.max(0, opts.quotaRemaining));
}
