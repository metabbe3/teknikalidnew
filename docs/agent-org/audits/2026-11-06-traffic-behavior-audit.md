# Laporan Audit Traffic & Behavior `teknikal.id` (30 Hari: 7 Okt – 6 Nov 2026)

- **Tanggal Penarikan Data:** 6 November 2026, pukul 21:08–21:25 WIB (`14:08–14:25 UTC`)
- **Sumber Data:** PostgreSQL `teknikalid` (Read-Only `SELECT` murni)
- **Rentang Analisa:** `NOW() - interval '30 days'` (`2026-10-07 14:08 UTC` s/d `2026-11-06 14:25 UTC`)

---

## Catatan Skema, Adaptasi Metrik & 3 Temuan Data Hygiene Kritis

### A. Struktur Skema Aktual & Adaptasi Kolom
Hasil inspeksi `information_schema.columns` menunjukkan tabel `public."PageView"` memiliki 12 kolom aktual: `id, path, referrer, userId, ip, userAgent, createdAt, isBot, utmSource, utmMedium, utmCampaign, anonId`. Beberapa kolom yang disebut pada spesifikasi awal (`sessionId`, `durationMs`, `deviceType`, `screenWidth`, `language`, `country`, `city`) **tidak ada di tabel `PageView`**, sehingga diadaptasi secara presisi dari tabel pendamping yang tersedia:

1. **Identitas Pengunjung (`UV`):** Kolom `PageView."anonId"` baru mulai terisi pada **29 Oktober 2026** (`505` distinct `anonId` total — persis sesuai angka baseline ~504 UV owner, di mana `267` adalah `isBot=false`). Untuk mencakup penuh 30 hari (7 Okt – 6 Nov), digunakan kunci gabungan `visitor_key = COALESCE("anonId", "ip")` (`848` raw UV, `587` human UV). Kedua angka dilaporkan berdampingan.
2. **Sesi (`sessionId`) & Bounce Rate:** Direkonstruksi menggunakan jendela inaktivitas standar 30 menit (`1.800 detik`) per `visitor_key`. Sesi dengan `1` pageview dihitung sebagai *bounce*.
3. **Durasi Halaman (`durationMs` / Time-on-Page):** Diukur dari dua sumber nyata:
   - Tabel `public."EngagementEvent"` (`type = 'dwell_tick'`, `valueNum` dalam detik `15–180s` = `15.000–180.000 ms`) dan kedalaman baca (`type = 'scroll_max'`, `1–100%`).
   - Selisih antar-pageview dalam sesi yang sama (`LEAD("createdAt") - "createdAt"` untuk halaman non-exit).
4. **Device, Screen Width, Bahasa & Negara:** Diparsing dari `PageView."userAgent"` (termasuk resolusi fisik & *locale* dari in-app browser Threads/Instagram), blok jaringan `PageView."ip"`, `User."signupAsn"`, dan `TelegramWatch."lang"`.

### B. Tiga Temuan Forensik Data (Penting Sebelum Membaca Angka Mentah)
1. **Kebocoran Crawler Meta/Threads (`2a03:2880::/32` - AS32934) ke `isBot = false`:**
   Terdapat **`136` PageView (`133` `anonId` unik — hampir 50% dari `267` human `anonId`!)** dari IP datacenter Meta (`2a03:2880:%`) tanpa UA aplikasi Threads (`Barcelona`) yang lolos `isBot = false` karena memakai UA browser palsu (`Chrome/74`, `Firefox/59`, `Mac OS X 10_7_2`). Saat pembuat preview link Threads/Facebook me-render halaman selama 1–3 detik, script klien ikut menembakkan `scroll_max` (~33% tinggi layar awal) dan `guest_quota = 1`, lalu keluar (`100%` bounce, `0` klik navigasi).
2. **Volume Aktivitas Internal/Admin (`1.290+` PV):**
   Akun Admin (`Nicholas Andrian` / IP `114.12.1.248` & `103.85.62.162`) menyumbang **`945` PV terautentikasi** (dan ~`1.290` PV gabungan IP/admin), termasuk `332` PV di `/stocks/BBCA.JK` dan `573` PV di `/`. Agar keputusan bisnis tidak bias oleh testing internal maupun crawler Meta, laporan ini memisahkan **All Human (`isBot=false` & non-bot UA)** dan **External Real Human (tanpa Admin & tanpa Crawler Meta)**.
3. **Kontaminasi `AiChatLog` oleh `AiEvalRun` & Bug `anonId = NULL`:**
   - Dari **`203` baris** di `AiChatLog` (aktif sejak 30 Okt 2026), kolom `anonId`, `userId`, dan `followupClick` bernilai **kosong/`NULL` pada 100% baris (203/203)** sehingga join langsung `anonId` belum tersambung di backend.
   - Sebanyak **`103` baris (50,7%)** adalah eksekusi otomatis harian tabel `AiEvalRun` (jam ~18:25–18:43 WIB), dan **~`85` baris** adalah pengujian QA/prompt-injection internal, menyisakan **~`15` interaksi Tanya AI organik nyata** dari pengunjung eksternal.
   - Selain itu ditemukan bug frontend `referrer = 'https://teknikal.idundefined'` sebanyak **`122` PV**.

---

## 1. TRAFFIC OVERVIEW (30 Hari)

### 1.1 Ringkasan Bot vs Human
| Segmen Traffic (30 Hari) | PageViews (PV) | Share PV | Unique Visitors (`COALESCE(anonId,ip)`) | Distinct `anonId` (29 Okt–6 Nov) |
|---|---:|---:|---:|---:|
| **Total Raw Traffic** | **4.856** | **100,0%** | **848** | **505** |
| Bot via Regex UA Prompt (`bot\|crawl\|spider\|headless\|lighthouse\|python-requests\|curl`) | 653 | 13,4% | 188 | 173 |
| Bot Tambahan via Flag DB (`isBot = true` non-regex, mis. rate/IP) | 227 | 4,7% | 78 | 65 |
| **All Human Standar (`isBot = false` & lolos Regex UA)** | **3.976** | **81,9%** | **587** | **267** |
| *Dikurangi:* Crawler Preview Meta (`2a03:2880:%` non-Barcelona) | -136 | -2,8% | -136 | -127 |
| *Dikurangi:* Traffic Internal / Admin & Path `/admin*` | -1.290 | -26,6% | -31 | -15 |
| **External Real Human (Pengunjung Murni Eksternal)** | **2.550** | **52,5%** | **420** | **125** |

> **Rincian Bot Utama:** `HeadlessChrome/155–156` (506 PV), `meta-webindexer/1.1` + Meta IPv6 previewer (228 PV), `Bytespider` ByteDance (45 PV), dan `bingbot` (2 PV).

