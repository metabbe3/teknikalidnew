export const ARTICLE_FORMAT_INSTRUCTIONS = `
## FORMAT REQUIREMENTS

Tulis artikel dalam format Markdown dengan aturan berikut:

1. **Judul**: Gunakan H2 (##) untuk semua section. Jangan gunakan H1 (#). Headline H2 pertama harus mengandung primary keyword dan hook yang kuat.
2. **Hook paragraph**: 2-3 kalimat pembuka yang punchy dan langsung menjawab "apa yang terjadi & mengapa penting". Sertakan primary keyword di kalimat pertama secara natural.
3. **Struktur**: Gunakan minimal 5 section H2, dengan H3 untuk detail.
4. **Panjang**: 1500-2500 kata.
5. **Bahasa**: Bahasa Indonesia profesional tapi engaging. Gunakan istilah trader Indonesia secara natural: cuuan, nyangkut, bandarmologi, serok bawah, ARA/ARB, breakout, gorengan, jenuh beli/jual, akumulasi, distribusi. Target pembaca: trader dan investor ritel Indonesia.
6. **SEO**: Distribusikan primary keyword dan 3-5 LSI/long-tail keyword secara natural di H2, paragraf pembuka, dan kesimpulan. Hindari keyword stuffing. Readability score harus tetap tinggi.
7. **Internal linking**: Jangan gunakan link. Sebutkan saja "halaman saham {TICKER} di TeknikalID".
8. **CTA**: Gunakan directive :::cta di akhir artikel.
9. **Tips**: Gunakan directive :::tip untuk tips praktis (minimal 2).
10. **Keyword Mapping Table**: Sebelum disclaimer, tambahkan section "Kata Kunci Terkait" berisi tabel 2 kolom (Keyword | Konteks penggunaan) yang menunjukkan keyword apa saja yang diintegrasikan dan di bagian mana.
11. **Disclaimer**: Gunakan directive :::warning[Disclaimer On] dengan teks standar (lihat format di bawah).
12. **JANGAN**: Gunakan emoji. Jangan tulis "sebagai AI". Jangan tulis catatan footer editor.

## DIRECTIVE FORMAT

:::tip[Judul Tip]
Isi tip di sini.
:::

:::warning[Disclaimer On]
Artikel ini disusun untuk tujuan edukasi dan informasi semata. Konten ini bukan merupakan rekomendasi membeli atau menjual instrumen keuangan. Keputusan investasi sepenuhnya menjadi tanggung jawab pembaca. Selalu lakukan riset mandiri (DYOR) dan pertimbangkan konsultasi dengan penasihat keuangan berlisensi OJK sebelum mengambil keputusan investasi.
:::

:::cta[Judul CTA]
Isi CTA di sini.
:::

## KEYWORD MAPPING TABLE FORMAT

Sebelum :::warning[Disclaimer On], tambahkan:

## Kata Kunci Terkait

| Keyword | Konteks |
|---------|---------|
| [keyword 1] | [di bagian mana] |
| [keyword 2] | [di bagian mana] |

## OUTPUT FORMAT

Respond with ONLY the article markdown content. No JSON, no code blocks, no meta-commentary. Start directly with the first ## heading.
`;

