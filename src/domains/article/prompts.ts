export const ARTICLE_FORMAT_INSTRUCTIONS = `
## ATURAN OUTPUT (SANGAT PENTING — PELANGGARAN = ARTIKEL DITOLAK)

1. Mulai respons LANGSUNG dengan baris yang dimulai "## ". Tidak ada teks sebelumnya.
2. Output HANYA Markdown artikel. DILARANG:
   - JSON, object, atau code block (\`\`\`).
   - Pembuka percakapan seperti "Berikut adalah...", "Ini artikel...", "Tentu...", "Sebagai AI...".
   - Catatan editor, penjelasan, atau komentar meta.
   - Variasi judul atau judul alternatif. Hanya SATU artikel dengan SATU judul.
3. Karakter pertama respons Anda HARUS "#".
4. Bahasa: Latin saja. DILARANG karakter Cina/Kanji/Hanzi/Kana/Hiragana.
5. Judul artikel = H2 pertama. Tulis seperti headline berita KORAN (5-10 kata, MAKSIMAL 65 karakter). Bukan kalimat percakapan, bukan paragraf.

## FORMAT REQUIREMENTS

Tulis artikel dalam format Markdown dengan aturan berikut:

1. **Judul**: Gunakan H2 (##) untuk semua section. Jangan gunakan H1 (#). Headline H2 pertama harus mengandung primary keyword dan hook yang kuat.
2. **Hook paragraph**: 2-3 kalimat pembuka yang punchy dan langsung menjawab "apa yang terjadi & mengapa penting". Sertakan primary keyword di kalimat pertama secara natural.
3. **Struktur**: Gunakan minimal 5 section H2, dengan H3 untuk detail.
4. **Panjang**: 1500-2500 kata.
5. **Bahasa**: Bahasa Indonesia profesional tapi engaging. Gunakan istilah trader Indonesia secara natural: cuuan, nyangkut, bandarmologi, serok bawah, ARA/ARB, breakout, gorengan, jenuh beli/jual, akumulasi, distribusi. Target pembaca: trader dan investor ritel Indonesia.
6. **SEO**: Distribusikan primary keyword dan 3-5 LSI/long-tail keyword secara natural di H2, paragraf pembuka, dan kesimpulan. Hindari keyword stuffing. Readability score harus tetap tinggi.
7. **Internal linking**: Jangan gunakan format markdown link [text](url). Sebagai gantinya, sebutkan ticker saham dalam format teks biasa menggunakan kode uppercase (misalnya: ASII, BBCA, TLKM) — sistem akan otomatis menghubungkan ke halaman saham terkait. Sebutkan minimal 3-5 ticker relevan secara natural di seluruh artikel, terutama saat membahas perbandingan atau sektor.
8. **CTA**: Gunakan directive :::cta di akhir artikel.
9. **Tips**: Gunakan directive :::tip untuk tips praktis (minimal 2).
10. **Keyword Mapping Table**: Sebelum disclaimer, tambahkan section "Kata Kunci Terkait" berisi tabel 2 kolom (Keyword | Konteks penggunaan) yang menunjukkan keyword apa saja yang diintegrasikan dan di bagian mana.
11. **Disclaimer**: Gunakan directive :::warning[Disclaimer On] dengan teks standar (lihat format di bawah).
12. **JANGAN**: Gunakan emoji. Jangan tulis "sebagai AI". Jangan tulis catatan footer editor.

## CONTOH JUDUL YANG DITOLAK (jangan tiru)

- "Berikut adalah beberapa variasi judul alternatif..."
- "Berikut adalah kelanjutan artikel yang logis..."
- "Teks Anda terpotong di bagian akhir..."
- "Sebagai AI, saya merekomendasikan..."
- "Secara keseluruhan, judul dan preview yang Anda buat..."
- Judul yang diawali sapaan/percakapan atau berakhir "..."
- Lebih dari satu pilihan judul dalam respons.

## CONTOH JUDUL YANG BAGUS (semua di bawah 65 karakter)

- "BBCA Naik 1,2% Saat Ekspektasi GCG Bank Q2"
- "Saham Bank Flat Meski IHSG Terbang"
- "IHSG Tembus 7.200: 3 Sektor yang Diserok"
- "Rupiah Melemah: Saham Konsumer Masih Layak?"
- "Bandarmologi: Akumulasi Aneh di Saham Energi"
- "TLKM Tertekan Kurs, Masih Defensif?"

## CONTOH JUDUL YANG DITOLAK (terlalu panjang / verbose)

- "Anomali Pasar: Saham Bank Indonesia Big Cap Flat Meski IHSG Terbang, Siapa Penggerak Sebenarnya?" (14 kata, 96 karakter — TERLALU PANJANG)
- "Rupiah Melemah Terhadap Dolar AS: Apakah Saham Konsumer Masih Layak Diserok atau Rawan Nyangkut?" (14 kata, 96 karakter — TERLALU PANJANG)
- "Tekanan Kurs Dolar AS Menguji Ketahanan Saham Telekomunikasi dan TLKM di Tengah Badai Rupiah" (14 kata, 92 karakter — TERLALU PANJANG)
- Judul dengan pola "Besok: Apakah X atau Y?" yang terlalu panjang
- Judul dengan lebih dari 10 kata atau 65 karakter

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

Mulai respons LANGSUNG dengan baris yang dimulai "## ". Tidak ada teks sebelumnya, tidak ada JSON, tidak ada code block, tidak ada pembuka percakapan.
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

## JUDUL ARTIKEL

Pilih judul yang SEO-friendly mengikuti format ini:
- "Analisa Teknikal {Nama Saham} ({TICKER}) Hari Ini {Harga} ({Perubahan}) — Sinyal {Bullish/Bearish/Netral}"
- Atau variasi yang memuat: nama saham, harga, keyword "hari ini", dan sinyal teknikal

Jangan gunakan format generik seperti "Analisa Teknikal TICKER Bulan X". Judul harus mengandung harga dan sinyal karena itu yang dicari trader di Google.

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

## TICKER YANG HARUS DISEBUTKAN

Sebutkan ticker-ticker berikut secara natural di artikel (bukan sebagai link, cukup teks biasa uppercase seperti ASII):
- ${t} (saham utama yang dianalisis)
- Sebutkan 2-3 saham sejawat dari sektor ${data.sector} sebagai perbandingan
- Jika membahas IHSG atau tren pasar secara umum, sebutkan BBCA atau BBRI sebagai referensi

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

Integrasikan keyword secara natural. Gunakan contoh dari saham-saham IDX40 seperti BBCA, BBRI, TLKM, ASII, dll. Jangan hanya teori — berikan contoh praktis cara membaca/menggunakan konsep ini di chart saham nyata. Sebutkan ticker saham dalam teks biasa uppercase (ASII, BBCA, dll) saat memberikan contoh — sistem akan otomatis menghubungkan ke halaman saham. Hindari penulisan format link markdown.`;

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
  // ─── TEKNIKAL LANJUTAN ───
  {
    id: "fibonacci-retracement",
    title: "Fibonacci Retracement Saham: Cara Mengidentifikasi Level Reversal",
    description: "Panduan lengkap Fibonacci Retracement untuk trading saham BEI. Cara menggambar level Fibonacci, rasio penting (38.2%, 50%, 61.8%), dan strategi trading berbasis Fibonacci.",
    keywords: ["fibonacci retracement saham", "cara pakai fibonacci", "level fibonacci BEI", "fibonacci 61.8%"],
    suggestedSections: ["Apa Itu Fibonacci Retracement", "Rasio Fibonacci yang Penting", "Cara Menggambar Fibonacci di Chart", "Fibonacci Sebagai Support/Resistance", "Kombinasi Fibonacci dengan Price Action", "Kesalahan Umum Fibonacci"],
  },
  {
    id: "pola-candlestick-lengkap",
    title: "25 Pola Candlestick Saham yang Wajib Diketahui Trader",
    description: "Panduan lengkap pola candlestick untuk analisa saham BEI. Doji, Hammer, Engulfing, Morning Star, Dark Cloud Cover, dan strategi trading berbasis candlestick pattern.",
    keywords: ["pola candlestick saham", "doji hammer engulfing", "candlestick reversal", "pola candlestick BEI"],
    suggestedSections: ["Dasar Candlestick: Body dan Shadow", "Pola Reversal Bullish", "Pola Reversal Bearish", "Pola Lanjutan (Continuation)", "Pola Candlestick Dua dan Tiga Bar", "Cara Trading dengan Konfirmasi Candlestick"],
  },
  {
    id: "ichimoku-cloud-panduan",
    title: "Ichimoku Cloud (Kumo): Sistem Trading All-in-One",
    description: "Panduan praktis Ichimoku Kinko Hyo untuk trading saham BEI. Cara membaca Tenkan-sen, Kijun-sen, Senkou Span, Chikou Span, dan strategi entry/exit dengan Ichimoku.",
    keywords: ["ichimoku cloud saham", "kumo trading", "tenkan kijun sen", "strategi ichimoku BEI"],
    suggestedSections: ["Apa Itu Ichimoku Cloud", "5 Komponen Ichimoku", "Cara Membaca Cloud (Kumo)", "Sinyal Buy/Sell Ichimoku", "Ichimoku untuk Tren Jangka Panjang", "Kombinasi Ichimoku dengan Volume"],
  },
  {
    id: "price-action-trading",
    title: "Price Action Trading: Membaca Pergerakan Harga Tanpa Indikator",
    description: "Pelajari teknik price action trading untuk saham BEI. Membaca struktur pasar, higher highs/lower lows, pin bar, inside bar, dan breakout tanpa bergantung pada indikator.",
    keywords: ["price action saham", "trading tanpa indikator", "pin bar inside bar", "struktur pasar BEI"],
    suggestedSections: ["Apa Itu Price Action", "Membaca Struktur Pasar (HH, HL, LH, LL)", "Pin Bar dan Inside Bar", "Breakout dan Retest", "Price Action dengan Support Resistance", "Membangun Strategi Price Action"],
  },
  {
    id: "divergensi-trading",
    title: "Divergensi dalam Trading Saham: Sinyal Reversal Terkuat",
    description: "Panduan lengkap divergensi bullish dan bearish menggunakan RSI, MACD, dan Stochastic. Cara mengidentifikasi regular dan hidden divergence untuk entry saham BEI.",
    keywords: ["divergensi saham", "RSI divergensi MACD", "hidden divergence", "sinyal reversal BEI"],
    suggestedSections: ["Apa Itu Divergensi", "Regular Bullish Divergence", "Regular Bearish Divergence", "Hidden Divergence", "Divergensi dengan RSI vs MACD", "Strategi Trading Divergensi"],
  },
  {
    id: "multi-timeframe-analysis",
    title: "Analisa Multi Timeframe: Cara Trading yang Lebih Akurat",
    description: "Pelajari cara menganalisa saham dari multiple timeframe untuk konfirmasi tren yang lebih kuat. Kombinasi weekly, daily, dan intraday untuk entry presisi.",
    keywords: ["multi timeframe saham", "analisa beberapa timeframe", "top down analysis", "trading timeframe BEI"],
    suggestedSections: ["Mengapa Multi Timeframe Penting", "Top-Down Analysis", "Mengatur Timeframe Utama", "Konfirmasi Entry Multi TF", "Menghindari Sinyal Palsu", "Strategi Praktis Multi Timeframe"],
  },
  {
    id: "gap-trading-saham",
    title: "Gap Trading Saham BEI: Jenis Gap dan Strategi Trading-nya",
    description: "Panduan gap trading untuk saham BEI. Breakaway gap, runaway gap, exhaustion gap — cara mengidentifikasi dan memanfaatkan gap opening untuk profit.",
    keywords: ["gap trading saham", "breakaway gap exhaustion", "gap opening BEI", "trading gap saham"],
    suggestedSections: ["Apa Itu Gap dalam Saham", "Jenis-Jenis Gap", "Breakaway Gap: Sinyal Tren Baru", "Runaway Gap: Lanjutan Tren", "Exhaustion Gap: Tren Akan Berakhir", "Strategi Fading the Gap"],
  },
  {
    id: "supertrend-indicator",
    title: "Supertrend Indicator: Cara Trading Tren dengan Sederhana",
    description: "Pelajari cara menggunakan Supertrend indicator untuk trading saham BEI. Pengaturan parameter, sinyal buy/sell, dan kombinasi dengan indikator lain.",
    keywords: ["supertrend indicator", "supertrend saham BEI", "trading tren indikator", "ATR multiplier supertrend"],
    suggestedSections: ["Apa Itu Supertrend", "Cara Hitung Supertrend", "Sinyal Buy/Sell Supertrend", "Supertrend sebagai Trailing Stop", "Kombinasi Supertrend + RSI", "Pitfall Supertrend di Sideway Market"],
  },
  // ─── FUNDAMENTAL ANALYSIS ───
  {
    id: "memahami-per-pbv",
    title: "Memahami PER dan PBV: Cara Menilai Valuasi Saham yang Murah/Mahal",
    description: "Panduan lengkap PER (Price to Earnings Ratio) dan PBV (Price to Book Value) untuk menilai apakah saham BEI murah atau mahal. Interpretasi rasio, perbandingan industri, dan jebakan valuasi.",
    keywords: ["PER PBV saham", "valuasi saham murah mahal", "PER wajar BEI", "cara baca PER PBV"],
    suggestedSections: ["Apa Itu PER", "Apa Itu PBV", "PER vs PBV: Kapan Pakai Yang Mana", "PER Industri vs Individual", "Jebakan PER Rendah (Value Trap)", "Kombinasi PER PBV dengan ROE"],
  },
  {
    id: "membaca-laporan-keuangan-pemula",
    title: "Cara Membaca Laporan Keuangan Emiten untuk Pemula",
    description: "Panduan step-by-step membaca laporan keuangan tahunan dan kuartalan emiten BEI. Balance sheet, income statement, cash flow, dan rasio keuangan penting.",
    keywords: ["membaca laporan keuangan", "laporan keuangan emiten", "balance sheet income statement", "analisa fundamental BEI"],
    suggestedSections: ["Struktur Laporan Keuangan", "Income Statement (Laba Rugi)", "Balance Sheet (Neraca)", "Cash Flow Statement (Arus Kas)", "Catatan Laporan Keuangan", "Red Flag dalam Laporan Keuangan"],
  },
  {
    id: "rasio-profitabilitas",
    title: "Rasio Profitabilitas: NPM, ROE, ROA, dan ROIC untuk Menilai Emiten",
    description: "Pelajari rasio profitabilitas untuk menilai kualitas emiten. Net Profit Margin, Return on Equity, Return on Assets, Return on Invested Capital — cara hitung dan interpretasi.",
    keywords: ["rasio profitabilitas saham", "ROE ROA NPM", "ROIC emiten", "profitabilitas perusahaan BEI"],
    suggestedSections: ["Apa Itu Rasio Profitabilitas", "Net Profit Margin (NPM)", "Return on Equity (ROE)", "Return on Assets (ROA)", "Return on Invested Capital (ROIC)", "Membandingkan Rasio Antar Emiten"],
  },
  {
    id: "rasio-solvabilitas-likuiditas",
    title: "Rasio Solvabilitas dan Likuiditas: Mengevaluasi Kesehatan Finansial Emiten",
    description: "Panduan DER (Debt to Equity), Current Ratio, Quick Ratio untuk menilai kemampuan emiten membayar utang dan kewajiban jangka pendek.",
    keywords: ["DER saham", "current ratio quick ratio", "rasio solvabilitas emiten", "utang perusahaan BEI"],
    suggestedSections: ["Apa Itu Solvabilitas", "Debt to Equity Ratio (DER)", "Apa Itu Likuiditas", "Current Ratio dan Quick Ratio", "Emiten dengan Utang Berisiko", "Kombinasi Solvabilitas + Profitabilitas"],
  },
  {
    id: "analisa-arus-kas",
    title: "Analisa Arus Kas (Cash Flow) Emiten: Deteksi Kesehatan Asli Perusahaan",
    description: "Pelajari cara menganalisa cash flow statement untuk mengetahui arus kas operasi, investasi, pendanaan. Operating cash flow, free cash flow, dan deteksi creative accounting.",
    keywords: ["arus kas emiten", "cash flow saham", "free cash flow BEI", "operating cash flow analysis"],
    suggestedSections: ["Mengapa Cash Flow Lebih Jujur dari Laba", "Tiga Komponen Cash Flow", "Free Cash Flow (FCF)", "Cash Flow vs Net Income", "Deteksi Creative Accounting", "Emiten dengan Cash Flow Sehat"],
  },
  {
    id: "dividen-investing-strategi",
    title: "Strategi Dividen Investing: Cara Dapat Passive Income dari Saham BEI",
    description: "Panduan dividen investing untuk saham BEI. Dividend yield, payout ratio, ex-date, record date, dan strategi memilih saham dividen berkualitas.",
    keywords: ["dividen investing", "saham dividen BEI", "dividend yield payout ratio", "passive income saham"],
    suggestedSections: ["Apa Itu Dividen Saham", "Dividend Yield: Cara Hitung dan Interpretasi", "Dividend Payout Ratio", "Jadwal Dividen: Cum Date, Ex Date, Record Date", "Saham Dividen Aman vs Berisiko", "Strategi Dividend Growth Investing"],
  },
  // ─── STRATEGI & MANAJEMEN RISIKO ───
  {
    id: "position-sizing-saham",
    title: "Position Sizing: Berapa Banyak Uang yang Harus Ditaruh di Satu Saham?",
    description: "Panduan position sizing untuk trader dan investor saham BEI. Aturan 1-2%, Kelly Criterion, dan cara menghitung ukuran posisi berdasarkan stop loss.",
    keywords: ["position sizing saham", "aturan 1% trading", "kelly criterion", "berapa modal per saham"],
    suggestedSections: ["Mengapa Position Sizing Penting", "Aturan 1% dan 2%", "Rumus Position Sizing", "Kelly Criterion untuk Saham", "Position Sizing untuk Portofolio", "Kesalahan Position Sizing Umum"],
  },
  {
    id: "swing-trading-saham",
    title: "Swing Trading Saham BEI: Strategi untuk Profit 3-14 Hari",
    description: "Panduan lengkap swing trading untuk saham BEI. Setup entry, exit, stop loss, target profit, dan timeframe optimal untuk swing trading.",
    keywords: ["swing trading saham", "strategi swing trading BEI", "entry exit swing trade", "swing trading Indonesia"],
    suggestedSections: ["Apa Itu Swing Trading", "Setup Swing Trading yang Menguntungkan", "Entry: Pullback ke EMA", "Exit: Trailing Stop atau Target", "Swing Trading dengan Stochastic + MACD", "Manajemen Risiko Swing Trading"],
  },
  {
    id: "membangun-watchlist",
    title: "Cara Membangun Watchlist Saham: Memilih Kandidat Trading Harian",
    description: "Pelajari cara membangun watchlist saham yang efektif. Kriteria screening, setup teknikal, dan rutinitas harian untuk menemukan saham potensial.",
    keywords: ["watchlist saham", "screener harian BEI", "memilih saham trading", "kandidat trading saham"],
    suggestedSections: ["Apa Itu Watchlist", "Kriteria Watchlist yang Baik", "Screener untuk Watchlist", "Rutinitas Harian: Pre-Market", "Review Post-Market", "Tools untuk Watchlist"],
  },
  {
    id: "trading-plan-lengkap",
    title: "Cara Membuat Trading Plan yang Lengkap dan Disiplin",
    description: "Panduan step-by-step membuat trading plan untuk saham BEI. Entry rules, exit rules, risk management, dan evaluasi performa trading.",
    keywords: ["trading plan saham", "aturan trading BEI", "disiplin trading", "jurnal trading"],
    suggestedSections: ["Mengapa Trading Plan Penting", "Komponen Trading Plan", "Entry Rules yang Jelas", "Exit dan Stop Loss Rules", "Risk Management Rules", "Trading Journal dan Evaluasi"],
  },
  {
    id: "dca-vs-lump-sum",
    title: "DCA vs Lump Sum: Strategi Mana yang Lebih Baik untuk Investor Pemula?",
    description: "Perbandingan Dollar Cost Averaging dan Lump Sum investing untuk saham BEI. Kelebihan, kekurangan, dan kapan menggunakan masing-masing strategi.",
    keywords: ["DCA vs lump sum", "dollar cost averaging Indonesia", "strategi investasi pemula", "DCA saham BEI"],
    suggestedSections: ["Apa Itu DCA", "Apa Itu Lump Sum Investing", "Pro dan Kontra DCA", "Pro dan Kontra Lump Sum", "Kapan Pakai DCA vs Lump Sum", "Hybrid Strategy: DCA + Tactical Entry"],
  },
  // ─── CANDLESTICK & POLA CHART ───
  {
    id: "pola-chart-saham",
    title: "15 Pola Chart (Chart Pattern) Saham yang Paling Akurat",
    description: "Panduan lengkap chart pattern untuk trading saham BEI. Head and Shoulders, Double Top/Bottom, Triangle, Flag, Pennant, Wedge — cara identifikasi dan trading.",
    keywords: ["pola chart saham", "chart pattern BEI", "head and shoulders double top", "triangle wedge flag"],
    suggestedSections: ["Reversal Pattern: Head & Shoulders", "Reversal: Double Top dan Double Bottom", "Continuation: Flag dan Pennant", "Triangle: Ascending, Descending, Symmetrical", "Wedge: Rising dan Falling", "Cara Trading Chart Pattern"],
  },
  {
    id: "trendline-mastery",
    title: "Trendline Mastery: Cara Menggambar dan Trading dengan Garis Tren",
    description: "Pelajari cara menggambar trendline yang akurat, mengidentifikasi channel, dan trading dengan trendline break serta retest di saham BEI.",
    keywords: ["trendline saham", "cara gambar trendline", "trend channel trading", "trendline break retest BEI"],
    suggestedSections: ["Apa Itu Trendline", "Aturan Menggambar Trendline", "Trendline Valid vs Tidak Valid", "Trendline Break: Sinyal Reversal", "Channel: Parallel Trendline", "Strategi Trading Trendline + Volume"],
  },
  {
    id: "support-resistance-dinamis",
    title: "Support Resistance Dinamis dengan Moving Average",
    description: "Cara menggunakan EMA 20, 50, 200 sebagai support/resistance dinamis untuk saham BEI. Entry bounce dari MA dan break MA sebagai sinyal.",
    keywords: ["support resistance dinamis", "EMA sebagai support", "moving average bounce", "MA 20 50 200 BEI"],
    suggestedSections: ["MA sebagai Dynamic Support", "MA sebagai Dynamic Resistance", "EMA 20 untuk Swing Trading", "EMA 50 dan EMA 200", "Bounce vs Break dari MA", "Kombinasi MA + Price Action"],
  },
  // ─── PASAR & INSTRUMEN ───
  {
    id: "memahami-jam-trading-bei",
    title: "Jam Trading BEI: Sesi Pra-Opening, Reguler, dan Closing Auction",
    description: "Panduan jam trading Bursa Efek Indonesia. Pre-opening session, reguler market, closing auction, dan strategi trading untuk setiap sesi.",
    keywords: ["jam trading BEI", "pre-opening session", "closing auction", "sesi pasar saham Indonesia"],
    suggestedSections: ["Sesi Pra-Opening (08:45-08:59)", "Sesi Reguler (09:00-15:30)", "Closing Auction", "Strategi Trading di Setiap Sesi", "Liquiditas per Jam", "Tips Trading di Opening dan Closing"],
  },
  {
    id: "memahami-auto-rejection",
    title: "Auto Rejection (ARA/ARB): Aturan Batas Harga Harian BEI",
    description: "Pelajari cara kerja auto rejection atas (ARA) dan auto rejection bawah (ARB) di BEI. Fraksi harga, batas ARA/ARB per sektor, dan strategi trading saat ARA/ARB.",
    keywords: ["auto rejection ARA ARB", "batas harga harian BEI", "ARA ARB saham", "fraksi harga bursa"],
    suggestedSections: ["Apa Itu Auto Rejection", "Fraksi Harga di BEI", "Aturan ARA/ARB per Sektor", "Cara Cek Batas ARA/ARB", "Strategi Trading saat ARA", "Strategi Trading saat ARB"],
  },
  {
    id: "reksa-dana-vs-saham",
    title: "Reksa Dana vs Saham: Mana yang Cocok untuk Pemula?",
    description: "Perbandingan investasi reksa dana dan saham langsung untuk pemula di Indonesia. Risiko, return, biaya, dan strategi alokasi yang optimal.",
    keywords: ["reksa dana vs saham", "investasi pemula Indonesia", "reksa dana saham", "alokasi investasi pemula"],
    suggestedSections: ["Apa Itu Reksa Dana", "Apa Itu Saham Langsung", "Risiko dan Return Comparison", "Biaya Trading Saham vs Reksa Dana", "Kombinasi Optimal untuk Pemula", "Strategi Bertahap: RD Dulu atau Saham?"],
  },
  {
    id: "memahami-ipo-bei",
    title: "IPO Saham BEI: Panduan Cara Ikut dan Strategi Profit",
    description: "Panduan IPO (Initial Public Offering) di Bursa Efek Indonesia. Cara ikut IPO, IPO grading, book building, dan strategi trading saham IPO baru listing.",
    keywords: ["IPO saham BEI", "cara ikut IPO", "IPO grading Indonesia", "strategi trading IPO baru"],
    suggestedSections: ["Apa Itu IPO", "Proses IPO: Book Building hingga Listing", "IPO Grading dan Rating", "Cara Ikut IPO di Sekuritas", "Strategi Trading Hari Pertama IPO", "Risiko Saham IPO"],
  },
  // ─── PSIKOLOGI & DISIPLIN ───
  {
    id: "psikologi-trading-fomo",
    title: "Psikologi Trading: Cara Mengatasi FOMO dan Disiplin dalam Trading",
    description: "Panduan psikologi trading untuk investor saham BEI. Mengatasi FOMO, fear, greed, dan membangun disiplin trading yang konsisten.",
    keywords: ["psikologi trading", "FOMO saham", "disiplin trading BEI", "mengatasi fear greed trading"],
    suggestedSections: ["Apa Itu FOMO dalam Trading", "Tanda-Tanda FOMO", "Strategi Mengatasi FOMO", "Fear vs Greed: Dua Musuh Trader", "Membangun Disiplin Trading", "Trading Journal sebagai Alat Psikologis"],
  },
  {
    id: "menghindari-loss-besar",
    title: "7 Kesalahan Trading Saham yang Sering Dilakukan Pemula",
    description: "Pelajari kesalahan paling umum yang dilakukan trader pemula di BEI dan cara menghindarinya. Tanpa stop loss, averaging down butuh, overtrading, dll.",
    keywords: ["kesalahan trading pemula", "error trading saham", "overtrading averaging down", "tips trading BEI pemula"],
    suggestedSections: ["Tidak Pakai Stop Loss", "Averaging Down pada Saham Turun", "Overtrading: Terlalu Banyak Transaksi", "Tidak Ada Trading Plan", "Mendengarkan Rumor (Gorengan)", "Tidak Belajar dari Kesalahan", "Tips: Cara Menjadi Trader Lebih Baik"],
  },
  {
    id: "market-sentiment-analysis",
    title: "Market Sentiment: Cara Membaca Suasana Pasar untuk Timing Entry",
    description: "Pelajari cara membaca market sentiment IHSG untuk timing entry yang lebih baik. Foreign flow, market breadth, dan indikator sentimen kontra-intuitif.",
    keywords: ["market sentiment IHSG", "foreign flow saham", "market breadth", "timing entry BEI"],
    suggestedSections: ["Apa Itu Market Sentiment", "Foreign Buy/Sell Flow", "Market Breadth: Advancers vs Decliners", "VIX dan Fear/Greed Index", "Sentimen Kontra-Intuitif (Capitulation)", "Menggabungkan Sentiment + Teknikal"],
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
  recentTitles?: string[];
}): { system: string; user: string } {
  const month = new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  const system = `Kamu adalah elite Financial Copywriter, jurnalis keuangan Indonesia, dan Advanced SEO Specialist yang menulis untuk TeknikalID (teknikalid.com) — platform analisa teknikal saham BEI.

BAHASA: Tulis HANYA dalam Bahasa Indonesia. DILARANG menggunakan karakter Cina/Kanji/Hanzi/Katakana/Hiragana. Jika ada kata yang dirasa sulit, gunakan ejaan Latin saja.

Bulan saat ini: ${month}. Pastikan selalu menyebutkan bulan yang BENAR sesuai data tanggal di atas.

Tone: Jurnalistik namun sangat engaging, data-driven, opini yang balanced.
Vocabulary: Gunakan istilah trader Indonesia secara natural: cuuan, nyangkut, bandarmologi, serok bawah, breakout, IHSG, gorengan, arus dana asing.
Lokalisasi: Konteks erat dengan lanskap ekonomi Indonesia dan lingkungan yang diatur OJK.

SEO: Distribusikan keyword secara natural di H2, intro, dan kesimpulan. Ekspansi ke long-tail yang dicari trader Indonesia di Google.

Gaya tulis: Hook yang kuat, fokus fakta dan data, scannable, mudah dipahami investor ritel.

${data.marketDataSection ? `AKURASI DATA (SANGAT PENTING — NON-NEGOTIABLE):
- Artikel ini akan di-fact-check otomatis dengan toleransi Maksimal 0.3% untuk harga saham dan IHSG.
- Artinya: jika harga saham di artikel berbeda lebih dari 0.3% dari data yang disediakan, artikel AKAN DITOLAK.
- SALIN PERSIS angka dari section "DATA PASAR TERKINI" di bawah. Contoh: jika BBCA ditulis "6.425" di data, tulis "6.425" di artikel — JANGAN bulatkan menjadi "6.400" atau "6.430".
- Jangan membuat angka harga saham, level IHSG, atau kurs rupiah sendiri.
- Jika tidak ada data untuk saham tertentu, JANGAN sebutkan harganya. Gunakan frasa umum seperti "berdasarkan data terkini".
- Persentase perubahan harus disalin dari data yang disediakan, bukan dihitung ulang.` : ""}`;

  const user = `${ARTICLE_FORMAT_INSTRUCTIONS}

## TUGAS

Tulis artikel berita pasar saham tentang: **${data.topic}**

${data.context ? `Konteks: ${data.context}` : ""}

${data.marketDataSection ? data.marketDataSection : ""}

Periode: ${month}

## GAYA JUDUL (WAJIB SINGKAT — MAKSIMAL 10 KATA / 65 KARAKTER)

Tulis judul SEPERTI HEADLINE KORAN. Singkat, padat, langsung ke inti.

CONTOH JUDUL YANG BAGUS (perhatikan panjangnya):
- "BBCA Naik 1,2% Setelah Laporan Kuartal"
- "IHSG Reli Tanpa Saham Bank: Siapa Geraknya?"
- "3 Saham Energi Siap Cuuan Pekan Ini"
- "Rupiah Melemah: Saham Konsumer Masih Layak?"
- "Bandarmologi: Akumulasi Aneh di Sektor Ini"
- "Saham Tambang Tertekan Gejolak Kurs"

Aturan KOSONG (NON-NEGOTIABLE):
- MAKSIMAL 10 kata dan 65 karakter. Hitung sebelum menulis.
- Jangan gunakan pola "Judul: Pertanyaan Panjang Sekunder?" di setiap artikel — maksimal 30% artikel boleh pakai format colon.
- Jangan ulang kata yang sama (mis. "Saham" muncul 2x dalam judul).
- Jangan tulis kalimat lengkap sebagai judul — tulis FRASA berita.

${data.recentTitles && data.recentTitles.length > 0 ? `## JUDUL ARTIKEL TERBARU (JANGAN ULANG POLA YANG SAMA)

${data.recentTitles.slice(0, 5).map((t, i) => `${i + 1}. ${t}`).join("\n")}

Pilih struktur kalimat yang berbeda dari kelima judul di atas.` : ""}

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

Integrasikan keyword secara natural. Gunakan contoh dari saham-saham BEI yang relevan. Sebutkan ticker saham dalam teks biasa uppercase (ASII, BBCA, dll) saat membahas saham spesifik — sistem akan otomatis menghubungkan ke halaman saham. Hindari penulisan format link markdown.`;

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

Integrasikan keyword secara natural. Sesuaikan kedalaman dan contoh dengan target pembaca investor Indonesia. Sebutkan ticker saham dalam teks biasa uppercase (ASII, BBCA, dll) saat memberikan contoh — sistem akan otomatis menghubungkan ke halaman saham. Hindari penulisan format link markdown.`;

  return { system, user };
}