### 1.2 Tren Harian UV & PV (7 Okt – 6 Nov 2026 WIB)
| Tanggal (WIB) | Raw PV | Raw UV | All Human PV | All Human UV | Ext Real Human PV | Ext Real Human UV | Catatan Penting |
|---|---:|---:|---:|---:|---:|---:|---|
| 2026-10-07 | 79 | 2 | 79 | 2 | 79 | 2 | Awal jendela 30h (parsial) |
| 2026-10-08 | 130 | 15 | 130 | 15 | 128 | 14 | 1 signup (`Aryana`) |
| 2026-10-09 | 52 | 12 | 51 | 11 | 46 | 10 | 1 signup (`ali Pejuangreceh`) |
| 2026-10-10 | 83 | 8 | 66 | 7 | 60 | 6 | 1 signup (`Selvi Gustiana`) |
| 2026-10-11 | 59 | 9 | 57 | 8 | 57 | 8 | Akhir pekan |
| 2026-10-12 | 450 | 21 | 276 | 17 | **176** | 15 | Lonjakan PV tertinggi bulan Okt + 174 bot PV |
| 2026-10-13 | 132 | 13 | 127 | 12 | 122 | 9 | 1 signup (`Tri Sulardi`) |
| 2026-10-14 | 163 | 35 | 96 | 34 | 79 | **30** | Lonjakan UV organik |
| 2026-10-15 | 143 | 9 | 131 | 8 | 119 | 7 | 1 signup (`Ibnu faqih`) |
| 2026-10-16 | 132 | 17 | 73 | 15 | 40 | 9 | — |
| 2026-10-17 | 179 | 8 | 179 | 8 | 53 | 6 | Aktivitas admin tinggi |
| 2026-10-18 | 75 | 11 | 72 | 9 | 54 | 8 | Akhir pekan |
| 2026-10-19 | 53 | 13 | 46 | 12 | 26 | 11 | — |
| 2026-10-20 | 232 | 20 | 177 | 18 | 108 | 16 | `ShareEvent` `guest_quota` mulai aktif |
| 2026-10-21 | 174 | 32 | 149 | 30 | 121 | 26 | — |
| 2026-10-22 | 90 | 26 | 87 | 24 | 76 | 22 | 1 signup (`mc_sparkley`) |
| 2026-10-23 | 109 | 19 | 109 | 19 | 104 | 18 | 1 signup (`wrayhan07`) |
| 2026-10-24 | 322 | 22 | 236 | 20 | 57 | 18 | 1 signup (`Coco Coco`), testing internal |
| 2026-10-25 | 261 | 12 | 240 | 7 | 75 | 6 | Akhir pekan |
| 2026-10-26 | 183 | 27 | 154 | 25 | 102 | 14 | — |
| 2026-10-27 | 154 | 28 | 147 | 25 | 60 | 18 | — |
| 2026-10-28 | 185 | 29 | 148 | 27 | 106 | 25 | Tracking `nav_click` mulai masuk |
| 2026-10-29 | 182 | 40 | 165 | 33 | 62 | 22 | Kolom `PageView.anonId` mulai terisi |
| 2026-10-30 | 148 | 79 | 125 | 57 | 55 | **34** | Puncak Ext UV (kampanye Threads) + `AiChatLog` aktif |
| 2026-10-31 | 33 | 18 | 28 | 13 | 15 | 5 | Sabtu |
| 2026-11-01 | 43 | 26 | 32 | 15 | 9 | 7 | Minggu, halaman `/swing` pertama muncul |
| 2026-11-02 | 175 | 62 | 155 | 43 | 122 | 25 | Rebound awal pekan |
| 2026-11-03 | 167 | 74 | 145 | 52 | 106 | 25 | 1 signup (`Wing Ko`) |
| 2026-11-04 | 150 | 105 | 86 | 47 | 39 | 14 | 2 signup (`Aji`, `Tedy`), crawler Meta tinggi |
| 2026-11-05 | 217 | 82 | 167 | 35 | 134 | 19 | 1 signup (`Putu Satya`) |
| **2026-11-06** | **301** | **88** | **243** | **41** | **160** | **21** | **Tren naik kuat s/d 21:08 WIB, 2 signup baru** |

### 1.3 Device Split & Proxy Bucket Lebar Layar (`screenWidth`)
*(Adaptasi dari `userAgent` karena kolom `deviceType` & `screenWidth` tidak ada di `PageView`):*

| Kategori Device / Proxy Lebar Layar | All Human PV | Share Human PV | All Human UV | Ext Real Human PV | Share Ext PV | Ext Real Human UV | Share Ext UV | Rata-rata PV/UV (Ext) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **Mobile (`<768px` proxy)** | **2.650** | **66,6%** | 231 | **1.817** | **71,3%** | 141 | 33,5% | **12,89** |
| **Tablet (`768–1024px` proxy)** | **0** | **0,0%** | 0 | **0** | **0,0%** | 0 | 0,0% | 0,00 |
| **Desktop (`>=1024px` proxy)** | **1.325** | **33,3%** | 358 | **732** | **28,7%** | 279 | 66,3% | **2,62** |
| Unknown (`Mozilla/5.0` polos) | 1 | 0,0% | 1 | 1 | 0,0% | 1 | 0,2% | 1,00 |

- **Insight Layar Fisik (dari UA WebView Threads/IG `Barcelona`, `n=67` PV):** Seluruh perangkat memiliki lebar CSS efektif `<440px` (`<768px`), didominasi layar fisik `1080x2400` (420–480dpi, 19 PV), `1080x2340` (450–540dpi, 18 PV), `720x1612` / `720x1650` (9 PV), dan iPhone `1170x2532` / `1320x2868` (9 PV).
- **Mengapa Mobile mendominasi PV (`71,3%` 30h, bahkan `88,8%` hari ini 6 Nov) meski UV Desktop lebih banyak?** Pengguna ritel aktif Indonesia mengakses via Chrome Android (`1.641` PV dari `62` UV = **26,5 PV/UV**) & Safari iPhone (`76` PV dari `24` UV), sedangkan UV Desktop banyak berisi *one-hit bounce* dari Bing/pencarian sekali lewat (`2,62` PV/UV).

### 1.4 Bahasa & Negara / Jaringan ISP
- **Bahasa (dari Locale UA In-App Browser `n=68` PV & `TelegramWatch`):**
  - Bahasa Indonesia (`id_ID` / `in_ID`): **`44` PV (`64,7%`)**; pada `TelegramWatch.lang`: **`9/9` (`100%` `id`)**.
  - Bahasa Inggris (`en_US` / `en_GB` — umumnya HP user Indonesia bersetting OS English): **`21` PV (`30,9%`)**.
  - Lainnya (`es_US`): `3` PV (`4,4%`).
- **Negara / Jaringan ISP (dari Blok IP `PageView` Human `n=3.976` PV & `User.signupAsn`):**
  - **Indonesia — Telkom / Telkomsel / IndiHome (`AS7713`, `AS23693`):** `2.812` PV (**`70,7%`**), `177` UV, `11` pendaftar.
  - **Indonesia — Fixed ISP (Biznet, CBN, MyRepublic, FirstMedia):** `404` PV (**`10,2%`**), `55` UV.
  - **Indonesia — XL Axiata (`AS24203`):** `103` PV (**`2,6%`**), `11` UV, `2` pendaftar.
  - **Indonesia — Indosat Ooredoo Hutchison (`AS4761`):** `84` PV (**`2,1%`**), `13` UV, `3` pendaftar.
  - **Total Teridentifikasi ISP Domestik Indonesia:** **`3.403` PV (`85,6%` dari All Human PV)**.
  - **Datacenter Meta (`2a03:2880::/32` AS32934):** `142` PV (`3,6%`).
  - **Internasional / VPN / Cloud Proxy (`38.72.*`, `62.112.*`, `195.54.*`, dll.):** `418` PV (`10,5%`) — beberapa user Indonesia memakai VPN (contoh: user `Ibnu faqih` & `Aryana` login dari IP `38.72.134.28` & `62.112.138.9`).

---

## 2. REFERRER & ACQUISITION

### 2.1 Top-19 Seluruh Referrer Domain Aktual (30 Hari, Human `isBot=false`)
| # | Referrer Domain | All Human PV | All Human UV | Real Human PV (ex-Meta Crawler) | Real Human UV | Kelompok / Keterangan |
|---:|---|---:|---:|---:|---:|---|
| 1 | `teknikal.id` | 1.673 | 102 | 1.673 | 102 | Navigasi Internal |
| 2 | `(direct / none)` | 1.659 | 226 | 1.659 | 226 | Direct / Bookmark / In-App tanpa Referer |
| 3 | `www.bing.com` | 141 | 82 | **141** | **82** | **Search Organik #1 (Bing)** |
| 4 | `teknikal.idundefined` | 122 | 25 | 122 | 25 | **Bug URL Internal (`teknikal.id` + `undefined`)** |
| 5 | `accounts.google.com` | 75 | 11 | 75 | 11 | Redirect Login Google OAuth (bukan SEO) |
| 6 | `m.facebook.com` | 68 | 68 | 6 | 6 | 62 dari 68 PV adalah crawler Meta `2a03:2880` |
| 7 | `www.facebook.com` | 66 | 66 | 0 | 0 | **100% crawler preview Meta `2a03:2880`** |
| 8 | `l.threads.com` | 55 | 40 | **55** | **40** | **Klik Manusia Asli dari Threads** |
| 9 | `id.search.yahoo.com` | 50 | 11 | 50 | 11 | Search Organik (Yahoo ID) |
| 10 | `www.google.com` | 47 | 46 | **47** | **46** | **Search Organik Google** |
| 11 | `chatgpt.com` | 5 | 2 | 5 | 2 | AI Search (+19 PV lagi via `utmSource=chatgpt.com`) |
| 12 | `l.facebook.com` | 4 | 4 | 0 | 0 | Crawler Meta |
| 13 | `lm.facebook.com` | 4 | 4 | 0 | 0 | Crawler Meta |
| 14 | `search.yahoo.com` | 2 | 2 | 2 | 2 | Search Organik (Yahoo Global) |
| 15 | `www.threads.com` | 1 | 1 | 1 | 1 | Klik Threads Web |
| 16 | `sg.search.yahoo.com` | 1 | 1 | 1 | 1 | Search Organik (Yahoo SG) |
| 17 | `facebook.com` | 1 | 1 | 1 | 1 | Social |
| 18 | `com.google.android.googlequicksearchbox` | 1 | 1 | 1 | 1 | Google Discover / Search App Android |
| 19 | `www.perplexity.ai` | 1 | 1 | 1 | 1 | AI Search (Perplexity) |