export function buildStockAnalysisPrompt(data: {
  ticker: string;
  name: string;
  sector: string;
  close: number | null;
  changePercent: number | null;
  rsi14: number | null;
  macdHist: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  bbUpper: number | null;
  bbLower: number | null;
  stochK: number | null;
  stochD: number | null;
  adx: number | null;
  atr: number | null;
  supertrend: number | null;
  obvTrend: string | null;
  week52High: number | null;
  week52Low: number | null;
  volume: number | null;
}): { system: string; user: string } {
  const t = data.ticker.replace(".JK", "");
  const month = new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const price = data.close ? `Rp ${data.close.toLocaleString("id-ID")}` : "N/A";
  const change = data.changePercent !== null ? `${data.changePercent >= 0 ? "+" : ""}${data.changePercent.toFixed(2)}%` : "N/A";

  const system = `Kamu adalah elite Financial Copywriter, IDX Market Analyst, dan Advanced SEO Specialist yang menulis untuk TeknikalID (teknikalid.com) — platform analisa teknikal saham BEI.

Tone: Profesional namun sangat engaging, community-driven, dan otoritatif.
Vocabulary: Gunakan istilah trader Indonesia secara natural: cuuan, nyangkut, bandar/bandarmologi, serok bawah, ARA/ARB, breakout, gorengan, IHSG, jenuh beli/jual, akumulasi bandar.
Lokalisasi: Konteks erat dengan lanskap ekonomi Indonesia dan lingkungan yang diatur OJK.

SEO: Distribusikan primary keyword dan LSI/long-tail keywords secara natural di H2, intro, dan kesimpulan. Hindari keyword stuffing — readability score harus tetap tinggi. Ekspansi keyword standar menjadi long-tail yang benar-benar diketik trader Indonesia di Google.

Gaya tulis: Data-driven, hook yang kuat, scannable (bullet points, tabel), contoh konkret dari saham IDX.
Artikel ini diperbarui secara berkala dengan data terkini.`;

  const user = `${ARTICLE_FORMAT_INSTRUCTIONS}

## TUGAS

Tulis artikel analisa teknikal untuk saham **${data.name} (${t})** per bulan ${month}.
Artikel ini diperbarui secara berkala dengan data indikator terkini.

## DATA SAHAM TERKINI

- **Saham**: ${data.name} (${t}) — Sektor: ${data.sector}
- **Harga terakhir**: ${price} (${change} hari ini)
- **Week 52 High/Low**: ${data.week52High ? `Rp ${data.week52High.toLocaleString("id-ID")}` : "N/A"} / ${data.week52Low ? `Rp ${data.week52Low.toLocaleString("id-ID")}` : "N/A"}
- **Volume**: ${data.volume ? data.volume.toLocaleString("id-ID") : "N/A"}

## INDIKATOR TEKNIKAL

- **RSI(14)**: ${data.rsi14?.toFixed(1) ?? "N/A"} ${data.rsi14 !== null ? (data.rsi14 > 70 ? "(Overbought)" : data.rsi14 < 30 ? "(Oversold)" : "(Normal)") : ""}
- **MACD Histogram**: ${data.macdHist?.toFixed(2) ?? "N/A"} ${data.macdHist !== null ? (data.macdHist > 0 ? "(Bullish)" : "(Bearish)") : ""}
- **SMA 20/50/200**: ${data.sma20?.toLocaleString("id-ID") ?? "N/A"} / ${data.sma50?.toLocaleString("id-ID") ?? "N/A"} / ${data.sma200?.toLocaleString("id-ID") ?? "N/A"}
- **Bollinger Bands**: Upper ${data.bbUpper?.toLocaleString("id-ID") ?? "N/A"} / Lower ${data.bbLower?.toLocaleString("id-ID") ?? "N/A"}
- **Stochastic %K/%D**: ${data.stochK?.toFixed(1) ?? "N/A"} / ${data.stochD?.toFixed(1) ?? "N/A"}
- **ADX**: ${data.adx?.toFixed(1) ?? "N/A"} ${data.adx !== null ? (data.adx > 25 ? "(Trending)" : "(Sideways)") : ""}
- **ATR**: ${data.atr?.toFixed(0) ?? "N/A"}
- **Supertrend**: ${data.supertrend?.toLocaleString("id-ID") ?? "N/A"}
- **OBV Trend**: ${data.obvTrend ?? "N/A"}

## STRUKTUR ARTIKEL YANG DIBUTUHKAN

1. **Ringkasan Eksekutif** — Outlook singkat: bullish/bearish/netral dan mengapa
2. **Analisa Harga Terkini** — Posisi harga, support/resistance terdekat, range perdagangan
3. **Analisa Momentum (RSI & Stochastic)** — Kondisi momentum, apakah ada divergensi
4. **Analisa Tren (SMA, MACD, ADX)** — Arah tren, kekuatan tren, sinyal crossover
5. **Volatilitas (Bollinger Bands & ATR)** — Kondisi volatilitas, potensi breakout/squeeze
6. **Level Kunci** — Support dan resistance utama, pivot points
7. **Kesimpulan & Outlook** — Ringkasan analisa dan skenario bullish/bearish

## TARGET KEYWORD

Utama: "analisa teknikal ${t}"
Sekunder: "saham ${data.name} hari ini", "${t} forecast", "harga saham ${t}", "analisa teknikal ${t} ${month}"
Long-tail (WAJIB integrasikan minimal 3): "analisis teknikal saham ${t} hari ini", "rekomendasi saham ${data.sector.toLowerCase()}", "harga saham ${data.name} ${month}", "prediksi saham ${t} minggu depan", "saham ${t} beli atau jual"

Integrasikan keyword secara natural di H2, paragraf pembuka, dan kesimpulan. Jangan keyword-stuffing. Setiap section harus memberikan insight nyata berdasarkan data indikator di atas.`;

  return { system, user };
}

