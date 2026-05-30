import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const articles = [
  {
    slug: "cara-beli-saham-saat-turun",
    title: "Strategi Buy on Weakness Saham BEI: Beli di Koreksi, Bukan Menangkap Pisau Jatuh",
    excerpt:
      "Panduan lengkap strategi Buy on Weakness untuk saham BEI. Pelajari cara membedakan koreksi sehat dan falling knife, konfirmasi teknikal dengan Pivot Point, dan hitung risk-reward ratio.",
    tags: ["strategi trading", "buy on weakness", "manajemen risiko", "stop loss"],
    content: `## Apa Itu Buy on Weakness (BOW)?

**Buy on weakness** adalah strategi membeli saham ketika harganya sedang mengalami penurunan sementara — yang disebut **koreksi** — di dalam tren naik yang lebih besar. Prinsipnya sederhana: Anda membeli saham berkualitas saat sedang **diskon**.

Bukan berarti beli sembarang saham yang turun. BOW mengharuskan Anda memilih saham dengan fundamental kuat yang sedang mengalami koreksi teknis, bukan saham yang sedang runtuh karena masalah mendasar.

\`\`\`
   Harga ┤     ╱╲        ╱ ← Koreksi sehat = PELUANG BOW
         │    ╱  ╲      ╱      Harga memantul dari support
         │   ╱    ╲  ╱╱       dan melanjutkan uptrend
         │  ╱      ╲╱
         │ ╱  UPTREND BESAR
   SMA ──┤╱ ← SMA 200 menahan koreksi
   200   │
         ├────────────────────────────────────────
         │╲
         │ ╲        ← DOWNTREND = BAHAYA!
         │  ╲          Jangan beli, ini pisau jatuh
         │   ╲
\`\`\`

Warren Buffett merangkumnya dengan sempurna: *"Be fearful when others are greedy, and greedy when others are fearful."* Buy on weakness adalah implementasi praktis dari prinsip tersebut — dengan disiplin teknikal yang ketat.

### BOW vs Averaging Down vs Falling Knife

Banyak pemula mencampuradukkan tiga konsep ini. Padahal perbedaannya sangat penting:

| Konsep | Definisi | Risiko |
|--------|----------|--------|
| **Buy on Weakness** | Beli di koreksi dalam uptrend, dengan konfirmasi teknikal | Terukur (punya stop loss) |
| **Averaging down buta** | Terus beli karena "pasti naik lagi" | Tinggi — tanpa batas kerugian |
| **Catching a falling knife** | Beli saham yang sedang anjlok tanpa tanda pembalikan | Sangat tinggi — bisa rugi 50%+ |

Filosofi BOW: **Anda membeli diskon dengan rencana**. Anda tahu di mana masuk, di mana keluar kalau salah, dan berapa potensi untung kalau benar.

---

## Kesalahan Fatal: Menangkap Pisau Jatuh (Falling Knife)

Inilah musuh terbesar strategi BOW: **falling knife** — saham yang terus merosot tanpa henti. Menangkapnya bukan investasi, itu judi.

### Apa Itu Falling Knife?

Falling knife adalah saham yang mengalami **downtrend berkelanjutan** dengan volume penjualan yang tinggi dan tidak ada tanda-tanda pembalikan. Setiap kali Anda berpikir "sudah pasti yang paling bawah," harga turun lagi.

\`\`\`
   Rp10.000 ┤╲ ← "Pasti sudah di bawah, beli!"
   Rp 9.000 ┤  ╲ ← "Wah turun lagi, average down aja"
   Rp 8.000 ┤    ╲ ← "Kok masih turun??"
   Rp 7.000 ┤      ╲ ← Portofolio sudah -30%
   Rp 6.000 ┤        ╲ ← "Nggak kuat lagi..."
   Rp 5.000 ┤          ╲ ← Cut loss terpaksa: -50%
             └────────────────────────────────
              Minggu 1    3    5    7    9
\`\`\`

:::warning[Peringatan]
Dalam downtrend kuat, saham bisa turun **50-80%** dari puncaknya. Saham-saham IDX yang pernah menjadi falling knife termasuk yang memiliki masalah fundamental serius: rugi bersih, hutang meningkat, atau regulasi yang merugikan.
:::

### Cara Membedakan Koreksi Sehat vs Falling Knife

Gunakan tabel ini sebagai checklist sebelum membeli saham yang turun:

| Indikator | Koreksi Sehat ✅ | Falling Knife ❌ |
|-----------|:---:|:---:|
| Tren utama | Uptrend (higher highs, higher lows) | Downtrend (lower highs, lower lows) |
| Posisi vs SMA 200 | Di atas SMA 200 | Jauh di bawah SMA 200 |
| Volume saat turun | Menurun (penjual habis) | Meningkat (panic selling) |
| RSI(14) | 30-40, lalu memantul | Di bawah 30 terus-menerus |
| Support | Bertahan, harga memantul | Ditembus berulang kali |
| Candlestick | Hammer, doji, bullish engulfing | Bearish marubozu terus-menerus |
| Fundamental | Tidak berubah | Memburuk (rugi, hutang naik) |

**Aturan emas:** Kalau harga sudah **di bawah SMA 200** dan terus membuat low baru dengan volume tinggi — itu bukan koreksi. Itu falling knife. **Jauhi.**

:::tip[Tip Praktis]
Sebelum membeli saham yang turun, cek tiga hal dalam 30 detik: (1) Apakah harga masih di atas SMA 200? (2) Apakah volume menurun saat harga turun? (3) Apakah fundamental perusahaan tidak berubah? Kalau ketiganya "ya," lanjut analisis. Kalau ada yang "tidak," waspada.
:::

---

## Indikator Teknikal untuk Konfirmasi Buy on Weakness

Jangan pernah masuk posisi hanya karena "sudah turun jauh." Gunakan konfirmasi teknikal. Berikut tiga tools yang paling efektif untuk strategi BOW di pasar Indonesia:

### 1. Pivot Point S1 dan S2 sebagai Area Beli

Pivot point menghitung level support dan resistance secara **objektif** menggunakan formula matematika dari data harga hari sebelumnya.

> **PP = (High + Low + Close) / 3**
>
> **S1 = (2 × PP) - High**
>
> **S2 = PP - (High - Low)**

\`\`\`
   ▲ RESISTANCE ZONE
   R2 ───────── Rp10.000 ─── Target jual maksimal
   R1 ───────── Rp 9.800 ─── Target jual pertama
   ═══════════════════════════════════════════
   PP ───────── Rp 9.650 ─── Garis sentimen
   ═══════════════════════════════════════════
   S1 ───────── Rp 9.500 ─── ✅ Area beli pertama (BOW entry)
   S2 ───────── Rp 9.200 ─── ✅ Area beli kedua (deeper BOW)
                                = Letak stop loss di bawah ini
   ▼ SUPPORT ZONE
\`\`\`

**Cara menggunakannya untuk BOW:**
- **S1** = Zona entry pertama. Kalau harga koreksi ke S1 dan menunjukkan candle reversal, itu peluang BOW dengan risk-reward yang baik.
- **S2** = Zona entry yang lebih dalam. Kalau S1 tembus, tunggu harga di S2. Risk lebih besar, tapi reward juga lebih besar.
- **Stop loss** ditempatkan **1-2% di bawah S2** — kalau sampai tembus S2, kemungkinan bukan koreksi lagi.

### 2. Trendline sebagai Konfirmasi Arah Tren

Trendline adalah garis diagonal yang menghubungkan titik-titik low (uptrend) atau high (downtrend). Ini membantu Anda melihat apakah tren naik masih utuh.

\`\`\`
   Harga ┤          ╱ ← Higher High
         │        ╱
         │      ╱    ╱ ← Higher High
         │    ╱    ╱
         │  ╱    ╱  ╱ ← Koreksi menyentuh trendline
         │╱    ╱  ╱      = PELUANG BOW! ✅
         │   ╱  ╱
         │ ╱  ╱  ← Higher Low (trendline bertahan)
         │╱  /
         └────────────────────────────────
           Low 1   Low 2   Low 3
\`\`\`

**Aturan BOW dengan trendline:**
1. Gambar trendline yang menghubungkan minimal 2 titik low
2. Kalau koreksi menyentuh trendline dan memantul → **sinyal BOW kuat**
3. Kalau trendline tembus dan harga membuat lower low → **bukan BOW, ini falling knife**

### 3. Volume sebagai Validasi

Volume adalah "pelaporan kejujuran" pasar. Harga bisa ditipu, volume tidak.

| Skenario Volume | Artinya | Tindakan BOW |
|-----------------|---------|--------------|
| Harga turun + volume turun | Penjual mulai habis | ✅ Validasi BOW |
| Harga turun + volume naik | Tekanan jual kuat | ❌ Hindari, bisa falling knife |
| Harga turun + volume rendah + candle hammer | Akumulasi diam-diam | ✅ Sinyal BOW terkuat |

### Kombinasi Sinyal: Setup BOW Ideal

Setup BOW paling kuat terjadi ketika **semua konfirmasi muncul bersamaan:**

\`\`\`
   ┌────────────┐   ┌────────────┐   ┌────────────┐
   │ Harga di   │   │ Trendline  │   │ Volume     │
   │ S1 atau S2 │ + │ bertahan   │ + │ menurun    │
   │ (Pivot Pt) │   │ (Uptrend)  │   │ (Seller    │
   └─────┬──────┘   └─────┬──────┘   │  habis)    │
         │                │          └──────┬─────┘
         └────────────────┼─────────────────┘
                          ↓
                ┌─────────────────────┐
                │  SETUP BOW IDEAL    │
                │  Entry di support   │
                │  SL di bawah S2     │
                │  Target di R1/R2    │
                └─────────────────────┘
\`\`\`

---

## Cara Mengelola Risiko: Risk-Reward Ratio

Ini adalah bagian yang membedakan trader profesional dari penjudi. **Tanpa manajemen risiko, BOW hanya spekulasi.**

### Apa Itu Risk-Reward Ratio (RRR)?

RRR membandingkan berapa banyak yang bisa Anda rugikan (risk) versus berapa banyak yang bisa Anda untungkan (reward) dalam satu trade.

> **RRR = (Target - Entry) / (Entry - Stop Loss)**

Standar minimum untuk strategi BOW adalah **RRR 1:1.5**. Artinya, setiap Rp1 yang Anda risikokan harus berpotensi menghasilkan minimal Rp1.5 keuntungan.

### Mengapa 1:1.5 Bukan 1:1?

Dengan RRR 1:1, Anda harus benar **lebih dari 50% waktu** untuk profit. Tapi dengan RRR 1:1.5, Anda bisa salah lebih sering dan tetap profitable:

| RRR | Win Rate Minimum | Artinya |
|-----|:---:|:---:|
| 1:1 | 50%+ | Harus benar setengah dari total trade |
| 1:1.5 | 40%+ | Boleh salah 6 dari 10 trade, tetap profit |
| 1:2 | 34%+ | Boleh salah 7 dari 10 trade, tetap profit |

Dengan RRR 1:1.5, Anda punya **margin of error** yang lebih besar. Di pasar yang volatile seperti BEI, ini sangat penting.

### Contoh Perhitungan: TLKM Buy on Weakness

**Skenario:** TLKM koreksi dari Rp3.600 ke Rp3.200. Fundamental kuat, tren masih uptrend.

| Langkah | Detail |
|---------|--------|
| Pivot Point S1 | Rp3.250 (dihitung dari High/Low/Close kemarin) |
| Pivot Point S2 | Rp3.050 |
| Entry Zone | Rp3.200 - Rp3.250 (di area S1) |
| Stop Loss | Rp3.050 (di S2) — kalau tembus, bukan koreksi lagi |
| Target | Rp3.600 (resistance terdekat) |
| Risk per lembar | Rp3.200 - Rp3.050 = **Rp150** |
| Reward per lembar | Rp3.600 - Rp3.200 = **Rp400** |
| **RRR** | Rp400 / Rp150 = **1 : 2.67** ✅ |

\`\`\`
   Harga
   ┌─────────────────────────────────────────────────────┐
   │  Rp3.600 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ TARGET ←── Rp400    │
   │                                          reward     │
   │  Rp3.200 ═════════════════════ ENTRY  ══════════    │
   │          │                                         │
   │          │ Rp150 risk                              │
   │  Rp3.050 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ STOP LOSS (S2)     │
   │                                                     │
   │  Risk : Reward = Rp150 : Rp400 = 1 : 2.67 ✅      │
   └─────────────────────────────────────────────────────┘
\`\`\`

### Position Sizing: Jangan Risiko Lebih dari 2%

Aturan terakhir: **jangan pernah merisikokan lebih dari 2% total portofolio** dalam satu trade.

> **Jumlah Lot = (2% × Total Portofolio) / (Risk per Lot) / 100**

Contoh dengan portofolio Rp100 juta:
- Maksimal risiko: Rp2.000.000
- Risk per lot (100 lembar × Rp150): Rp15.000
- Jumlah lot: Rp2.000.000 / Rp15.000 ≈ **133 lot**

:::tip[Rumus Praktis]
Kalau perhitungan di atas terasa ribet, ada cara lebih mudah: gunakan **Kalkulator Trading Plan** di TeknikalID. Masukkan harga saham, dan otomatis dapatkan entry, stop loss, target, dan jumlah lot — sudah disesuaikan dengan fraksi harga BEI.
:::

---

## Stop Memori Manual: Otomatisasi dengan TeknikalID

Menghitung pivot point, menentukan support-resistance, lalu mengkonversi ke fraksi harga BEI — semua itu memakan waktu dan rawan error. Satu salah hitung di fraksi harga, dan order Anda bisa ditolak oleh sistem bursa.

**TeknikalID** menyelesaikan masalah ini dengan **Kalkulator Trading Plan** yang terintegrasi di setiap halaman saham.

### Apa yang Dilakukan Kalkulator Trading Plan?

1. **Menghitung Pivot Point otomatis** — PP, S1, S2, R1, R2 dari data harga real-time
2. **Menentukan Entry Price** — berdasarkan level support yang valid
3. **Menghitung Stop Loss** — otomatis disesuaikan dengan fraksi harga BEI
4. **Menampilkan Target Harga** — berdasarkan resistance dengan RRR minimum 1:1.5
5. **Menghitung Position Sizing** — sesuai dengan besaran portofolio Anda

### Contoh: Kalkulator Trading Plan untuk BBCA

Anda tinggal buka halaman saham BBCA, klik **"Trading Plan"**, dan langsung mendapat:

| Parameter | Hasil Otomatis |
|-----------|---------------|
| Pivot Point | Rp9.650 |
| S1 (Entry Area) | Rp9.500 |
| S2 (Stop Loss) | Rp9.350 |
| R1 (Target 1) | Rp9.800 |
| R2 (Target 2) | Rp9.950 |
| RRR Target 1 | 1 : 1.67 ✅ |
| RRR Target 2 | 1 : 2.67 ✅ |

Semua harga sudah **dibulatkan ke fraksi harga BEI** — tidak ada lagi order ditolak karena harga tidak sesuai tick size.

:::cta[Coba Kalkulator Trading Plan Gratis]
Hitung entry, stop loss, target, dan position sizing secara otomatis untuk saham IDX40. Tidak perlu registrasi, tidak perlu download.

[Buka Kalkulator Trading Plan →](/stocks/BBCA)
:::

---

## Checklist Buy on Weakness

Sebelum Anda membeli saham yang sedang turun, pastikan semua item ini tercentang:

:::checklist
- **Tren utama masih uptrend** — harga berada di atas SMA 200
- **Koreksi bersifat sementara** — tidak ada perubahan fundamental perusahaan
- **Harga di area Pivot Point S1 atau S2** — level support terukur
- **Trendline uptrend bertahan** — koreksi menyentuh trendline dan memantul
- **Volume menurun saat harga turun** — penjual mulai kehabisan amunisi
- **Sudah menentukan entry, stop loss, dan target** — punya trading plan tertulis
- **Risk-reward ratio minimal 1:1.5** — potensi untung sebanding dengan risiko
- **Position sizing sudah dihitung** — risiko maksimal 2% portofolio
:::

Buy on weakness bukan tentang menebak dasar (bottom). Ini tentang **membeli dengan rencana yang matang** di area yang probabilistically menjadi dasar. Bedanya dengan gambling? Anda punya stop loss, target, dan perhitungan risiko yang jelas.

Mulailah dengan [membuka halaman saham](/stocks) yang Anda minati, cek pivot point dan indikator teknikalnya, lalu buat trading plan sebelum market buka. Disiplin eksekusi, dan biarkan probabilitas yang bekerja untuk Anda.

:::warning[Disclaimer]
Seluruh konten dalam artikel ini bersifat edukasi dan bukan merupakan rekomendasi investasi. Keputusan investasi sepenuhnya menjadi tanggung jawab Anda. Selalu pertimbangkan toleransi risiko dan lakukan riset mandiri sebelum berinvestasi.
:::
`,
  },  {
    slug: "indikator-rsi-stochastic-cari-saham-murah",
    title: "Membaca Indikator RSI & Stochastic: Rahasia Mencari Saham Murah",
    excerpt:
      "Pelajari cara membaca RSI dan Stochastic untuk menemukan saham BEI yang oversold. Panduan lengkap dengan contoh nyata dan strategi bottom fishing.",
    tags: [
      "indikator teknikal",
      "RSI",
      "stochastic",
      "oversold",
      "bottom fishing",
    ],
    content: `## Saham "Murah" — Apa Artinya Sebenarnya?

Ketika orang mendengar "saham murah," kebanyakan langsung berpikir tentang saham dengan harga per lembar yang rendah — Rp50, Rp100, atau Rp200. Tapi ini adalah pemahaman yang salah.

**Saham murah bukan yang harganya rendah, tapi yang harganya di bawah nilai wajar.**

Sebuah saham Rp10.000 bisa jadi "murah" kalau nilainya sebenarnya Rp13.000. Sebaliknya, saham Rp200 bisa jadi "mahal" kalau nilainya hanya Rp100.

Lalu bagaimana kita tahu kapan saham sedang murah secara teknikal? Di sinilah dua indikator paling populer masuk: **RSI (Relative Strength Index)** dan **Stochastic Oscillator**.

Kedua indikator ini membantu kita mengidentifikasi kondisi **oversold** — ketika saham sudah terlalu banyak dijual dan kemungkinan siap untuk rebound.

---

## Apa Itu RSI (Relative Strength Index)?

RSI adalah indikator momentum yang mengukur kecepatan dan perubahan pergerakan harga. Dikembangkan oleh J. Welles Wilder pada 1978, RSI menjadi salah satu indikator paling banyak digunakan di dunia.

### Formula RSI

RSI dihitung dengan formula berikut:

> **RSI = 100 - (100 / (1 + RS))**
>
> di mana **RS = Rata-rata Gain / Rata-rata Loss** selama periode tertentu (biasanya 14 hari)

Jangan khawatir tentang menghitung manual — semua platform charting menghitung ini secara otomatis. Yang penting adalah **cara membaca** hasilnya.

### Peta Zona RSI

\`\`\`
   RSI 100 ┤ ■ ■ ■ ■ ■ ■ ■  OVERBOUGHT (Jual/Waspada)
            │                   "Saham terlalu mahal secara
            │                    momentum — siap koreksi"
            │
   RSI  70 ┤ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  Garis Overbought
            │
            │                     ╱ ← Bullish Divergence!
            │                   ╱     (RSI naik, harga turun)
   RSI  50 ┤         NETRAL
            │       "Garis pertempuran"
            │       (di atas = buyer menang,
            │        di bawah = seller menang)
            │       ╲
   RSI  30 ┤ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  Garis Oversold
            │
            │   ╲
            │     ■ ■ ■ ■  OVERSOLD (Peluang Beli)
   RSI   0 ┤                "Saham terlalu murah secara
                             momentum — siap rebound"
\`\`\`

### Tabel Zona RSI

| Zona RSI | Interpretasi | Tindakan |
|----------|:---:|:---:|
| **Di atas 70** | Overbought (terlalu banyak dibeli) | Waspada, kemungkinan koreksi |
| **50 - 70** | Zona bullish | Tren naik, watch for entry |
| **30 - 50** | Zona bearish | Tren turun, tunggu |
| **Di bawah 30** | Oversold (terlalu banyak dijual) | Potensi pembalikan naik |

:::tip[Tip Penting]
RSI di bawah 30 BUKAN berarti "langsung beli." Oversold bisa tetap oversold untuk waktu yang lama dalam downtrend kuat. Selalu tunggu konfirmasi tambahan sebelum entry.
:::

### Parameter RSI

| Periode | Karakteristik | Cocok Untuk |
|---------|---------------|-------------|
| **7-9 hari** | Sangat sensitif, banyak sinyal (dan false signal) | Day trader berpengalaman |
| **14 hari** *(standar)* | Keseimbangan sensitivitas dan akurasi | Semua trader, terutama pemula |
| **21-25 hari** | Kurang sensitif, sinyal lebih akurat tapi lebih lambat | Swing trader |

Untuk pasar Indonesia yang cenderung volatile, RSI-14 adalah pilihan terbaik untuk pemula.

---

## Apa Itu Stochastic Oscillator?

Stochastic Oscillator dikembangkan oleh George Lane pada 1950-an. Indikator ini mengukur di mana harga penutupan saat ini berada relatif terhadap range harga dalam periode tertentu.

### Cara Kerja Stochastic

Intinya: Stochastic menjawab pertanyaan *"Apakah harga penutupan hari ini dekat dengan harga tertinggi atau terendah dalam periode tertentu?"*

\`\`\`
   Range 14 Hari
   ┌─────────────────────────────────────┐
   │                                     │
   │  High ─ ─ ─ ─ Rp10.000 ─ ─ ─ ─    │ ← %K = 90% (dekat High = OVERBOUGHT)
   │                    Rp9.750 ─ ─     │ ← %K = 75%
   │                    Rp9.500 ─ ─     │ ← %K = 50% (netral)
   │                    Rp9.250 ─ ─     │ ← %K = 25%
   │  Low  ─ ─ ─ ─ Rp9.000 ─ ─ ─ ─    │ ← %K = 10% (dekat Low = OVERSOLD)
   │                                     │
   └─────────────────────────────────────┘

   %K = (Close - Low14) / (High14 - Low14) × 100
\`\`\`

- Kalau harga penutupan dekat dengan **tertinggi** → pembeli dominan → overbought
- Kalau harga penutupan dekat dengan **terendah** → penjual dominan → oversold

### Tabel Sinyal Stochastic

| Zona Stochastic | Interpretasi | Tindakan |
|-----------------|:---:|:---:|
| **%K > 80** | Overbought | Waspada koreksi |
| **%K < 20** | Oversold | Potensi pembalikan |
| **%K memotong %D ke atas** | Sinyal beli | Konfirmasi bullish |
| **%K memotong %D ke bawah** | Sinyal jual | Konfirmasi bearish |

### Tipe Stochastic

| Tipe | Kecepatan | Karakteristik |
|------|-----------|---------------|
| **Fast Stochastic** | Sangat cepat | Banyak sinyal, banyak noise |
| **Slow Stochastic** | Lebih lambat | Sinyal lebih sedikit, lebih akurat |
| **Full Stochastic** | Dapat dikustomisasi | Fleksibel, untuk trader berpengalaman |

**Rekomendasi:** Untuk pemula, gunakan Slow Stochastic dengan parameter standar (14, 3, 3).

---

## Oversold ≠ Saham Murah: Konteks yang Harus Dipahami

Ini adalah kesalahan terbesar yang dilakukan pemula: melihat RSI di bawah 30 atau Stochastic di bawah 20, lalu langsung beli. **Oversold bukan berarti murah.**

Saham bisa oversold karena tiga alasan:

### 1. Koreksi Teknis Sehat ✅
Penurunan sementara dalam uptrend. Ini adalah peluang buy on weakness yang legitimate.

**Tanda-tanda:** Tren utama masih naik, volume menurun saat harga turun, fundamental tidak berubah.

### 2. Penurunan Fundamental ❌
Perusahaan memiliki masalah nyata — laba turun, hutang meningkat, regulasi baru yang merugikan.

**Tanda-tanda:** Laporan keuangan memburuk, berita negatif berulang, harga terus membuat low baru.

### 3. Panic Selling ⚠️
Penjualan massal yang tidak rasional, sering kali dipicu oleh berita yang menakutkan atau margin call.

**Tanda-tanda:** Volume sangat tinggi, penurunan tajam dalam waktu singkat, tidak ada perubahan fundamental.

\`\`\`
   Tipe Oversold          Koreksi Sehat    Penurunan Fundamental    Panic Selling
   ─────────────          ─────────────    ─────────────────────    ─────────────
   Tren utama             Uptrend ✅       Downtrend ❌             Bisa keduanya ⚠️
   Volume                 Menurun         Bisa naik/turun          SANGAT TINGGI
   Fundamental            Kuat            MEMBURUK                 Tidak berubah
   Peluang rebound        TINGGI          RENDAH                   SEDANG
   Tindakan               Beli di support HINDARI                  Tunggu stabil
\`\`\`

:::warning[Peringatan]
Dalam downtrend yang kuat, RSI bisa tetap di bawah 30 selama berminggu-minggu. Saham bisa turun 50% atau lebih dari level ketika RSI pertama kali menyentuh oversold. Jangan gunakan oversold saja sebagai alasan untuk membeli.
:::

---

## RSI Divergence: Sinyal Reversal Terkuat

Divergence adalah perbedaan arah antara pergerakan harga dan pergerakan indikator. Ini adalah salah satu sinyal reversal paling kuat yang bisa Anda temukan.

### Visualisasi Bullish Divergence

\`\`\`
   Harga    ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
             ╲
              ╲ ← Low 1: Rp5.200
               ╲
                ╲
                 ╲ ← Low 2: Rp5.000  (LOWER LOW — harga turun lagi)
                  ╲
   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─

   RSI      ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
   70 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
             ╲
              ╲ ← RSI = 25 (oversold)
               ╲
                ╱ ← RSI = 32 (HIGHER LOW — momentum membaik!)
               ╱        ↑
              ╱   BULLISH DIVERGENCE
             ╱    "Harga turun, tapi momentum
   30 ─ ─ ─ ─ ─ ─ penurunan melemah" ─ ─ ─ ─ ─ ─ ─ ─ ─
   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
\`\`\`

### Bullish Divergence

Terjadi ketika:
- **Harga** membuat low baru (lebih rendah dari low sebelumnya)
- **RSI** membuat low yang lebih tinggi (tidak sepenuhnya oversold)

Artinya: meskipun harga masih turun, momentum penurunan sudah melemah. Penjual mulai kehilangan kekuatan.

**Cara trading:**
1. **Identifikasi** bullish divergence pada chart harian
2. **Tunggu konfirmasi** — candle bullish kuat atau break above resistance kecil
3. **Entry** di konfirmasi dengan stop loss di bawah low terakhir
4. **Target** di resistance berikutnya

### Contoh Praktis

Bayangkan saham BMRI (Bank Mandiri):

**Skenario Bullish Divergence:**

| Titik | Harga | RSI |
|-------|-------|-----|
| Low 1 | Rp5.200 | 25 (oversold) |
| Low 2 | Rp5.000 | 32 (higher low!) |

Artinya: Harga turun lebih rendah, tapi RSI tidak seekor itu oversold → **momentum penurunan melemah** → Potensi rebound menuju Rp5.500-Rp5.800.

Ini adalah setup yang sangat kuat, terutama kalau didukung oleh:
- Volume yang menurun saat harga turun
- Harga di area support historis
- Fundamental BMRI tetap kuat

---

## Menggabungkan RSI + Stochastic untuk Sinyal Konfirmasi

Satu indikator saja tidak cukup. Kombinasi RSI dan Stochastic memberikan **konfirmasi ganda** yang jauh lebih andal.

### Setup Ideal: Kedua Indikator Oversold

\`\`\`
   ┌──────────────────┐     ┌──────────────────┐     ┌──────────────┐
   │   RSI(14) < 30   │ AND │ Stoch %K < 20    │ AND │  Volume ↓    │
   │  (Momentum       │     │  (Harga dekat    │     │ (Penjual     │
   │   oversold)       │     │   terendah)      │     │  mulai habis)│
   └────────┬─────────┘     └────────┬─────────┘     └──────┬───────┘
            │                        │                       │
            └────────────────────────┼───────────────────────┘
                                     ↓
                          ┌─────────────────────┐
                          │  SINYAL BELI KUAT   │
                          │  Tunggu %K cross %D │
                          │  sebagai trigger    │
                          └─────────────────────┘
\`\`\`

**Kondisi konfirmasi ganda:**
1. RSI(14) < 30 → momentum menunjukkan oversold
2. Stochastic %K < 20 → harga dekat terendah periode
3. %K memotong %D ke atas → sinyal pembalikan stochastic
4. Volume menurun → tekanan jual berkurang

### Contoh dengan Data

| Parameter | Nilai |
|-----------|-------|
| Saham | ASII (Astra International) |
| Harga saat ini | Rp5.100 |
| RSI(14) | 24 (oversold) |
| Stochastic %K | 15 (oversold) |
| Stochastic %D | 18 |
| Volume | 60% dari rata-rata 20 hari |
| Support terdekat | Rp4.900 |
| Resistance terdekat | Rp5.500 |

**Trading Plan:**
- Entry zone: Rp5.050-5.150 (tunggu %K cross %D)
- Stop loss: Rp4.850 (±3% di bawah support)
- Target 1: Rp5.400 (RRR 1:1.7)
- Target 2: Rp5.600 (RRR 1:2.7)

### Tabel Kekuatan Sinyal

| Kombinasi Sinyal | Kekuatan | Probabilitas Rebound |
|-------------------|----------|---------------------|
| RSI < 30 saja | Lemah ⚠️ | ~40% |
| Stoch %K < 20 saja | Lemah ⚠️ | ~40% |
| RSI < 30 + Stoch < 20 | Sedang 📊 | ~55% |
| Keduanya + %K cross %D | Kuat 📈 | ~65% |
| Keduanya + Bullish Divergence | Sangat Kuat 🚀 | ~75% |
| Semua di atas + Volume turun | Terkuat ✅ | ~80%+ |

---

## Strategi Bottom Fishing: Checklist Lengkap

Bottom fishing adalah strategi membeli saham di atau dekat titik terendah (bottom) setelah penurunan. Ini adalah bentuk agresif dari buy on weakness.

### 7 Langkah Bottom Fishing yang Disiplin

\`\`\`
   Step 1         Step 2         Step 3         Step 4
   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
   │Identify │──▶│Konfirm  │──▶│Cari     │──▶│Tentukan │
   │Kandidat │   │Tren     │   │Divergen │   │Support  │
   │(RSI<30) │   │(Uptrend)│   │(RSI ↑   │   │(Level   │
   │         │   │         │   │ harga ↓)│   │ kuat)   │
   └─────────┘   └─────────┘   └─────────┘   └─────────┘
                                                    │
   Step 7         Step 6         Step 5            │
   ┌─────────┐   ┌─────────┐   ┌─────────┐        │
   │Eksekusi │◀──│Hitung   │◀──│Tunggu   │◀───────┘
   │+ Disiplin│   │RRR ≥1:2 │   │Reversal │
   │Stop Loss│   │         │   │(Candle) │
   └─────────┘   └─────────┘   └─────────┘
\`\`\`

**Langkah 1: Identifikasi Kandidat**
Gunakan [Screener TeknikalID →](/screener) untuk mencari saham dengan RSI < 30 dan Stochastic < 20. Filter saham yang oversold dalam satu klik.

**Langkah 2: Konfirmasi Tren**
Pastikan saham sebelumnya dalam uptrend. Bottom fishing di saham downtrend sangat berbahaya. Cek apakah harga masih di atas SMA 200.

**Langkah 3: Cari Divergence**
Perhatikan apakah ada bullish divergence pada RSI. Ini meningkatkan probabilitas rebound.

**Langkah 4: Tentukan Support**
Identifikasi level support kuat — horizontal line, SMA, atau pivot point.

**Langkah 5: Tunggu Reversal Candle**
Jangan masuk sebelum ada candle reversal (hammer, bullish engulfing, morning star).

**Langkah 6: Hitung Risk-Reward**
Pastikan RRR minimal 1:2. Kalau tidak, lewati dan cari saham lain.

**Langkah 7: Eksekusi dengan Disiplin**
Masuk sesuai rencana, pasang stop loss, dan JANGAN memindahkan stop loss ke bawah.

:::cta[Coba Radar Pantulan TeknikalID]
Temukan saham IDX40 yang sedang oversold secara otomatis. Filter berdasarkan RSI, Stochastic, dan indikator teknikal lainnya dalam satu klik.

[Buka Screener Saham →](/screener)
:::

---

## Contoh Nyata: Bottom Fishing di IDX40

### Studi Kasus 1: UNVR (Unilever Indonesia)

**Konteks:** UNVR mengalami penurunan dari Rp4.800 ke Rp3.800 selama 2 bulan karena sentimen konsumsi yang lemah.

**Analisis Teknikal saat di Rp3.800:**

| Indikator | Nilai | Interpretasi |
|-----------|-------|--------------|
| RSI(14) | 22 | Deep oversold ✅ |
| Stochastic %K | 12 | Oversold ✅ |
| Stochastic %D | 15 | |
| Volume | Menurun | Penjual mulai habis ✅ |
| Divergence | Bullish | Momentum membaik ✅ |
| Support | Rp3.700 | Bertahan 2x sebelumnya ✅ |
| Candle | Hammer | Reversal signal ✅ |

**Hasil:** Saham rebound ke Rp4.400 dalam 3 minggu (profit +15.8%).

### Studi Kasus 2: BMRI (Bank Mandiri)

**Konteks:** BMRI turun dari Rp6.200 ke Rp5.400 karena koreksi sektor perbankan.

**Analisis Teknikal saat di Rp5.400:**

| Indikator | Nilai | Interpretasi |
|-----------|-------|--------------|
| RSI(14) | 28 | Oversold ✅ |
| Stochastic %K | 18, crossing %D ke atas | Sinyal beli aktif ✅ |
| SMA 200 | Rp5.100 | Harga masih di atas → uptrend utuh ✅ |
| Volume | Turun 40% | Penjual berkurang ✅ |
| Support | Rp5.300 | Bertahan ✅ |

**Hasil:** Rebound ke Rp5.900 dalam 2 minggu (profit +9.3%).

:::warning[Disclaimer]
Contoh di atas adalah studi kasus historis untuk tujuan edukasi. Performa masa lalu tidak menjamin hasil di masa depan. Selalu lakukan analisis mandiri sebelum mengambil keputusan investasi.
:::

---

## False Signals: Kapan RSI dan Stochastic Menyesatkan

Tidak ada indikator yang sempurna. Berikut situasi di mana RSI dan Stochastic bisa memberikan sinyal palsu:

### 1. Downtrend Kuat
Dalam downtrend yang sangat kuat, RSI bisa tetap di bawah 30 selama berminggu-minggu.

**Solusi:** Selalu konfirmasi dengan tren utama. Kalau harga jauh di bawah SMA 200, hindari bottom fishing.

### 2. Berita Fundamental Negatif
Kalau penurunan harga disebabkan oleh berita fundamental negatif, indikator teknikal bisa terus oversold.

**Solusi:** Selalu cek berita terkini sebelum entry berdasarkan sinyal teknikal.

### 3. Volume Rendah (Saham Tidak Likuid)
Pada saham dengan volume rendah, pergerakan harga bisa tidak teratur.

**Solusi:** Fokus pada saham liquid (blue chip, IDX40) di mana indikator teknikal lebih reliable.

### 4. Early Signal (Masih Bisa Turun Lebih Jauh)
RSI oversold bukan berarti harga tidak bisa turun lagi.

**Solusi:** Jangan entry hanya karena oversold. Tunggu konfirmasi (candle reversal, divergence, cross di stochastic).

### Tabel Anti-False Signal

| Red Flag | Artinya | Yang Harus Anda Lakukan |
|----------|---------|------------------------|
| Harga jauh di bawah SMA 200 | Downtrend kuat | **Jangan bottom fish** |
| Volume naik tajam saat turun | Panic selling | **Tunggu stabilisasi** |
| Berita fundamental negatif | Penurunan bukan teknikal | **Cek laporan keuangan dulu** |
| RSI < 20 terus menerus | Momentum sangat lemah | **Jangan terburu-buru** |
| Tidak ada support dekat | Tidak ada "lantai" | **Cari saham lain** |

---

## 5 Tips Penting untuk Pemula

### 1. Jangan Hanya Pakai Satu Indikator
RSI dan Stochastic sangat baik, tapi selalu gunakan minimal 2-3 konfirmasi sebelum entry.

### 2. Perhatikan Timeframe
Sinyal di chart mingguan (weekly) lebih kuat daripada chart harian (daily). Untuk bottom fishing, gunakan chart harian sebagai basis.

### 3. Gunakan Trailing Stop
Setelah saham rebound dan Anda sudah profit, gunakan trailing stop untuk melindungi keuntungan.

### 4. Kelola Emosi
Bottom fishing butuh keberanian dan disiplin. Jangan terpancing emosi saat melihat portofolio merah.

### 5. Catat Setiap Trade
Buat jurnal trading. Catat setiap entry berdasarkan RSI/Stochastic, dan evaluasi hasilnya setelah 1 bulan.

---

## Kesimpulan

RSI dan Stochastic adalah dua indikator powerful untuk menemukan saham yang sedang oversold — kondisi di mana saham berpotensi "murah" dan siap rebound. Tapi kunci keberhasilannya bukan pada indikator saja, melainkan pada **konteks lengkap**:

:::checklist
- **Tren utama masih naik** — jangan bottom fish di downtrend
- **RSI dan Stochastic keduanya oversold** — konfirmasi ganda
- **Bullish divergence muncul** — momentum mulai berbalik
- **Volume menurun** — tekanan jual berkurang
- **Ada support kuat** — level harga yang bisa menahan penurunan
- **Risk-reward ratio minimal 1:2** — potensi untung sebanding dengan risiko
:::

Dengan mengikuti checklist ini, Anda bisa mencari saham murah dengan cara yang terukur dan terstruktur — bukan dengan menebak-nebak.

:::cta[Mulai Cari Saham Oversold Sekarang]
Gunakan Screener TeknikalID dengan filter RSI dan Stochastic otomatis. Temukan saham IDX40 yang sedang berada di zona oversold dalam hitungan detik.

[Buka Screener Sekarang →](/screener)
:::
`,
  },
  {
    slug: "support-resistance-pivot-point",
    title: "Cara Menentukan Support dan Resistance Saham Menggunakan Pivot Point",
    excerpt:
      "Panduan lengkap menghitung pivot point (S1, S2, R1, R2) untuk menentukan level support dan resistance saham BEI secara otomatis.",
    tags: [
      "support resistance",
      "pivot point",
      "analisis teknikal",
      "level harga",
    ],
    content: `## Kenapa Level Harga Itu Penting?

Pernahkah Anda memperhatikan bahwa saham sering sekali "mental" atau "mentok" di harga tertentu? Misalnya, BBCA berkali-kali gagal menembus Rp10.000, atau TLKM selalu memantul saat menyentuh Rp3.200.

Itu bukan kebetulan. Itu yang disebut **support dan resistance** — level harga di mana tekanan beli atau jual menjadi sangat dominan.

Memahami support dan resistance adalah fondasi dari semua strategi trading. Dan **pivot point** memberikan cara paling objektif dan sistematis untuk menghitung level-level ini.

Dalam artikel ini, Anda akan belajar:
- Apa itu support dan resistance dan kenapa itu penting
- Bagaimana menghitung pivot point secara manual
- Cara menggunakan pivot point untuk menentukan entry, stop loss, dan target
- Bagaimana TeknikalID menghitung pivot point secara otomatis untuk setiap saham

---

## Apa Itu Support dan Resistance?

### Support — Lantai Harga

Support adalah level harga di mana **tekanan beli mulai melampaui tekanan jual**, sehingga harga cenderung berhenti turun dan memantul naik. Bayangkan ini sebagai "lantai" yang menahan harga agar tidak jatuh lebih dalam.

\`\`\`
   Harga
   Rp10.000 ┤ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ RESISTANCE = "ATAP"
             │         ↓ ditolak ↓
   Rp 9.500 ┤ ╱╲  ╱╲
             │╱  ╲╱  ╲ ← harga mental di Resistance (Rp10.000)
             │        ╲           dan memantul di Support (Rp9.000)
   Rp 9.000 ┤ ─ ─ ─ ─ ╲─ ╱╲ ─ ─ SUPPORT = "LANTAI"
             │           ╲╱  ← harga mantul naik!
             │
             └──────────────────────────────────────
\`\`\`

**Karakteristik support kuat:**
- Harga sudah memantul dari level ini beberapa kali sebelumnya
- Volume cenderung meningkat saat harga menyentuh support (buyer aktif)
- Level ini berdekatan dengan moving average penting (SMA 50, SMA 200)

### Resistance — Atap Harga

Resistance adalah kebalikannya — level harga di mana **tekanan jual melampaui tekanan beli**, sehingga harga cenderung berhenti naik dan turun kembali. Bayangkan ini sebagai "atap" yang menghalangi harga naik lebih tinggi.

**Karakteristik resistance kuat:**
- Harga sudah ditolak di level ini beberapa kali
- Volume meningkat saat harga mendekati resistance (seller aktif)
- Level ini adalah high sebelumnya yang signifikan

### Contoh Visual

Perhatikan pergerakan harga fiktif saham ABC:

| Periode | Harga | Peristiwa |
|---------|-------|-----------|
| Minggu 1 | Rp5.000 → Rp5.500 | Naik |
| Minggu 2 | Rp5.500 → Rp5.000 | Turun (resistance di Rp5.500) |
| Minggu 3 | Rp5.000 → Rp5.400 | Naik (support di Rp5.000) |
| Minggu 4 | Rp5.400 → Rp5.500 | Naik |
| Minggu 5 | Rp5.500 → Rp5.100 | Ditolak lagi di Rp5.500! |
| Minggu 6 | Rp5.100 → Rp5.400 | Support di Rp5.000 bertahan |

Dari tabel di atas, kita bisa melihat:
- **Resistance: Rp5.500** — harga ditolak dua kali
- **Support: Rp5.000** — harga memantul setiap kali menyentuh level ini

---

## Metode Menentukan Level Support dan Resistance

Ada beberapa cara untuk menentukan support dan resistance:

### Perbandingan 4 Metode

| Metode | Cara Kerja | Kelebihan | Kelemahan |
|--------|-----------|-----------|-----------|
| **Manual (Visual)** | Gambar garis di chart pada level pantulan | Sederhana, fleksibel | Subjektif, butuh pengalaman |
| **Moving Average** | Gunakan SMA 20, 50, 200 sebagai level dinamis | Objektif, otomatis | Berubah tiap hari, kurang presisi |
| **Pivot Point** | Formula matematika dari High, Low, Close | Objektif, terukur, bisa diulang | Tidak memperhitungkan fundamental |
| **Fibonacci** | Rasio Fibonacci (23.6%, 38.2%, 50%, 61.8%) | Banyak digunakan trader | Subjektif tergantung swing high/low |

:::tip[Rekomendasi]
Untuk pemula, mulailah dengan **pivot point**. Ini adalah metode paling objektif dan mudah dihitung. Setelah mahir, Anda bisa menggabungkan pivot point dengan metode lain untuk konfirmasi.
:::

---

## Formula Pivot Point: Classic Method

Pivot Point klasik menggunakan data harga hari sebelumnya untuk menghitung 5 level harga:

### Data yang Dibutuhkan

Dari periode sebelumnya:
- **H** = Harga tertinggi (High)
- **L** = Harga terendah (Low)
- **C** = Harga penutupan (Close)

### Formula

> **PP (Pivot Point) = (H + L + C) / 3**
>
> **R1 (Resistance 1) = (2 × PP) - L**
>
> **S1 (Support 1) = (2 × PP) - H**
>
> **R2 (Resistance 2) = PP + (H - L)**
>
> **S2 (Support 2) = PP - (H - L)**

### Visualisasi Level Pivot Point

\`\`\`
   ▲ RESISTANCE ZONE — "ATAP"
   │
   R2 ───────── Rp10.000 ─── Resistance kuat = Target Jual Maksimal
   │                           (jarak = Range hari sebelumnya)
   R1 ───────── Rp 9.800 ─── Resistance pertama = Target Jual
   │
   ══════════════════════════════════════════════════════
   PP ───────── Rp 9.650 ─── PIVOT POINT = Garis Sentimen
   │                           (di atas = bullish, di bawah = bearish)
   ══════════════════════════════════════════════════════
   │
   S1 ───────── Rp 9.500 ─── Support pertama = Area Beli
   │                           (harga cenderung memantul di sini)
   S2 ───────── Rp 9.200 ─── Support kuat = STOP LOSS area
   │                           (kalau tembus, biasanya lanjut turun)
   │
   ▼ SUPPORT ZONE — "LANTAI"
\`\`\`

### Contoh Perhitungan Manual

Mari kita hitung pivot point untuk saham BBCA:

**Data hari sebelumnya:**
- High: Rp9.800
- Low: Rp9.500
- Close: Rp9.650

**Perhitungan langkah demi langkah:**

| Langkah | Formula | Perhitungan | Hasil |
|---------|---------|-------------|-------|
| 1. PP | (H + L + C) / 3 | (9800 + 9500 + 9650) / 3 | **Rp9.650** |
| 2. R1 | (2 × PP) - L | (2 × 9650) - 9500 | **Rp9.800** |
| 3. S1 | (2 × PP) - H | (2 × 9650) - 9800 | **Rp9.500** |
| 4. R2 | PP + (H - L) | 9650 + (9800 - 9500) | **Rp9.950** |
| 5. S2 | PP - (H - L) | 9650 - (9800 - 9500) | **Rp9.350** |

**Interpretasi cepat:**
- Harga besok di **atas Rp9.650** (PP) → biasanya **bullish**
- Harga besok di **bawah Rp9.650** → biasanya **bearish**
- R1 (Rp9.800) = target pertama untuk trader bullish
- S1 (Rp9.500) = support pertama
- R2 dan S2 = level ekstrem untuk hari yang sangat volatile

---

## Tipe Pivot Point: Perbandingan

Selain Classic, ada beberapa variasi pivot point:

| Metode | Karakteristik | Cocok Untuk | Tingkat Popularitas |
|--------|--------------|-------------|---------------------|
| **Classic** | 5 level (PP, S1-2, R1-2) | Swing trading, pemula | Tinggi ⭐⭐⭐ |
| **Fibonacci** | Level berbasis rasio Fib (38.2%, 61.8%) | Trading dalam range | Sedang ⭐⭐ |
| **Camarilla** | 8 level (S1-4, R1-4), lebih rapat | Day trading, scalping | Sedang ⭐⭐ |
| **DeMark** | Fokus pada prediksi range hari itu | Reversal trading | Rendah ⭐ |

**Untuk pasar Indonesia (BEI), Classic Pivot Point adalah pilihan terbaik** karena sederhana, banyak digunakan, dan hasilnya konsisten dengan pergerakan harga saham blue chip.

---

## Cara Trading dengan Pivot Point

### Strategi 1: Trading di Area Support (Beli saat Mantul)

**Kapan:** Harga mendekati S1 atau S2
**Asumsi:** Support akan menahan penurunan dan harga akan memantul

\`\`\`
   R1 ─ ─ ─ ─ Rp3.400 ─ ─ ─ ─ ─ ─ ─ ─ ─ TARGET 2
   PP ─ ─ ─ ─ Rp3.250 ─ ─ ─ ─ ─ ─ ─ ─ ─ TARGET 1
   │
   │  ← Entry di Rp3.120 (dekat S1)
   S1 ─ ─ ─ ─ Rp3.100 ─ ─ ─ ─ AREA BELI ← harga memantul!
   │
   │  ← Stop Loss di Rp3.040 (2% di bawah S1)
   │
   └────────────────────────────────────────────

   Risk: Rp80/lot    Reward ke T1: Rp130/lot    RRR = 1:1.6
\`\`\`

**Langkah eksekusi:**
1. **Tunggu** harga menyentuh S1 (atau S2 untuk setup lebih agresif)
2. **Tunggu konfirmasi** — candle reversal, volume meningkat
3. **Entry** sedikit di atas support
4. **Stop loss** 1-2% di bawah support
5. **Target:** PP (resistance pertama) atau R1

**Contoh:**
- Saham TLKM, S1 = Rp3.100, PP = Rp3.250, R1 = Rp3.400
- Harga menyentuh Rp3.110 → entry di Rp3.120
- Stop loss: Rp3.040 (2% di bawah S1)
- Target 1: Rp3.250 (PP) → profit +4.2%
- Target 2: Rp3.400 (R1) → profit +9%

### Strategi 2: Trading di Area Resistance (Jual saat Mental)

**Kapan:** Harga mendekati R1 atau R2
**Asumsi:** Resistance akan menahan kenaikan dan harga akan turun kembali

**Langkah:**
1. Harga mendekati R1 → **pertimbangkan take profit sebagian**
2. Harga mendekati R2 → **pertimbangkan jual seluruh posisi**
3. Kalau harga berhasil **menembus R2** → trend kuat, biasanya lanjut naik

### Tabel Keputusan Pivot Point

| Posisi Harga | Sentimen | Kemungkinan | Aksi |
|--------------|----------|-------------|------|
| **Di atas R2** | Sangat bullish 🚀 | 80% lanjut naik | Hold / trailing stop |
| **Di atas R1** | Bullish 📈 | 65% lanjut naik | Take profit parsial |
| **Di atas PP** | Sedikit bullish ↗ | 55% naik | Watch, siap entry |
| **Di bawah PP** | Sedikit bearish ↘ | 55% turun | Waspada |
| **Di bawah S1** | Bearish 📉 | 65% lanjut turun | Pertimbangkan jual |
| **Di bawah S2** | Sangat bearish ⚠️ | 80% lanjut turun | Jual / stop loss |

\`\`\`
   KEPUTUSAN BERDASARKAN POSISI HARGA

   R2 ──── Sangat Bullish → HOLD / Trailing Stop
   │
   R1 ──── Bullish → Take Profit Parsial
   │
   PP ──── Garis Sentimen (atas=bullish, bawah=bearish)
   │
   S1 ──── Bearish → Pertimbangkan Jual
   │
   S2 ──── Sangat Bearish → JUAL / Stop Loss
\`\`\`

:::tip[Tip Profesional]
Pivot point lebih akurat pada saham liquid (blue chip, IDX40) dibanding saham kecil. Semakin banyak partisipan yang menggunakan level yang sama, semakin kuat level tersebut menjadi "self-fulfilling prophecy."
:::

---

## Contoh Nyata: Trading Plan dengan Pivot Point

### Studi Kasus 1: BBCA (Bank Central Asia)

**Data hari sebelumnya:**
- High: Rp9.800
- Low: Rp9.400
- Close: Rp9.600

**Pivot Point Levels:**

\`\`\`
   R2 ───────── Rp10.000 ─── Target jual agresif
   R1 ───────── Rp 9.800 ─── Target jual pertama
   ═══════════════════════════════════════
   PP ───────── Rp 9.600 ─── Garis sentimen
   ═══════════════════════════════════════
   S1 ───────── Rp 9.400 ─── Area beli
   S2 ───────── Rp 9.200 ─── Stop loss area
\`\`\`

**Skenario A — Bearish Open (buka di Rp9.550, di bawah PP):**

| Parameter | Nilai | Alasan |
|-----------|-------|--------|
| Entry beli | Tunggu di S1 (Rp9.400) | Beli di support dengan konfirmasi |
| Stop loss | Rp9.200 (di bawah S2) | Jika tembus S2, bearish kuat |
| Target 1 | Rp9.600 (PP) | Resistance pertama |
| Target 2 | Rp9.800 (R1) | Resistance kedua |
| RRR | 1:1.5 (T1) / 1:2 (T2) | Memenuhi syarat minimum |

**Skenario B — Bullish Open (buka di Rp9.650, di atas PP):**

| Parameter | Nilai | Alasan |
|-----------|-------|--------|
| Entry beli | Saat pullback ke PP (Rp9.600) | Beli di support dinamis |
| Stop loss | Rp9.350 (di bawah S1) | Jika tembus S1, sentimen berubah |
| Target 1 | Rp9.800 (R1) | Resistance pertama |
| Target 2 | Rp10.000 (R2) | Resistance kedua |
| RRR | 1:1.6 (T1) / 1:2.3 (T2) | Bagus untuk swing trade |

### Studi Kasus 2: TLKM (Telkom Indonesia)

**Data hari sebelumnya:**
- High: Rp3.450
- Low: Rp3.300
- Close: Rp3.350

**Pivot Point Levels:**

\`\`\`
   R2 ───────── Rp 3.500 ─── +3.9% dari entry
   R1 ───────── Rp 3.400 ─── +0.9% dari entry
   ═══════════════════════════════════════
   PP ───────── Rp 3.367 ─── Garis sentimen
   ═══════════════════════════════════════
   S1 ───────── Rp 3.283 ─── Area beli
   S2 ───────── Rp 3.217 ─── Stop loss area
\`\`\`

**Skenario:** Harga buka di Rp3.370 (sedikit di atas PP → bullish):

- **Entry:** Rp3.370
- **Stop loss:** Rp3.270 (di bawah S1)
- **Target 1:** Rp3.400 (R1) → profit +0.9%
- **Target 2:** Rp3.500 (R2) → profit +3.9%

:::warning[Disclaimer]
Angka-angka di atas adalah ilustrasi edukasi. Pivot point dihitung berdasarkan data historis dan tidak menjamin pergerakan harga di masa depan. Selalu gunakan manajemen risiko yang ketat.
:::

---

## Pivot Point Otomatis di TeknikalID

Menghitung pivot point secara manual setiap hari untuk setiap saham itu memakan waktu. Itulah kenapa TeknikalID menghitungnya secara otomatis untuk setiap saham IDX40.

### Cara Mengaksesnya

1. Buka halaman saham — misalnya [halaman BBCA →](/stocks/BBCA)
2. Scroll ke bagian **Pivot Point**
3. Anda akan melihat level PP, S1, S2, R1, R2 yang dihitung otomatis berdasarkan data hari sebelumnya

### Keunggulan Pivot Point Otomatis

| Fitur | Manual | TeknikalID Otomatis |
|-------|--------|---------------------|
| Kecepatan | 5-10 menit per saham | Instan, semua saham sekaligus |
| Akurasi | Rentan salah hitung | Formula tepat, data real-time |
| Konsistensi | Bisa beda tiap orang | Formula sama untuk semua saham |
| Visualitas | Perlu gambar manual | Langsung tampil di halaman saham |

### Cara Menggunakannya

\`\`\`
   Pagi Hari               Saat Market              Akhir Hari
   ┌──────────────┐       ┌──────────────┐        ┌──────────────┐
   │ 1. Cek Pivot │──────▶│ 3. Eksekusi  │───────▶│ 5. Evaluasi  │
   │    Point     │       │    order     │        │    hasil     │
   │              │       │              │        │              │
   │ 2. Buat      │       │ 4. Pasang   │        │ Bandingkan   │
   │    rencana   │       │    stop loss │        │ aktual vs    │
   │    trading   │       │    & target  │        │ prediksi PP  │
   └──────────────┘       └──────────────┘        └──────────────┘
\`\`\`

1. **Pagi hari sebelum market buka:** Cek pivot point untuk saham yang Anda incar
2. **Buat rencana:** Tentukan entry, stop loss, dan target berdasarkan level S1/S2/R1/R2
3. **Eksekusi:** Pasang order sesuai rencana saat market buka
4. **Evaluasi:** Di akhir hari, bandingkan pergerakan aktual dengan prediksi pivot point

:::cta[Lihat Pivot Point Otomatis]
Buka halaman saham IDX40 favorit Anda dan temukan level support/resistance yang dihitung otomatis. Gunakan untuk merencanakan trading Anda hari ini.

[Contoh: Pivot Point BBCA →](/stocks/BBCA)
:::

---

## 6 Tips Menggunakan Pivot Point di Pasar Indonesia

### 1. Gunakan Timeframe yang Tepat
Untuk swing trading (2-5 hari), gunakan pivot point **harian**. Untuk posisi jangka menengah (1-4 minggu), gunakan pivot point **mingguan**.

### 2. Level Bukan Garis Tepat
Pivot point memberikan zona, bukan garis presisi. Berikan toleransi ±0.5% di sekitar setiap level.

### 3. Konfirmasi dengan Volume
Level pivot point lebih kuat kalau didukung oleh perubahan volume.

### 4. Perhatikan Gap
Kalau harga buka dengan gap (jauh dari close kemarin), pivot point mungkin kurang akurat.

### 5. Gabungkan dengan Indikator Lain
Pivot point paling kuat bila dikonfirmasi oleh:

| Kombinasi | Sinyal |
|-----------|--------|
| RSI oversold di S1/S2 | Peluang beli kuat |
| RSI overbought di R1/R2 | Peluang jual kuat |
| Moving average konfluen dengan pivot | Support/resistance sangat kuat |
| Bullish divergence + dekat S1 | Setup beli high probability |

### 6. Catat dan Evaluasi
Buat catatan: berapa kali harga memantul di S1? Berapa kali menembus R2? Data historis ini membantu Anda memahami seberapa akurat pivot point untuk saham tertentu.

---

## Kesimpulan

Pivot point adalah salah satu cara paling objektif dan praktis untuk menentukan level support dan resistance. Dengan formula sederhana yang menggunakan data High, Low, dan Close hari sebelumnya, Anda mendapatkan 5 level harga yang bisa langsung digunakan untuk:

:::checklist
- **Menentukan sentimen harian** — harga di atas PP = bullish, di bawah PP = bearish
- **Merencanakan entry** — beli di area S1/S2 dengan konfirmasi
- **Menentukan target** — jual di area R1/R2
- **Memasang stop loss** — di bawah support dengan margin yang aman
:::

Kunci keberhasilan menggunakan pivot point bukan pada formula itu sendiri, melainkan pada **disiplin eksekusi** — masuk di level yang direncanakan, keluar di target atau stop loss, tanpa emosi.

Ingat: pivot point memberikan zona perkiraan, bukan garis pasti. Selalu gunakan konfirmasi tambahan (volume, candlestick, indikator momentum) dan kelola risiko dengan ketat.

:::cta[Mulai Gunakan Pivot Point Hari Ini]
Buka halaman saham IDX40 mana saja di TeknikalID dan temukan level S1, S2, R1, R2 yang sudah dihitung otomatis. Jadikan sebagai bagian dari rencana trading Anda.

[Lihat Semua Saham IDX40 →](/stocks)
:::
`,
  },
];

async function main() {
  console.log("Seeding Akademi articles...\n");

  const author = await findAuthor();

  for (const article of articles) {
    const result = await prisma.article.upsert({
      where: { slug: article.slug },
      update: {
        title: article.title,
        excerpt: article.excerpt,
        content: article.content,
        tags: article.tags,
        authorId: author.id,
      },
      create: {
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt,
        content: article.content,
        tags: article.tags,
        authorId: author.id,
      },
    });

    console.log(`✓ ${result.title}`);
    console.log(`  /akademi/${result.slug}`);
    console.log(`  Tags: ${result.tags.join(", ")}\n`);
  }

  console.log("Done! 3 articles seeded.");
}

async function findAuthor() {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true, name: true, username: true },
  });

  if (admin) {
    console.log(`Using admin author: ${admin.name ?? admin.username}\n`);
    return admin;
  }

  const user = await prisma.user.findFirst({
    select: { id: true, name: true, username: true },
  });

  if (user) {
    console.log(
      `No admin found. Using user as author: ${user.name ?? user.username}\n`
    );
    return user;
  }

  throw new Error(
    "No users found in database. Create a user first before seeding articles."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
