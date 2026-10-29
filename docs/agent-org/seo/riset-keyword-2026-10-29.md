### 1. Keyword Landscape Halaman Saham Indonesia (Intent & Tipe SERP)

* **Head / Navigational-Informational (`harga saham [X]`, `saham [X] hari ini`, `[nama PT] saham`)**
  * **Intent**: Cek harga live/penutupan cepat, perubahan %, volume, & berita singkat.
  * **Tipe SERP**: *Google Finance OneBox* mendominasi paruh atas layar (Zero-Click tinggi ~60%+), diikuti Top Stories berita (Kontan/IDXChannel) & halaman simbol sekuritas/portal data.
* **Charting & Tools (`chart saham [X]`, `grafik saham [X]`, `[X] tradingview`)**
  * **Intent**: Melihat candlestick interaktif & pasang indikator (MA, RSI, MACD).
  * **Tipe SERP**: Didominasi aplikasi/widget chart (`id.tradingview.com`, `id.investing.com`, `stockbit.com`). Sangat sulit ditembus untuk emiten LQ45 tanpa brand query.
* **Tactical / Actionable Technical (`analisa teknikal saham [X]`, `support resistance [X] hari ini`, `target harga [X]`, `sinyal saham [X]`)**
  * **Intent**: Trader ritel mencari angka konkret (Entry, TP, Cut Loss, S1-S3/R1-R3, RSI oversold/golden cross) sebelum buka posisi.
  * **Tipe SERP**: Campuran tabel otomatis Investing/TradingView + artikel harian sekuritas (Ajaib, Kompas Money, Kontan). **Zero-Click rendah** — user butuh baca level harga & konfirmasi indikator.
* **Diagnostic / Event-Driven (`kenapa saham [X] naik/turun hari ini`, `saham [X] ARA/ARB`)**
  * **Intent**: Validasi anomali harga/volume mendadak saat jam bursa atau EOD.
  * **Tipe SERP**: Artikel berita dadakan; untuk mid/small-cap (di luar 100 saham teratas) SERP sering kosong atau hanya menampilkan halaman profil statis.
* **Discovery / Screener (`saham apa yang bagus hari ini`, `rekomendasi saham hari ini`, `saham oversold/golden cross hari ini`)**
  * **Intent**: Cari ide trading harian siap beli.
  * **Tipe SERP**: Artikel listicle harian media finansial & halaman screener (`carisaham.com`, `id.investing.com`).

---

### 2. Peta Kompetitor SERP Indonesia (Pola Title, Kekuatan, Celah)

* **Google Finance** (`https://www.google.com/finance/quote/BBCA:IDX`)
  * **Kekuatan**: Posisi #0 (Rich Box interaktif) untuk semua query `harga saham [X]`.
  * **Celah**: Nol analisa teknikal (tidak ada RSI, MACD, Pivot Support/Resistance, atau kesimpulan sinyal).
* **Investing.com Indonesia** (`https://id.investing.com/equities/bank-central-asia` & `...-technical`)
  * **Pola Title**: `Harga Saham [Nama] ([TICKER]) Hari Ini - Investing.com` | Sub-tab: `Analisis Teknikal [TICKER]`.
  * **Kekuatan**: Tabel indikator & Pivot Point otomatis terindeks kuat untuk head-term.
  * **Celah**: URL memakai slug nama perusahaan (bukan ticker murni di semua emiten), tidak kenal semua 950+ ticker baru/papan akselerasi, UI berat iklan, & terjemahan mesin kaku tanpa narasi konteks lokal.
* **TradingView Indonesia** (`https://id.tradingview.com/symbols/IDX-BBCA/` & `/technicals/`)
  * **Pola Title**: `Harga Saham & Grafik [TICKER] — IDX:[TICKER] — TradingView`.
  * **Kekuatan**: Raja keyword `chart/grafik [X]` + *Technical Ratings* gauge.
  * **Celah**: Ringkasan indikator dikunci dalam JS widget tanpa teks narasi HTML (thin text untuk long-tail `support resistance [X]` atau `kenapa [X] naik`).
* **Stockbit** (`https://stockbit.com/symbol/BBCA`) & **Ajaib** (`https://ajaib.co.id/saham/bbca`)
  * **Pola Title**: `Harga Saham [TICKER] Hari Ini - Grafik dan Analisis [Nama] | Stockbit` & `Harga Saham [TICKER] ([Nama]) Hari Ini | Ajaib`.
  * **Kekuatan**: DR tinggi, halaman profil emiten & riset harian tim analis (`https://ajaib.co.id/berita-saham/`).
  * **Celah**: Fitur bandarmology/chart Stockbit tertutup login wall (CSR); artikel teknikal Ajaib ditulis manual sehingga hanya mencakup ~5–10 saham likuid per hari, menyisakan 800+ emiten tanpa ulasan teknikal harian.
