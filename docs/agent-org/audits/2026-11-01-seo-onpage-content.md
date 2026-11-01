# Audit On-Page + Content SEO — teknikal.id

**Tanggal:** 2026-11-01 · **Metode:** curl live tanpa JS (Googlebot view), sitemap.xml (1.375 URL), GSC ground truth 5 klik / 874 impresi / avg pos 66 per hari.

---

## 1. Skor On-Page — 31 Halaman Publik Penting

Kriteria per halaman: (a) keyword depan di title, (b) title unik, (c) panjang title 50–60 char, (d) meta desc menarik & ≤160 char, (e) H1 = intent utama. ✅/⚠️/❌.

| # | Halaman | Title (panjang) | Masalah | Skor |
|---|---------|-----------------|---------|------|
| 1 | `/` (home) | Analisa Teknikal Saham IDX & Chart Real-Time (57) | — semua bersih | 5/5 |
| 2 | `/stocks` | Harga Saham IDX Hari Ini — Screener… (85) | title 85 char (>60); **tabel harga 0 baris di HTML (client-render)**; H1 "Radar Saham IDX" ≠ intent "harga saham hari ini" | 2/5 |
| 3 | `/harga-saham-hari-ini` | identik `/stocks` (85) | **bukan halaman — canonical→/stocks**; tidak ada di sitemap; doorway 200 duplikat | 1/5 |
| 4 | `/screener` | identik `/stocks` (85) | sama: canonical→/stocks, doorway 200; `/stocks?view=screener` juga self-canonical ke ticker jika ada param aneh | 1/5 |
| 5 | `/stocks/KLBF.JK` | Saham KLBF (Kalbe Farma) Hari Ini: … (80) | title 80; **H1 = "KLBF" saja** (bukan intent); bagus: meta ada harga live Rp730 | 3/5 |
| 6 | `/stocks/INDF.JK` | Saham INDF (Indofood…) Hari Ini… (91) | title 91; H1 = "INDF" | 3/5 |
| 7 | `/stocks/BRIS.JK` | Saham BRIS (Bank Syariah Indonesia **(Perser** Hari Ini… (99) | title 99 + **nama emiten terpotong "(Perser" tanpa tutup kurung** — bug template; H1 = "BRIS" | 2/5 |
| 8 | `/saham/klbf/kenapa-naik-hari-ini` | Kenapa Saham Kalbe Farma Naik Hari Ini… (85) | title 85; konten SSR 496 kata, tabel 0 — tipis tapi intent OK | 3/5 |
| 9 | `/saham/indf/…` | Kenapa Saham Indofood… (108) | title 108 — sektor panjang "Consumer Non-Cyclicals" memakan kuota | 2/5 |
| 10 | `/saham/bris/…` | **"Analisis Teknikal"** Bank Syariah… (95) | **template title beda dari sibling** ("Analisis Teknikal…" vs "Kenapa Saham X Naik") — tidak konsisten; 95 char | 2/5 |
| 11 | `/berita` | Brief Pasar Saham Hari Ini — Berita & Analisa IDX (62) | 62 char, border | 4/5 |
| 12 | `/berita/listicle-healthcare-2026-10-31` | 5 Saham Healthcare… (31 Okt) (77) | 77 char; **JSON-LD hanya Organization — tidak ada Article** | 3/5 |
| 13 | `/berita/brief-…-116-saham-oversold` | IHSG Runtuh 3,49% ke 5.098 — Brief IDX 30 Okt (62) | pola Google News ID (angka+tanggal) ✅; 62 char border | 4/5 |
| 14 | `/berita/analis-pagi-…-mbss` | Analis Pagi 30 Oktober: … (91) | 91 char; **2 H1** di satu halaman | 3/5 |
| 15 | `/berita/rekap-pasar-mingguan-2026-10-31` | IHSG Turun 7% Sepekan… (76) | 76 char; **tanpa Article JSON-LD** | 3/5 |
| 16 | `/berita/analisa-saham-klbf-…` | Analisa Saham KLBF Rp720: 8% di Atas… (75) | bagus (harga+angka+tanggal), 75 char | 4/5 |
| 17 | `/aliran-dana-asing` | …Net Foreign Buy Terbesar \| TeknikalID **\| TeknikalID** (89) | **brand ganda di title**; 89 char; konten SSR real (22 baris tabel, 20 link ticker) ✅ | 3/5 |
| 18 | `/market-structure` | Market Structure — Struktur Tren… (65) | 65 char; konten SSR real (41 baris, 160 harga, 40 link) ✅; H1 "Market Structure" English | 4/5 |
| 19 | `/indeks` | Daftar Indeks Saham BEI — IDX SMC Liquid… (66) | 66 char border | 4/5 |
| 20 | `/indeks/lq45` | Daftar Harga Saham Indeks LQ45 BEI Hari Ini… (75) | 75 char; meta kepotong "LQ45 men..."; **SSR real: 31 baris, 120 harga, 30 link** ✅ | 4/5 |
| 21 | `/sektor` | Sektor Saham BEI — … (74) | **shell: 0 tabel, 0 link ticker, 0 harga di HTML** — daftar sektor client-render | 2/5 |
| 22 | `/saham-oversold` | Saham Oversold Hari Ini — RSI Dibawah 30 (53) | ✅ SSR real (34 baris, 60 harga, 29 link); title/meta bersih | 5/5 |
| 23 | `/saham-blue-chip` | Daftar Saham Blue Chip Indonesia… (71) | 71 char; daftar 40 link ticker SSR tapi tanpa angka/harga; H2 = 0 | 3/5 |
| 24 | `/saham-dividen` | Daftar Saham Dividen Tinggi Indonesia… (66) | 66 char; tabel SSR 21 baris tapi hanya 4 string Rp (yield tidak dirender?) | 3/5 |
| 25 | `/kalender-dividen` | Kalender Dividen Saham BEI 2026 Terbaru… \| TeknikalID **\| TeknikalID** (91) | **brand ganda**; 91 char; SSR real 16 baris ✅ | 3/5 |
| 26 | `/saham-undervalued` | Daftar Saham Undervalued Indonesia — PE Rendah PB<1.5 (68) | 68 char; tanpa tabel SSR (0), hanya link | 3/5 |
| 27 | `/laporan-pasar` | Laporan Pasar Saham IDX Mingguan… (70) | **221 kata total = shell indeks tipis**; H2 = 0 | 2/5 |
| 28 | `/akademi` | Belajar Analisis Teknikal Saham… (83) | 83 char; H1 = "Akademi" (bukan intent) | 3/5 |
| 29 | `/akademi/cara-membaca-rsi-…` | Cara Membaca RSI Saham: Panduan Lengkap… (67) | konten real 1.659 kata, 12 H2 ✅ — konten terbaik di site | 4/5 |
| 30 | `/broker-saham-terbaik` | Perbandingan Broker Saham Terbaik 2026… (85) | 85 char | 3/5 |
| 31 | `/community` | Komunitas Saham BEI… (59) | **171 kata total = halaman paling tipis di site** | 2/5 |

**Ringkasan hygiene:** 20/31 title >60 char · 2 title brand ganda "| TeknikalID | TeknikalID" · 1 nama emiten terpotong "(Perser" · 3 halaman shell tanpa data SSR (`/stocks`, `/sektor`, `/community`) · meta desc semua ada & umumnya bagus (kekuatan site).

---

## 2. Gap Kompetitor — Query Ticker (klbf/indf/bris, GSC pos 87–91)

Pemenang aktual untuk query ticker ID: **stockanalysis.com** (SSR penuh), **google.com/finance**, kontan/cnbc (news feed). Bedah `stockanalysis.com/quote/idx/KLBF/` vs `/stocks/KLBF.JK`:

| Elemen | stockanalysis.com (MENANG) | teknikal.id `/stocks/KLBF.JK` | Gap |
|---|---|---|---|
| Tabel statistik SSR | ✅ 18 baris: Market Cap 33,03T, Revenue 38,31T, Net Income 3,77T, EPS 83,22, PE 8,77 — semua di HTML mentah | ❌ 0 baris `<tr>`; 89 string Rp ada (harga live ✅) tapi **tanpa tabel struktural** | **Fundamental snapshot SSR** — data fundamental teknikal.id ada tapi di balik login/gating |
| H1 | "PT Kalbe Farma Tbk. (IDX:KLBF)" — nama lengkap + ticker | "KLBF" — 4 huruf telanjang | H1 harus `Saham KLBF (Kalbe Farma) — Harga & Analisa` |
| Struktur konten | H2: About / Financial Performance / Analyst Summary / News | 8 H2 ada ✅ | sudah par, tambah "Tentang Kalbe Farma" para 100 kata |
| JSON-LD | Corporation + WebPage + BreadcrumbList | tidak terdeteksi pada halaman ticker | tambah `Corporation`/`LocalBusiness`-style schema |
| Backlink/authority | domain raksasa | domain baru | hanya bisa dimenangkan via depth + freshness, bukan authority |

**Kesimpulan gap:** teknikal.id kalah pos 87–91 bukan karena meta (meta-nya justru lebih relevan utk Bahasa Indonesia) tapi karena (1) H1 telanjang, (2) tidak ada tabel angka SSR yang bisa Google jadikan rich result/factual signal, (3) 1.191 halaman ticker-family tipis saling mendesak tanya hub internal yang jelas.

---

## 3. Query "harga saham hari ini" vs `/harga-saham-hari-ini`

- URL `/harga-saham-hari-ini` **200 OK tapi bukan halaman**: title/meta/H1 identik `/stocks`, canonical → `/stocks`. Google harus menebak sendiri; GSC menunjukkan "daftar harga saham hari ini" (7 impr, pos 85) dan "harga saham" (6, pos 91).
- **Penyebab utama pos 85–91:** `/stocks` merender **0 baris tabel, 0 harga, 0 link ticker** tanpa JS. Intent query = daftar harga real-time; Googlebot melihat shell + copy penjelasan, tanpa satu pun angka harga di HTML. Kompetitor (idx.co.id, google.com/finance) menyajikan angka.
- Jam update tidak tampil di HTML tanpa JS; tidak ada teks "Update: HH:MM WIB" yang SSR.
- Catatan positif: intent-match copy ("Harga Saham IDX Hari Ini — 956+ Saham") sudah tepat; halaman data sekunder (`/saham-oversold`, `/indeks/lq45`, `/market-structure`, `/aliran-dana-asing`) SEMUA punya tabel SSR penuh — jadi pola fix-nya sudah ada di codebase, tinggal diterapkan ke `/stocks`.

---

## 4. Artikel Berita — Sample 5 Terbaru

| Artikel | tickerTag (link /stocks/X.JK) | Article JSON-LD | Pola title Google News ID (angka+tanggal+emiten) |
|---|---|---|---|
| listicle-healthcare-2026-10-31 | ✅ 10 link (CARE, DGNS, PRDA…) | ❌ hanya Organization | ✅ "5 Saham… (31 Okt)" |
| rekap-pasar-mingguan-2026-10-31 | ✅ 27 link | ❌ hanya Organization | ✅ "Turun 7%… 26–30 Okt" |
| brief-pasar-…-30-okt | ✅ 49 link | ✅ Article | ✅ "3,49% ke 5.098 — 30 Oktober" |
| analis-pagi-…-mbss | ✅ 9 link | ✅ Article | ✅ |
| analis-sore-…-aadi | ✅ 14 link | ✅ Article | ✅ |

**tickerTag doctrine: terpenuhi 5/5** — semua saham yang disebut terhubung ke chart. ✅

**Kebocoran discovery Google News:**
1. `sitemap-news.xml` hanya berisi **3 URL** (semua tertanggal 31 Okt) — 66 artikel berita lain tidak masuk. Ini kemungkinan bug "hanya N hari terakhir yang di-push" yang terlalu sempit, atau push gagal.
2. 2/5 artikel sample tanpa `Article` JSON-LD (listicle + rekap mingguan) — dua tipe template itu tidak dapat eligible Google News rich result.
3. `datePublished` 3 artikel berbeda = `2026-10-31T06:38:0X` (batch regenerate, bukan jam publish asli) — Google News menghukum timestamp yang tidak konsisten dengan konten.
4. `keywords` meta JSON-LD kosong di semua artikel — ticker sebagai keyword hilang.

---

## 5. Cannibalization

| Klaster | URL | Status |
|---|---|---|
| screener | `/stocks`, `/screener`, `/harga-saham-hari-ini`, `/stocks?view=screener` | ✅ sudah teratasi via canonical → `/stocks` (semua return 200 dengan canonical sama — aman, tapi 301 lebih bersih) |
| **akademi/tanya duplikat** | `cara-memilih-saham-untuk-pemula` × **4 URL** (`-bb7c51`, `-cthzrv`, `-i7cx5q`, polos), `strategi-swing-trading-saham` × 2, `apa-itu-flipping` × 2, `bollinger-bands-cara…` × 2 | ❌ **semua self-canonical** — 4 halaman identik intent bersaing sendiri. Ini kanibalisasi nyata terbesar di site |
| golden cross | `/akademi/beda-golden-cross-vs-death-cross`, `/akademi/golden-cross-vs-death-cross-arti…`, `/akademi/golden-cross-dan-death-cross-sinyal…` + `/saham-golden-cross` | ❌ 3 artikel akademi self-canonical intent sama ("golden cross vs death cross") + 1 halaman data |
| support/resistance | `support-dan-resistance-…` + `support-resistance-…` | ❌ 2 artikel intent identik, keduanya canonical ke diri sendiri |
| oversold | `/saham-oversold` (data) + `/akademi/saham-oversold-arti…` (edukasi) | ✅ bukan kanibalisasi — intent beda (daftar vs arti), biarkan |

---

## 6. Content Depth SSR (curl tanpa JS)

| Halaman | Tabel | Baris | Harga Rp | Link ticker | Kata | Vonis |
|---|---|---|---|---|---|---|
| `/stocks` | 0 | 0 | 0 | 2 | 613 | ❌ **SHELL — prioritas #1** |
| `/sektor` | 0 | 0 | 0 | 0 | 623 | ❌ SHELL |
| `/community` | 0 | 0 | 0 | 0 | 171 | ❌ paling tipis |
| `/laporan-pasar` | 0 | 0 | 0 | 0 | 221 | ❌ indeks shell |
| `/saham-blue-chip` | 0 | 0 | 0 | 40 | 508 | ⚠️ daftar link tanpa angka |
| `/saham-undervalued` | 0 | 0 | 0 | ~20 | 458 | ⚠️ idem |
| `/stocks/KLBF.JK` | 0 | 0 | 89 | 17 | 1.309 | ⚠️ konten ada, tabel tidak |
| `/saham-oversold` | 2 | 34 | 60 | 29 | 1.027 | ✅ |
| `/market-structure` | 1 | 41 | 160 | 40 | 756 | ✅ |
| `/indeks/lq45` | 1 | 31 | 120 | 30 | 800 | ✅ |
| `/aliran-dana-asing` | 2 | 22 | 22 | 20 | 478 | ✅ |
| `/akademi/cara-membaca-rsi…` | — | — | — | — | 1.659 | ✅ konten terbaik |

**Pola:** semua halaman "listicle data" baru sudah SSR benar; halaman navigasi lama (`/stocks`, `/sektor`) masih shell. Fix `/stocks` = copy pola yang sudah ada.

---

## 10 Quick-Win Rewrite (teks baru persis)

1. **`/stocks` title** (85→56 char):
   `Harga Saham Hari Ini — 956 Emiten IDX Real-Time`
   Meta: `Daftar harga saham IDX hari ini untuk 956 emiten — update real-time tiap detik pasar buka. Filter sektor, RSI, MACD & golden cross gratis, tanpa login.`
   *(+ render 50 baris pertama tabel harga SSR + baris "Update terakhir HH:MM WIB")*

2. **`/stocks/[ticker]` H1** (semua 616 halaman, satu perubahan template):
   `Saham KLBF (Kalbe Farma) — Harga Rp730 & Analisa Teknikal Hari Ini`

3. **`/stocks/[ticker]` title** (80→58 char, template):
   `Harga Saham KLBF Hari Ini Rp730 — Analisa & Sinyal`
   (nama perusahaan pindah ke meta; potong di 30 char utk hindari kasus BRIS)

4. **Bug BRIS "Perser"**: filter nama emiten — buang `(Perser` / `Tbk.` setengah; jadi `Bank Syariah Indonesia`.
   Title: `Harga Saham BRIS Hari Ini — Bank Syariah Indonesia`

5. **`/aliran-dana-asing` title** (89→60, hilangkan brand ganda):
   `Aliran Dana Asing Hari Ini — Net Foreign Buy BEI`
   Meta: `Saham net foreign buy & sell terbesar BEI hari ini dari data resmi IDX, plus skor sinyal teknikal tiap emiten. Update tiap hari bursa.`

6. **`/kalender-dividen` title** (91→57, hilangkan brand ganda):
   `Kalender Dividen BEI 2026 — Cum Date & Yield`
   Meta: `Jadwal pembagian dividen saham BEI terbaru: cum date, ex date, tanggal pembayaran, nominal, dan estimasi yield — cek sebelum beli.`

7. **`/saham/bris/kenapa-naik-hari-ini` title** (samakan template sibling):
   `Kenapa Saham BRIS Naik Hari Ini — Analisa Bank Syariah`

8. **`/sektor` title + SSR** (74→52):
   `Sektor Saham BEI — Harga & Analisa per Sektor`
   *(+ render 12 baris tabel sektor: nama, jumlah saham, % naik/turun hari ini)*

9. **`/berita/listicle-*` & `/berita/rekap-pasar-mingguan-*`**: tambah `Article` JSON-LD (headline, datePublished asli dari DB — bukan jam regenerate, author Organization, `about` = ticker) + push **semua** berita 30 hari ke `sitemap-news.xml` (sekarang cuma 3).

10. **`/akademi/tanya` duplikat**: 301 `-bb7c51`, `-cthzrv`, `-i7cx5q` (dan varian `-uo62xv`, `apa-itu-flipping-dalam-pasar-saham`, `bollinger-bands-dan-cara…`) ke URL polos; pilih 1 winner dari klaster golden-cross ×3 dan 301 dua sisanya.

---

## 5 Insight Terbesar

1. **Masalah bukan metadata, tapi render.** `/stocks` — halaman target query ber-volume terbesar ("harga saham hari ini") — menampilkan 0 baris tabel, 0 harga, 0 link ticker tanpa JS. Meta deskripsi site justru kelas atas; yang kalah adalah kemampuan Googlebot membaca datanya. Pola SSR yang benar sudah ada di `/saham-oversold` & `/market-structure` — replikasi, bukan riset baru.
2. **Aset peringkat terbaik sudah depan mata: eastspring pos 8,5.** Satu-satunya query yang ranking bagus adalah halaman yang kontennya unik & spesifik. Sementara 1.191 halaman ticker-family (616 `/stocks/X.JK` + 575 `/saham/x/kenapa-naik-hari-ini`) duduk di pos 87–91 dengan H1 telanjang 4 huruf — fix H1 + tabel SSR = leverage terbesar per halaman.
3. **Kanibalisasi nyata ada di akademi, bukan di screener.** Klaster screener sudah bersih lewat canonical. Yang rusak: 4× "cara memilih saham pemula", 3× golden-cross, 2× support-resistance — semua self-canonical, semua indexed.
4. **Mesin berita kuat tapi bocor di discovery.** tickerTag 5/5 ✅ dan pola title Google News ID sudah benar, tapi sitemap-news cuma 3/69 URL dan 2 template artikel tanpa Article JSON-LD — konten bagus yang tidak pernah diajukan.
5. **Bug kecil berulang jadi pola kredibilitas:** brand ganda "| TeknikalID | TeknikalID" (2 halaman), nama emiten terpotong "(Perser" (semua emiten berakhiran serupa), title template beda utk `/saham/bris` vs sibling — tanda template title tidak di-test lintas tipe emiten.
