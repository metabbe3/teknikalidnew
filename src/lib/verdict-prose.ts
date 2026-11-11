/**
 * verdict-prose — deterministic Indonesian prose engine for SEO.
 *
 * Turns StockIndicator rows + price delta into unique-per-stock Indonesian
 * prose WITHOUT leaking exact indicator decimals (which are login-gated as
 * freemium). Prose stays qualitative/relative so scrapers harvest nothing
 * they couldn't get from the verdict label, while each ticker/day reads
 * distinct — defeats Google's thin/templated-content filter.
 *
 * Three pure fns:
 *   - summarizeVerdict()  → 1-2 sentence verdict for the stock page (Branch 2)
 *   - rankDrivers()       → ranks the day's signal changes (shared ladder)
 *   - explainMove()       → "kenapa naik/turun hari ini" explainer (Branch 3)
 *
 * No Prisma, no network. Fully unit-testable.
 */

export type Outlook = "Bullish" | "Bearish" | "Neutral";
export type DriverTone = "bullish" | "bearish" | "neutral";
export type DriverKind = "verdict" | "crossover" | "gap" | "rsi-zone";

/** Number-coerced indicator snapshot (caller coerces Decimals via toSnapshot). */
export interface IndicatorSnapshot {
  rsi14: number | null;
  macdHist: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  stochK: number | null;
  adx: number | null;
  obvTrend: string | null;
  signalLabel: string | null;
  smaCrossSignal: string | null;
  emaCrossSignal: string | null;
}

export interface SignalDriver {
  kind: DriverKind;
  tone: DriverTone;
  rank: number;
  label: string;
  detail: string | null;
}

function labelTone(label: string | null | undefined): DriverTone {
  if (!label) return "neutral";
  const l = label.toLowerCase();
  if (l.includes("bullish")) return "bullish";
  if (l.includes("bearish")) return "bearish";
  return "neutral";
}

function rsiZone(r: number): "oversold" | "overbought" | "neutral" {
  if (r <= 30) return "oversold";
  if (r >= 70) return "overbought";
  return "neutral";
}

/**
 * rankDrivers — the shared signal-change ladder.
 * Same ranking order as morning-delta.service.ts buildCandidate
 * (verdict flip > SMA cross > EMA cross > MACD flip > |gap|>=3%), plus an
 * RSI-zone-transition rung for richer explainers. Returns ALL firing drivers
 * sorted desc; callers take top-N.
 */
export function rankDrivers(
  latest: IndicatorSnapshot | null,
  prev: IndicatorSnapshot | null,
  changePercent: number | null,
): SignalDriver[] {
  if (!latest) return [];
  const drivers: SignalDriver[] = [];

  // 1) Verdict flip — highest signal
  if (prev?.signalLabel && latest.signalLabel && latest.signalLabel !== prev.signalLabel) {
    drivers.push({
      kind: "verdict",
      tone: labelTone(latest.signalLabel),
      rank: 30,
      label: `Sinyal ${latest.signalLabel}`,
      detail: `dari ${prev.signalLabel}`,
    });
  }

  // 2) SMA50/200 cross
  if (latest.smaCrossSignal && latest.smaCrossSignal !== prev?.smaCrossSignal) {
    const golden = latest.smaCrossSignal === "golden_cross";
    drivers.push({
      kind: "crossover",
      tone: golden ? "bullish" : "bearish",
      rank: 25,
      label: golden ? "Golden cross" : "Death cross",
      detail: "SMA50 & SMA200",
    });
  }

  // 3) EMA12/26 cross
  if (latest.emaCrossSignal && latest.emaCrossSignal !== prev?.emaCrossSignal) {
    const bull = latest.emaCrossSignal === "bullish";
    drivers.push({
      kind: "crossover",
      tone: bull ? "bullish" : "bearish",
      rank: 22,
      label: bull ? "EMA bullish cross" : "EMA bearish cross",
      detail: "EMA12 & EMA26",
    });
  }

  // 4) MACD histogram sign flip
  const macdNow = latest.macdHist;
  const macdPrev = prev?.macdHist ?? null;
  if (
    macdNow !== null &&
    macdPrev !== null &&
    macdNow !== 0 &&
    Math.sign(macdNow) !== Math.sign(macdPrev)
  ) {
    const bull = macdNow > 0;
    drivers.push({
      kind: "crossover",
      tone: bull ? "bullish" : "bearish",
      rank: 20,
      label: bull ? "MACD bullish cross" : "MACD bearish cross",
      detail: null,
    });
  }

  // 5) RSI zone transition (extra rung — not in morning-delta)
  const rsiNow = latest.rsi14;
  const rsiPrev = prev?.rsi14 ?? null;
  if (rsiNow !== null && rsiPrev !== null) {
    const zNow = rsiZone(rsiNow);
    const zPrev = rsiZone(rsiPrev);
    if (zNow !== zPrev) {
      if (zNow === "overbought") {
        drivers.push({ kind: "rsi-zone", tone: "bearish", rank: 15, label: "RSI masuk zona overbought", detail: null });
      } else if (zNow === "oversold") {
        drivers.push({ kind: "rsi-zone", tone: "bullish", rank: 15, label: "RSI masuk zona oversold", detail: null });
      } else if (zPrev === "overbought") {
        drivers.push({ kind: "rsi-zone", tone: "bearish", rank: 14, label: "RSI turun dari zona overbought", detail: null });
      } else if (zPrev === "oversold") {
        drivers.push({ kind: "rsi-zone", tone: "bullish", rank: 14, label: "RSI bangkit dari zona oversold", detail: null });
      }
    }
  }

  // 6) Price gap
  if (changePercent !== null && Math.abs(changePercent) >= 3) {
    const up = changePercent > 0;
    drivers.push({
      kind: "gap",
      tone: up ? "bullish" : "bearish",
      rank: 10 + Math.min(Math.abs(changePercent), 10),
      label: up ? `Naik ${changePercent.toFixed(1)}%` : `Turun ${Math.abs(changePercent).toFixed(1)}%`,
      detail: null,
    });
  }

  return drivers.sort((a, b) => b.rank - a.rank);
}