### 2.2 Pengelompokan Channel Akuisisi Eksternal (Gabungan `referrer` + `utmSource`)
| Kelompok Channel Akuisisi | Human PV (Raw) | Real Human PV (ex-Meta Crawler) | Real Human UV | Catatan Kunci |
|---|---:|---:|---:|---|
| **Bing & Yahoo Search** | 194 | **194** | **96** | Sumber SEO terbesar saat ini (**4x lipat Google!**) |
| **Threads & Social Post (`threads` / `social`)** | 214 | **83** | **52** | `cta-chart` (32 real PV) & reply saham populer (`BBCA`, `TLKM`, `BBRI`, `TPIA`) |
| **Google Organic Search** | 48 | **48** | **47** | Hampir 1 PV per 1 UV (rasio bounce sangat tinggi di `/stocks/*`) |
| **AI Search (`chatgpt.com`, `perplexity.ai`, `ai-search`)** | 29 | **29** | **16** | Traksi awal GEO/AEO sangat sehat (28 PV ChatGPT, 1 PV Perplexity) |
| **Telegram (`utmSource = tg_digest` / `t.me`)** | 3 | **3** | **1** | `referrer` `t.me` = **0 PV**; hanya 3 PV via `utmSource=tg_digest` |
| **Instagram (`utmSource = instagram`)** | 6 | **1** | **1** | 5 dari 6 PV adalah crawler Meta |
| **Twitter / X (`t.co` / `x.com`)** | 0 | **0** | **0** | Belum ada traffic masuk dari X/Twitter dalam 30 hari |
| *Internal (`teknikal.id`) & Google OAuth* | *1.870* | *1.870* | *108* | Navigasi dalam web & callback login |
| *Direct / Tanpa Referrer* | *1.612* | *1.612* | *209* | Termasuk ketik langsung, PWA/bookmark, & app yang strip Referer |

### 2.3 Top Landing Path (Halaman Pertama Sesi) & Perbandingan Bot Telegram vs Google
**Top-10 Landing Path Sesi Real Human (ex-Meta Crawler, Total 751 Sesi):**
1. `/` (Home): **`293` sesi masuk** — Bounce **`41,3%`**, rata-rata **`5,63` halaman/sesi** (sangat lengket).
2. `/stocks` (Screener): **`131` sesi masuk** — Bounce **`45,8%`**, rata-rata **`4,04` halaman/sesi**.
3. `/stocks/BBCA.JK`: **`20` sesi masuk** — Bounce **`75,0%`**, rata-rata `1,50` halaman/sesi.
4. `/berita`: **`18` sesi masuk** — Bounce **`88,9%`**, rata-rata `1,28` halaman/sesi.
5. `/stocks/TLKM.JK`: **`9` sesi masuk** — Bounce **`100,0%`**, rata-rata `1,00` halaman/sesi.
6. `/stocks/TPIA.JK`: **`9` sesi masuk** — Bounce **`88,9%`**, rata-rata `1,29` halaman/sesi.
7. `/indeks`: **`8` sesi masuk** — Bounce **`12,5%`** (terbaik!), rata-rata **`4,00` halaman/sesi**.
8. `/stocks/RUNS.JK`: **`7` sesi masuk** — Bounce `71,4%`, rata-rata `3,14` halaman/sesi.
9. `/aliran-dana-asing`: **`7` sesi masuk** — Bounce `85,7%`, rata-rata `1,29` halaman/sesi.
10. `/akademi/per-dan-pbv-cara-membaca-valuasi-saham`: **`6` sesi masuk** — Bounce `100,0%`.

**Perbandingan Akuisisi Telegram vs Google:**
- **Telegram (`0` PV dari `t.me` referrer; `3` PV / `1` UV dari `utmSource=tg_digest`):** Pemeriksaan tabel `TelegramSent` membuktikan bot hanya mengirim **`1` pesan digest** dalam 30 hari terakhir (`28 Okt 2026`), tabel `TelegramWatch` baru memiliki **`8` pantauan aktif dari `3` `chatId`**, dan `BotInbox` `1` pesan. Sebaliknya, klik keluar dari web menuju bot Telegram (`EngagementEvent` `tg_*`) tercatat `9` klik. *Rekomendasi:* Pastikan semua link yang dikirim bot Telegram menyertakan `?utm_source=telegram&utm_medium=bot` (karena browser in-app Telegram sering menghapus header `Referer: t.me`) dan tingkatkan frekuensi pengiriman alert harian.
- **Google Organic (`48` PV / `47` UV):** Mayoritas mendarat langsung di halaman emiten tunggal (`/stocks/TLKM.JK` 5 PV, `/stocks/BMRI.JK` 3 PV, `/stocks/BUKA.JK` 2 PV, `/stocks/ADES.JK` 2 PV, `/stocks/BRMS.JK` 2 PV, `/stocks/CASA.JK` 2 PV, `/stocks/PACK.JK` 2 PV, `/` 5 PV). Berbeda dengan Bing/Yahoo (`194` PV) yang banyak mengindeks `/stocks` (`61` PV), `/indeks*` (`26` PV), `/akademi/*` (`18` PV), dan `/saham/*/kenapa-naik-hari-ini` (`16` PV), Google hampir belum mengarahkan trafik ke halaman direktori `/stocks` maupun `/indeks`.

---

## 3. BEHAVIOR, TOP-30 PATH & FUNNEL KONVERSI

### 3.1 Metrik Sesi Keseluruhan (30 Hari)
- **All Human (`isBot=false` & non-bot UA):** `887` sesi | `3.976` PV | **`4,48` pages/session** | Bounce Rate **`59,86%`** | Median durasi sesi aktif (>1 PV): **`234,1 detik`** (`3m 54d`).
- **External Real Human (tanpa Admin & tanpa Crawler Meta):** `540` sesi | `2.541` PV (ex-admin path) | **`4,71` pages/session** | Bounce Rate **`56,11%`** | Median durasi sesi aktif: **`161,5 detik`** (`2m 41d`) | Median `dwell_tick` per halaman: **`60,0 detik` (`60.000 ms`)**.