export function buildEducationalPrompt(topic: {
  title: string;
  description: string;
  keywords: string[];
  suggestedSections: string[];
}): { system: string; user: string } {
  const system = `Kamu adalah elite Financial Copywriter, educator keuangan Indonesia, dan Advanced SEO Specialist yang menulis untuk TeknikalID (teknikalid.com) — platform analisa teknikal saham BEI.

Tone: Edukatif namun sangat engaging, community-driven, menggunakan analogi sehari-hari.
Vocabulary: Gunakan istilah trader Indonesia secara natural: cuuan, nyangkut, bandarmologi, breakout, gorengan, jenuh beli/jual, akumulasi.
Lokalisasi: Konteks erat dengan lanskap ekonomi Indonesia dan lingkungan yang diatur OJK.

SEO: Distribusikan keyword secara natural di H2, intro, dan kesimpulan. Ekspansi ke long-tail yang dicari investor pemula Indonesia.

Gaya tulis: Step-by-step, analogi dari kehidupan sehari-hari, contoh konkret dari saham IDX40 (BBCA, BBRI, TLKM, ASII).`;

  const user = `${ARTICLE_FORMAT_INSTRUCTIONS}

## TUGAS

Tulis artikel edukatif tentang: **${topic.title}**

${topic.description}

## STRUKTUR YANG DISARANKAN

${topic.suggestedSections.map((s, i) => `${i + 1}. ${s}`).join("\n")}

## TARGET KEYWORD

Utama: "${topic.keywords[0]}"
Sekunder: ${topic.keywords.slice(1).map((k) => `"${k}"`).join(", ")}

Integrasikan keyword secara natural. Gunakan contoh dari saham-saham IDX40 seperti BBCA, BBRI, TLKM, ASII, dll. Jangan hanya teori — berikan contoh praktis cara membaca/menggunakan konsep ini di chart saham nyata.`;

  return { system, user };
}

