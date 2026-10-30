# Audit UI/UX teknikal.id — Juri Produk Independen

- **Tanggal:** Jumat, 30 Okt 2026, ±19:45 WIB (pasar sudah tutup, sesi terakhir = 30 Okt)
- **Auditor:** Claude (Antigravity), read-only. Tidak ada file production yang diubah.
- **Sumber bukti:** HTML SSR asli — `/tmp/page_.html` (home), `/tmp/bbca.html` (detail BBCA), plus 2 curl mobile-UA (`/pasar`, `/compare`, karena file lokalnya belum ada) + 3 curl verifikasi (brief 30 Okt, redirect `/saham/BBCA`, home desktop-UA). **Total 5 curl, sesuai batas.**
- **Catatan 390px vs 1440px:** HTML desktop-UA dan mobile-UA **sama persis** (home: 196.050 byte dua-duanya). Jadi layout responsif murni lewat breakpoint Tailwind (`sm:/md:/lg:`). Penilaian per viewport di bawah dibaca dari class itu, bukan dari screenshot.

> [!WARNING]
> **Batas metode:** saya tidak merender halaman di browser. Bagian yang di-render di client (chart, isi `/compare`, list Radar Pantulan, isi modal Tanya AI) cuma bisa dinilai dari skeleton/markup-nya. Skor spacing berasal dari distribusi class dan struktur DOM, bukan dari ukuran piksel yang diukur.

---

## Ringkasan skor

| # | Pertanyaan | Skor | Verdict |
|---|---|---|---|
| 1 | Spacing cukup? | **6/10** | Whitespace makro **pas**, tapi mikro (font & tap target) **cramped**, terutama di halaman emiten |
| 2 | Terlalu ribet? | **5/10** | Jalur inti **pendek** (2–3 interaksi ke verdict), tapi **tenggelam di pilihan**: banyak CTA, blok data dobel, 3 lapis elemen fixed di bawah layar mobile |
| 3 | Beginner-friendly? | **5/10** | Niatnya ada ("Ringkas untuk pemula", tooltip `?`, "Bahasa Sederhana"), tapi **eksekusinya bocor**: jargon Inggris, angka yang saling bertentangan, label sesi/tanggal salah |
| 4 | Keseluruhan | **6/10** | Data kaya dan aturan brand umumnya dipatuhi. Masalah utamanya **kepercayaan & konsistensi**, bukan kekurangan fitur |

---

## 1. Spacing — 6/10

### Bukti kuantitatif (class di HTML SSR, script dibuang)

| Halaman | `text-[9px]` | `text-[10px]` | `text-[11px]` | `text-sm` | `h-8` (32px) | `truncate` | Verdict |
|---|---|---|---|---|---|---|---|
| Home `/` | 9 | 63 | 28 | 69 | 1 | 38 | **Pas** (makro lega, badge kecil) |
| `/pasar` | 0 | 23 | 0 | 158 | 1 | 50 | **Pas–padat** (list rapat tapi bisa di-scan) |
| `/stocks/BBCA.JK` | 6 | **110** | **57** | 97 | **23** | 17 | **Cramped** |
| `/compare` | 0 | 3 | 0 | 15 | 7 | 0 | **Lega karena kosong** (lihat §3) |

### Temuan per halaman

**Home**
- ✅ Hero lega: `mt-5 font-serif text-4xl sm:text-5xl lg:text-6xl`, paragraf `mt-5 ... max-w-xl leading-relaxed`, CTA `px-6 py-3 rounded-xl`. Antar-section pakai `space-y-14`.
- ⚠️ Badge pakai **9px**: `class="text-[9px] font-medium px-1.5 py-0.5 rounded-full ..."` → "Teraktif" / "Top Mover". Di 390px ini terlalu kecil untuk dibaca.
- ⚠️ Di 1440px hero jadi 2 kolom (`lg:grid-cols-[minmax(0,1fr)_400px]`) dengan grid gainer `hidden lg:grid grid-cols-2`. Di 390px grid itu hilang, jadi angka pasar pertama baru muncul ±1 layar di bawah hero.

**/pasar**
- ✅ Baris list konsisten `py-2.5` (36×) dan `gap-3` (53×). Ritmenya rapi.
- ⚠️ Tiap baris memadatkan rank, logo, ticker, nama, harga, volume, %, skor, dan label dalam 1 baris → `truncate` 50×. Di 390px nama emiten pasti terpotong ("Bank Negara Indonesia (Persero" sudah terpotong dari sumbernya).