### 3.2 Top-30 Path Berdasarkan Views (30 Hari)
| # | Path | All Human PV | All Human UV | Ext Real Human PV | Ext Real Human UV | Keterangan Sumber Utama |
|---:|---|---:|---:|---:|---:|---|
| 1 | `/stocks` | 984 | 172 | **841** | **158** | Hub utama aplikasi (Screener) |
| 2 | `/` | 903 | 153 | **318** | **116** | Homepage (573 PV dari testing Admin) |
| 3 | `/stocks/BBCA.JK` | 180 | 43 | **23** | **21** | 149 Human PV dari Admin + link default `nav:stocks_BBCA` |
| 4 | `/berita` | 62 | 32 | **31** | **26** | Indeks berita pasar |
| 5 | `/saham-golden-cross` | 43 | 18 | **38** | **16** | Halaman SEO programatik terlaris |
| 6 | `/auth/signin` | 42 | 24 | **33** | **20** | Halaman masuk |
| 7 | `/stocks/DSSA.JK` | 36 | 18 | **11** | **10** | Konglomerasi / energi |
| 8 | `/stocks/AADI.JK` | 30 | 7 | **4** | **4** | Dominan testing Admin (26 PV) |
| 9 | `/paper-trading` | 28 | 15 | **18** | **12** | Simulasi trading |
| 10 | `/akademi` | 27 | 14 | **10** | **10** | Hub edukasi |
| 11 | `/stocks/TPIA.JK` | 27 | 17 | **22** | **12** | Internal screener + Threads |
| 12 | `/stocks/GOTO.JK` | 25 | 19 | **13** | **8** | Internal + 8 PV crawler Meta |
| 13 | `/auth/register` | 25 | 15 | **22** | **14** | Halaman daftar akun |
| 14 | `/stocks/FORU.JK` | 24 | 15 | **23** | **14** | **#1 Saham Murni Eksternal (tie BBCA)** |
| 15 | `/stocks/AKKU.JK` | 24 | 7 | **10** | **3** | Saham gocap/spekulatif + Admin |
| 16 | `/stocks/MKNT.JK` | 24 | 6 | **5** | **5** | 19 PV dari Admin |
| 17 | `/indeks` | 23 | 9 | **22** | **8** | SEO Bing/Yahoo sangat konversif |
| 18 | `/pasar` | 22 | 11 | **9** | **8** | Ringkasan pasar (13 PV Admin) |
| 19 | `/stocks/RUNS.JK` | 22 | 11 | **10** | **8** | SEO Bing/Yahoo + 3 chat AI |
| 20 | `/stocks/BNBR.JK` | 21 | 9 | **21** | **9** | 100% trafik eksternal + 1 AI summarize |
| 21 | `/stocks/TLKM.JK` | 21 | 21 | **10** | **10** | Google + Threads (+11 PV crawler Meta) |
| 22 | `/trading-plan` | 20 | 4 | **1** | **1** | Hampir murni testing Admin (19 PV) |
| 23 | `/aliran-dana-asing` | 19 | 8 | **17** | **6** | ChatGPT referral + navigasi riset |
| 24 | `/bottom-fishing` | 18 | 10 | **11** | **6** | Fitur riset pembalikan arah |
| 25 | `/stocks/IDEA.JK` | 18 | 7 | **18** | **7** | 100% eksternal mobile dari screener |
| 26 | `/stocks/SQMI.JK` | 18 | 10 | **18** | **10** | 100% eksternal mobile, scroll 95% |
| 27 | `/stocks/PCAR.JK` | 16 | 12 | **16** | **12** | 100% eksternal mobile |
| 28 | `/stocks/WAPO.JK` | 16 | 8 | **16** | **8** | 100% eksternal mobile |
| 29 | `/stocks/BMRI.JK` | 16 | 13 | **7** | **7** | Google + Direct + Meta crawler |
| 30 | `/stocks/DOOH.JK` | 15 | 8 | **14** | **7** | 100% eksternal mobile dari screener |

*(Peringkat 31–35: `/stocks/BBRI.JK` 15 PV [4 ext], `/portfolio` 15 PV [9 ext], `/stocks/BUMI.JK` 14 PV [10 ext], `/auth/complete-profile` 13 PV [13 ext], `/stocks/INET.JK` 13 PV [13 ext]).*

### 3.3 Durasi Median Time-on-Page per Kelompok Path
*(Lihat tabel lengkap gabungan durasi & bounce pada Bagian 5.1 di bawah; secara ringkas median `dwell_tick` tertinggi ada di `/pasar` `97.500 ms` [97,5s], disusul `/stocks`, `/stocks/*`, `/akademi/*`, `/indeks*`, dan `/paper-trading` masing-masing di **`60.000 ms` [60,0s]**, sedangkan `/`, `/swing`, `/berita/*`, dan `/saham*` berada di **`15.000 ms` [15,0s]**).*

### 3.4 Funnel Konversi 30 Hari (`/stocks/*` → Tanya AI → Register/Login → Subscribe)
| Tahap Funnel (Basis: Pengunjung Murni Eksternal 30 Hari) | Volume Unik | Konversi dari Tahap Sebelumnya | Konversi dari Total Ext UV (`420`) | Catatan Teknis & Fakta DB |
|---|---:|---:|---:|---|
| **1. Total Pengunjung Eksternal (`Ext Real Human UV`)** | **420 UV** | — | 100,0% | `COALESCE(anonId, ip)` bersih |
| **2a. Membuka Ekosistem Saham (`/stocks` atau `/stocks/*`)** | **273 UV** | 65,0% | 65,0% | `158` UV buka `/stocks`, `196` UV buka `/stocks/*` |
| **2b. Membuka Detail Emiten (`/stocks/*`)** | **196 UV** | 46,7% (dari total) | 46,7% | `959` PV eksternal |
| **3. Interaksi Tanya AI (`AiChatLog` & `fab_ask_ai`)** | **~6–8 UV estimasi** *(3 `anonId` klik FAB; ~15 chat organik)* | ~3,1%–4,1% dari penonton `/stocks/*` | ~1,4%–1,9% | **Join `anonId` = `0`** karena kolom `AiChatLog.anonId` & `userId` masih `NULL` di seluruh `203` baris (`103` baris `AiEvalRun` + ~`85` QA) |
| **4. Membuka Halaman Auth (`/auth/signin` atau `/auth/register`)** | **28 UV** *(`18` UV berasal dari penonton `/stocks/*`)* | **9,2%** dari penonton `/stocks/*` (`18/196`) | 6,7% | `/auth/signin`: 20 UV, `/auth/register`: 14 UV |
| **5. Registrasi Akun Berhasil (`public."User"`, role `USER`)** | **14 User Baru** *(`11` di antaranya membuka `/stocks/*`)* | **50,0%** dari pengunjung Auth (`14/28`) | **3,33%** | Akselerasi tajam ke **1,5 user/hari** pada 3–6 Nov |
| **6. Subscribe / Pembayaran (`public."Payment"` & `isPremium`)** | **0 User** | 0,0% | 0,0% | Tabel `Payment` = `0` baris, `User.isPremium=true` = `0`, `WaitlistSubscriber` 30h = `0` |

### 3.5 Pencarian / Search Terms
- **Query Param URL (`?q=`, `?search=`):** **`0` baris** pada `PageView.path` maupun `PageView.referrer` (aplikasi memotong query string sebelum menyimpan `path`, dan Google/Bing menyembunyikan keyword organik di `Referer`).
- **Pencarian Internal yang Terekam:** Fitur kotak cari saham (`EngagementEvent` `label = 'cari_saham_pilih'`) diklik **`43` kali** di halaman `/` oleh `8` `anonId` dan `fab_search_click` diklik **`5` kali** (pada `/stocks/ASPI.JK`, `BBCA`, `BBRI`, `BIPI`, `TPIA`). Pertanyaan pencarian bebas di Tanya AI didominasi tema: *"saham apa yang lagi oke hari ini?"*, *"saham sinyal terkuat sekarang?"*, *"saham dividen besar"*, *"blue chip oversold"*, dan *"berapa total modal carsurin"*.

---

## 4. SAHAM APA YANG OKE (Cross-Check Views vs Tanya AI — Top 15+)

### 4.1 Tabel 18 Besar Emiten Berdasarkan Permintaan Pengunjung Eksternal & Tanya AI (30 Hari)
*(Diurutkan berdasarkan **External Real Human PV** agar mencerminkan permintaan pasar sesungguhnya, dilengkapi Total Human PV & `AiChatLog` bersih vs mentah):*

