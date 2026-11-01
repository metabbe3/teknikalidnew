# SEO Keyword Opportunity Audit — teknikal.id

**Tanggal:** 2026-11-01 · **Metode:** SERP-first (20 query dicek langsung via web search, 20 basis autocomplete Google untuk volume indikatif) · **Target:** menang dalam 30–60 hari · **KPI:** traffic MoM growth (baseline Okt −4,6%)

**Realitas konteks:** DA rendah, backlink ~0. Maka bukan head term (`ihsg`, `saham`) — cari SERP yang diisi situs indie/forum/blog kecil, di mana teknikal.id menang karena: (1) data EOD 968 emiten update harian, (2) halaman per-ticker SEO-friendly, (3) gratis tanpa login (carisaham menyorok hasil di balik login).

**Label volume: semua "indikatif"** — derived dari keberadaan & posisi query di autocomplete/related Google, bukan angka tools berbayar. Tidak ada angka volume yang dikarang.

---

## Tabel Prioritas — 25 Keyword

Effort: **R** = ringan (on-page/internal link, <1 jam) · **M** = sedang (1 hari) · **B** = berat (>1 hari).

| # | Keyword | Intent | Kenapa winnable (SERP evidence, dicek 1 Nov 2026) | Target URL (1 keyword = 1 URL) | Aksi | Effort |
|---|---------|--------|--------------------------------------------------|-------------------------------|------|--------|
| 1 | `saham oversold hari ini` | Screener list | **teknikal.id sudah #1.** Posisi 2–3 investing.com & TradingView (UI EN, berat), #7 brights.id blog (statis Nov 2024). Autocomplete: varian terbanyak di cluster ini ("screener saham oversold", "saham oversold artinya", "ciri saham oversold") — indikatif demand tertinggi | `/saham-oversold` | **Optimize/defend** — tambah FAQ "saham oversold artinya/ciri", internal link dari semua halaman ticker yang RSI<30 | R |
| 2 | `saham volume spike hari ini` | Screener list | **teknikal.id #1.** Pesaing langsung: teknikal.net & chamid.org — situs pribadi kecil tanpa SEO; sisanya screener.in (India!) & isaham.my (Malaysia) | `/saham-volume-spike` | **Optimize** — pertahankan freshness stamp, rich result table | R |
| 3 | `saham golden cross hari ini` | Screener list | **teknikal.id #1.** #3 carisaham (halaman per-sektor, hasil di balik login), #7 sahamgoldencross.com (situs usang, masih HTTP) | `/saham-golden-cross` | **Optimize** — tambah penjelasan MACD vs MA golden cross (SERP campur intent) | R |
| 4 | `saham macd bullish hari ini` | Screener list | **teknikal.id #1.** Sisa SERP: carisaham per-sektor, berita sekuritas (investor.id), journalarta (AI content farm kecil) | `/saham-macd-bullish` | **Optimize** | R |
| 5 | `saham overbought hari ini` | Screener list | **teknikal.id #1** (halaman list) + #5 oversold ikut muncul. SERP bawah: investing, bisnis.com hub, brights.id blog lama | `/saham-overbought` | **Optimize** | R |
| 6 | `saham death cross hari ini` | Screener list | Untuk "saham death cross": akademi teknikal.id #1 + list page #3; pesaing journalarta (situs AI kecil) & wallstreetmojo (EN). Autocomplete hanya 2 varian — niche sempit tapi bebas pemain besar | `/saham-death-cross` | **Optimize** | R |
| 7 | `saham stochastic oversold hari ini` | Screener list | Halaman ini muncul #5 di SERP "saham oversold hari ini" tanpa dioptimasi. Niche stochastic = tanpa pemain besar sama sekali | `/saham-stochastic-oversold` | **Optimize** — title/H1 + internal link dari artikel stochastic (jika belum ada, buat) | R |
| 8 | `analisa saham bris` | Ticker-specific | **teknikal.id #6** (halaman ticker BRIS). Yang di atas: PDF riset sekuritas, sahamsp (indie), carisaham, kbvalbury PDF → semua lemah secara SEO on-page. Jarak ke top-3 dekat | `/stocks/BRIS.JK` | **Optimize** — title "Analisa Saham BRIS Hari Ini…", FAQ, internal link. Template ini lalu direplikasi ke 968 ticker | M |
| 9 | `analisa saham bumi hari ini` | Ticker-specific | Autocomplete: "analisa saham bumi" & "…hari ini" muncul eksplisit (indikatif demand tinggi). SERP = PDF sekuritas + berita investor.id + sahamsp/carisaham — halaman data harian teknikal.id lebih fresh & lengkap | `/stocks/BUMI.JK` | **Optimize** (replikasi template ticker #8) | M |
| 10 | `rsi saham bbca` / `rsi saham bbri` | Ticker+indikator | Autocomplete Google memunculkan "rsi saham bbca/bbri/bumi" persis — permintaan nyata (indikatif). Belum ada pemain khusus yang ranking; yang ada halaman app Stockbit. teknikal.id sudah menampilkan RSI live per ticker | `/stocks/BBCA.JK` (blok "RSI BBCA Hari Ini") | **Optimize** — heading per-indikator di template ticker agar terindeks untuk query "rsi/macd/ma saham [ticker]" | M |
| 11 | `kalender dividen saham` | Tools | SERP **100% situs indie**: telmi.id, sahamidx.com, carisaham, aitrade.id, mediasaham, iqplus — **nol big media**. Data teknikal.id update harian + tanpa login = pembeda | `/kalender-dividen` | **Optimize** — H1 "Kalender Dividen Saham IDX Hari Ini", tabel cum/ex/payment + yield | M |
| 12 | `kalender dividen november 2026` | Tools (bulan spesifik) | #1 telmi.id, #2 pantausaham.id (situs sangat kecil, konten manual). Query musiman berulang tiap bulan — menang sekali, menang terus tiap bulan | `/kalender-dividen` (seksi bulan berjalan + anchor) | **Optimize** — auto-generate heading bulan aktif | M |
| 13 | `net sell asing hari ini` | Data harian | Autocomplete kaya varian ("net sell asing ihsg hari ini", "…ytd", "…adalah"). SERP = topic page bisnis.com + artikel berita penainsight/kabarbursa (semuanya statis, tidak pernah #1 stabil) + edukasi ajaib. **Tidak ada satu pun halaman data live** — celah pas untuk /aliran-dana-asing | `/aliran-dana-asing` | **Optimize** — H2 "Net Buy/Net Sell Asing Hari Ini", update harian, FAQ "net sell asing adalah" | M |
| 14 | `screener saham gratis` | Tools-intent | SERP: carisaham (login-wall), serokin (bayar), indostock.ai, blog aitrade — semua indie, **tanpa big media**. teknikal.id = gratis tanpa login, belum masuk top-6 → ada ruang | `/stocks` | **Optimize** + artikel pendukung "Screener saham gratis tanpa login" | M |
| 15 | `screener saham ai` | Tools-intent | Muncul di autocomplete "screener saham" (indikatif). SERP diisi indostock.ai & blog — kompetitor indie; teknikal.id punya skor sinyal 9 indikator per emiten (bisa diceritakan sebagai "screener AI/otomatis") | `/stocks` (section skor) — dengan artikel #14 sebagai varian terpisah di `/berita`/akademi | **Artikel baru** listicle "Screener saham AI gratis" | M |
| 16 | `swing trade saham` | Strategi | **teknikal.id akademi #5.** Yang di atas (#1–3) = Investopedia, CMC Markets, Schwab — semuanya **EN, bukan pesaing nyata untuk pencari Indonesia**. Konten ID terbaik berikutnya cuma ajaib #6 → posisi "konten ID #2" bisa jadi #1 | `/akademi/strategi-swing-trade-saham-untuk-pemula` | **Optimize** — FAQ schema, contoh kasus live dari screener, internal link ke semua halaman sinyal | M |
| 17 | `cara baca rsi saham` | Edukasi | **teknikal.id akademi #1.** Belakang: heygotrade, TradingView docs, snips stockbit, mediasaham. Autocomplete 8 varian ("cara baca rsi 14", "…divergence", "…di stockbit") — demand edukasi besar (indikatif) | `/akademi/cara-membaca-rsi-saham-panduan-lengkap-pemula` | **Optimize/defend** — tambah FAQ varian autocomplete, link ke /saham-oversold & /saham-overbought | R |
| 18 | `supertrend saham artinya` | Edukasi | SERP: invezgo, indodax, dupoin, didimax, indovestory — **semua blog edukasi kecil**, tidak satu otoritas besar. Kecocokan produk sempurna: Supertrend ada di setiap halaman ticker teknikal.id (bisa embed contoh live) | `/akademi/` artikel baru "Cara Membaca Supertrend Saham" | **Artikel baru** | M |
| 19 | `cara screening saham golden cross` | Tutorial-tools | Autocomplete: "cara screening saham golden cross" + "…di stockbit" (indikatif — orang mencari cara, intent tutorial). SERP untuk varian ini kosong pemain besar; carisaham cuma punya halaman hasil, bukan tutorial | `/akademi/` artikel baru tutorial (redirect ke /saham-golden-cross) | **Artikel baru** | M |
| 20 | `saham overbought dan oversold hari ini` | Edukasi+list | #7 saat ini = brights.id blog bertanggal Nov 2024 (konten usang, statis). Intent "keduanya sekaligus" tak dilayani siapa pun dengan data live | `/akademi/` artikel baru evergreen "Overbought vs Oversold: cara baca & daftar hari ini" (link kedua list) | **Artikel baru** | M |
| 21 | `saham ema cross hari ini` | Screener list | SERP query sinyal sejenis diisi journalarta & situs kecil (lihat bukti #4/#6). Halaman sudah ada, belum dioptimasi | `/saham-ema-cross` | **Optimize** | R |
| 22 | `saham pullback sma20` | Screener list/strategi | Niche sangat sempit; pola SERP cluster sinyal = indie semua (bukti #2/#4/#6). Autocomplete "saham" family memunculkan varian volume/pullback | `/saham-pullback-sma20` | **Optimize** — tambah penjelasan strategi pullback di body | R |
| 23 | `daftar saham oversold` | List (varian head) | investing.com #1–2 (screener generik), **teknikal.id #3** — varian tanpa "hari ini" masih bisa naik karena intent-nya persis halaman kita | `/saham-oversold` (H2 varian "daftar saham oversold hari ini") | **Optimize** | R |
| 24 | `saham undervalued hari ini` | List fundamental | Autocomplete: "saham undervalued saat ini/hari ini/2026" (indikatif demand ada). SERP cluster screener-list dikuasai indie (bukti #14); halaman sudah ada | `/saham-undervalued` | **Optimize** — H1 + penjelasan kriteria (PER/PBV) | M |
| 25 | `saham volume naik harga turun` | Edukasi/diagnosis | Autocomplete varian #1 untuk basis "saham volume" (indikatif). Intent diagnosis pola — tak ada halaman fokus dari pemain mana pun; teknikal.id punya data OBV per ticker | `/akademi/` artikel baru "Volume naik harga turun artinya apa" | **Artikel baru** | M |

---

## Bonus — 5 Keyword LAYAK tapi JANGAN (kompetitor kuat / salah medan)

| Keyword | Kenapa jangan |
|---------|---------------|
| `ihsg hari ini` | SERP = investing.com, IDX Channel, TradingView, bisnis.com, detik.com. Head term real-time milik platform data + big media; DA rendah tak akan menembus 30–60 hari |
| `daftar saham lq45 terbaru` | Katadata, Liputan6, CNBC Indonesia, Kontan mengisi SERP setiap evaluasi indeks (query news-cycle, selalu ada berita baru yang fresh). Big media unggul permanen di sini |
| `saham potensi naik hari ini` | SERP = bittime, ajaib (brand besar + halaman harian ter-update), bisnis.com/rekomendasi. Intent "rekomendasi" YMYL — Google berat ke brand sekuritas/media |
| `golden cross artinya` | #1 Investopedia, lalu OKX/HSB/Indodax/Kraken — raksasa crypto-keuangan dengan authority masif. Ambil varian "saham"-nya saja (sudah #1, lihat #3) |
| `screener saham` (head) | Autocomplete didominasi brand (stockbit, ajaib) → navigasi ke app, bukan pencarian informasi. SERP kategori tools dengan pemain mapan. Serang varian long-tail-nya (#14, #15, #19) |

---

## Top-10 (urutan eksekusi)

1. **`analisa saham bris`** → optimize `/stocks/BRIS.JK` — bukti konsep template 968 ticker; dari #6 ke top-3 sangat dekat
2. **`net sell asing hari ini`** → optimize `/aliran-dana-asing` — satu-satunya halaman data live di SERP berita statis
3. **`kalender dividen saham` + varian bulanan** → optimize `/kalender-dividen` — SERP indie 100%, menang = compounding tiap bulan
4. **`swing trade saham`** → optimize akademi — pesaing "asli" cuma ajaib; 3 situs di atas adalah EN
5. **`screener saham gratis`** → optimize `/stocks` + artikel — keyword tools-intent paling komersial yang masih kosong big media
6. **`saham oversold hari ini`** → defend #1 + FAQ varian autocomplete (artinya/ciri/screener)
7. **`analisa saham bumi hari ini`** → replikasi template ticker setelah BRIS
8. **`supertrend saham artinya`** → artikel baru akademi — SERP blog kecil semua, produk match sempurna
9. **`rsi saham bbca/bbri`** → blok indikator di template ticker — mesin long-tail ribuan varian
10. **`cara baca rsi saham`** → defend #1 + internal-link mesh ke semua halaman sinyal

## Pola Besar

1. **"Sinyal + indikator + hari ini" = benteng teknikal.id.** SERP-nya diisi situs pribadi/indie (teknikal.net, chamid.org, journalarta, sahamgoldencross.com) — bukan Kontan/CNBC/Google. Big media tidak mau bikin halaman per-sinyal karena tak ada angle berita. Pertahankan 6 halaman yang sudah #1, lalu kloning polanya (ema cross, pullback, breadth, stochastic).
2. **Data-update-harian mengalahkan artikel statis.** SERP dividen & aliran dana asing berisi halaman manual indie (telmi, pantausaham) dan artikel berita yang cepat basi. Halaman yang refresh otomatis tiap hari + stamp tanggal = moat yang tak bisa ditiru blogger manual.
3. **Mesin long-tail per-ticker = asimetri terbesar.** "analisa saham [ticker]", "rsi saham [ticker]", "dividen [ticker]" — 968 halaman × 3 pola query = ribuan pintu masuk. BRIS #1…#6 membuktikan halaman ticker bisa ranking dengan DA rendah. Optimasi template sekali, menang di semua ticker.
4. **Edukasi indikator = medan blog kecil.** Supertrend/stochastic/RSI diisi blog edukasi & crypto exchange, tanpa media besar. Keunggulan teknikal.id: setiap artikel bisa menampilkan contoh live dari data sendiri (ticker + sinyal nyata hari ini) — hal yang tak bisa dilakukan penulis lepas.
5. **Hindari dua medan yang salah:** (a) head term pasar-hari-ini (`ihsg hari ini`) — milik platform data & big media; (b) intent rekomendasi (`saham potensi naik`) — YMYL, Google berat ke brand berlisensi. teknikal.id menang sebagai **alat/data**, bukan sebagai media berita atau penasihat.

---
*Volume: semua indikatif (autocomplete/related Google, dicek 1 Nov 2026). Tidak ada klaim angka volume pencarian. SERP dicek via web search langsung per query.*