* **IDNFinancials** (`https://www.idnfinancials.com/id/bbca/pt-bank-central-asia-tbk`) & **SahamOK** (`https://www.sahamok.net/`)
  * **Pola Title**: `[TICKER] - [Nama Lengkap PT] | IDNFinancials`.
  * **Kekuatan**: Menang query nama lengkap PT (`PT ... Tbk saham`), kepemilikan, & direktori sektor klasik.
  * **Celah**: Statis & murni fundamental/profil; absen total di sinyal teknikal harian & level harga real-time.
* **Media Berita: Kontan** (`https://investasi.kontan.co.id/`) & **IDXChannel** (`https://www.idxchannel.com/market-news`)
  * **Pola Title**: `Rekomendasi Teknikal Saham [X], [Y], [Z] Hari Ini ([Tanggal])`.
  * **Kekuatan**: Menang Google Discover & Top Stories untuk *rekomendasi saham hari ini* dan *kenapa saham X naik*.
  * **Celah**: URL berita cepat kedaluwarsa (1–2 hari basi), tidak punya halaman evergreen per-ticker yang meng-update angka support/resistance otomatis setiap hari.
* **CariSaham** (`https://carisaham.com/`)
  * **Kekuatan**: Menang long-tail screener (`saham macd golden cross`, valuasi PBV).
  * **Celah**: UI tabel mentah tanpa analisis naratif per emiten dan tanpa halaman diagnostik pergerakan harian.

---

### 3. Strategi Celah `teknikal.id` (Realistic Quick-Wins)