export interface MoveExplainer {
  direction: "naik" | "turun" | "datar";
  changePercent: number | null;
  hasSignal: boolean;
  primary: SignalDriver | null;
  drivers: SignalDriver[];
  headline: string;
  bullets: string[];
  prose: string;
}

/**
 * explainMove — deterministic "kenapa naik/turun hari ini" prose from
 * indicator delta. No LLM, no exact decimal leak. Returns null only when
 * there is no latest indicator row at all.
 */
export function explainMove(opts: {
  ticker: string;
  latest: IndicatorSnapshot | null;
  prev: IndicatorSnapshot | null;
  changePercent: number | null;
  volumeMultiple?: number | null;
  close?: number | null;
}): MoveExplainer | null {
  const { latest, prev, changePercent } = opts;
  if (!latest) return null;

  const drivers = rankDrivers(latest, prev, changePercent);
  // ponytail: ±0.5% is noise — sub-half-percent reads "datar" so we never
  // publish a silly "naik 0.1%" headline. Tighten if copy needs finer grain.
  const direction: MoveExplainer["direction"] =
    changePercent === null
      ? "datar"
      : changePercent > 0.5
        ? "naik"
        : changePercent < -0.5
          ? "turun"
          : "datar";

  const sym = opts.ticker.replace(/\.JK$/, "");
  const pct = changePercent !== null ? Math.abs(changePercent).toFixed(1) : null;
  const movePhrase =
    direction === "naik"
      ? `naik ${pct}%`
      : direction === "turun"
        ? `turun ${pct}%`
        : "bergerak relatif datar";

  const primary = drivers[0] ?? null;
  const hasSignal = drivers.length > 0;

  let headline: string;
  const gapOnly =
    primary !== null &&
    primary.kind === "gap" &&
    ((direction === "naik" && primary.label.startsWith("Naik")) ||
      (direction === "turun" && primary.label.startsWith("Turun")));
  if (primary && !gapOnly) {
    const detail = primary.detail ? ` (${primary.detail.toLowerCase()})` : "";
    headline = `${sym} ${movePhrase} hari ini, didorong ${primary.label.toLowerCase()}${detail}.`;
  } else if (primary && gapOnly) {
    // Tautologi guard: satu-satunya driver adalah pergerakan harga itu sendiri → jangan
    // tulis "naik X%, didorong naik X%". Sebut magnet pergerakannya secara jujur.
    const moveWord = direction === "naik" ? "kenaikan" : direction === "turun" ? "penurunan" : "pergerakan";
    headline =
      `${sym} ${movePhrase} hari ini (${Math.abs(changePercent ?? 0).toFixed(1)}%) tanpa perubahan sinyal teknikal mayor — ${moveWord} sebesar ini umumnya dipicu tekanan beli/jual intraday dan volume, bukan pergantian tren.`;
  } else if (direction === "datar") {
    headline = `${sym} bergerak relatif datar hari ini tanpa perubahan sinyal teknikal yang berarti.`;
  } else {
    headline = `${sym} ${movePhrase} hari ini, namun tidak ada perubahan sinyal teknikal mayor (golden/death cross, MACD flip, atau verdict).`;
  }

  const bullets = drivers.slice(0, 3).map((d) => (d.detail ? `${d.label} — ${d.detail}` : d.label));

  // Paragraph 1: Headline, volume spike (if any), and secondary drivers
  const p1Parts: string[] = [headline];
  if (opts.volumeMultiple && opts.volumeMultiple >= 1.5) {
    p1Parts.push(
      `Volume melonjak sekitar ${opts.volumeMultiple.toFixed(1)}× rata-rata 20 hari, menandakan minat pasar yang kuat.`,
    );
  }
  const rest = drivers.slice(1, 3);
  if (rest.length > 0) {
    p1Parts.push(`Indikator pendukung: ${rest.map((d) => d.label.toLowerCase()).join(", ")}.`);
  }
  const p1 = p1Parts.join(" ");

  // Paragraph 2: Konteks Tren (posisi harga vs SMA20/50 secara kualitatif, TANPA angka desimal)
  const p2Parts: string[] = [];
  const close = opts.close ?? null;
  const sma20 = latest.sma20;
  const sma50 = latest.sma50;

  if (close !== null && sma20 !== null && sma50 !== null) {
    if (close > sma20 && close > sma50) {
      p2Parts.push(
        `Dalam konteks tren, harga saat ini bertahan di atas garis rata-rata pergerakan 20 hari (SMA20) maupun 50 hari (SMA50), mengindikasikan struktur pergerakan jangka pendek hingga menengah yang masih terjaga solid.`,
      );
    } else if (close < sma20 && close < sma50) {
      p2Parts.push(
        `Meninjau struktur tren, posisi harga berada di bawah garis SMA20 dan SMA50, mencerminkan tren jangka pendek hingga menengah yang masih berada dalam tekanan jual.`,
      );
    } else if (close > sma20 && close <= sma50) {
      p2Parts.push(
        `Dari kacamata tren, harga berhasil bertahan di atas garis SMA20 kendati masih tertahan di bawah SMA50, menandakan upaya pemulihan jangka pendek yang masih menguji resistensi tren menengahnya.`,
      );
    } else {
      p2Parts.push(
        `Secara struktur tren, harga tertekan di bawah SMA20 namun masih bertengger di atas garis SMA50, mengisyaratkan koreksi wajar di dalam kerangka tren menengah yang belum sepenuhnya patah.`,
      );
    }
  } else if (close !== null && sma50 !== null) {
    if (close > sma50) {
      p2Parts.push(
        `Dari perspektif tren, harga diperdagangkan di atas garis rata-rata 50 hari (SMA50), menjaga bias positif untuk horizon jangka menengah.`,
      );
    } else {
      p2Parts.push(
        `Dari perspektif tren, harga berada di bawah garis penopang 50 hari (SMA50), mengindikasikan dominasi tren penurunan pada horizon jangka menengah.`,
      );
    }
  } else if (sma20 !== null && sma50 !== null) {
    if (sma20 > sma50) {
      p2Parts.push(
        `Ditinjau dari orientasi rata-rata pergerakan, garis SMA20 berada di atas garis SMA50, mencerminkan struktur pergerakan yang secara umum condong konstruktif.`,
      );
    } else if (sma20 < sma50) {
      p2Parts.push(
        `Ditinjau dari orientasi rata-rata pergerakan, posisi garis SMA20 berada di bawah SMA50, mengindikasikan momentum tren yang masih berada dalam fase defensif.`,
      );
    } else {
      p2Parts.push(
        `Ditinjau dari rata-rata pergerakan, garis SMA20 dan SMA50 saling berdekatan, menandakan fase konsolidasi tren yang relatif mendatar.`,
      );
    }
  } else {
    p2Parts.push(
      `Dari struktur pergerakan teknikal, pola harga masih berada dalam tahap pembentukan konsolidasi arah baru.`,
    );
  }

  if (latest.smaCrossSignal === "golden_cross") {
    p2Parts.push(
      `Kondisi ini diperkuat oleh terbentuknya sinyal golden cross pada indikator moving average utama, membuka peluang transisi menuju fase bullish lanjutan.`,
    );
  } else if (latest.smaCrossSignal === "death_cross") {
    p2Parts.push(
      `Di sisi lain, kehadiran sinyal death cross menjadi pengingat kehati-hatian atas risiko pelemahan lanjutan dalam jangka menengah.`,
    );
  } else if (latest.sma200 !== null && sma50 !== null) {
    if (sma50 > latest.sma200) {
      p2Parts.push(
        `Konfigurasi moving average jangka menengah tetap berada di atas acuan jangka panjang (SMA200), mempertahankan stabilitas tren makro.`,
      );
    } else {
      p2Parts.push(
        `Pergerakan harga jangka menengah masih tertahan di bawah acuan jangka panjang (SMA200), sehingga pembalikan arah membutuhkan konfirmasi penguatan yang lebih berkesinambungan.`,
      );
    }
  }
  const p2 = p2Parts.join(" ");

  // Paragraph 3: Apa yang perlu dipantau (RSI ekstrem, MACD histogram, volume confirmation)
  const p3Parts: string[] = [];
  const rsi = latest.rsi14;
  if (rsi !== null) {
    if (rsi >= 70) {
      p3Parts.push(
        `Untuk perdagangan berikutnya, pelaku pasar perlu mewaspadai pembacaan indikator RSI yang sudah memasuki zona jenuh beli (overbought), di mana potensi aksi ambil untung (profit taking) jangka pendek kian terbuka.`,
      );
    } else if (rsi <= 30) {
      p3Parts.push(
        `Untuk perdagangan berikutnya, perhatikan bahwa indikator RSI saat ini berada di area jenuh jual (oversold), membuka peluang terjadinya pantulan teknikal (rebound) jika tekanan jual mulai mereda.`,
      );
    } else if (rsi >= 60 && rsi < 70) {
      p3Parts.push(
        `Untuk sesi berikutnya, perhatikan indikator RSI yang mulai mendekati ambang jenuh beli, menandakan momentum kenaikan yang kuat namun ruang apresiasi jangka pendek mulai menipis.`,
      );
    } else if (rsi <= 40 && rsi > 30) {
      p3Parts.push(
        `Untuk sesi berikutnya, pantau indikator RSI yang kian mendekati ambang jenuh jual, mengindikasikan tekanan pelemahan yang berpotensi memasuki fase jenuh.`,
      );
    } else {
      p3Parts.push(
        `Untuk sesi selanjutnya, indikator RSI masih bergerak di kisaran netral tanpa kejenuhan ekstrem, memberikan ruang fleksibel bagi kelanjutan pergerakan harga.`,
      );
    }
  } else {
    p3Parts.push(
      `Untuk langkah antisipasi berikutnya, pelaku pasar disarankan mencermati dinamika momentum harga dan respon pasar di sekitar level support-resistance kunci.`,
    );
  }

  const macd = latest.macdHist;
  const prevMacd = prev?.macdHist ?? null;
  if (macd !== null) {
    if (macd > 0 && prevMacd !== null && macd > prevMacd) {
      p3Parts.push(
        `Histogram MACD memperlihatkan pelebaran momentum positif, mengonfirmasi dorongan beli yang kian solid.`,
      );
    } else if (macd > 0) {
      p3Parts.push(
        `Histogram MACD bertahan di zona positif, menjaga bias penguatan momentum harga.`,
      );
    } else if (macd < 0 && prevMacd !== null && macd < prevMacd) {
      p3Parts.push(
        `Histogram MACD menunjukkan pelebaran tekanan negatif, menegaskan dominasi momentum jual yang perlu diwaspadai.`,
      );
    } else if (macd < 0) {
      p3Parts.push(
        `Histogram MACD berada di wilayah negatif, mengisyaratkan kehati-hatian terhadap risiko pelemahan lanjutan.`,
      );
    } else {
      p3Parts.push(
        `Histogram MACD berada di dekat garis netral, mencerminkan momentum arah pergerakan yang masih berimbang.`,
      );
    }
  }

  if (opts.volumeMultiple && opts.volumeMultiple >= 1.5) {
    p3Parts.push(
      `Selain itu, perhatikan apakah likuiditas transaksi dapat bertahan di atas rata-rata hariannya untuk memvalidasi kelanjutan arah tren.`,
    );
  } else {
    p3Parts.push(
      `Selain itu, pantau konfirmasi volume transaksi pada sesi berikutnya guna memastikan pergerakan harga didukung partisipasi pasar yang memadai.`,
    );
  }
  const p3 = p3Parts.join(" ");

  const prose = [p1, p2, p3].join("\n\n");

  return {
    direction,
    changePercent,
    hasSignal,
    primary,
    drivers,
    headline,
    bullets,
    prose,
  };
}