**/stocks/BBCA.JK** (paling bermasalah)
- ❌ **173 elemen di bawah 12px** (`text-[9px]`+`[10px]`+`[11px]`), lebih banyak dari `text-sm` (97). Contoh: label verdict utama `<span class="text-[10px] font-semibold text-text-tertiary mt-0.5">Skor Sinyal 0-1</span>`, chip `text-[9px] ... bg-bearish-bg text-bearish">Below`.
- ❌ Tap target: tombol tooltip `?` = `w-8 h-8 -m-2.5` (32px), padahal ada 9+ tooltip di blok "Rincian 9 indikator". `h-8` muncul 23×, di bawah standar 44px. (Catatan positif: tombol share sudah `h-11 sm:h-8` dan "Bahasa Sederhana" sudah `min-h-11 sm:min-h-0`. Polanya sudah ada, cuma belum diterapkan merata.)
- ❌ Panjang halaman: ±25 blok konten sebelum footer (H2/H3 terhitung 26). Yang paling terasa bukan kurang whitespace, tapi **kepadatan informasi**.
- ⚠️ Bagian bawah layar mobile ditumpuk 3 elemen `fixed`: sticky bar `md:hidden fixed bottom-0 z-40` (Bandingkan / Simulasi Beli), bottom-sheet daftar `fixed inset-x-0 bottom-0 z-50`, dan FAB `fixed z-50 bottom-24 ... h-14`. Di 390px ketiganya berebut ±30% tinggi layar.

---

## 2. Terlalu ribet? — 5/10

### Hitung langkah (landing → nilai → fitur inti)

| Tujuan user | Jalur nyata | Interaksi | Nilai |
|---|---|---|---|
| "Pasar hari ini gimana?" | Home → scroll ke strip `IHSG 5.057,05 -0,80% \| 194 naik 552 turun` | 0 tap + ±1 scroll (mobile) | ⚠️ Tidak ada verdict pasar di hero |
| Verdict 1 saham | Home → search `Cari saham… (mis. BBCA, GOTO)` → pilih → kartu skor tepat di bawah harga | **2–3** | ✅ Bagus |
| Trading plan | + tap anchor `#plan` (nav: Chart · Indikator · Analisa · Asing · Trading Plan) | 3–4 | ✅ OK |
| Screener | Hero "Coba Screener" → `/screener` | 1 + pilih strategi | ⚠️ Ada 2 URL: `/screener` dan `/stocks?view=screener` |
| Bandingkan | Sticky "Bandingkan" / link footer → `/compare` | 2+ | ❌ Body kosong di SSR (§3) |
| Tanya AI | FAB | 1 | ⚠️ Di mobile cuma ikon: `<span class="hidden sm:inline">Tanya AI</span>` |
| `/saham/BBCA` | `HTTP/2 308 → /stocks/BBCA.JK` | 0 | ✅ Redirect permanen benar |

**Kesimpulan:** jalurnya sendiri sudah pendek. Yang bikin ribet adalah **jumlah pilihan dan duplikasi** di sepanjang jalan:

- **Home:** 68 link sebelum footer (39 tujuan unik), 3 CTA hero + search + chip "Belum tahu cari apa?". Kartu gainer dirender **2×** (versi `lg:` dan mobile), ticker-tape 2× (wajar untuk marquee). H2 "Coba Fitur Analisa" dan "Paling Banyak Diperdagangkan" juga muncul dua kali di DOM (skeleton + stream).
- **BBCA, data dobel di 1 halaman:**
  - OHLC 2×: strip `Buka Rp4.900 Tertinggi Rp5.025 ...` **dan** "Statistik Utama" `Open Rp4.900 / Day High Rp5.025 ...`
  - SMA 2×: kartu `SMA (20/50/200)` **dan** blok "Moving Averages"
  - Indikator 2×: "Rincian 9 indikator ▾" **dan** section "Indikator Teknikal" (H2 dan H3 berjudul **sama**: "Indikator Teknikal")
  - CTA Telegram 2×: `🔔 Kabari di Telegram` **dan** `🔔 Pantau via Telegram`
  - Total 43 `<button>` + 55 link sebelum footer
- **Label menyesatkan di home:** H2 "Paling Banyak Diperdagangkan — Sesi Terakhir · 9 saham" isinya campuran 5 "Teraktif" + 4 "Top Mover". Top mover bukan "paling banyak diperdagangkan".
- **Bottom-sheet daftar** ("Suka fitur analisa teknikal ini?") ada di **semua** halaman, termasuk `/compare` yang isinya kosong. Pengunjung diminta daftar sebelum dapat nilai apa pun.