* **Jangan tabrak head-term LQ45 (`harga saham BBCA`) di awal** — SERP sudah dikunci Google Finance + Stockbit/Investing/Ajaib.
* **Segmen Emiten Target #1 (Mid-Cap, Second Liner & Ramai Ritel: Rank #50–#600 Volume)**
  * Emiten yang ramai ditradingkan ritel/komunitas tapi jarang dibuatkan artikel harian oleh media/sekuritas: contoh seperti `CPRO`, `MAPB`, `SOSS`, `DVLA`, `ELTY` (terbukti di [sitemap.ts](file:///Users/nicholasandriansurjadi/Documents/teknikalidnew/src/app/sitemap.ts#L61-L67)), lapis dua komoditas/energi (`DEWA`, `ENRG`, `DOID`, `PSAB`, `TINS`), properti/konstruksi, dan konglomerasi mid-cap.
* **Segmen Keyword Target #1 (High-Intent Technical + Angka di HTML/Meta)**
  * **Support/Resistance & Trading Plan (`support resistance [TICKER]`, `analisa teknikal [TICKER] hari ini`)**: Ekspos angka Pivot S1/R1, RSI14, status MA, dan Skor Sinyal langsung di SSR HTML & meta description di [`stocks/[ticker]/page.tsx`](file:///Users/nicholasandriansurjadi/Documents/teknikalidnew/src/app/(public)/stocks/[ticker]/page.tsx#L108-L116) — mengalahkan halaman CSR kompetitor.
  * **Diagnostic Movement (`kenapa saham [TICKER] naik/turun hari ini`)**: Jalur [`kenapa-naik-hari-ini/page.tsx`](file:///Users/nicholasandriansurjadi/Documents/teknikalidnew/src/app/(public)/saham/[ticker]/kenapa-naik-hari-ini/page.tsx#L106-L120) menangkap trafik saat ticker second-liner tiba-tiba spike volume/harga tetapi wartawan Kontan/IDXChannel belum menulis beritanya.
  * **Kombinasi Nama PT + Ticker (`saham [Nama Pendek PT]`, `[TICKER] teknikal`)**: Menangkap pencarian investor yang mengetik nama perusahaan (seperti query GSC `"darya varia"` → `DVLA`).
  * **Programmatic Screener Hubs (`/saham-oversold`, `/saham-golden-cross`, `/saham-volume-spike`)**: Halaman kategori yang otomatis ter-update harian untuk menangkap intent *saham apa yang bagus/potensi rebound hari ini*.

---

### 4. 10 Contoh Title + H1 Programmatic Terbaik (Halaman Saham)

*(Variabel: `{TICKER}`, `{ShortName}`, `{Price}`, `{Chg%}`, `{Signal}` [Bullish/Bearish/Netral], `{Score}`, `{RSI}`, `{S1}`, `{R1}`, `{Sector}`)*

1. **Template Utama (`/stocks/[ticker]` — Balanced Harga + Teknikal)**
   * **Title**: `Harga Saham {TICKER} ({ShortName}) Hari Ini & Analisa Teknikal`
   * **H1**: `Harga Saham {TICKER} ({ShortName}) Hari Ini — Grafik & Sinyal Teknikal`
2. **Template Actionable Level (Fokus Trader Swing/Day Trade)**
   * **Title**: `Analisa Teknikal {TICKER} Hari Ini: Support {S1}, Resistance {R1} & Sinyal`
   * **H1**: `Analisa Teknikal Saham {ShortName} ({TICKER}): Area Support, Resistance & Indikator`
3. **Template Skor Sinyal Unik (CTR Booster di SERP)**
   * **Title**: `Saham {TICKER} ({ShortName}) Hari Ini: Harga, Grafik & Skor Sinyal {Score}/100`
   * **H1**: `Saham {ShortName} ({TICKER}) — Harga Real-Time & Skor Kesehatan Teknikal`
4. **Template Emiten Pencarian Nama Perusahaan (GSC Name-First Query)**
   * **Title**: `{ShortName} ({TICKER}) Harga Saham Hari Ini, Grafik & Indikator Teknikal`
   * **H1**: `{ShortName} ({TICKER}) — Pergerakan Harga Saham & Ringkasan Teknikal`
5. **Template Sub-Halaman Indikator (`/stocks/[ticker]/indikator`)**
   * **Title**: `Indikator Teknikal Saham {TICKER} Hari Ini: RSI ({RSI}), MACD & Moving Average`
   * **H1**: `Tabel Indikator Teknikal {ShortName} ({TICKER}) — RSI, MACD, SMA/EMA & Pivot`
6. **Template Diagnostik Saat Naik (`/saham/[ticker]/kenapa-naik-hari-ini` — Bullish)**
   * **Title**: `Kenapa Saham {TICKER} ({ShortName}) Naik {Chg%} Hari Ini? Analisis Teknikal`
   * **H1**: `Penyebab Saham {ShortName} ({TICKER}) Naik Hari Ini: Volume, Momentum & Tren`
7. **Template Diagnostik Saat Turun (`/saham/[ticker]/kenapa-naik-hari-ini` — Bearish)**
   * **Title**: `Kenapa Saham {TICKER} Turun Hari Ini? Cek Support Kuat {ShortName} di {S1}`
   * **H1**: `Analisis Penurunan Saham {ShortName} ({TICKER}) Hari Ini & Batas Support Kritis`
8. **Template Diagnostik Saat Sideways/Datar**
   * **Title**: `Prospek Teknikal Saham {TICKER} ({ShortName}) Hari Ini: Konsolidasi & Batas Breakout`
   * **H1**: `Analisis Pergerakan Saham {ShortName} ({TICKER}) Sektor {Sector} Hari Ini`
9. **Template Momentum Khusus (Saat RSI < 30 / Golden Cross Terdeteksi)**
   * **Title**: `Sinyal Saham {TICKER} ({ShortName}) Hari Ini: Status {Signal} (RSI {RSI})`
   * **H1**: `Sinyal Trading & Grafik Saham {ShortName} ({TICKER}) Hari Ini`
10. **Template Perbandingan Sektor / Peer Context**
    * **Title**: `Harga & Grafik Saham {TICKER} ({ShortName}) — Emiten {Sector} BEI`
    * **H1**: `Profil & Analisis Teknikal Saham {ShortName} ({TICKER}) — Sektor {Sector}`

---

### 5. 5 Contoh Title + H1 Programmatic Terbaik (Halaman Sektor & Pasar)

1. **Halaman Sektor (`/sektor/[slug]`)**
   * **Title**: `Daftar Saham Sektor {Sector} BEI Hari Ini: Harga, Top Gainer & Sinyal Teknikal`
   * **H1**: `Saham Sektor {Sector} di BEI — Performa Harian, Breadth ({BullCount} Bullish) & Sinyal`
2. **Screener Sinyal Rebound (`/saham-oversold`)**
   * **Title**: `Daftar Saham Oversold (RSI < 30) Hari Ini di BEI — Potensi Technical Rebound`
   * **H1**: `Screener Saham Oversold BEI Hari Ini ({Count} Emiten Jenuh Jual Non-Gorengan)`
3. **Screener Momentum Breakout (`/saham-golden-cross`)**
   * **Title**: `Saham Golden Cross Hari Ini di BEI — Sinyal Bullish SMA & EMA Terbaru`
   * **H1**: `Daftar Saham Golden Cross BEI Hari Ini: Konfirmasi Tren Naik & Volume`
4. **Halaman Indeks Bursa (`/indeks/[slug]`, misal LQ45 / IDX30 / IDXHIDIV20)**
   * **Title**: `Daftar Saham {IndexName} Terbaru Hari Ini: Harga, Bobot & Sinyal Teknikal`
   * **H1**: `Anggota Indeks {IndexName} BEI — Peta Sinyal Teknikal & Pergerakan Harga Hari Ini`
5. **Halaman Ringkasan Pasar Terindeks (`/harga-saham-hari-ini` / `/laporan-pasar`)**
   * **Title**: `Harga Saham IDX Hari Ini: Top Gainers, Volume Spike & Radar Sinyal Teknikal`
   * **H1**: `Ringkasan Pasar Saham BEI Hari Ini — Pergerakan IHSG, Sektor & Sinyal Emiten`
REAL_EXIT=0