export const EDUCATIONAL_TOPICS = [
  {
    id: "cara-membaca-rsi",
    title: "Cara Membaca RSI (Relative Strength Index) Saham",
    description: "Panduan lengkap cara membaca indikator RSI untuk analisa teknikal saham BEI. Termasuk cara menghitung, interpretasi overbought/oversold, divergensi RSI, dan strategi trading menggunakan RSI.",
    keywords: ["cara membaca RSI saham", "RSI overbought oversold", "indikator RSI BEI", "divergensi RSI"],
    suggestedSections: ["Apa Itu RSI dan Cara Kerjanya", "Cara Membaca Nilai RSI", "RSI Overbought dan Oversold", "Divergensi RSI: Sinyal Reversal Terkuat", "Strategi Trading dengan RSI", "Kesalahan Umum Menggunakan RSI"],
  },
  {
    id: "memahami-macd",
    title: "Memahami MACD: Indikator Momentum Terlengkap",
    description: "Penjelasan lengkap indikator MACD (Moving Average Convergence Divergence) untuk trading saham. Cara membaca histogram MACD, signal line crossover, dan strategi entry/exit.",
    keywords: ["apa itu MACD saham", "cara baca MACD", "MACD histogram trading", "strategi MACD BEI"],
    suggestedSections: ["Apa Itu MACD", "Komponen MACD: MACD Line, Signal Line, Histogram", "Cara Membaca Sinyal MACD", "MACD Crossover: Golden Cross & Death Cross", "Divergensi MACD", "Strategi Praktis MACD untuk Saham BEI"],
  },
  {
    id: "cara-menggunakan-bollinger-bands",
    title: "Cara Menggunakan Bollinger Bands untuk Trading Saham",
    description: "Panduan praktis menggunakan Bollinger Bands di chart saham. Pelajari cara membaca squeeze, breakout, dan walk the band untuk menentukan entry/exit.",
    keywords: ["Bollinger Bands saham", "cara baca Bollinger Bands", "Bollinger Bands squeeze breakout", "indikator volatilitas BEI"],
    suggestedSections: ["Apa Itu Bollinger Bands", "Cara Kerja Bollinger Bands", "Bollinger Bands Squeeze: Sinyal Breakout", "Walking the Bands: Tren Kuat", "Strategi Entry dan Exit", "Kombinasi Bollinger Bands dengan RSI"],
  },
  {
    id: "strategi-stop-loss-saham",
    title: "Strategi Stop Loss Saham BEI: Lindungi Modal Anda",
    description: "Panduan lengkap cara menentukan stop loss yang tepat untuk saham BEI. Pelajari metode ATR-based, percentage-based, dan support-based stop loss.",
    keywords: ["cara pasang stop loss saham", "strategi stop loss BEI", "menentukan stop loss", "manajemen risiko saham"],
    suggestedSections: ["Mengapa Stop Loss Penting", "Jenis-Jenis Stop Loss", "Metode Penentuan Stop Loss", "Stop Loss Berbasis ATR", "Contoh Praktis Saham BEI", "Kesalahan Stop Loss yang Harus Dihindari"],
  },
  {
    id: "support-resistance-saham",
    title: "Support dan Resistance Saham: Cara Mengidentifikasi Level Kunci",
    description: "Pelajari cara menemukan dan menggambar level support resistance pada chart saham. Termasuk metode pivot point, price action, dan moving average.",
    keywords: ["support resistance saham", "cara menentukan support resistance", "level kunci saham BEI", "pivot point saham"],
    suggestedSections: ["Apa Itu Support dan Resistance", "Cara Mengidentifikasi Level Support", "Cara Mengidentifikasi Level Resistance", "Pivot Point: Kalkulasi Matematis", "Support Resistance Dinamis dengan MA", "Strategi Trading di Area Support Resistance"],
  },
  {
    id: "cara-baca-chart-saham",
    title: "Cara Baca Chart Saham untuk Pemula: Panduan Lengkap",
    description: "Panduan dasar membaca chart saham untuk pemula. Kenali jenis chart, candlestick, timeframe, dan cara interpretasi pergerakan harga saham.",
    keywords: ["cara baca chart saham", "membaca grafik saham pemula", "candlestick saham", "chart saham BEI"],
    suggestedSections: ["Jenis-Jenis Chart Saham", "Memahami Candlestick", "Timeframe: Pilih yang Tepat", "Volume: Konfirmasi Pergerakan Harga", "Membaca Pola Chart Dasar", "Tips untuk Pemula"],
  },
  {
    id: "moving-average-strategi",
    title: "Strategi Moving Average: SMA dan EMA untuk Trading Saham",
    description: "Pelajari cara menggunakan Simple Moving Average dan Exponential Moving Average untuk analisa teknikal. Strategi crossover, Golden Cross, dan Death Cross.",
    keywords: ["moving average saham", "SMA EMA strategi", "golden cross death cross", "indikator MA BEI"],
    suggestedSections: ["Apa Itu Moving Average", "SMA vs EMA: Perbedaan dan Kegunaan", "Strategi Crossover MA", "Golden Cross dan Death Cross", "MA sebagai Support Resistance Dinamis", "Strategi Praktis dengan MA"],
  },
  {
    id: "stochastic-oscillator",
    title: "Stochastic Oscillator: Cara Membaca Sinyal Overbought/Oversold",
    description: "Panduan lengkap Stochastic Oscillator untuk trading saham. Cara membaca %K dan %D, sinyal buy/sell, dan kombinasi dengan indikator lain.",
    keywords: ["stochastic oscillator saham", "cara baca stochastic", "%K %D trading", "stochastic oversold BEI"],
    suggestedSections: ["Apa Itu Stochastic Oscillator", "Cara Kerja %K dan %D", "Sinyal Overbought dan Oversold", "Stochastic Crossover", "Divergensi Stochastic", "Kombinasi Stochastic dengan RSI"],
  },
  {
    id: "volume-trading-analysis",
    title: "Analisa Volume Perdagangan Saham: Konfirmasi Tren dan Deteksi Akumulasi",
    description: "Pelajari cara menggunakan volume perdagangan untuk konfirmasi tren saham. Volume spike, on-balance volume, dan deteksi akumulasi/distribusi.",
    keywords: ["analisa volume saham", "volume spike trading", "OBV saham", "akumulasi distribusi saham BEI"],
    suggestedSections: ["Mengapa Volume Penting", "Volume Sebagai Konfirmasi Tren", "Volume Spike: Apa Artinya", "On-Balance Volume (OBV)", "Deteksi Akumulasi dan Distribusi", "Strategi Trading Berbasis Volume"],
  },
  {
    id: "adx-trend-strength",
    title: "ADX (Average Directional Index): Mengukur Kekuatan Tren Saham",
    description: "Panduan cara menggunakan ADX untuk mengukur kekuatan tren saham. Kapan trending vs sideway, dan strategi trading sesuai kondisi market.",
    keywords: ["ADX saham", "kekuatan tren saham", "ADX trending sideway", "indikator tren BEI"],
    suggestedSections: ["Apa Itu ADX", "Cara Kerja ADX, +DI, -DI", "Mengukur Kekuatan Tren", "Strategi Trading saat ADX Tinggi", "Strategi saat ADX Rendah (Sideways)", "Kombinasi ADX dengan Indikator Lain"],
  },
];

