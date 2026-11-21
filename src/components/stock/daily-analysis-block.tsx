import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { stripJk, formatVolume } from "@/lib/utils";
import { signalLabelId } from "@/lib/signal-label-id";
import { UhuStockTrigger } from "@/components/uhu/uhu-provider";
import { detectAnomalies } from "./daily-anomaly";
import { safeJsonLd } from "@/lib/safe-json-ld";
import {
  buildFaqJsonLd,
  type BuildFaqJsonLdParams,
  type FaqPageJsonLd,
  type FaqQuestionItem,
} from "@/lib/faq-jsonld";

export { buildFaqJsonLd, type BuildFaqJsonLdParams, type FaqPageJsonLd, type FaqQuestionItem };

export interface VerdictIndicatorInput {
  signalScore?: number | null;
  signalLabel?: string | null;
  rsi14?: number | null;
  smaCrossSignal?: string | null;
  emaCrossSignal?: string | null;
  isGorengan?: boolean | null;
  date?: Date | string | null;
  [key: string]: unknown;
}

/**
 * Pure function server-side deterministic verdict logic.
 * Tone "kamu", TANPA rekomendasi beli/jual ("untuk diwatch" / "kamu pantau" diizinkan).
 * Return null jika data kosong atau stale > 5 hari.
 */
export function buildVerdictLine(
  indicator: VerdictIndicatorInput | null | undefined,
): string | null {
  if (!indicator) return null;

  const hasData =
    indicator.signalScore != null ||
    indicator.signalLabel != null ||
    indicator.rsi14 != null ||
    indicator.smaCrossSignal != null ||
    indicator.emaCrossSignal != null;
  if (!hasData) return null;

  // Stale check: > 5 hari dari hari ini -> null
  if (indicator.date) {
    const d =
      typeof indicator.date === "string"
        ? new Date(indicator.date)
        : indicator.date;
    if (!isNaN(d.getTime())) {
      const diffMs = Date.now() - d.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays > 5) return null;
    }
  }

  const score =
    indicator.signalScore != null ? Number(indicator.signalScore) : null;
  const rsi = indicator.rsi14 != null ? Number(indicator.rsi14) : null;
  const ema = indicator.emaCrossSignal;
  const sma = indicator.smaCrossSignal;
  const label = (indicator.signalLabel || "").toLowerCase();

  const isBull =
    ema === "bullish" ||
    sma === "golden_cross" ||
    (score != null && score > 0.15) ||
    /bullish|beli|accumulate|menguat/.test(label);

  const isBear =
    ema === "bearish" ||
    sma === "death_cross" ||
    (score != null && score < -0.15) ||
    /bearish|jual|sell|melemah/.test(label);

  if (isBull) {
    if (ema === "bullish" && rsi != null && rsi >= 50 && rsi < 70) {
      return `EMA bullish dan RSI ${Math.round(rsi)} menunjukkan momentum menguat dan belum overbought, menarik untuk kamu watch.`;
    }
    if (rsi != null && rsi >= 70) {
      return `Momentum tren sangat kuat namun RSI ${Math.round(rsi)} sudah di area overbought, kamu perlu disiplin batasi risiko jika ingin watch.`;
    }
    if (sma === "golden_cross") {
      return `Terbentuk Golden Cross mengindikasikan tren kenaikan solid, sinyal positif untuk kamu cermati di watchlist.`;
    }
    if (score != null && score >= 0.5) {
      return `Sinyal teknikal kuat di zona bullish dengan akumulasi terjaga, layak kamu masukkan ke radar pantauan.`;
    }
    return `Momentum teknikal menguat dan pergerakan harga terjaga positif, menarik untuk kamu watch perkembangannya.`;
  }

  if (isBear) {
    if (rsi != null && rsi <= 30) {
      return `Tekanan penurunan intens hingga menyentuh area oversold (RSI ${Math.round(rsi)}), kamu bisa cermati potensi technical rebound namun tetap waspada.`;
    }
    if (sma === "death_cross") {
      return `Terbentuk Death Cross menandakan tren jangka menengah melemah, sebaiknya kamu berhati-hati dan tunggu harga stabil.`;
    }
    if (ema === "bearish") {
      return `EMA bergerak bearish menunjukkan tekanan penurunan masih dominan, waspadai koreksi lanjutan sebelum kamu mengambil keputusan.`;
    }
    if (score != null && score <= -0.5) {
      return `Sinyal teknikal berada di zona bearish dengan risiko koreksi terbuka, prioritaskan proteksi modal kamu.`;
    }
    return `Tekanan penurunan masih dominan dan indikator cenderung melemah, sebaiknya kamu tunggu sinyal konfirmasi pembalikan arah.`;
  }

  // Netral
  if (rsi != null && rsi >= 45 && rsi <= 55) {
    return `Pergerakan harga dan indikator masih berkonsolidasi di area netral, kamu bisa tunggu konfirmasi breakout arah pergerakan.`;
  }
  return `Kondisi teknikal relatif berimbang tanpa arah tren yang dominan, kamu bisa pantau level support dan resistance terdekat.`;
}

function formatAsOfDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const dateObj = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateObj);
}

export interface DailyAnalysisBlockProps {
  ticker: string;
  className?: string;
}

export async function DailyAnalysisBlock({
  ticker,
  className,
}: DailyAnalysisBlockProps) {
  const clean = stripJk(ticker).toUpperCase();
  const canonicalTicker = `${clean}.JK`;
  const rawTicker = ticker.toUpperCase();

  // 1. StockIndicator terbaru untuk ticker
  const indicators = await prisma.$queryRaw<
    {
      date: Date;
      signalScore: number | null;
      signalLabel: string | null;
      rsi14: number | null;
      smaCrossSignal: string | null;
      emaCrossSignal: string | null;
      isGorengan: boolean | null;
    }[]
  >(Prisma.sql`
    SELECT
      si.date,
      si."signalScore"::float8 AS "signalScore",
      si."signalLabel",
      si.rsi14::float8 AS rsi14,
      si."smaCrossSignal",
      si."emaCrossSignal",
      si."isGorengan"
    FROM "StockIndicator" si
    JOIN "Stock" s ON s.id = si."stockId"
    WHERE (s.ticker = ${canonicalTicker} OR s.ticker = ${rawTicker} OR s.ticker = ${clean})
      AND si.interval = '1d'
    ORDER BY si.date DESC
    LIMIT 2
  `).catch(() => []);

  const indicator = indicators[0] ?? null;
  const prevIndicator = indicators[1] ?? null;
  if (!indicator) return null;

  // Stale check > 5 hari (silent null, bukan skeleton)
  const now = new Date();
  const indDate = new Date(indicator.date);
  if (isNaN(indDate.getTime())) return null;
  const ageDays = (now.getTime() - indDate.getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays > 5) return null;

  // 2. Perubahan harga terakhir (LAG window StockPrice) + volume vs avgVol20
  const priceRows = await prisma.$queryRaw<
    {
      date: Date;
      close: number | null;
      prevClose: number | null;
      volume: number | null;
    }[]
  >(Prisma.sql`
    WITH recent AS (
      SELECT
        p.date,
        p.close::float8 AS close,
        p.volume::float8 AS volume,
        LAG(p.close::float8) OVER (ORDER BY p.date ASC) AS "prevClose"
      FROM (
        SELECT p.date, p.close, p.volume
        FROM "StockPrice" p
        JOIN "Stock" s ON s.id = p."stockId"
        WHERE (s.ticker = ${canonicalTicker} OR s.ticker = ${rawTicker} OR s.ticker = ${clean})
          AND (p.volume > 0 OR s.ticker LIKE '^%')
        ORDER BY p.date DESC
        LIMIT 22
      ) p
    )
    SELECT * FROM recent ORDER BY date DESC
  `).catch(() => []);

  const latestPrice = priceRows[0] ?? null;
  let avgVol20: number | null = null;
  if (priceRows.length > 1) {
    const prevSessions = priceRows.slice(1, 21);
    const sum = prevSessions.reduce((acc, row) => acc + (row.volume ?? 0), 0);
    avgVol20 = sum / prevSessions.length;
  }

  // Hitung volumeRatio & priceChangePct untuk deteksi anomali
  let priceChangePct: number | null = null;
  if (
    latestPrice?.close != null &&
    latestPrice?.prevClose != null &&
    latestPrice.prevClose > 0
  ) {
    priceChangePct =
      ((latestPrice.close - latestPrice.prevClose) / latestPrice.prevClose) * 100;
  }

  let volumeRatio: number | null = null;
  if (latestPrice?.volume != null && avgVol20 != null && avgVol20 > 0) {
    volumeRatio = latestPrice.volume / avgVol20;
  }

  const anomalies = detectAnomalies({
    ticker: clean,
    indicator,
    priceChangePct,
    volumeRatio,
    prevIndicator,
  });
  const topAnomalies = anomalies.slice(0, 2);

  const verdictLine = buildVerdictLine(indicator);
  if (!verdictLine) return null;

  // Fakta 1: Skor sinyal
  const scoreNum =
    indicator.signalScore != null ? Number(indicator.signalScore) : null;
  const scoreFormatted =
    scoreNum != null
      ? `${scoreNum >= 0 ? "+" : ""}${scoreNum.toFixed(2).replace(".", ",")}`
      : "—";
  const labelText = signalLabelId(indicator.signalLabel);
  const scoreColor =
    scoreNum != null
      ? scoreNum > 0.15
        ? "text-bullish font-semibold"
        : scoreNum < -0.15
          ? "text-bearish font-semibold"
          : "text-text-secondary font-semibold"
      : "text-text-secondary font-semibold";

  // Fakta 2: Cross terbaru
  let crossFact = "Posisi moving average netral tanpa sinyal cross baru";
  if (indicator.smaCrossSignal === "golden_cross") {
    crossFact = "Terbentuk Golden Cross (SMA 50 memotong ke atas SMA 200) — indikasi tren jangka menengah menguat";
  } else if (indicator.smaCrossSignal === "death_cross") {
    crossFact = "Terbentuk Death Cross (SMA 50 memotong ke bawah SMA 200) — indikasi tren jangka menengah melemah";
  } else if (indicator.emaCrossSignal === "bullish") {
    crossFact = "EMA 12 melintas ke atas EMA 26 — momentum jangka pendek menguat";
  } else if (indicator.emaCrossSignal === "bearish") {
    crossFact = "EMA 12 melintas ke bawah EMA 26 — momentum jangka pendek melemah";
  }

  // Fakta 3: Volume vs rata-rata
  let volumeFact = "Data volume perdagangan belum tersedia";
  if (latestPrice?.volume != null) {
    const volStr = formatVolume(latestPrice.volume);
    if (avgVol20 != null && avgVol20 > 0) {
      const ratio = latestPrice.volume / avgVol20;
      const ratioStr = ratio.toFixed(1).replace(".", ",");
      if (ratio >= 1.2) {
        volumeFact = `${volStr} (${ratioStr}x di atas rata-rata 20 sesi — minat transaksi tinggi)`;
      } else if (ratio <= 0.8) {
        volumeFact = `${volStr} (${ratioStr}x di bawah rata-rata 20 sesi — perdagangan relatif sepi)`;
      } else {
        volumeFact = `${volStr} (${ratioStr}x rata-rata 20 sesi — volume normal)`;
      }
    } else {
      volumeFact = `${volStr} lembar`;
    }
  }

  const asOf = formatAsOfDate(indicator.date);

  const faqJsonLd = buildFaqJsonLd({
    ticker: clean,
    verdictLine,
    facts: [
      `Skor sinyal: ${scoreFormatted} (${labelText}) pada skala −1 s.d. +1`,
      `Moving Average: ${crossFact}`,
      `Volume: ${volumeFact}`,
    ],
    asOf,
  });

  return (
    <section
      id="analis-hari-ini"
      className={className ?? "mt-3 pt-3 border-t border-border/60 space-y-2.5"}
      aria-label={`Analis hari ini ${clean}`}
    >
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }}
        />
      )}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-serif text-sm font-semibold text-text-primary">
          Analis Hari Ini · {clean}
        </h3>
        {asOf && (
          <span className="text-[11px] font-medium text-text-tertiary">
            Data per {asOf}
          </span>
        )}
      </div>

      {/* (a) Verdict 1 baris */}
      <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
        <strong className="font-semibold text-text-primary">Verdict:</strong>{" "}
        {verdictLine}
      </p>

      {/* Top-2 anomali hari ini (bullet badge, tidak render jika kosong) */}
      {topAnomalies.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5" aria-label="Anomali teknikal hari ini">
          {topAnomalies.map((anomali, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/5 px-2.5 py-0.5 text-xs text-text-secondary"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" aria-hidden="true" />
              <strong className="font-semibold text-text-primary">{anomali.label}:</strong>
              <span>{anomali.detail}</span>
            </div>
          ))}
        </div>
      )}

      {/* (b) 3 bullet fakta angka */}
      <ul className="space-y-1 text-xs text-text-secondary">
        <li className="flex items-start gap-1.5">
          <span className="text-accent shrink-0 font-bold">•</span>
          <span>
            <strong className="font-semibold text-text-primary">Skor sinyal:</strong>{" "}
            <span className={scoreColor}>
              {scoreFormatted} ({labelText})
            </span>
            <span className="text-text-tertiary"> pada skala −1 s.d. +1</span>
          </span>
        </li>
        <li className="flex items-start gap-1.5">
          <span className="text-accent shrink-0 font-bold">•</span>
          <span>
            <strong className="font-semibold text-text-primary">Moving Average:</strong>{" "}
            {crossFact}
          </span>
        </li>
        <li className="flex items-start gap-1.5">
          <span className="text-accent shrink-0 font-bold">•</span>
          <span>
            <strong className="font-semibold text-text-primary">Volume:</strong>{" "}
            {volumeFact}
          </span>
        </li>
      </ul>

      {/* (c) Link Tanya AI */}
      <div className="pt-0.5">
        <UhuStockTrigger
          ticker={ticker}
          data-engagement="analis_hari_ini_tanya_ai"
          className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-accent/40 bg-accent/5 px-2.5 py-1 text-xs font-semibold text-accent hover:bg-accent/15 hover:border-accent transition-colors"
        >
          <span>🤖 Tanya AI soal {clean} →</span>
        </UhuStockTrigger>
      </div>
    </section>
  );
}
export default DailyAnalysisBlock;