---

## 3. Beginner-friendly? — 5/10

### ✅ Yang sudah bagus (pertahankan)
- `Ringkas untuk pemula: 1 lot (100 lembar) BBCA = Rp498.000 · batas bawah (support) ...`. Ini pola emas: istilah + arti + angka rupiah.
- Tooltip `?` di tiap indikator (`aria-label="Penjelasan RSI"` dst.), toggle "Bahasa Sederhana", link "Belajar 5 menit · Golden vs Death Cross".
- Tag `Gorengan` dengan title "Saham gorengan — volatilitas tinggi, hati-hati" di gainer home. Proteksi pemula yang bagus.
- Disclaimer konsisten ("Edukatif, bukan rekomendasi jual/beli").
- Verdict-first di emiten: kartu skor langsung di bawah harga.

### ❌ Masalah (dengan bukti)

**A. Angka yang saling bertentangan (merusak kepercayaan)**
1. **Label skor salah:** `-0,36` ditampilkan di atas label `Skor Sinyal 0-1`. Nilai negatif tidak mungkin ada di skala 0–1. Di `/pasar` skalanya ditulis benar: "Skor sinyal (−1 s.d. +1)". Dua halaman, dua definisi.
2. **Support/resistance BBCA ada 2 versi di 1 halaman:**
   - "Ringkas untuk pemula": support **Rp4.495**, resistance **Rp6.523** (= Bollinger lower/upper)
   - "Untuk Trader": "Support kunci di **Rp4.912** ... Resistance terdekat di **Rp5.037**"
   - Pemula tidak tahu harus pakai yang mana. Selisih resistance-nya 30%.
3. **Trading plan memberi sinyal campur aduk:** badge `Wait & See`, `Risk : Reward 1 : 0.1`, rata-rata hasil `− Rp69 /lembar`, tapi angka paling besar dan berwarna hijau justru `Peluang kena TP duluan 75 %` (`text-lg font-mono font-bold text-bullish`). Mata pemula akan menangkap "75% hijau" lalu masuk posisi.
4. **Dua angka IHSG berdampingan di home:** strip `IHSG 5.057,05 -0,80 %` tepat di samping `Brief Hari Ini · IHSG Runtuh 3,49% ke 5.098`. Setelah dicek, brief 30 Okt isinya "Rekap sesi **Kamis, 29 Oktober**". Datanya benar, **labelnya** yang menyesatkan. Halaman BBCA mengulang hal yang sama ("Disebut di Brief Pasar Hari Ini: IHSG Runtuh 3,49%") padahal BBCA sendiri naik +0,81%.
5. **Status sesi salah di `/pasar`** (dicek Jumat 19:45 WIB): `Pasar belum buka`, `Akhir pekan — bursa tutup. Rekap sesi Jumat terakhir`, header list `Gainers kemarin` / `Losers kemarin`, jam `--:-- WIB`. Faktanya ini Jumat malam dan datanya sesi **hari ini**. Home di saat yang sama sudah benar: "Pasar Tutup — Data Sesi Terakhir". `Live update mulai 06:30 WIB` juga membingungkan karena bursa buka 09:00.
6. **"Strong Bullish" untuk saham yang anjlok:** di Top-20 `/pasar`, `NEST ... -6,30% · 0.66 Strong Bullish`, `ASPI -6,62% · 0.64 Strong Bullish`, `SMLE -6,40%`. Tanpa penjelasan di baris itu, pemula membacanya sebagai bug atau jebakan.

**B. Jargon Inggris tanpa terjemahan** (bertabrakan dengan target "Bahasa Indonesia kasual")
- Emiten: `Bearish`/`Bullish`/`Netral` vs `Neutral` (dua bahasa untuk istilah yang sama), `Below`, `Bearish Cross`, `Trending`, `Distribution`, `Oversold`, `24 % of band`, `Day High`, `Day Low`, `52W Range`, `Market Cap`, `Forward P/E`, `Simulasi Monte Carlo 10.000 × jalur harga`.
- Home: `Bottom Fishing Radar`, `Hype Alert`, `Live monitoring` (padahal pasar sedang tutup), sektor campur `Basic Materials`/`Healthcare` (kartu) vs `Bahan Dasar`/`Kesehatan` (Peta Sektor).
- `/pasar`: `Strong Bullish`, `Gainers`/`Losers`.
- Toggle "Bahasa Sederhana" ada, tapi **default OFF** (`bg-bg-hover text-text-secondary`, tanpa state aktif).