/**
 * computeOutlook — the page-level Bullish/Bearish/Neutral gate.
 * Mirrors the outlook IIFE in the stock detail page (RSI not extreme +
 * MACD hist sign + price vs SMA50). Centralized here so the dated archive
 * page stays consistent without re-implementing the ladder.
 */
export function computeOutlook(s: IndicatorSnapshot | null, close: number | null): Outlook {
  if (!s || close === null) return "Neutral";
  const bullish =
    s.rsi14 !== null && s.rsi14 < 70
    && s.macdHist !== null && s.macdHist > 0
    && s.sma50 !== null && close > s.sma50;
  const bearish =
    s.rsi14 !== null && s.rsi14 > 30
    && s.macdHist !== null && s.macdHist < 0
    && s.sma50 !== null && close < s.sma50;
  return bullish ? "Bullish" : bearish ? "Bearish" : "Neutral";
}

/**
 * summarizeVerdict — 1-2 sentence dynamic verdict for the stock page.
 * Replaces the 3 static identical TONE.summary sentences in SignalVerdict.
 * Qualitative only: names which signals agree with the outlook + any caveat.
 */
export function summarizeVerdict(
  snapshot: IndicatorSnapshot | null,
  outlook: Outlook,
  close: number | null = null,
): string {
  if (!snapshot) {
    return outlook === "Bullish"
      ? "Indikator teknikal condong bullish — momentum beli sedang kuat."
      : outlook === "Bearish"
        ? "Indikator menunjukkan tekanan jual dominan."
        : "Sinyal masih netral — belum ada arah yang jelas.";
  }

  const bull: string[] = [];
  const bear: string[] = [];

  if (snapshot.rsi14 !== null) {
    if (snapshot.rsi14 <= 30) bull.push("RSI di zona oversold");
    else if (snapshot.rsi14 >= 70) bear.push("RSI overbought");
    else bull.push("RSI di zona sehat");
  }
  if (snapshot.macdHist !== null) {
    if (snapshot.macdHist > 0) bull.push("MACD positif");
    else if (snapshot.macdHist < 0) bear.push("MACD negatif");
  }
  if (close !== null && snapshot.sma50 !== null) {
    if (close > snapshot.sma50) bull.push("harga di atas SMA50");
    else bear.push("harga di bawah SMA50");
  }
  if (snapshot.smaCrossSignal === "golden_cross") bull.push("golden cross SMA50/200");
  if (snapshot.smaCrossSignal === "death_cross") bear.push("death cross SMA50/200");
  if (snapshot.obvTrend === "Accumulation") bull.push("OBV akumulasi");
  if (snapshot.obvTrend === "Distribution") bear.push("OBV distribusi");

  const agreeing = outlook === "Bullish" ? bull : outlook === "Bearish" ? bear : [];
  const opposing = outlook === "Bullish" ? bear : outlook === "Bearish" ? bull : [];

  const lead =
    outlook === "Bullish"
      ? "Momentum beli sedang kuat"
      : outlook === "Bearish"
        ? "Tekanan jual mendominasi"
        : "Sinyal teknikal masih berimbang";

  if (outlook === "Neutral") {
    const mixed = [...bull.slice(0, 2), ...bear.slice(0, 2)];
    const tail = mixed.length > 0 ? ` — ${mixed.join(", ")}.` : ".";
    return `${lead}${tail} Tunggu konfirmasi sebelum mengambil posisi.`;
  }

  const core = agreeing.length > 0 ? ` didukung ${agreeing.join(", ")}` : "";
  const caveat =
    opposing.length > 0
      ? ` Waspadai ${opposing[0].toLowerCase()} yang bisa membatasi lanjutan gerakan.`
      : "";

  return `${lead}${core}.${caveat}`;
}

/** Coerce a Prisma StockIndicator row (Decimal fields) into a snapshot. */
export function toSnapshot(row: {
  rsi14: { toString(): string } | null;
  macdHist: { toString(): string } | null;
  sma20: { toString(): string } | null;
  sma50: { toString(): string } | null;
  sma200: { toString(): string } | null;
  stochK: { toString(): string } | null;
  adx: { toString(): string } | null;
  obvTrend: string | null;
  signalLabel: string | null;
  smaCrossSignal: string | null;
  emaCrossSignal: string | null;
}): IndicatorSnapshot {
  const n = (v: { toString(): string } | null): number | null => (v == null ? null : Number(v));
  return {
    rsi14: n(row.rsi14),
    macdHist: n(row.macdHist),
    sma20: n(row.sma20),
    sma50: n(row.sma50),
    sma200: n(row.sma200),
    stochK: n(row.stochK),
    adx: n(row.adx),
    obvTrend: row.obvTrend,
    signalLabel: row.signalLabel,
    smaCrossSignal: row.smaCrossSignal,
    emaCrossSignal: row.emaCrossSignal,
  };
}