| # | Ticker | Ext Real PV | Ext UV | All Human PV *(Admin PV)* | Mobile % (Ext) | Dwell Median | Scroll Median | Chat AI Bersih *(Raw)* | Kuadran Permintaan & Insight Data (Referrer / Device / Perilaku) |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | **BBCA** | **23** | 21 | 180 *(332 all)* | 74% | 180s | 32% | **30** *(64)* | **PERMINTAAN NYATA (Blue-Chip Jangkar):** Multi-sumber (Threads 7 real PV, Bing/Yahoo 4, Google 1, Direct/Home CTA `nav:stocks_BBCA`). Chat tinggi namun sebagian besar dari pengujian/eval; organik menanyakan posisi nyangkut @6000 & dividen. |
| 2 | **FORU** | **23** | 14 | 24 *(1)* | **96%** | **180s** | **82%** | **0** *(0)* | **PELUANG EMAS #1 (High View, 0 Chat):** 96% Mobile dari Screener internal + Google + 1 share story. Pengunjung baca sangat dalam (180s, scroll 82%) tapi 0 klik AI — butuh chip prompt AI kontekstual di halaman saham lapis-3. |
| 3 | **TPIA** | **22** | 12 | 27 *(0)* | 59% | 38s | 34% | **0** *(0)* | **PELUANG (Konglomerasi Prajogo):** Masuk dari Screener internal & Threads (`t-tpia` 3 real PV). Bounce masuk langsung 88,9% & scroll 34% — user butuh ringkasan cepat level support/resistance di atas lipatan. |
| 4 | **BNBR** | **21** | 9 | 21 *(0)* | 67% | **180s** | **64%** | **1** *(1)* | **PERMINTAAN NYATA (Turnaround/Momentum):** 100% trafik organik eksternal (Screener + SEO `/saham/bnbr/kenapa-naik-hari-ini`), dwell 180s, dan memicu **1 klik organik `summarize` AI**. |
| 5 | **IDEA** | **18** | 7 | 18 *(0)* | **100%** | **180s** | 54% | **0** *(0)* | **PELUANG (Small-Cap Screener):** 100% Mobile murni dari hasil saringan `/stocks` (`2,57` PV/UV, dwell 180s), 0 chat AI. |
| 6 | **SQMI** | **18** | 10 | 18 *(0)* | **100%** | **180s** | **95%** | **0** *(0)* | **PELUANG EMAS #2:** 100% Mobile dari Screener/Direct, **rekor baca terdalam (scroll 95%, dwell 180s)** namun 0 chat AI. Trader ritel sangat haus data teknikal emiten mikro ini. |
| 7 | **PCAR** | **16** | 12 | 16 *(0)* | **100%** | **180s** | 68% | **0** *(0)* | **PELUANG (Small-Cap Momentum):** 100% Mobile dari Screener, 12 UV berbeda membaca penuh (180s, scroll 68%), belum tersentuh Tanya AI. |
| 8 | **WAPO** | **16** | 8 | 16 *(0)* | **94%** | **180s** | **73%** | **0** *(0)* | **PELUANG (Small-Cap Momentum):** 94% Mobile dari Screener (`2,0` PV/UV, dwell 180s, scroll 73%), 0 chat AI. |
| 9 | **DOOH** | **14** | 7 | 15 *(0)* | **100%** | 98s | 30% | **0** *(0)* | **PELUANG + PENDORONG LOGIN:** 100% Mobile dari Screener; menariknya `1` user klik `/auth/signin` langsung dari `/stocks/DOOH.JK`. |
| 10 | **GOTO** | **13** | 8 | 25 *(6)* | 85% | 60s | 65% | **1** *(1)* | **PERMINTAAN NYATA:** 85% Mobile dari Screener/Direct (+8 crawler Meta dari Threads `t-goto`), scroll 65%, 1 chat menanyakan posisi nyangkut. |
| 11 | **INET** | **13** | 10 | 13 *(0)* | 69% | 98s | 39% | **1** *(1)* | **PERMINTAAN NYATA:** Murni eksternal dari Screener/Pasar, dwell 98s, dan terbukti memicu **1 klik organik `summarize` AI** oleh pengunjung eksternal (`4 Nov`). |
| 12 | **BUVA** | **13** | 7 | 13 *(0)* | **100%** | 15s | 45% | **0** *(0)* | **PELUANG (Cek Cepat Mobile):** 100% Mobile dari Screener, durasi singkat (15s) untuk cek skor cepat. |
| 13 | **SRSN** | **13** | 4 | 13 *(0)* | **100%** | 60s | 51% | **0** *(0)* | **PELUANG (Repeat Watcher):** Hanya 4 UV mobile tapi bolak-balik mengecek (`3,25` PV/UV, dwell 60s) — kandidat kuat fitur Alert Telegram `Pantau Saham`. |
| 14 | **BIPI** | **12** | 7 | 13 *(1)* | **100%** | 15s | 17% | **0** *(0)* | **PELUANG (Energi Lapis-2):** 100% Mobile, memicu klik `fab_search_click`, namun berhenti baca di 17% halaman atas. |
| 15 | **TMPO** | **12** | 6 | 12 *(0)* | 83% | **180s** | 41% | **0** *(0)* | **PELUANG:** Masuk dari Screener + SEO Bing (`/saham/tmpo/kenapa-turun-hari-ini`), dwell 180s. |
| 16 | **DSSA** | **11** | 10 | 36 *(23)* | 82% | **180s** | 31% | **0** *(0)* | **PELUANG:** Google + Threads + Screener, 82% Mobile, dwell 180s, juga mencapai `guest_quota=11` di `ShareEvent`. |
| 17 | **RUNS** | **10** | 8 | 22 *(15)* | **10%** *(90% Desktop)* | 60s | 33% | **3** *(3)* | **PERMINTAAN NYATA SPESIFIK:** Unik karena **90% Desktop dari SEO Bing/Yahoo** (`6` PV), memicu **3 chat AI beruntun** (valuasi, peer teknologi, timing entry) & **1 konversi registrasi akun (`mc_sparkley`)**! |
| 18 | **TLKM** | **10** | 10 | 21 *(3)* | 40% | **15s** | **12%** | **3** *(12)* | **ALARM LAYOUT LANDING:** Masuk dari **Google Organic (5 PV) & Threads (4 real PV)**, tetapi **bounce 100%**, dwell hanya 15s, scroll cuma 12%! Topik chat AI fokus pada keamanan dividen. |

*(Catatan emiten lain yang muncul di `AiChatLog`: **BBRI** [4 ext PV, 6 raw chat / 2 non-eval], **ANTM** [6 ext PV dari Bing/Google, 6 raw chat / 2 non-eval soal volume & vs INCO], **JRPT** [0 PV web, 3 chat soal dividen], **AMRT** [1 ext PV, 1 klik organik `summarize` AI], **AADI** [4 ext PV / 26 Admin PV, 1 chat risiko]).*

### 4.2 Kesimpulan Pola Saham
- **Permintaan Riil Pengunjung Aktif Terbelah Dua:** Pencari dari Google/Threads mencari **Blue-Chip (`BBCA`, `TLKM`, `BMRI`, `BBRI`, `ANTM`)** tapi langsung *bounce* cepat, sedangkan pengguna setia di dalam aplikasi (Mobile Android) justru memburu **saham lapis-2/3 ber-volatilitas tinggi (`FORU`, `BNBR`, `IDEA`, `SQMI`, `PCAR`, `WAPO`, `DOOH`, `INET`, `RUNS`)** melalui Screener `/stocks` dengan durasi baca sangat lama (`98–180 detik`).
- **Gap Konversi Tanya AI di Saham Lapis-2/3:** Saham seperti `FORU`, `SQMI`, `IDEA`, `PCAR`, dan `WAPO` punya atensi baca maksimal (`180s`), namun **0 chat AI** karena tombol mengambang `fab_ask_ai` hanya diklik `10` kali dalam 30 hari. Menaruh tombol/chip pertanyaan 1-klik langsung di bawah Skor Teknikal akan langsung membuka *bottleneck* ini.

---

## 5. LAYOUT PLUS-MINUS & DAMPAK ELEMEN BARU