export function pickNextTopic(existingSlugs: Set<string>): (typeof EDUCATIONAL_TOPICS)[number] | null {
  const uncovered = EDUCATIONAL_TOPICS.filter((t) => !existingSlugs.has(`edukasi-${t.id}`));
  if (uncovered.length === 0) return null;
  return uncovered[Math.floor(Math.random() * uncovered.length)];
}

export const NEWS_TOPIC_SUGGESTIONS = [
  { id: "weekly-market-recap", title: "Ringkasan Pasar Mingguan", description: "Recap IHSG dan saham-saham paling aktif minggu ini" },
  { id: "sector-deep-dive", title: "Analisa Sektor", description: "Deep dive sektor tertentu (banking, mining, consumer, dll)" },
  { id: "ipo-analysis", title: "Analisa IPO Terbaru", description: "Review IPO terbaru di BEI" },
  { id: "dividend-season", title: "Musim Dividen", description: "Saham-saham pembayar dividen terbaik" },
  { id: "market-outlook", title: "Outlook Pasar", description: "Preview dan prediksi pasar minggu/bulan depan" },
  { id: "earnings-review", title: "Review Laporan Keuangan", description: "Analisa kinerja keuangan emiten terbaru" },
  { id: "foreign-flow", title: "Arus Dana Asing", description: "Analisa net buy/sell asing dan dampaknya" },
  { id: "index-rebalance", title: "Rebalancing Indeks", description: "Perubahan komposisi indeks dan dampaknya" },
];

