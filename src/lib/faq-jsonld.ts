import { stripJk } from "@/lib/utils";

export interface FaqQuestionItem {
  "@type": "Question";
  name: string;
  acceptedAnswer: {
    "@type": "Answer";
    text: string;
  };
}

export interface FaqPageJsonLd {
  "@context": "https://schema.org";
  "@type": "FAQPage";
  mainEntity: FaqQuestionItem[];
}

export interface BuildFaqJsonLdParams {
  ticker: string;
  verdictLine: string | null | undefined;
  facts?:
    | string[]
    | {
        scoreFormatted?: string | null;
        labelText?: string | null;
        crossFact?: string | null;
        volumeFact?: string | null;
        [key: string]: unknown;
      }
    | null;
  asOf?: string | null;
}

/**
 * Pure function to build JSON-LD FAQPage for stock pages.
 * Data MUST be 100% consistent with rendered DailyAnalysisBlock (no cloaking).
 * Tone "kamu", NO rekomendasi beli/jual/cut loss.
 * Returns null if ticker or verdictLine is empty/stale/null.
 */
export function buildFaqJsonLd(
  params: BuildFaqJsonLdParams | null | undefined,
): FaqPageJsonLd | null {
  if (!params || !params.ticker || !params.verdictLine) {
    return null;
  }

  const rawVerdict = typeof params.verdictLine === "string" ? params.verdictLine.trim() : "";
  if (!rawVerdict) {
    return null;
  }

  const clean = stripJk(params.ticker).trim().toUpperCase();
  if (!clean) {
    return null;
  }

  let scoreFormatted: string | null = null;
  let labelText: string | null = null;
  let crossFact: string | null = null;
  let volumeFact: string | null = null;
  let firstFactText: string | null = null;
  const rawFacts: string[] = [];

  if (Array.isArray(params.facts)) {
    for (const f of params.facts) {
      if (typeof f === "string" && f.trim().length > 0) {
        rawFacts.push(f.trim());
      }
    }
    if (rawFacts.length > 0) {
      firstFactText = rawFacts[0];

      // Parse scoreFormatted and labelText from first fact if present
      const scoreMatch = firstFactText.match(/([+-]?\d+[,.]\d+)/);
      if (scoreMatch) {
        scoreFormatted = scoreMatch[1];
      }
      const labelMatch = firstFactText.match(/\(([^)]+)\)/);
      if (labelMatch) {
        labelText = labelMatch[1].trim();
      }
    }
    if (rawFacts.length > 1) {
      crossFact = rawFacts[1];
    }
    if (rawFacts.length > 2) {
      volumeFact = rawFacts[2];
    }
  } else if (params.facts && typeof params.facts === "object") {
    scoreFormatted =
      typeof params.facts.scoreFormatted === "string"
        ? params.facts.scoreFormatted.trim()
        : null;
    labelText =
      typeof params.facts.labelText === "string"
        ? params.facts.labelText.trim()
        : null;
    crossFact =
      typeof params.facts.crossFact === "string"
        ? params.facts.crossFact.trim()
        : null;
    volumeFact =
      typeof params.facts.volumeFact === "string"
        ? params.facts.volumeFact.trim()
        : null;

    if (scoreFormatted || labelText) {
      firstFactText = `Skor sinyal: ${scoreFormatted ?? "—"}${labelText ? ` (${labelText})` : ""} pada skala −1 s.d. +1`;
    }
  }

  const questions: FaqQuestionItem[] = [];

  // Q1: Kondisi teknikal ticker hari ini (verdict line + 1 fakta)
  let a1 = rawVerdict;
  if (firstFactText) {
    if (!/[.!?]$/.test(a1)) a1 += ".";
    a1 += ` ${firstFactText}`;
  }
  if (!/[.!?]$/.test(a1)) a1 += ".";

  questions.push({
    "@type": "Question",
    name: `Bagaimana kondisi teknikal ${clean} hari ini?`,
    acceptedAnswer: {
      "@type": "Answer",
      text: a1,
    },
  });

  // Q2: Arti skor sinyal X utk ticker (1-2 kalimat)
  const signalDescriptor =
    scoreFormatted && labelText
      ? `${scoreFormatted} (${labelText})`
      : scoreFormatted || labelText || "teknikal";

  let scoreVal: number | null = null;
  if (scoreFormatted) {
    const parsed = parseFloat(scoreFormatted.replace(",", "."));
    if (!isNaN(parsed)) scoreVal = parsed;
  }

  const isBullish =
    (scoreVal !== null && scoreVal > 0.15) ||
    (labelText !== null && /bullish|beli|accumulate|menguat/i.test(labelText));

  const isBearish =
    (scoreVal !== null && scoreVal < -0.15) ||
    (labelText !== null && /bearish|jual|sell|melemah/i.test(labelText));

  let a2: string;
  if (isBullish) {
    a2 = `Skor sinyal ${signalDescriptor} menunjukkan pergerakan teknikal ${clean} berada di zona bullish berdasarkan komposit indikator tren, momentum, dan volume. Hal ini mengindikasikan dominasi minat beli yang dapat kamu pantau di watchlist dengan tetap menerapkan manajemen risiko disiplin.`;
  } else if (isBearish) {
    a2 = `Skor sinyal ${signalDescriptor} menandakan pergerakan teknikal ${clean} berada di zona bearish dengan tekanan jual yang masih dominan. Sebaiknya kamu waspada terhadap potensi koreksi lanjutan dan tunggu konfirmasi pembalikan arah sebelum mengambil keputusan.`;
  } else {
    a2 = `Skor sinyal ${signalDescriptor} menunjukkan kondisi teknikal ${clean} relatif berimbang atau berkonsolidasi di area netral. Arah tren baru belum dominan, sehingga kamu bisa memantau pergerakan harga di sekitar level support dan resistance terdekat.`;
  }

  questions.push({
    "@type": "Question",
    name: `Apa arti skor sinyal ${signalDescriptor} untuk ${clean}?`,
    acceptedAnswer: {
      "@type": "Answer",
      text: a2,
    },
  });

  // Q3 (opsional 3rd Q&A jika data moving average / volume tersedia)
  const extraParts: string[] = [];
  if (crossFact) {
    extraParts.push(crossFact.trim());
  }
  if (volumeFact) {
    extraParts.push(volumeFact.trim());
  }

  if (extraParts.length > 0) {
    const a3 = extraParts
      .map((p) => (/[.!?]$/.test(p) ? p : `${p}.`))
      .join(" ");
    questions.push({
      "@type": "Question",
      name: `Bagaimana indikasi moving average dan volume saham ${clean}?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: a3,
      },
    });
  }

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions,
  };
}