### 5.1 Matriks Performa Layout Antar-Bagian Halaman (30 Hari, ex-Meta Crawler)
| Kelompok Halaman | PV (ex-Meta) | Ext Real PV | Ext UV | Inter-PV Median | Dwell Median (`ms`) | Scroll Median | Entry Sesi (Ext) | Bounce Entry (Ext) | Entry Google *(Search Total)* | Bounce Google *(Search Total)* | Vonis Layout |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| **Indeks (`/indeks*`)** | 44 | 42 | 9 | 9,0s | **60.000 ms** (60s) | **53%** | 10 | **20,0%** | 0 *(9)* | — *(**22,2%**)* | **MENANG TELAK (Best SEO Hub)** |
| **Home (`/`)** | 891 | 318 | 116 | 11,7s | 15.000 ms (15s) | 41% | 124 | **35,5%** | 5 *(13)* | **0,0%** *(**15,4%**)* | **MENANG (Router Efektif)** |
| **Screener (`/stocks`)** | 978 | **841** | **158** | 8,4s | **60.000 ms** (60s) | 39% | 123 | **48,0%** | 2 *(37)* | 100% *(**54,1%**)* | **MENANG (Core Sticky Engine)** |
| **Paper Trading (`/paper-trading`)** | 28 | 18 | 12 | 4,6s | **60.000 ms** (60s) | **87%** | 0 | — | 0 *(0)* | — | **MENANG KONVERSI (Scroll 87%)** |
| **SEO Saham (`/saham*`)** | 117 | 96 | 43 | 12,1s | 15.000 ms (15s) | 46% | 25 | 68,0% | 2 *(18)* | 100% *(72,2%)* | **CUKUP (`/saham-golden-cross` kuat)** |
| **Pasar (`/pasar`)** | 22 | **9** | 8 | 9,2s | **97.500 ms** (97,5s) | **15%** | 3 | 66,7% | 0 *(0)* | — | **KONTEN ATAS KUAT, DISCOVERY & SCROLL RENDAH** |
| **Akademi (`/akademi/*`)** | 59 | 36 | 29 | 8,6s | **60.000 ms** (60s) | 27% | 24 | 70,8% | 0 *(19)* | — *(84,2%)* | **BACA LAMA, KURANG JEMBATAN KE SCREENER** |
| **Detail Saham (`/stocks/*`)** | 1.310 | **959** | **196** | **40,6s** | **60.000 ms** (60s) | 31% | 160 | 63,8% | **35** *(43)* | **100,0%** *(**97,7%**)* | **BAGUS INTERNAL, KALAH PARAH SAAT ENTRY GOOGLE** |
| **Swing (`/swing`)** | 4 | **2** | 2 | 36,9s | 15.000 ms (15s) | 29% | 1 | 100,0% | 0 *(0)* | — | **TIDAK TERLIHAT (Minim Trafik)** |
| **Berita (`/berita` & `/berita/*`)** | 124 | 71 | 55 | 6,7s | **15.000 ms** (15s) | **29%** | 42 | **92,9%** | 3 *(4)* | **100,0%** *(75,0%)* | **LAYOUT KALAH (Durasi 15s + Bounce 92,9%)** |

### 5.2 Bedah Perbandingan `/pasar` vs `/swing` vs `/stocks/*` vs `/berita/*`
1. **`/stocks/*` (Paradoks Dua Wajah):** Saat diakses dari dalam aplikasi (mis. klik dari `/stocks`), pembaca bertahan sangat lama (`40,6s` antar-halaman, `60s` median dwell). Namun saat menjadi **pintu masuk dari Google Organic (`35` sesi entry), 35 dari 35 sesi (`100%`) langsung bounce**, dan dari total mesin pencari (`43` sesi), **`97,7%` bounce** dengan median scroll hanya **`31%`**! Pengunjung dingin dari Google melihat harga/skor di layar pertama tanpa terdorong mengeklik saham sejenis (klik `funnel_peer_card` + `funnel_peer_chip` cuma **`2` klik** dalam 30 hari!).
2. **`/berita/*` (Layout Kalah Utama):** Memiliki durasi terendah (`15s` dwell, `6,7s` inter-PV), scroll dangkal (`29%`), dan **bounce entry tertinggi (`92,9%` eksternal, `100%` Google)**. Pembaca brief pasar tidak mengeklik masuk ke halaman saham yang disebut di berita.
3. **`/pasar` vs `/swing`:**
   - **`/pasar`** hanya dikunjungi **`8` UV eksternal (`9` PV)** dalam 30 hari (klik menu `nav:pasar` hanya **`1` kali**!). Bagi yang masuk, mereka membaca bagian paling atas sangat lama (**`97,5s` dwell**), tapi **hanya scroll `15%`** — indikasi halaman terlalu padat di atas atau tampak sudah selesai di layar pertama, ditambah tidak terekspos di navigasi utama mobile.
   - **`/swing`** (aktif mulai 1 Nov) baru meraih **`2` PV eksternal (`2` UV)** dan `1` klik `nav:swing` dengan dwell `15s` & scroll `29%`. Secara distribusi layout, fitur `/swing` belum ditemukan user; sebaiknya dijadikan tab/preset utama langsung di dalam `/stocks` (mengingat preset di `/stocks` seperti `saringan_preset_radar` [8 klik] & `rsi_oversold` [5 klik] jauh lebih sering dipakai).

### 5.3 Pengukuran Dampak Elemen Baru: `bouncer-hook` (Mobile Guest) & Banner/Gate Register
Berdasarkan pelacakan event `EngagementEvent`, `ShareEvent`, dan transisi *next-path* menuju `/auth/register` & `/auth/signin`:

1. **`bouncer-hook` / `guest_quota` (Tamu Mobile):**
   - Secara mentah di `EngagementEvent` (29 Okt – 6 Nov) tercatat `194` event `guest_quota` (`165` `anonId`), namun **`122` `anonId` adalah crawler Meta `2a03:2880`** dan `1` Admin.
   - Pada **Tamu Mobile Eksternal Asli (`26` `anonId` unik)**:
     - **`21` orang (`80,8%`)** berhenti di `guest_quota = 1` → **`0` orang (`0%`)** ke halaman Auth (karena mereka langsung *bounce* di halaman saham pertama).
     - **`4` orang (`15,4%`)** mencapai `guest_quota = 2` → **`2` orang (`50,0%`) langsung membuka `/auth/signin` atau `/auth/register`!**
     - **`1` orang (`3,8%`)** mencapai `guest_quota = 3` → **`1` orang (`100,0%`) langsung membuka halaman Auth!**
   - **Kesimpulan Data `bouncer-hook`:** Begitu tamu mobile membuka saham ke-2 atau ke-3 (`quota >= 2`), konversi ke halaman login/register melonjak ke **`60,0%` (`3/5`)**! Kelemahannya bukan pada hook-nya, melainkan **80,8% tamu mobile gugur di saham pertama (`quota = 1`)** sebelum sempat melihat saham ke-2.

2. **Banner & Gate Register (`funnel_login_gate_cta`, `funnel_paper_gate_cta`, `nav_register_mobile`):**
   - Transisi halaman (*next-path* ke `/auth/register` & `/auth/signin` pada External Real Human) paling banyak dipicu dari:
     1. **`/stocks` (Screener):** `9` transisi (`6` Mobile ke `/auth/signin`, `3` Desktop ke `/auth/register`) dari `7` UV.
     2. **`/` (Home):** `7` transisi (`3` Mobile, `4` Desktop) dari `6` UV.
     3. **Detail Saham `/stocks/*` (`ACES`, `BBRI`, `DOOH`, `ARKO`, `BNBR`, `MEJA`, `SMCB`, `TLKM`, `UNVR`):** `12` transisi (`5` Mobile, `7` Desktop) dari `10` UV.
     4. **`/saham-golden-cross`:** `2` transisi Mobile langsung ke `/auth/register` (`2` UV).
     5. **`/paper-trading`:** `2` transisi (`1` Mobile, `1` Desktop) langsung ke `/auth/register` (`2` UV).
     6. **`/indeks/lq45`:** `1` transisi Mobile langsung ke `/auth/register` (`1` UV).
   - **Bukti Konversi ke User Terdaftar (Audit Jejak 6 Pendaftar Terbaru, 3–6 Nov 2026):**
     - `funnel_login_gate_cta` di `/stocks`: `2` klik unik → **`2` pendaftar sukses (`100%` konversi: `Aji Dirgantara` & `Putu Satya`)**.
     - `funnel_paper_banner_stocks` (`6` klik) + `funnel_paper_gate_cta` (`1` klik): memicu aliran `/stocks/AXIO.JK -> /paper-trading -> /auth/register` → **`1` pendaftar sukses (`Tedy Maulana`)**.
     - `nav_register_mobile` di `/indeks/lq45`: `1` klik → **`1` pendaftar sukses (`Gundhul` pada 6 Nov)**.
     - Tombol `nav:auth_signin` + `nav:masuk_dengan_google` dari `/stocks`: menghasilkan **`2` pendaftar sukses (`Wing Ko` & `Fatur Rokhim`)**.
   - **Dampak Bisnis Nyata:** Sejak elemen gate/banner register aktif di awal November, laju akuisisi akun melesat **4,8x lipat** dari **`0,31` pendaftar/hari** (8 Okt – 2 Nov: 8 user dalam 26 hari) menjadi **`1,50` pendaftar/hari** (3–6 Nov: **6 user baru dalam 4 hari**)!