**C. Angka tanpa konteks / satuan ambigu**
- `M` dipakai untuk **miliar** (`−233,6 M`, `likuid ≥ Rp1 M`), padahal di bahasa Inggris M = juta. Volume justru pakai `jt`. Pemula bisa salah baca 1.000×.
- Format desimal campur: `+0,81%` (koma, ID) vs `P/E 10.31`, `▼ 0.4 %`, `614.1 triliun` vs `614,07 T` di halaman yang sama.
- `ATR 4.5 %`, `OBV -5515.0M`, `Histogram -31.24` tidak punya kalimat "artinya apa".

**D. Dead-end & empty state**
- `/compare`: SSR hanya berisi H1 + 1 kalimat. Isinya `<div class="fade-in"><!--$!--><template data-dgst=""></template><!--/$--></div>` (Suspense jatuh ke client-render). Tanpa JS, atau saat JS lambat, halaman kosong. Tidak ada contoh perbandingan default.
- BBCA: `Sentimen Komunitas — Belum ada data sentimen untuk saham ini.` (kosong tanpa CTA), `Diskusi BBCA — Masuk untuk bergabung` (perlu login), `Simulasi Trading BBCA → /auth/signin?callbackUrl=...` (perlu login, padahal sticky bar bilang "Simulasi Beli"), `Kode ISIN —`.
- Home: "Radar Pantulan" di SSR cuma spinner (`animate-spin`); screener demo "Klik salah satu strategi di atas" (kosong sampai diklik).
- Berita di BBCA basi: "Berita Sektor Keuangan" bertanggal **5–7 Sep 2026** (±2 bulan), ada typo "Sinyal **Bullis**".
- "Saham Sektor Keuangan Lainnya" diurutkan alfabetis (`ABDA, ADMF, AGRO, AGRS, AHAP ...`), bukan peer yang relevan (BBRI/BMRI/BBNI).
- FAQ generik ("tersedia lengkap di halaman ini"). Tombol `Akurat? 👍 👎` (aria "Verdik akurat") terletak **jauh di bawah** FAQ, terpisah dari verdict yang dinilai.

### Kepatuhan brand rules

| Rule | Status | Bukti |
|---|---|---|
| Larangan purple/indigo | ❌ **1 pelanggaran** | BBCA, tombol Story: `bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400`. Home, `/pasar`, `/compare`: 0 hit |
| Verdict-first | ⚠️ Sebagian | Emiten ✅ (kartu skor di bawah harga). Home ❌ (H1 = `TeknikalID`, nama brand; belum ada kalimat "pasar hari ini"). `/pasar` ❌ (langsung angka) |
| Gratis | ✅ | "Gratis." di hero, "Daftar gratis" |
| Tanpa login untuk inti | ✅ inti / ⚠️ pinggiran | Verdict, indikator, plan terbuka. Simulasi & diskusi butuh login. Bottom-sheet daftar muncul di semua halaman |

---

## 4. Tiga simpulan utama

1. **Masalah #1 adalah kepercayaan, bukan fitur.** Skor `-0,36` dengan label "0-1", dua versi support/resistance, "Strong Bullish" di saham −6%, "Gainers kemarin" untuk sesi hari ini, dan dua angka IHSG berdampingan. Untuk platform yang menjual "Trading tanpa nebak-nebak", tiap kontradiksi justru memaksa user menebak. Hampir semuanya **bug copy/label yang murah diperbaiki**.
2. **Halaman emiten terlalu padat dan dobel.** Sekitar 25 blok, 173 teks di bawah 12px, 3 data yang tampil dua kali, dan 3 elemen fixed di bawah layar mobile. Verdict-first sudah benar di atas, tapi sisanya perlu disusun ulang jadi bertingkat: verdict → detail → referensi.
3. **Mode pemula sudah ada tapi tidak dijadikan default.** "Ringkas untuk pemula", tooltip, dan "Bahasa Sederhana" sudah jalan, sementara label di sekitarnya masih Inggris teknis. Menyalakan mode itu secara default dan mengganti label ke Bahasa Indonesia adalah cara termurah untuk menaikkan skor beginner-friendly.

---

## Top-5 perbaikan prioritas

