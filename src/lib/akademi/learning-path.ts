/**
 * LEARNING PATH AKADEMI (owner 24 Okt: "kurang menarik/interaktif untuk belajar")
 * Roadmap bernomor 3 tingkat — pemula bisa jawab "mulai dari mana?" dalam 3 detik.
 * Quiz data untuk artikel jalur utama (belajar aktif, client-side, tanpa backend).
 */

export interface PathStep {
  slug: string;
  title: string; // pendek utk chip roadmap
  minutes?: number;
}

export interface LearningTrack {
  id: string;
  label: string;
  description: string;
  steps: PathStep[];
}

export const LEARNING_TRACKS: LearningTrack[] = [
  {
    id: "pemula",
    label: "Pemula",
    description: "Nol → bisa beli saham pertama dengan aman",
    steps: [
      { slug: "belajar-saham-dari-nol-panduan-langkah-demi-langkah-pemula", title: "Belajar Saham dari Nol", minutes: 8 },
      { slug: "panduan-lengkap-cara-beli-saham-pertama-kali-untuk-pemula-2025", title: "Beli Saham Pertama", minutes: 9 },
      { slug: "cara-mengelola-risiko-dalam-investasi-saham", title: "Kelola Risiko", minutes: 7 },
      { slug: "strategi-dollar-cost-averaging-untuk-investasi-saham-idx", title: "Strategi DCA", minutes: 6 },
      { slug: "panduan-memilih-saham-blue-chip-di-bursa-efek-indonesia", title: "Pilih Blue Chip", minutes: 7 },
    ],
  },
  {
    id: "menengah",
    label: "Menengah",
    description: "Baca chart: indikator inti & level kunci",
    steps: [
      { slug: "indikator-teknikal-wajib-rsi-macd-dan-moving-average", title: "3 Indikator Wajib", minutes: 8 },
      { slug: "cara-membaca-rsi-saham-panduan-lengkap-pemula", title: "Membaca RSI", minutes: 8 },
      { slug: "golden-cross-dan-death-cross-sinyal-strategi-saham", title: "Golden/Death Cross", minutes: 7 },
      { slug: "support-dan-resistance-saham-cara-menentukan", title: "Support & Resistance", minutes: 8 },
      { slug: "cara-membaca-volume-saham-dan-price-volume", title: "Analisa Volume", minutes: 7 },
    ],
  },
  {
    id: "lanjut",
    label: "Lanjut",
    description: "Senjata lanjutan & strategi entry",
    steps: [
      { slug: "cara-membaca-macd-saham-panduan-trader-pemula", title: "Membaca MACD", minutes: 8 },
      { slug: "cara-membaca-bollinger-bands-saham", title: "Bollinger Bands", minutes: 7 },
      { slug: "divergensi-rsi-macd-arti-cara-membaca-dan-strategi", title: "Divergensi RSI/MACD", minutes: 8 },
      { slug: "pola-candlestick-saham-hammer-engulfing-doji", title: "Pola Candlestick", minutes: 8 },
      { slug: "strategi-pullback-sma20-untuk-pemula", title: "Strategi Pullback", minutes: 9 },
    ],
  },
];

/** Rekomendasi kontekstual utk halaman saham — teachable moment (owner 24 Okt:
 *  "funelling dari stocks / per ticker" — kontekstual dulu, baru rotasi harian). */
export interface EduSuggestion {
  slug: string;
  title: string;
  reason: string;
}

export function suggestEduForIndicator(opts: {
  rsi14: number | null;
  macdSignal?: string | null; // "bullish" | "bearish" | null
  nearSupport?: boolean;
}): EduSuggestion | null {
  const { rsi14, macdSignal } = opts;
  if (rsi14 !== null && rsi14 >= 70) {
    return { slug: "saham-overbought-arti-cara-membaca-rsi-dan-strategi", title: "Saham Overbought: Arti & Strateginya", reason: `RSI ${Math.round(rsi14)} — saham ini overbought. Pahami artinya sebelum keputusan.` };
  }
  if (rsi14 !== null && rsi14 <= 30) {
    return { slug: "saham-oversold-arti-cara-membaca-dan-strategi", title: "Saham Oversold: Arti & Strategi Membeli", reason: `RSI ${Math.round(rsi14)} — kondisi oversold. Belajar cara bacanya.` };
  }
  if (macdSignal === "bullish") {
    return { slug: "arti-macd-golden-cross-dan-cara-menggunakannya", title: "MACD Golden Cross & Cara Menggunakannya", reason: "MACD saham ini bullish — pelajar sinyalnya." };
  }
  if (macdSignal === "bearish") {
    return { slug: "golden-cross-vs-death-cross-arti-cara-membaca-contoh-saham", title: "Golden vs Death Cross", reason: "MACD melemah — kenali sinyal bearish." };
  }
  return null;
}