---

## 6. TABEL BENCHMARK MINGGUAN (Angka Kunci Hari Ini & Baseline)

Gunakan tabel berikut sebagai patokan (*apple-to-apple* pada segmen **External Real Human** maupun **All Human**) untuk evaluasi mingguan setiap hari Jumat:

| Metrik Kunci | Baseline 30 Hari *(All Human `isBot=f`)* | Baseline 30 Hari *(Ext Real Human)* | 7 Hari Terakhir *(31 Okt–6 Nov, Ext)* | **Angka Hari Ini** *(6 Nov 2026 WIB, Ext)* | Target Mingguan (4 Minggu ke Depan) |
|---|---:|---:|---:|---:|---:|
| **Unique Visitors (UV)** | 587 *(19,6/hr)* | **417** *(13,9/hr)* | 91 *(13,0/hr)* | **21 UV** *(41 All Human)* | `>= 175 Ext UV / minggu` (`25/hr`) |
| **PageViews (PV)** | 3.976 *(132,5/hr)* | **2.541** *(84,7/hr)* | 585 *(83,6/hr)* | **160 PV** *(243 All Human)* | `>= 1.000 Ext PV / minggu` |
| **Total Sesi** | 887 | **540** | 145 | **28 Sesi** | `>= 220 Sesi / minggu` |
| **Bounce Rate (%)** | 59,9% | **56,1%** | 59,3% | **53,6%** | **`< 48,0%`** *(khusus Google `< 70%`)* |
| **Pages / Session** | 4,48 | **4,71** | 4,03 | **5,71** | **`>= 5,00`** |
| **Median Dwell Time (`dwell_tick`)** | 60,0s (`60.000 ms`) | **60,0s** (`60.000 ms`) | 15,0s (`15.000 ms`) | **15,0s** *(Sesi aktif: `161,5s`)* | **`>= 60,0s`** konsisten |
| **Share Mobile (% dari PV)** | 66,7% *(74,4% di sesi)* | **71,3%** | 69,6% | **88,8%** | Pantau UX Mobile-First (`70–85%`) |
| **Share Mobile (% dari UV)** | 39,4% | **33,6%** | 39,6% | **42,9%** | `>= 50,0%` |
| **Bounce Entry `/stocks/*` dari Search** | 97,7% | **97,7%** *(Google: `100%`)* | 100,0% | **100,0%** | **`< 65,0%`** (perbaiki hook peer/screener) |
| **Konversi Pengunjung → Signup (`User`)** | 2,39% (`14/587`) | **3,33%** (`14/420`) | **6,59%** (`6/91`) | **9,52%** (`2/21` hari ini) | Pertahankan **`>= 4,5%`** (`>= 8` user/mgg) |
| **Paid Subscription (`Payment`)** | 0 | **0** | 0 | **0** | Aktifkan eksperimen paket Pro / Waitlist |

### 5 Action Items Prioritas Berdasarkan Data (Tanpa Spekulasi)
1. **Perbaiki 3 Bug Telemetri Segera:** (a) Kirim & simpan `anonId` + `userId` ke tabel `AiChatLog` dan pisahkan flag `isEval = true` untuk `AiEvalRun`; (b) Masukkan ASN Meta `2a03:2880:%` (kecuali UA `Barcelona`/`Instagram`) ke deteksi `isBot = true` agar tidak mengotori `guest_quota` & bounce rate; (c) Perbaiki bug link internal yang menghasilkan referrer `https://teknikal.idundefined` (`122` PV).
2. **Selamatkan Entry Google di `/stocks/*` (`100%` Bounce) & `/berita/*` (`92,9%` Bounce):** Pindahkan widget *"3 Saham Sektor Sejenis yang Sinyalnya Lebih Kuat Hari Ini"* + tombol 1-tap ke `/stocks` tepat di paruh atas layar (`<35%` scroll) agar tamu Google punya alasan klik halaman ke-2 (yang otomatis mengaktifkan `bouncer-hook` `guest_quota >= 2` dengan konversi ke Auth 60%!).
3. **Pasang Chip Prompt Tanya AI 1-Klik di Halaman Saham Lapis-2/3 (`FORU`, `SQMI`, `IDEA`, `PCAR`, `WAPO`):** Trader mobile menghabiskan `180 detik` di emiten ini tapi jarang menekan tombol mengambang `fab_ask_ai`.
4. **Replikasi Template `/indeks*` (Bounce `20%`) & `/saham-golden-cross` untuk SEO Google:** Perkuat internal linking agar Google mengindeks `/indeks/*` dan `/saham-*` sebaik Bing (`194` PV). Gabungkan `/swing` & `/pasar` sebagai tab cepat di atas `/stocks` karena saat ini tersembunyi (`2` dan `9` Ext PV).
5. **Aktifkan Mesin Distribusi Bot Telegram + UTM:** Tambahkan `?utm_source=telegram&utm_medium=bot` di semua pesan bot dan hidupkan jadwal digest otomatis (`TelegramSent` baru terkirim `1` kali dalam 30 hari).

---

## LAMPIRAN: QUERY SQL NYATA YANG DIGUNAKAN (READ-ONLY)