| # | Perbaikan | Tipe | Effort | Dampak |
|---|---|---|---|---|
| **1** | **Perbaiki label & state yang salah.** (a) `Skor Sinyal 0-1` → `Skor −1 s.d. +1` (samakan dengan `/pasar`). (b) State sesi `/pasar`: setelah tutup di hari bursa tampilkan "Pasar sudah tutup — rekap sesi hari ini", ganti "kemarin" jadi "sesi {tanggal}", dan "Akhir pekan" hanya di Sabtu/Minggu. (c) Label brief di home & emiten: `Brief Hari Ini` → `Brief pagi · rekap sesi Kamis 29 Okt`. (d) Hapus `from-purple-500` di tombol Story (pakai warna brand) | Quick-win | **2–3 jam** | Tinggi (trust) |
| **2** | **Satu bahasa, satu satuan.** Buat peta label EN→ID terpusat: Bullish→Menguat, Bearish→Melemah, Strong Bullish→Sangat Menguat, Neutral→Netral, Below→Di bawah, Oversold→Jenuh jual, Day High→Tertinggi, 52W Range→Rentang 52 minggu, Bottom Fishing Radar→Radar Pantulan. `M`→`miliar`/`mlr`, desimal ID konsisten (`10,31`). "Bahasa Sederhana" default **ON** untuk guest | Quick-win | **≤ ½ hari** | Tinggi (beginner) |
| **3** | **Satu angka per konsep di halaman emiten.** Pakai satu sumber support/resistance (pivot/plan) untuk "Ringkas untuk pemula" dan "Untuk Trader". Kalau verdict = `Wait & See` atau R:R < 1, warna "Peluang kena TP 75%" jadi netral dan tambahkan peringatan "setup belum layak, R:R 1:0,1". Demo trading plan di home sebaiknya pakai saham dengan setup valid, atau diberi label "contoh saat sinyal belum layak". Di `/pasar`, tambahkan kolom/tooltip "skor teknikal ≠ performa hari ini" di baris Strong Bullish yang merah | Quick-win → kecil | **½–1 hari** | Tinggi (trust + safety pemula) |
| **4** | **Batas minimum tipografi & tap target + rapikan layer bawah.** Font minimal 12px (`text-[9px]`/`text-[10px]` → `text-xs` untuk label bermakna seperti skor dan chip status). Tombol `?` dan `h-8` → `min-h-11` di mobile (pola `h-11 sm:h-8` sudah ada, tinggal diterapkan merata). Bottom-sheet daftar baru muncul setelah ≥2 pageview / ≥60 detik dan tidak di `/compare`. FAB disembunyikan saat sticky bar emiten aktif, dan diberi label teks di mobile | Kecil | **1 hari** | Sedang–tinggi (mobile 390px) |
| **5** | **Restruktur IA emiten + empty-state.** Tingkat 1 (above fold): harga, skor, 1 kalimat verdict, plan ringkas. Tingkat 2: chart, indikator (gabung "Rincian 9 indikator" + section Indikator jadi satu), asing. Tingkat 3 (collapsed): fundamental, profil, FAQ, diskusi. Hapus data dobel (OHLC, SMA, CTA Telegram). Peer = top market-cap satu sub-industri, bukan alfabetis. Sembunyikan berita > 14 hari. `/compare` di-SSR dengan contoh default (mis. BBCA vs BBRI). Home: hero verdict pasar ("IHSG −0,80%, 552 saham turun — pasar melemah") di atas search | **Redesign** | **3–5 hari** | Tinggi (simplicity), risiko regresi SEO/consistency-test |

> [!IMPORTANT]
> Kerjakan #1 sampai #3 dulu (total ±1,5 hari). Ketiganya menutup hampir semua temuan "angka bertentangan" tanpa mengubah layout. #5 menyentuh halaman market-related, jadi wajib consistency-test (home + /stocks + /api/market) sesuai API Reuse Rule, dan wajib blok GATEGUARD sebelum deploy.

---

## Lampiran — reproduksi bukti

```bash
# hitung font < 12px per halaman (script dibuang dulu agar payload RSC tidak dobel)
perl -0pe 's/<script[\s\S]*?<\/script>//g' /tmp/bbca.html | grep -o 'text-\[\(9\|10\|11\)px\]' | sort | uniq -c
# pelanggaran warna brand
perl -0pe 's/<script[\s\S]*?<\/script>//g' /tmp/bbca.html | grep -o 'from-purple-500[^"]*'
# label skor
grep -o 'Skor Sinyal 0-1' /tmp/bbca.html
# status sesi /pasar
grep -o 'Pasar belum buka\|Akhir pekan — bursa tutup\|Gainers kemarin' /tmp/page__pasar.html | sort -u
# compare kosong di SSR
grep -o '<!--\$!--><template data-dgst=""></template>' /tmp/page__compare.html
```