/** Fallback rotasi HARIAN (deterministik by date — cache-friendly, bukan random per-view). */
export function dailyRotation(dayIndex: number): EduSuggestion {
  const pool: EduSuggestion[] = [
    { slug: "indikator-teknikal-wajib-rsi-macd-dan-moving-average", title: "3 Indikator Teknikal Wajib", reason: "Belajar 3 indikator inti yang dipakai halaman ini." },
    { slug: "cara-membaca-rsi-saham-panduan-lengkap-pemula", title: "Cara Membaca RSI", reason: "Angka RSI di halaman ini jadi berguna kalau tahu artinya." },
    { slug: "support-dan-resistance-saham-cara-menentukan", title: "Support & Resistance", reason: "Level hijau/merah di chart = support/resistance." },
    { slug: "cara-membaca-volume-saham-dan-price-volume", title: "Analisa Volume", reason: "Volume besar tanpa naik harga? Ini artinya." },
    { slug: "golden-cross-dan-death-cross-sinyal-strategi-saham", title: "Golden Cross & Death Cross", reason: "Sinyal MA50/MA200 yang paling ditunggu trader." },
    { slug: "saham-gorengan-arti-ciri-ciri-dan-kenapa-golden-cross-nya-menipu", title: "Saham Gorengan & Sinyal Menipu", reason: "Harga murah ≠ murah. Kenali ciri gorengan." },
  ];
  return pool[dayIndex % pool.length];
}

/** Quiz — artikel jalur utama. Format pilihan ganda, jawaban + penjelasan. */
export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number; // index
  why: string;
}