```sql
-- L1. Inspeksi Tabel & Skema Aktual
SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema='public' AND table_name IN ('PageView', 'AiChatLog', 'EngagementEvent', 'User', 'Payment', 'ShareEvent', 'AiEvalRun')
ORDER BY table_name, ordinal_position;

-- L2. Ringkasan Bot vs Human & Tren Harian 30 Hari (WIB)
SELECT 
  DATE("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta') AS dt_wib,
  COUNT(*) AS pv_raw,
  COUNT(DISTINCT COALESCE("anonId", "ip")) AS uv_raw,
  COUNT(*) FILTER (WHERE "isBot" = false AND COALESCE("userAgent",'') !~* '(bot|crawl|spider|headless|lighthouse|python-requests|curl)') AS pv_human,
  COUNT(DISTINCT COALESCE("anonId", "ip")) FILTER (WHERE "isBot" = false AND COALESCE("userAgent",'') !~* '(bot|crawl|spider|headless|lighthouse|python-requests|curl)') AS uv_human,
  COUNT(*) FILTER (
    WHERE "isBot" = false
      AND COALESCE("userAgent",'') !~* '(bot|crawl|spider|headless|lighthouse|python-requests|curl)'
      AND NOT ("ip" LIKE '2a03:2880:%' AND COALESCE("userAgent",'') !~* 'Barcelona|Instagram|FBAN|FBAV')
      AND COALESCE("userId",'') != 'a681952b-096b-408b-befc-dc71f6e7853f'
      AND "ip" NOT IN ('114.12.1.248', '103.85.62.162', '::1', '::ffff:172.29.0.1')
      AND "path" NOT LIKE '/admin%'
  ) AS pv_ext_human,
  COUNT(DISTINCT COALESCE("anonId", "ip")) FILTER (
    WHERE "isBot" = false
      AND COALESCE("userAgent",'') !~* '(bot|crawl|spider|headless|lighthouse|python-requests|curl)'
      AND NOT ("ip" LIKE '2a03:2880:%' AND COALESCE("userAgent",'') !~* 'Barcelona|Instagram|FBAN|FBAV')
      AND COALESCE("userId",'') != 'a681952b-096b-408b-befc-dc71f6e7853f'
      AND "ip" NOT IN ('114.12.1.248', '103.85.62.162', '::1', '::ffff:172.29.0.1')
      AND "path" NOT LIKE '/admin%'
  ) AS uv_ext_human
FROM "PageView"
WHERE "createdAt" >= NOW() - interval '30 days'
GROUP BY 1 ORDER BY 1;

-- L3. Device Split & Screen Width Proxy dari User-Agent
WITH classified AS (
  SELECT *,
    CASE
      WHEN "isBot" = true OR COALESCE("userAgent",'') ~* '(bot|crawl|spider|headless|lighthouse|python-requests|curl)' THEN 'Bot'
      WHEN "userAgent" ~* '(iPad|Tablet|PlayBook|Silk)' OR ("userAgent" ~* 'Android' AND "userAgent" !~* '(Mobile|Barcelona|Instagram|FBAN)') THEN 'Tablet (768-1024px proxy)'
      WHEN "userAgent" ~* '(iPhone|iPod|Mobile|Barcelona|Instagram|FBAN|FBAV|Android)' THEN 'Mobile (<768px proxy)'
      WHEN "userAgent" ~* '(Windows NT|Macintosh|X11; Linux|CrOS)' THEN 'Desktop (>=1024px proxy)'
      ELSE 'Unknown'
    END AS device_bucket,
    (NOT ("ip" LIKE '2a03:2880:%' AND COALESCE("userAgent",'') !~* 'Barcelona|Instagram|FBAN|FBAV')
     AND COALESCE("userId",'') != 'a681952b-096b-408b-befc-dc71f6e7853f'
     AND "ip" NOT IN ('114.12.1.248', '103.85.62.162', '::1', '::ffff:172.29.0.1')
     AND "path" NOT LIKE '/admin%') AS is_ext
  FROM "PageView"
  WHERE "createdAt" >= NOW() - interval '30 days'
)
SELECT device_bucket, COUNT(*) AS pv_all, COUNT(DISTINCT COALESCE("anonId", "ip")) AS uv_all,
       COUNT(*) FILTER (WHERE device_bucket != 'Bot' AND is_ext) AS pv_ext_human,
       COUNT(DISTINCT COALESCE("anonId", "ip")) FILTER (WHERE device_bucket != 'Bot' AND is_ext) AS uv_ext_human
FROM classified GROUP BY 1 ORDER BY pv_all DESC;

-- L4. Referrer Domain Top-20 & UTM Breakdown
SELECT
  CASE WHEN "referrer" IS NULL OR "referrer" = '' THEN '(direct / none)'
       ELSE COALESCE(NULLIF(REGEXP_REPLACE("referrer", '^https?://([^/?#]+).*$', '\1'), ''), "referrer")
  END AS ref_domain,
  COUNT(*) AS pv_human,
  COUNT(DISTINCT COALESCE("anonId", "ip")) AS uv_human,
  COUNT(*) FILTER (WHERE NOT ("ip" LIKE '2a03:2880:%' AND COALESCE("userAgent",'') !~* 'Barcelona|Instagram|FBAN|FBAV')) AS pv_real_human
FROM "PageView"
WHERE "createdAt" >= NOW() - interval '30 days'
  AND "isBot" = false
  AND COALESCE("userAgent",'') !~* '(bot|crawl|spider|headless|lighthouse|python-requests|curl)'
GROUP BY 1 ORDER BY pv_human DESC LIMIT 20;

-- L5. Rekonstruksi Sesi (30 Menit), Bounce Rate, Pages/Session & Layout Plus-Minus per Path Group
WITH pv_base AS (
  SELECT *,
    COALESCE("anonId", "ip") AS visitor_key,
    ("ip" LIKE '2a03:2880:%' AND COALESCE("userAgent",'') !~* 'Barcelona|Instagram|FBAN|FBAV') AS is_meta_crawler,
    (COALESCE("userId",'') = 'a681952b-096b-408b-befc-dc71f6e7853f' OR "ip" IN ('114.12.1.248', '103.85.62.162', '::1', '::ffff:172.29.0.1') OR "path" LIKE '/admin%') AS is_admin,
    CASE
      WHEN "path" = '/' THEN '01. Home (/)'
      WHEN "path" = '/stocks' THEN '02. Screener (/stocks)'
      WHEN "path" LIKE '/stocks/%' THEN '03. Stock Detail (/stocks/*)'
      WHEN "path" = '/pasar' OR "path" LIKE '/pasar/%' THEN '04. Pasar (/pasar)'
      WHEN "path" = '/swing' OR "path" LIKE '/swing/%' THEN '05. Swing (/swing)'
      WHEN "path" = '/berita' OR "path" LIKE '/berita/%' THEN '06. Berita (/berita & /berita/*)'
      WHEN "path" = '/akademi' OR "path" LIKE '/akademi/%' THEN '07. Akademi (/akademi/*)'
      WHEN "path" LIKE '/saham%' THEN '08. Programmatic SEO (/saham*)'
      WHEN "path" LIKE '/indeks%' THEN '09. Indeks (/indeks*)'
      WHEN "path" LIKE '/paper-trading%' THEN '10. Paper Trading (/paper-trading)'
      WHEN "path" LIKE '/auth/%' THEN '11. Auth (/auth/*)'
      ELSE '12. Riset & Lainnya'
    END AS pgroup
  FROM "PageView"
  WHERE "createdAt" >= NOW() - interval '30 days'
    AND "isBot" = false
    AND COALESCE("userAgent",'') !~* '(bot|crawl|spider|headless|lighthouse|python-requests|curl)'
),
with_lag AS (
  SELECT *,
    CASE WHEN LAG("createdAt") OVER (PARTITION BY visitor_key ORDER BY "createdAt") IS NULL THEN 1
         WHEN EXTRACT(EPOCH FROM ("createdAt" - LAG("createdAt") OVER (PARTITION BY visitor_key ORDER BY "createdAt"))) > 1800 THEN 1
         ELSE 0 END AS is_new_sess
  FROM pv_base WHERE NOT is_meta_crawler
),
sess_pv AS (
  SELECT *, visitor_key || '#' || SUM(is_new_sess) OVER (PARTITION BY visitor_key ORDER BY "createdAt" ROWS UNBOUNDED PRECEDING) AS session_id
  FROM with_lag
),
pv_enriched AS (
  SELECT *,
    ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY "createdAt") AS step_num,
    COUNT(*) OVER (PARTITION BY session_id) AS sess_pv_cnt,
    EXTRACT(EPOCH FROM (LEAD("createdAt") OVER (PARTITION BY session_id ORDER BY "createdAt") - "createdAt")) AS next_pv_sec
  FROM sess_pv
)
SELECT pgroup,
  COUNT(*) AS pv_ex_meta,
  COUNT(*) FILTER (WHERE NOT is_admin) AS pv_ext,
  COUNT(DISTINCT visitor_key) FILTER (WHERE NOT is_admin) AS uv_ext,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY next_pv_sec)::numeric, 1) AS med_inter_pv_sec,
  COUNT(*) FILTER (WHERE step_num = 1 AND NOT is_admin) AS ext_entries,
  ROUND(100.0 * COUNT(*) FILTER (WHERE step_num = 1 AND sess_pv_cnt = 1 AND NOT is_admin) / NULLIF(COUNT(*) FILTER (WHERE step_num = 1 AND NOT is_admin), 0), 1) AS ext_bounce_pct,
  COUNT(*) FILTER (WHERE step_num = 1 AND "referrer" ~* 'www\.google\.com|googlequicksearchbox') AS google_entries,
  ROUND(100.0 * COUNT(*) FILTER (WHERE step_num = 1 AND sess_pv_cnt = 1 AND "referrer" ~* 'www\.google\.com|googlequicksearchbox') / NULLIF(COUNT(*) FILTER (WHERE step_num = 1 AND "referrer" ~* 'www\.google\.com|googlequicksearchbox'), 0), 1) AS google_bounce_pct
FROM pv_enriched GROUP BY pgroup ORDER BY pgroup;

-- L6. Cross-Check Top Saham (/stocks/*) vs AiChatLog (Raw vs Non-AiEvalRun) + Dwell & Scroll
SELECT c.ticker,
  COUNT(*) AS total_chats,
  COUNT(*) FILTER (WHERE NOT EXISTS (
    SELECT 1 FROM "AiEvalRun" e WHERE e."question" = c."question" OR ABS(EXTRACT(EPOCH FROM (c."createdAt" - e."createdAt"))) < 60
  ) AND c."question" !~* '(abaikan semua instruksi|asdf|aaaaa|XXX bagus)') AS clean_chats
FROM "AiChatLog" c
WHERE c."createdAt" >= NOW() - interval '30 days'
GROUP BY 1 ORDER BY total_chats DESC;

-- L7. Evaluasi guest_quota (Bouncer-Hook Mobile Guest) & Jejak Konversi User Baru
SELECT u.name, u."createdAt", u."signupIp", u."signupAsn", u."initialAnonId"
FROM "User" u
WHERE u."createdAt" >= NOW() - interval '30 days'
ORDER BY u."createdAt" DESC;
```
