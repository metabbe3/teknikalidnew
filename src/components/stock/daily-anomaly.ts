/**
 * Pure function anomaly detection for DailyAnalysisBlock.
 * Evaluates whether current market/technical state exhibits noteworthy anomalies.
 * Tone: Indonesian "kamu", TANPA rekomendasi beli/jual.
 * Pure function: No DB / IO operations.
 */

export interface AnomalyIndicatorInput {
  signalScore?: number | null;
  signalLabel?: string | null;
  rsi14?: number | null;
  smaCrossSignal?: string | null;
  emaCrossSignal?: string | null;
  [key: string]: unknown;
}

export interface DetectAnomaliesInput {
  ticker: string;
  indicator: AnomalyIndicatorInput | null | undefined;
  priceChangePct?: number | null;
  volumeRatio?: number | null;
  prevIndicator?: AnomalyIndicatorInput | null;
}

export interface DailyAnomaly {
  label: string;
  detail: string;
  weight: number;
}

/**
 * Detect technical anomalies based on current session data vs previous indicators/averages.
 * Priority weights order the anomalies (higher weight = higher priority).
 */
export function detectAnomalies(input: DetectAnomaliesInput): DailyAnomaly[] {
  if (!input || !input.indicator) {
    return [];
  }

  const { indicator, prevIndicator, priceChangePct, volumeRatio } = input;
  const anomalies: DailyAnomaly[] = [];

  // 1. Cross baru (butuh prevIndicator row sebelum terbaru untuk ticker)
  if (prevIndicator) {
    // SMA Cross
    if (
      indicator.smaCrossSignal &&
      indicator.smaCrossSignal !== prevIndicator.smaCrossSignal
    ) {
      if (indicator.smaCrossSignal === "golden_cross") {
        anomalies.push({
          label: "Golden Cross Baru",
          detail:
            "SMA golden cross baru terbentuk, tren jangka menengah menguat untuk kamu cermati",
          weight: 55,
        });
      } else if (indicator.smaCrossSignal === "death_cross") {
        anomalies.push({
          label: "Death Cross Baru",
          detail:
            "SMA death cross baru terbentuk, tren jangka menengah melemah perlu kamu antisipasi",
          weight: 55,
        });
      }
    }

    // EMA Cross
    if (
      indicator.emaCrossSignal &&
      indicator.emaCrossSignal !== prevIndicator.emaCrossSignal
    ) {
      if (indicator.emaCrossSignal === "bullish") {
        anomalies.push({
          label: "EMA Cross Bullish",
          detail:
            "EMA cross bullish baru terbentuk, momentum jangka pendek positif untuk kamu pantau",
          weight: 50,
        });
      } else if (indicator.emaCrossSignal === "bearish") {
        anomalies.push({
          label: "EMA Cross Bearish",
          detail:
            "EMA cross bearish baru terbentuk, waspadai tekanan jangka pendek pada pantauan kamu",
          weight: 50,
        });
      }
    }
  }

  // 2. Volume spike: volumeRatio (vol/avgVol20) > 1.5 -> "volume X,Xx rata-rata 20 hari"
  if (volumeRatio != null && volumeRatio > 1.5) {
    const ratioStr = volumeRatio.toFixed(1).replace(".", ",");
    anomalies.push({
      label: "Lonjakan Volume",
      detail: `volume ${ratioStr}x rata-rata 20 hari, lonjakan aktivitas transaksi untuk kamu perhatikan`,
      weight: 45,
    });
  }

  // 3. Pergerakan besar: |priceChangePct| > 3% -> "bergerak X,X% sesi terakhir"
  if (priceChangePct != null && Math.abs(priceChangePct) > 3) {
    const sign = priceChangePct > 0 ? "+" : "";
    const pctStr = `${sign}${priceChangePct.toFixed(1).replace(".", ",")}%`;
    anomalies.push({
      label: "Pergerakan Besar",
      detail: `bergerak ${pctStr} sesi terakhir, pergerakan lebar yang layak kamu cermati`,
      weight: 40,
    });
  }

  // 4. RSI ekstrem: <35 oversold / >65 mendekati overbought
  if (indicator.rsi14 != null) {
    const rsi = Number(indicator.rsi14);
    if (!isNaN(rsi)) {
      if (rsi < 35) {
        anomalies.push({
          label: "RSI Oversold",
          detail: `RSI ${Math.round(rsi)} di area oversold, potensi pantulan teknikal menarik untuk kamu cermati`,
          weight: 35,
        });
      } else if (rsi > 65) {
        anomalies.push({
          label: "RSI Mendekati Overbought",
          detail: `RSI ${Math.round(rsi)} mendekati overbought, kamu perlu waspada terhadap potensi konsolidasi`,
          weight: 35,
        });
      }
    }
  }

  // 5. Skor sinyal tinggi: signalScore > 0.6
  if (indicator.signalScore != null) {
    const score = Number(indicator.signalScore);
    if (!isNaN(score) && score > 0.6) {
      const scoreStr = `+${score.toFixed(2).replace(".", ",")}`;
      anomalies.push({
        label: "Skor Sinyal Tinggi",
        detail: `skor sinyal ${scoreStr} berada di zona penguatan tinggi untuk radar pantauan kamu`,
        weight: 30,
      });
    }
  }

  // Urutkan berdasarkan weight prioritas tertinggi
  anomalies.sort((a, b) => b.weight - a.weight);

  return anomalies;
}