export const ARTICLE_QUIZZES: Record<string, QuizQuestion[]> = {
  "belajar-saham-dari-nol-panduan-langkah-demi-langkah-pemula": [
    { q: "Apa langkah PERTAMA sebelum beli saham?", options: ["Beli saham harga murah", "Buka rekening efek (broker) dulu", "Ikut sinyal grup Telegram", "Pinjam uang biar modal besar"], answer: 1, why: "Tanpa rekening efek di broker (sekuritas), kamu tidak bisa mengeksekusi transaksi di IDX." },
    { q: "Kalau baru mulai, modal yang ideal adalah…", options: ["Seluruh tabungan", "Dana pinjaman", "Uang dingin yang tak dipakai 1-2 tahun", "Uang sekolah anak"], answer: 2, why: "Saham = aset jangka panjang. Hanya pakai uang yang tidak dibutuhkan dalam waktu dekat." },
    { q: "Diversifikasi artinya…", options: ["Beli 1 saham tapi banyak", "Membeli beberapa saham sektor berbeda", "Beli-tjual cepat tiap hari", "Pasang banyak order sekaligus"], answer: 1, why: "Menyebar ke beberapa sektor mengurangi risiko satu emiten bermasalah." },
  ],
  "panduan-lengkap-cara-beli-saham-pertama-kali-untuk-pemula-2025": [
    { q: "IHSG di bursa mana?", options: ["NYSE", "NASDAQ", "IDX (Bursa Efek Indonesia)", "SGX"], answer: 2, why: "Saham Indonesia diperdagangkan di IDX, sebelumnya disebut BEI." },
    { q: "Satuan terkecil pembelian saham di IDX (market lot)?", options: ["1 lembar", "10 lembar", "100 lembar", "1000 lembar"], answer: 2, why: "1 lot = 100 lembar untuk mayoritas saham (beberapa punya lot 200/500 tergantung harga)." },
    { q: "Jam utama sesi perdagangan reguler IDX?", options: ["07.00-12.00", "09.00-15.50 WIB", "10.00-16.00", "24 jam"], answer: 1, why: "Sesi reguler idx: 09.00-15.50 WIB (dengan jeda & pre-closing)." },
  ],
  "cara-mengelola-risiko-dalam-investasi-saham": [
    { q: "Aturan populer '1R = berapa % modal maksimal per posisi'?", options: ["50%", "10%", "1-2%", "0%"], answer: 2, why: "Trader disiplin membatasi kerugian per posisi 1-2% modal agar satu salah tak mematikan." },
    { q: "Stop-loss itu…", options: ["Order beli otomatis", "Level jual otomatis utk batasi rugi", "Bonus broker", "Pajak saham"], answer: 1, why: "Stop-loss menjual otomatis di level tertentu supaya rugi tidak membesar." },
    { q: "Risk-reward 1:2 artinya…", options: ["Rugi 2 untung 1", "Rugi 1 untung 2", "Modal 2x lipat", "Komisi 2%"], answer: 1, why: "Risiko Rp100 demi target Rp200 — cukup menang 34% saja untuk profit jangka panjang." },
  ],
  "strategi-dollar-cost-averaging-untuk-investasi-saham-idx": [
    { q: "DCA (Dollar Cost Averaging) artinya…", options: ["Beli sekali besar", "Belajarlah rutin nominal tetap berkala", "Trading harian", "Tunggu harga terendah"], answer: 1, why: "Beli rutin (misal tiap bulan) nominal tetap — rata-rata harga jadi halus, timing tidak lagi segenting." },
    { q: "Keuntungan utama DCA bagi pemula?", options: ["Pasti untung cepat", "Tidak perlu menebak timing pasar", "Bebas rugi", "Bebas pajak"], answer: 1, why: "DCA menghilangkan stress menebak titik terbawah — konsistensi mengalahkan timing." },
    { q: "DCA paling cocok dikombinasikan dengan…", options: ["Saham gorengan", "Emiten likuid & sehat fundamentalnya", "Saham yang di-suspend", "Crypto 100x"], answer: 1, why: "Aset yang likelihood-nya naik jangka panjang (blue chip/index) — DCA pada sampah = rata-rata bawah." },
  ],
  "panduan-memilih-saham-blue-chip-di-bursa-efek-indonesia": [
    { q: "Ciri utama blue chip?", options: ["Harga saham termahal", "Kapitalisasi besar, likuid, fundamental solid", "Baru IPO", "Sering ARA"], answer: 1, why: "Blue chip = emiten raksasa (bank BUMN, telko) yang stabil & aktif diperdagangkan." },
    { q: "Likuiditas saham penting karena…", options: ["Biar keren", "Bisa jual cepat tanpa merusak harga", "Dividen lebih besar", "Bebas komisi"], answer: 1, why: "Saham likuid mudah dijual kapan pun — penting saat butuh cash mendadak." },
    { q: "Contoh saham blue chip Indonesia?", options: ["PGUK", "BBCA", "BUVA", "WMUU"], answer: 1, why: "BBCA (Bank Central Asia) — kapitalisasi terbesar & sangat likuid. Sisanya small-caps." },
  ],
  "indikator-teknikal-wajib-rsi-macd-dan-moving-average": [
    { q: "RSI mengukur…", options: ["Harga wajar saham", "Kecepatan & perubahan pergerakan harga (momentum)", "Volume perdagangan", "Dividen"], answer: 1, why: "RSI = Relative Strength Index, osilator momentum 0-100." },
    { q: "MACD digunakan untuk…", options: ["Menghitung pajak", "Mendeteksi perubahan tren & momentum", "Melihat laporan keuangan", "Menentukan lot"], answer: 1, why: "MACD membandingkan 2 EMA — crossing-nya jadi sinyal perubahan tren." },
    { q: "Moving Average berfungsi…", options: ["Selembar harga rata-rata dalam periode", "Nilai buku", "Kurs", "Bunga"], answer: 0, why: "MA = rata-rata harga N-hari — menghaluskan noise agar tren terlihat." },
  ],
  "cara-membaca-rsi-saham-panduan-lengkap-pemula": [
    { q: "RSI di atas 70 umumnya berarti…", options: ["Oversold", "Overbought", "Netral", "Bankrupt"], answer: 1, why: ">70 = overbought (potensi jenuh beli), <30 = oversold (potensi jenuh jual)." },
    { q: "RSI 50 biasanya dibaca sebagai…", options: ["Bullish ekstrem", "Netral / garis tengah", "Wajib jual", "Wajib beli"], answer: 1, why: "Di atas 50 cenderung momentum naik, di bawah 50 cenderung turun." },
    { q: "RSI paling optimal dipakai saat pasar…", options: ["Trending kuat satu arah", "Sideways / ranging", "Suspend", "IPO"], answer: 1, why: "Di pasar ranging, batas 70/30 bekerja bagus; di tren kuat RSI bisa nempel lama di ekstrem." },
  ],
  "golden-cross-dan-death-cross-sinyal-strategi-saham": [
    { q: "Golden cross klasik terjadi ketika…", options: ["MA50 memotong naik MA200", "MA200 memotong turun MA50", "Harga menyentuh support", "Volume nol"], answer: 0, why: "MA50 naik menembus MA200 = sinyal bull jangka panjang paling terkenal." },
    { q: "Death cross adalah kebalikannya:…", options: ["MA50 memotong turun MA200", "Harga naik 2 hari", "RSI 50", "Dividen dibayar"], answer: 0, why: "MA50 jatuh di bawah MA200 = sinyal tekanan jual jangka panjang." },
    { q: "Cross MA sifatnya…", options: ["Instan, wajib langsung beli", "Lagging — konfirmasi tren, bukan prediksi", "Berlaku 5 menit", "Hanya utk crypto"], answer: 1, why: "MA berbasis rata-rata historis → sinyalnya telat tapi kuat sebagai konfirmasi." },
  ],
  "support-dan-resistance-saham-cara-menentukan": [
    { q: "Support adalah level…", options: ["Harga cenderung ditahan turunnya", "Harga cenderung tertahan naiknya", "Harga pembukaan", "Harga dividen"], answer: 0, why: "Support = 'lantai' tempat beli masuk; resistance = 'atap' tempat jual masuk." },
    { q: "Resistance yang ditembus kuat biasanya berubah menjadi…", options: ["Support baru", "Dividen", "IPO", "Suspensi"], answer: 0, why: "Pola flip level: resistance jebol → jadi support (dan sebaliknya)." },
    { q: "Cara termudah menemukan level utk pemula?", options: ["Tebak", "High/low yang sudah dicoba berkali-kali", "Harga penutupan kemarin saja", "Angka favorit"], answer: 1, why: "Level yang sudah beberapa kali 'diuji' adalah level yang dipercaya banyak peserta pasar." },
  ],
  "cara-membaca-volume-saham-dan-price-volume": [
    { q: "Harga naik + volume besar = …", options: ["Sinyal lemah", "Minat beli kuat & mendukung tren naik", "Pasar tutup", "Wajib jual"], answer: 1, why: "Kenaikan harga yang diikuti volume = partisipasi luas, bukan manipulasi segelintir." },
    { q: "Harga naik tapi volume makin kecil, patut…", options: ["Amankan / curiga tren lemah", "Beli semua uang", "Tidur", "Lapor OJK"], answer: 0, why: "Naik tanpa volume = daya tahan tren patut diragukan." },
    { q: "Volume spike tiba-tiba sering menandakan…", options: ["Ada berita/peristiwa emiten", "Bug aplikasi", "Market libur", "Semua saham naik"], answer: 0, why: "Aktivitas mendadak hampir selalu ada pemicu — cek berita sebelum ikut." },
  ],
  "cara-membaca-macd-saham-panduan-trader-pemula": [
    { q: "MACD line dihitung dari…", options: ["EMA12 - EMA26", "Harga - dividen", "RSI - MA", "Volume 2 hari"], answer: 0, why: "MACD = EMA12 minus EMA26; signal line-nya EMA9 dari MACD itu sendiri." },
    { q: "Sinyal beli klasik MACD saat…", options: ["MACD memotong naik signal line", "Histogram nol", "RSI 100", "Market buka"], answer: 0, why: "Crossing MACD di atas signal = momentum bullish menguat." },
    { q: "Histogram MACD mempendek saat harga naik = …", options: ["Momentum melemah (hati-hati)", "Wajib beli", "Dividen datang", "Tidak bermakna"], answer: 0, why: "Divergensi histogram-harga = peringatan dini tren kehilangan tenaga." },
  ],
  "cara-membaca-bollinger-bands-saham": [
    { q: "Bollinger Bands terdiri dari…", options: ["Middle band MA + upper/lower band std dev", "2 garis dividen", "Chart lilin", "Grafik volume"], answer: 0, why: "Middle = MA20, upper/lower = ±2 standar deviasi — sabuk yang melebar-mengecil." },
    { q: "Bands menyempit (squeeze) berarti…", options: ["Volatilitas rendah, sering sebelum gerakan besar", "Pasti turun", "Pasar libur", "Wajib jual semua"], answer: 0, why: "Squeeze = energi terkompresi; breakout arah berikutnya sering kuat." },
    { q: "Harga nempel upper band di tren kuat = …", options: ["Otomatis jual", "Bisa terus naik — band mengikuti harga", "Bug", "Suspend"], answer: 1, why: "Di tren kuat harga bisa 'jalan di atas band' — jangan jual hanya karena menyentuh upper." },
  ],
  "divergensi-rsi-macd-arti-cara-membaca-dan-strategi": [
    { q: "Bearish divergence terjadi saat…", options: ["Harga higher-high, indikator lower-high", "Semua naik", "Volume nol", "RSI 50"], answer: 0, why: "Harga bikin puncak baru tapi momentum tidak mengikuti = tenaga naik melemah." },
    { q: "Divergence adalah sinyal…", options: ["Peringatan dini (bukan entry instan)", "Beli sekarang", "Jual semua", "Tidak berguna"], answer: 0, why: "Divergence = warning; entry terbaik menunggu konfirmasi (break support/pola bearish)." },
    { q: "Divergence paling reliable di kondisi…", options: ["Trending kuat", "Ranging/ sideways setelah gerakan panjang", "Pasar tutup", "IPO baru"], answer: 1, why: "Setelah tren panjang & mulai ranging, divergence sering jadi pembalikan nyata." },
  ],
  "pola-candlestick-saham-hammer-engulfing-doji": [
    { q: "Hammer (palu) muncul di ujung downtrend biasanya = …", options: ["Potensi pembalikan naik", "Potensi jatuh", "Tidak bermakna", "Dividen"], answer: 0, why: "Ekor bawah panjang = penjual dicoba tekan tapi beli merebut kembali." },
    { q: "Bullish engulfing adalah…", options: ["Candle hijau menelan badan merah sebelumnya", "2 doji", "Candle tanpa sumbu", "Volume nol"], answer: 0, why: "Badan hijau lebih besar menelan candle merah = beli menguasai sepenuhnya." },
    { q: "Doji menandakan…", options: ["Ketidakpastian (imbang beli-jual)", "Pasti naik", "Pasti turun", "Market tutup"], answer: 0, why: "Open ≈ close: tidak ada pemenang — tunggu candle konfirmasi berikutnya." },
  ],
  "strategi-pullback-sma20-untuk-pemula": [
    { q: "Pullback trading = masuk saat…", options: ["Harga beristirahat ke MA di tengah tren naik", "Harga sudah turun 50%", "IPO", "Suspend"], answer: 0, why: "Tunggu retracement ke MA20 di tren sehat — entry lebih baik risikonya daripada kejar harga." },
    { q: "Stop-loss pullback SMA20 umumnya dipasang…", options: ["Di bawah MA20/titik invalidasi", "Jauh di atas", "Tidak perlu", "Di harga IPO"], answer: 0, why: "Kalau harga tutup jauh di bawah MA20, setup pullback batal = titik cut." },
    { q: "Tren 'sehat' untuk pullback biasanya…", options: ["MA20 menanjak + volume sehat", "MA20 turun", "Harga diam 1 bulan", "RSI 100"], answer: 0, why: "Pullback di tren menanjak berkesinambungan = ikut arah, bukan melawan." },
  ],
};