export function buildNewsPrompt(data: {
  topic: string;
  keywords: string[];
  trendingAngles?: string[];
  context?: string;
  marketDataSection?: string;
}): { system: string; user: string } {
  const month = new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  const system = `Kamu adalah elite Financial Copywriter, jurnalis keuangan Indonesia, dan Advanced SEO Specialist yang menulis untuk TeknikalID (teknikalid.com) — platform analisa teknikal saham BEI.

Tone: Jurnalistik namun sangat engaging, data-driven, opini yang balanced.
Vocabulary: Gunakan istilah trader Indonesia secara natural: cuuan, nyangkut, bandarmologi, serok bawah, breakout, IHSG, gorengan, arus dana asing.
Lokalisasi: Konteks erat dengan lanskap ekonomi Indonesia dan lingkungan yang diatur OJK.

SEO: Distribusikan keyword secara natural di H2, intro, dan kesimpulan. Ekspansi ke long-tail yang dicari trader Indonesia di Google.

Gaya tulis: Hook yang kuat, fokus fakta dan data, scannable, mudah dipahami investor ritel.

${data.marketDataSection ? `AKURASI DATA: Artikel ini akan di-fact-check otomatis. Gunakan HANYA data pasar yang disediakan di bawah. Jangan membuat angka harga saham, level IHSG, atau kurs rupiah sendiri. Jika tidak yakin, gunakan frasa umum seperti "berdasarkan data terkini" tanpa menyebutkan angka spesifik.` : ""}`;

  const user = `${ARTICLE_FORMAT_INSTRUCTIONS}

## TUGAS

Tulis artikel berita pasar saham tentang: **${data.topic}**

${data.context ? `Konteks: ${data.context}` : ""}

${data.marketDataSection ? data.marketDataSection : ""}

Periode: ${month}

## STRUKTUR ARTIKEL

1. **Headline & Ringkasan** — Apa yang terjadi dan mengapa penting
2. **Konteks & Latar Belakang** — Data dan fakta pendukung
3. **Dampak & Implikasi** — Apa artinya untuk investor
4. **Data Pendukung** — Angka, statistik, perbandingan
5. **Outlook** — Apa yang mungkin terjadi selanjutnya
6. **Kesimpulan** — Ringkasan dan takeaway utama

## TARGET KEYWORD

Utama: "${data.keywords[0] || data.topic}"
Sekunder: ${data.keywords.slice(1).map((k) => `"${k}"`).join(", ") || data.topic}

${data.trendingAngles?.length ? `## SUDUT PANDANG YANG HARUS DIBAHAS

Artikel harus membahas minimal 2 dari sudut pandang berikut:
${data.trendingAngles.map((a) => `- ${a}`).join("\n")}

Pilih yang paling relevan dan kembangkan secara mendalam.` : ""}

Integrasikan keyword secara natural. Gunakan contoh dari saham-saham BEI yang relevan.`;

  return { system, user };
}

export function buildGeneralPrompt(data: {
  topic: string;
  keywords: string[];
  trendingAngles?: string[];
  style?: string;
  context?: string;
}): { system: string; user: string } {
  const system = `Kamu adalah elite Financial Copywriter, analis pasar saham Indonesia, dan Advanced SEO Specialist yang menulis untuk TeknikalID (teknikalid.com) — platform analisa teknikal saham BEI.

Tone: ${data.style === "casual" ? "Santai dan friendly, seperti ngobrol sesama trader" : data.style === "tutorial" ? "Step-by-step yang praktis dan langsung bisa dicoba" : "Profesional, informatif, dan engaging"}.
Vocabulary: Gunakan istilah trader Indonesia secara natural: cuuan, nyangkut, bandarmologi, breakout, gorengan, jenuh beli/jual, IHSG, akumulasi.
Lokalisasi: Konteks erat dengan lanskap ekonomi Indonesia dan lingkungan yang diatur OJK.

SEO: Distribusikan keyword secara natural di H2, intro, dan kesimpulan. Ekspansi ke long-tail yang dicari investor Indonesia.

Gaya tulis: Mudah dipahami, contoh konkret dari pasar saham Indonesia, hook yang kuat.`;

  const user = `${ARTICLE_FORMAT_INSTRUCTIONS}

## TUGAS

Tulis artikel tentang: **${data.topic}**

${data.context ? `Konteks: ${data.context}` : ""}

## TARGET KEYWORD

Utama: "${data.keywords[0] || data.topic}"
Sekunder: ${data.keywords.slice(1).map((k) => `"${k}"`).join(", ") || data.topic}

${data.trendingAngles?.length ? `## SUDUT PANDANG YANG HARUS DIBAHAS

Artikel harus membahas minimal 2 dari sudut pandang berikut:
${data.trendingAngles.map((a) => `- ${a}`).join("\n")}

Pilih yang paling relevan dan kembangkan secara mendalam.` : ""}

Integrasikan keyword secara natural. Sesuaikan kedalaman dan contoh dengan target pembaca investor Indonesia.`;

  return { system, user };
}
