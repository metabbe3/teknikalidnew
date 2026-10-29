# Audit Tracking & Data `teknikal.id` — "DATA = RAJA"

**Tanggal Audit:** 30 Oktober 2026  
**Repositori:** `/Users/nicholasandriansurjadi/Documents/teknikalidnew` (Next.js 15 + Prisma + PostgreSQL)  
**Mode Audit:** Read-Only (Inspeksi kode sumber langsung + rekonsiliasi angka DB produksi 30 Okt 2026)  
**Prinsip Utama:** Setiap keputusan produk wajib bisa diambil dari data deterministik yang bersih, dapat di-join lintas instrumen, bebas bias, dan mematuhi konvensi bahasa awam Indonesia, tap target `≥44px` (`min-h-11`), serta token warna resmi (`--color-accent`, `--color-bullish`, `--color-bearish`, `--color-warning`).

---

## 1. Ringkasan Eksekutif (Verdict per Area)

Kesimpulan utama audit: **`teknikal.id` sudah memiliki fondasi pengumpulan data first-party tanpa ketergantungan vendor pihak ketiga, tetapi ~70% keputusan bisnis seputar retensi ("apa yang membuat user balik?") dan akuisisi saat ini berjalan dalam kondisi buta atau membaca metrik yang bias.** Dua pendorong retensi terpenting yang baru dibangun — **Bintang Pantauan Guest (`GuestStar`)** dan **Delta Pantauan (`MorningDeltaCard` / `WelcomeBackBanner`)** — memiliki keterukuran event **0%**, sementara metrik `dwell_tick` dan `scroll_max` terdistorsi oleh bug siklus hidup SPA (*Single Page Application*).

| Area Instrumen | Verdict | Bukti Kode (`file:baris`) | Bukti Angka Prod (30 Okt) | Diagnosis Inti |
|---|---|---|---|---|
| **1. `PageView` Core & Bot Filter** | **OKE** *(Fondasi)* / **SALAH** *(Dedup & SPA Query)* | **OKE:** `src/hooks/use-page-view.ts:68-86` (`sendBeacon` + dedup `sessionStorage` 5 dtk), `src/app/api/track/pageview/route.ts:120-123` (`detectBot` + `isBlocked`), `prisma/schema.prisma:1084,1094` (kolom + index `anonId`).<br>**SALAH:** `src/app/api/track/pageview/route.ts:130` (dedup server pakai `ip`, lupa `anonId`), `src/hooks/use-page-view.ts:98` (`[pathname]` saja, abaikan `?preset=`). | `1.386` views 7h (`isBot=false`), mobile `685` vs desktop `508`, `anonId` baru `8` baris. | Pencatatan dasar & filter bot solid, tetapi dedup 5 detik berbasis IP membuang view valid di jaringan seluler CGNAT, dan perubahan filter/preset screener via query string tidak tercatat. |
| **2. Kelengkapan Event Produk (`EngagementEvent`)** | **KURANG** | `src/components/stock/guest-star.tsx:43-49` (tanpa `data-engagement`), `src/app/(public)/stocks/[ticker]/page.tsx:751-758,1050-1057` (CTA Telegram tanpa tag), `src/components/home/morning-delta-card.tsx:17-71`, `src/components/chart/chart-section.tsx:169-226`, `src/components/home/hero-search.tsx:51-68`. | `cta_click` 7h hanya **`27` baris** (~10 label unik) dibanding `1.386` PageView (**rasio 1,9%**). `star_add` = **`0`**, `preset_save` = **`0`**. | Aksi mikro bernilai tinggi (klik bintang pantauan, interaksi grafik, buka rincian 9 indikator, pencarian saham, impresi/klik delta pantauan, 5 dari 6 titik CTA Telegram) **belum diukur sama sekali**. |
| **3. Kualitas `dwell_tick` & `scroll_max`** | **SALAH** *(Bias Berat)* | `src/components/engagement-instrument.tsx:144-184,207` (singleton `installed = true` di `RootLayout`, `start` & `scrollSent` tidak pernah reset saat pindah halaman SPA; timer 5 dtk mengunci `scrollSent = true`), `src/app/api/admin/engagement/route.ts:75-77` (`avg("valueNum")` merata-rata baris milestone). | `dwell_tick = 1.760` (`15s=805`, `60s=544`, `180s=411`); `scroll_max = 919` (`100%=133`, muncul nilai anomali `1–2`). | Waktu baca tidak reset antar-halaman SPA & tetap jalan saat tab di-background. `scroll_max` terkunci permanen pada detik ke-5 sejak scroll pertama (`1–2%` di halaman panjang), dan halaman SPA ke-2 dst tidak pernah mengirim `scroll_max`. |
| **4. Kualitas `cta_click` & `nav_click`** | **SALAH** *(Optimal-Setengah)* | `src/components/engagement-instrument.tsx:93,98` (dead selector `[class*='GuestStar']` & `[class*='SaveScreen']`), `:124,135-136,189-195` (double-fire CTA+nav, potong 2 segmen & 20–32 char), `src/app/auth/register/page.tsx:213` (`register_completed` pada klik tombol sebelum API sukses). | `nav_click = 88`, `cta_click = 27`; `register_step1_submit = 3`, `register_completed = 2`. | Fallback selector CSS mati di komponen Tailwind; `nav_click` memotong slug artikel/glosarium menjadi generik (`nav:akademi_glosarium`); `register_completed` menghitung percobaan klik, bukan akun yang benar-benar terbuat. |
| **5. `ShareEvent` & `GuestPass`** | **SALAH** *(Tercemar & Tak Bisa Join)* | **OKE:** `src/components/ui/share-buttons.tsx:68-115` (`ShareButtons` memanggil `trackShare`).<br>**SALAH:** `src/components/ui/share-buttons.tsx:220-269` (`ShareToggleButton` lupa `trackShare`), `src/components/ui/guest-stock-tracker.tsx:56-62` (`target: "guest_quota"` masuk `ShareEvent`), `src/app/api/admin/guest-quota/route.ts:32,60` (join via `ip`, hardcode cap `n >= 6` padahal kuota sudah `25` di `src/lib/guest-pass.ts:24`). | `ShareEvent` `214` total / `165` 7h (mayoritas absolut adalah beacon `guest_quota`, bukan share sosial). | Tabel `ShareEvent` dicemari log kuota halaman saham guest, tidak punya kolom `anonId`, dan metrik `hitCap` di admin masih mengukur batas lama (6 saham, bukan 25). |
| **6. Identity, Join & Retensi (`retention.service.ts`)** | **KURANG** *(Putus Lintas Tabel)* | **OKE:** `src/lib/retention.service.ts:113` (`COALESCE(userId, anonId, ip)` di mingguan), `src/lib/guest-storage.ts:25-32` (`try/catch` storage).<br>**SALAH/KURANG:** `prisma/schema.prisma:1099-1116` (`ShareEvent` tanpa `anonId`), `src/components/engagement-instrument.tsx:37` (`getAnonId` tanpa `try/catch` lokal), `src/lib/retention.service.ts:130-132` (double-shift `+7 hours` + cohort D1/D7 hanya `User` terdaftar), tiada jembatan `anonId → userId` & `anonId → chatId`. | `31` user register, **79% trafik anonim**, `anonId` di `PageView` baru `8` baris; weekly returning `14→38→34→63→31`. | `PageView ↔ EngagementEvent` mulai bisa di-join sejak 30 Okt, tetapi **putus** ke `ShareEvent`, `GuestPass` (hanya cookie), `TelegramWatch`, dan `User` (user anonim yang daftar terpecah jadi 2 identitas). |
| **7. Funnel Formal & Bot Telegram** | **KURANG** | `src/app/api/admin/funnel/route.ts:35-55` (agregat harian halaman, bukan cohort user), `src/app/api/admin/engagement/route.ts:85-104` (hanya `EngagementEvent`), `scripts/telegram-bot/poll.mjs:24-46` & `digest.mjs:88,114` (`TelegramWatch` tidak ada di `prisma/schema.prisma`). | `TelegramWatch` hanya **`1` chat (owner)**, `2` ticker aktif (`n=1`). | Belum ada funnel 5-tahap terpadu berbasis `anonId`. Kita tidak tahu apakah `n=1` di Telegram terjadi karena tombol di web tidak diklik atau user batal menekan `Start` di aplikasi Telegram. |
| **8. Error Tracking & System Health** | **KURANG** *(Blind Spot)* | `src/app/error.tsx:14` & `src/app/global-error.tsx:14` (`Sentry.captureException` mati karena `SENTRY_DSN` kosong + terblokir CSP `connect-src 'self'` di `src/proxy.ts:21`), `src/app/api/admin/errors/route.ts:37-60` (hanya `CronLog` + `AgentJob`), `src/proxy.ts:247` (hardcode status `200`). | **0 visibilitas** atas API `500`, crash SSR, JS error browser, maupun kegagalan `poll.mjs`/`digest.mjs`. | Crash JS sebelum hidrasi atau kegagalan validasi Zod pada beacon (`400`/`500` ditelan jadi `204`) terjadi 100% senyap tanpa counter maupun alert. |
| **9. UTM, Referrer & Akuisisi SEO** | **SALAH** *(Bocor di 6 Titik)* | `src/hooks/use-page-view.ts:10,27-30,52` (`document.referrer` SPA tidak di-clear; `gclid` dibuang server), `src/lib/validation.ts:95-98,244` (`max(255)` sebelum strip query → URL sosmed ber-`fbclid` gagal `400`), `src/proxy.ts:381` (`url.search = ""` hapus UTM di redirect saham), `src/app/sitemap.ts:263` (masih memuat URL 308 `/harga-saham-hari-ini`). | Referrer 7h: `(direct) 738`, internal `/stocks 154`, `bing.com 55`, Google organik `≈ 0` (GSC: `885` impr / `5` klik / pos `67,9`). | Angka `bing.com = 55` terinflasi oleh `document.referrer` yang lengket sepanjang navigasi SPA; URL iklan/sosmed panjang ditolak Zod `400` (kehilangan PageView + UTM sekaligus); belum ada log crawl `Googlebot` server-side. |

---

## 2. Detail Audit per Pertanyaan

---

### Pertanyaan 1 — KELENGKAPAN EVENT: Inventaris Aksi User Penting yang Belum Terukur & Prioritas Penjawab *"Apa yang Membuat User Balik?"*

Saat ini `EngagementEvent` di produksi hanya menangkap **`27` baris `cta_click`** dalam 7 hari terakhir (sekitar 10 label unik seperti `funnel_edu=4`, `brief_open=3`, `register_step1_submit=3`, `funnel_compare_open=2`, `register_completed=2`). Seluruh interaksi inti produk yang menunjukkan *value realization* (momen user merasa terbantu hingga mau kembali besok) **belum memiliki telemetri**.

#### Inventaris Lengkap Aksi Penting yang BELUM Terukur (0% Coverage)

##### A. Kelompok Prioritas 1 — Penjawab Langsung *"Apa yang Membuat User Balik?"* (Habit & Hook Loop)

1. **Klik Bintang Simpan/Hapus Pantauan Guest (`GuestStar`) & User Login (`StockActionBadge`)**
   - **Lokasi Kode:** `src/components/stock/guest-star.tsx:31-49` (dipakai di halaman detail saham & tabel screener) dan `src/components/stock/stock-action-badge.tsx:41-50` (jalur user login `/api/watchlist`), serta banner pengingat kunjungan berulang `src/components/stock/repeat-visit-hint.tsx:68-78`.
   - **Bukti Angka:** **`0` baris** event `star_add` di DB produksi (dari `2.794` total `EngagementEvent`). Selector fallback `el.closest("[class*='GuestStar']")` di `src/components/engagement-instrument.tsx:93` **100% mati** karena `GuestStar` memakai utility class Tailwind murni tanpa nama komponen di atribut `className`, dan tidak memiliki `data-engagement`.
   - **Bug Tambahan yang Ditemukan di `GuestStar`:** Pada `src/components/stock/guest-star.tsx:43,67,69`, elemen `<Link href="/stocks#pantauan">` dan `<a href="https://t.me/TeknikalidBot">` dirender **di dalam `<button onClick={handleClick}>`**. Selain melanggar spesifikasi HTML5, klik pada chip *"🔔 update sore via Telegram"* memicu *event bubbling* ke `handleClick` yang justru **menghapus kembali bintang saham yang baru saja disimpan**!
   - **Fix Konkret:**
     - Pindahkan chip flash (`baris 61-72`) ke luar `<button>` (bungkus keduanya dalam `<div className="relative inline-flex items-center">`), pastikan tombol utama mempertahankan `min-h-11` (`≥44px`).
     - Panggil fungsi telemetri eksplisit `trackEngagement("cta_click", added ? "pantau_tambah" : "pantau_hapus", kodeEmiten)` pada `handleClick` di `guest-star.tsx:32`, `stock-action-badge.tsx:42`, dan `repeat-visit-hint.tsx:69`.

2. **CTA Langganan Bot Telegram di 5 dari 6 Permukaan Utama**
   - **Lokasi Kode:**
     1. `src/app/(public)/stocks/[ticker]/page.tsx:1050-1057` — kartu utama *"Pantau {TICKER} tiap hari"* di halaman saham (**TANPA** `data-engagement`).
     2. `src/app/(public)/stocks/[ticker]/page.tsx:751-758` — tombol *"🔔 Kabari di Telegram"* di kartu Skor Sinyal (**TANPA** `data-engagement` DAN **TANPA** `?start={TICKER}_JK`, sehingga bot tidak otomatis memantau saham tersebut!).
     3. `src/components/telegram/subscribe-cta.tsx:51-58` — varian `footer` (**TANPA** `data-engagement`; hanya varian `inline` di `:98` yang punya `data-engagement="tg_subscribe_click"`).
     4. `src/components/stock/guest-star.tsx:69` — tautan Telegram pada chip setelah klik bintang (**TANPA** `data-engagement` & tanpa `?start=`).
     5. `src/components/stock/guest-watchlist-panel.tsx:78-86` (`/stocks#pantauan` sync batch `?start=watch_...`), `src/components/stock/channel-cta.tsx:11`, `src/app/(public)/saham/[ticker]/kenapa-naik-hari-ini/page.tsx:471`, `src/components/layout/footer.tsx:43`.
   - **Bukti Angka:** `TelegramWatch` hanya berisi **`1` chat (owner, 2 ticker)**, dan `tg_subscribe_click` tidak muncul di top label 7h. Karena `navClickLabel()` di `src/components/engagement-instrument.tsx:122` membuang semua link eksternal `https://`, klik ke `https://t.me/TeknikalidBot` hilang tanpa jejak.
   - **Fix Konkret:** Tambahkan `data-engagement="tg_pantau_klik"` pada seluruh tautan `t.me/TeknikalidBot` (atau tangkap semua `a[href*="t.me/TeknikalidBot"]` secara terpusat di listener `ctaLabel()` `engagement-instrument.tsx:92`), lengkapi `?start=${kode}_JK` di `stocks/[ticker]/page.tsx:752` & `guest-star.tsx:69`, serta sertakan token pendek `anonId` di payload `/start` (lihat detail di Pertanyaan 3 & 4).

3. **Impresi & Klik Kartu Delta Harian (`MorningDeltaCard` & `WelcomeBackBanner`)**
   - **Lokasi Kode:** `src/components/home/morning-delta-card.tsx:17-71`, `src/components/ui/welcome-back-banner.tsx:58-128`, dan `src/app/api/me/morning-delta/route.ts:10-35`.
   - **Bukti Angka:** **`0` event** impresi maupun klik pada ringkasan perubahan saham pantauan. Padahal 79% pengunjung adalah anonim dan fitur ini dirancang sebagai alasan nomor 1 pengunjung kembali setiap pagi/sore.
   - **Fix Konkret:** Kirim event `delta_pantauan_tampil` (dengan `valueNum = jumlahSahamBerubah`) sekali per sesi saat kartu menampilkan `bullets.length > 0`, dan tambahkan `data-engagement="delta_pantauan_klik"` pada tiap baris saham yang diklik dari kartu tersebut (`morning-delta-card.tsx:58`, `welcome-back-banner.tsx:92`).

##### B. Kelompok Prioritas 2 — Penjawab *"Fitur Analisa Apa yang Membuat User Paham & Betah?"* (Aha Moment)

4. **Membuka Rincian Skor Sinyal & Mode Bahasa Sederhana Indikator**
   - **Lokasi Kode:**
     - `src/components/stock/signal-breakdown-details.tsx:47-51` — elemen `<details>` *"Rincian 9 indikator"* pada kartu Skor Sinyal. (Perhatian: toggle `<summary>` pada `<details>` tidak terdeteksi oleh `navClickLabel` maupun `ctaLabel`).
     - `src/components/stock/indicator-panel.tsx:162-171` — tombol toggle *"Bahasa Sederhana"* vs mode teknis.
     - `src/components/stock/indicator-panel.tsx:343-350` — tombol *"Tampilkan 7 indikator lainnya"*.
     - `src/components/stock/verdict-feedback.tsx:35-58` — klik 👍/👎 akurasi sinyal (masuk tabel `SignalFeedback`, tetapi tanpa `anonId` sehingga tidak bisa diuji korelasinya terhadap retensi).
   - **Bukti Angka:** **`0` baris** di `EngagementEvent`. Kita tidak tahu apakah pengunjung awam benar-benar membaca alasan di balik skor sinyal atau langsung pergi.
   - **Fix Konkret:** Tambahkan `onToggle` di `signal-breakdown-details.tsx:47` (`if (e.currentTarget.open) trackCtaEvent("rincian_skor_buka")`), serta `data-engagement="indikator_awam_klik"` (`indicator-panel.tsx:163`) dan `data-engagement="indikator_semua_buka"` (`indicator-panel.tsx:344`, pastikan tinggi tombol `min-h-11`).

5. **Interaksi Grafik Harga (`ChartSection` — Timeframe, Tipe Grafik, Indikator Overlay, Bandingkan)**
   - **Lokasi Kode:** `src/components/chart/chart-section.tsx:169-193` (pilihan periode `1D/5D/1mo/3mo` & tombol `"🔒 Buka 6mo+"`), `:196-226` (tipe `Candle/Line/Area` & `Log`), `:271-315` (preset grafik `Klasik/Tren/Momentum/Bersih` & toggle overlay `SMA/EMA/BB/RSI/MACD`), `:330-368` (bandingkan emiten di grafik).
   - **Bukti Angka:** **`0` baris** di `EngagementEvent`.
   - **Fix Konkret:** Emit `cta_click` berlabel bahasa awam: `grafik_periode_ubah`, `grafik_periode_kunci` (saat user klik `6mo+` yang terkunci — sinyal niat daftar paling kuat!), `grafik_indikator_ubah`, dan `grafik_banding_tambah`.

6. **Keterlihatan Seksi Halaman Saham (*Section Visibility* pengganti Scroll Mentah)**
   - **Lokasi Kode:** `src/app/(public)/stocks/[ticker]/page.tsx:1061` (`#chart`), seksi `#indikator`, `#asing` (aliran dana asing), `#dividen`, dan `#plan` (area acuan harga).
   - **Bukti Angka:** `scroll_max` punya `919` baris tetapi tidak memberi tahu apakah user melihat seksi **Aliran Asing** atau **Indikator**, karena tinggi halaman tiap emiten berbeda drastis.
   - **Fix Konkret:** Pasang satu `IntersectionObserver` ringan (`threshold: 0.35`, sekali per seksi per halaman) untuk mencatat `seksi_grafik_lihat`, `seksi_indikator_lihat`, `seksi_asing_lihat`, `seksi_acuan_lihat`.

##### C. Kelompok Prioritas 3 — Penjawab *"Apa yang Dicari & Dibagikan User?"* (Discovery & Virality)

7. **Pencarian Saham & Pencarian Nihil (*Zero-Result Search*)**
   - **Lokasi Kode:** `src/components/home/hero-search.tsx:51-68`, `src/components/stock/ticker-fab.tsx:265-283` (`TickerSearchModal`), `src/components/stock/stock-table.tsx:145-153` (pencarian di `/stocks`), dan `src/app/not-found.tsx:12-28` (pencarian halaman 404).
   - **Bukti Angka:** **`0` baris** event pencarian. Seluruh filter bekerja di memori browser atas respons `/api/stocks`, sehingga server buta total ketika pemula mengetik nama merek sehari-hari (mis. *"Indomie"*, *"BCA"*, *"Pertamina"*) yang gagal cocok atau ketika user memilih hasil pencarian.
   - **Fix Konkret:** Saat user memilih hasil pencarian, kirim `cari_saham_pilih`; saat `debouncedQuery.length >= 3` menghasilkan `0` baris selama `>1000ms`, kirim `cari_saham_kosong` (simpan kueri yang sudah disanitasi huruf/angka maks 24 karakter, tanpa PII).

8. **Pemakaian Filter/Preset Screener, Urutan Tabel, Salin Tabel, & Tombol Bagikan Mobile**
   - **Lokasi Kode:**
     - `src/components/screener/screener-client.tsx:131-160` — pilih tab gaya, klik kartu preset (`Oversold`, `Golden Cross`, dll.), ubah filter kustom. (`usePageView` di `src/hooks/use-page-view.ts:98` hanya memantau `pathname`, sehingga `router.push('/stocks?view=screener&preset=rsi_oversold')` **tidak menghasilkan `PageView` maupun `EngagementEvent`**!).
     - `src/components/screener/screen-actions.tsx:148-155` — tombol *"Simpan ke Akun"* tidak cocok dengan regex `/simpan\s+(screen|preset)/i` di `engagement-instrument.tsx:100`.
     - `src/components/stock/eod-price-table.tsx:1-69` — belum ada tombol/telemetri salin ringkasan harga EOD (`tabel_harga_salin`).
     - `src/components/ui/share-buttons.tsx:220-269` — komponen `ShareToggleButton` (tombol *"Bagikan"* ringkas yang banyak muncul di mobile) **sama sekali tidak memanggil `trackShare()`**, berbeda dengan `ShareButtons` penuh di `:68-115`! Sementara `TickerFab` (`src/components/stock/ticker-fab.tsx:70-125`) mengirim `fab_share_*` ke `EngagementEvent`, bukan ke `ShareEvent`.
     - `src/components/ui/onboarding-wizard.tsx:88-106` — penyelesaian/penutupan panduan 3 langkah user baru hanya tersimpan di `localStorage["teknikal:wizard_done"]` (`0` telemetri server).
   - **Fix Konkret:** Panggil `trackShare(navigator.share ? "native" : "copy", ctx, path)` di `ShareToggleButton` (`share-buttons.tsx:227,234`) dan di `TickerFab`; tambahkan event `saringan_preset_klik`, `saringan_simpan`, `panduan_selesai`, dan `tabel_harga_salin`.

> **Catatan Kebersihan Kode:** File `src/lib/telemetry.ts:10-27` (transport kosong/no-op) dan `src/hooks/use-telemetry.ts:8-25` memiliki **0 pemanggil** di seluruh repo — jangan gunakan stub mati ini; satukan semua event interaksi UI ke pipeline `EngagementInstrument` yang sudah aktif.

#### Urutan Prioritas Event Penjawab *"Apa yang Membuat User Balik?"*
Jika diuji dengan analisis regresi retensi `D1–D7 Return Rate` per `anonId`, urutan daya prediksi tertinggi adalah:
1. **`pantau_tambah` + `delta_pantauan_tampil` / `delta_pantauan_klik`** → Mengukur apakah menyimpan saham di perangkat benar-benar menciptakan kebiasaan cek perubahan harian.
2. **`tg_pantau_klik` → `TelegramWatch` aktif → klik `utm_source=tg_digest`** → Mengukur efektivitas saluran pemicu eksternal (push harian 16:50 WIB tanpa bergantung ingatan user).
3. **`rincian_skor_buka` / `indikator_awam_klik` / `grafik_periode_ubah`** → Mengukur apakah pemahaman analisa teknikal bahasa awam berkorelasi dengan kunjungan ulang dibanding sekadar melihat harga.
4. **`saringan_preset_klik` / `saringan_simpan` / `cari_saham_pilih`** → Mengukur apakah eksplorasi penemuan saham baru (*discovery*) memicu retensi mingguan.

---

### Pertanyaan 2 — KUALITAS DATA SAAT INI: Apa yang Benar (`OKE`) vs Bias / Bocor (`SALAH`)

#### Bagian yang Sudah Benar (`OKE` — Terverifikasi Kode)
- **Pengiriman Beacon Anti-Putus saat Unload (`OKE`):** `src/components/engagement-instrument.tsx:57-67,201-205` menggunakan `navigator.sendBeacon` dengan `Blob` `application/json` pada `visibilitychange` (`hidden`) dan `pagehide`, serta fallback `fetch(..., { keepalive: true })`. `src/hooks/use-page-view.ts:85-96` melakukan pola serupa untuk `PageView`.
- **Filter Bot & Rate-Limit Endpoint Engagement (`OKE`):** `src/app/api/public/engagement/route.ts:16-30,48-50` menerapkan pembatasan `65 req/menit/IP` di memori dan membuang trafik bot menggunakan `detectBot(userAgent, ip)` sebelum insert ke PostgreSQL.
- **Dedup Double-Mount Client `PageView` (`OKE`):** `src/hooks/use-page-view.ts:72-79` menahan tembakan ganda dalam jendela `5.000ms` via `sessionStorage["pv:" + pathname]` ketika user berpindah *layout group* Next.js (`(public)` ↔ `auth`).
- **Tombol Bagikan Desktop/Lengkap (`OKE`):** `src/components/ui/share-buttons.tsx:68-115` memanggil `trackShare()` untuk lima target (`whatsapp`, `x`, `telegram`, `copy`, `story`) lengkap dengan konteks template (`:51-58`).

#### Bagian yang Bias, Bocor, atau Salah Hitung (`SALAH` / `OPTIMAL-SETENGAH`)

##### 1. `dwell_tick` — **SALAH / BIAS BERAT**
- **Lokasi Kode:** `src/components/engagement-instrument.tsx:32,144-161` & `src/app/api/admin/engagement/route.ts:75-77`.
- **Bukti Angka:** Total `1.760` baris (`15s = 805`, `60s = 544`, `180s = 411`). Rasio `180s / 15s = 411 / 805 = 51,1%` tampak luar biasa tinggi secara tidak wajar untuk situs web finansial publik.
- **3 Akar Masalah di Kode:**
  1. **Buta Navigasi SPA (Salah Atribusi Halaman & Mati Setelah 180 Detik):** `EngagementInstrument` dipasang satu kali di `RootLayout` (`src/app/layout.tsx:155`) dengan penjaga module-level `if (installed) return; installed = true;` (`engagement-instrument.tsx:144-145`). Variabel `const start = Date.now()` (`:152`) dan `ticksSent` (`:153`) **tidak pernah di-reset** saat user berpindah halaman via `<Link>` Next.js! Jika user berada di `/` selama 14 detik lalu klik `/stocks/BBCA.JK`, 1 detik kemudian tick `15s` ditembakkan dengan `path: "/stocks/BBCA.JK"`. Lebih parah lagi, setelah total tab terbuka 180 detik (`:160`), `window.clearInterval(dwellTimer)` mematikan pengukuran dwell **selamanya** untuk halaman ke-3, ke-4, dst.
  2. **Inflasi Tab Background:** `elapsed = Math.floor((Date.now() - start) / 1000)` (`:155`) menghitung jam dinding murni tanpa mengecek `document.visibilityState === "visible"`. User yang membuka tab lalu pindah ke aplikasi WhatsApp selama 4 menit, saat kembali ke tab akan memicu loop `while` (`:156-159`) yang menembakkan `15s`, `60s`, dan `180s` sekaligus! Inilah penyebab angka `180s = 411` (`51%` dari `15s`) terinflasi tajam.
  3. **Salah Rumus Rata-Rata di Admin API:** Pada `src/app/api/admin/engagement/route.ts:75-77`, query menghitung `avg("valueNum") FILTER (WHERE type = 'dwell_tick')` langsung di atas baris milestone mentah. Satu sesi 180 detik menulis **3 baris** (`15`, `60`, `180`), sehingga SQL menghitung rata-ratanya sebagai `(15 + 60 + 180) / 3 = 85 detik` (padahal durasi sebenarnya `≥180 detik`)! Dengan angka produksi saat ini, rata-rata mentah seluruh DB terhitung `(805×15 + 544×60 + 411×180) / 1760 = 67,4 detik`, angka artifisial yang tidak bermakna statistik.
- **Fix Konkret:**
  - Pantau perubahan `usePathname()` di `EngagementInstrument`: saat `pathname` berubah, flush data halaman lama, lalu reset akumulator waktu aktif halaman baru & `ticksSent = 0`.
  - Akumulasikan detik **hanya** ketika `document.visibilityState === "visible"`.
  - Di `/api/admin/engagement/route.ts:75`, hitung `MAX("valueNum")` per `(anonId, path, tanggal)` terlebih dahulu dalam CTE sebelum menghitung `AVG` dan `PERCENTILE_CONT(0.5)`.

##### 2. `scroll_max` — **SALAH / BOCOR (Termasuk Bukti Matematis Nilai `1–2`)**
- **Lokasi Kode:** `src/components/engagement-instrument.tsx:165-184,207`.
- **Bukti Angka:** `919` baris total (`100% = 133`), dengan kemunculan nilai anomali sangat kecil **`valueNum = 1` atau `2`**.
- **2 Akar Masalah & Bukti Matematis `valueNum = 1–2`:**
  1. **Penguncian Prematur pada Detik ke-5 (`scrollSent = true`):** Baris `:207` menjalankan `window.setInterval(() => flushWithScroll(false), 5000)`. Begitu user menyentuh layar dan menggulir sedikit saja dalam 5 detik pertama (`maxScroll > 0`), pada detik ke-5 `flushWithScroll` (`:178-183`) mengeksekusi `scrollSent = true` dan mengirim nilai `maxScroll` saat itu juga! Seluruh aktivitas scroll user setelah detik ke-5 (mis. lanjut membaca sampai `85%`) **dibuang selamanya** karena `!scrollSent` sudah `false`. Dan karena `scrollSent` tidak pernah di-reset pada navigasi SPA, seluruh halaman berikutnya dalam sesi yang sama mendapat **0 baris `scroll_max`**.
  2. **Mengapa Muncul Nilai `1` dan `2`?** Rumus pada baris `:169-170` adalah:
     $$\text{pct} = \text{Math.round}\left(\frac{\text{window.scrollY} + \text{window.innerHeight}}{\text{document.documentElement.scrollHeight}} \times 100\right)$$
     Agar $\text{pct} \in \{1, 2\}$, rasio pembilang terhadap `scrollHeight` harus berada di rentang $0{,}5\% \le \text{rasio} < 2{,}5\%$. Pada layar HP tipikal (`innerHeight = 667px`) dengan sentuhan awal tipis dalam 5 detik pertama (`scrollY ≈ 10–50px`, pembilang `≈ 700px`), halaman dengan tinggi DOM `scrollHeight ≥ 28.000px` s.d. `65.000px` (seperti daftar saham/glosarium panjang atau tabel desktop non-virtual/kontainer panjang saat load awal) menghasilkan $\frac{700}{45.000} \times 100 = 1{,}55\% \rightarrow \mathbf{2}$ (atau $\frac{680}{55.000} \times 100 = 1{,}23\% \rightarrow \mathbf{1}$). Karena timer 5 detik langsung mengunci `scrollSent = true`, angka `1` atau `2` tersebut membeku permanen di DB! Sebaliknya, di halaman pendek seperti `/auth/signin` di mana `innerHeight >= scrollHeight`, goresan scroll 1px langsung menghasilkan **`100%`** (menyumbang sebagian dari `133` baris `100%`).
- **Fix Konkret:**
  - **Jangan pernah** memanggil `flushWithScroll` dari `setInterval` 5 detik! Di `setInterval` 5 detik (`:207`), cukup panggil `flush(false)` untuk mengosongkan antrean klik/dwell.
  - Kirim `scroll_max` **hanya** saat user benar-benar selesai dengan halaman tersebut: yaitu pada pergantian `pathname` SPA, `visibilitychange` (`hidden`), atau `pagehide`, dan hanya jika `documentHeight > innerHeight * 1.2` (agar halaman pendek 1 layar tidak memalsukan `100%`).

##### 3. `cta_click` — **KURANG & BIAS DEFINISI**
- **Lokasi Kode:** `src/components/engagement-instrument.tsx:87-102,187-195` & `src/app/auth/register/page.tsx:213,227-238`.
- **Bukti Angka:** Hanya **`27` baris** dalam 7 hari; `register_step1_submit = 3`, `register_completed = 2`.
- **3 Masalah Kualitas:**
  1. **Dead Fallback Selectors:** `[class*='GuestStar']` (`:93`) dan `[class*='SaveScreen' i]` (`:98`) tidak pernah cocok dengan class Tailwind yang terkompilasi di DOM.
  2. **False-Positive `register_completed` & Buta Google OAuth:** Di `src/app/auth/register/page.tsx:213`, `data-engagement="register_completed"` dipasang langsung sebagai atribut HTML pada `<button type="submit">`. Artinya event tercatat **saat tombol diklik**, SEBELUM `/api/auth/register` memvalidasi password/email duplikat! Jika submit gagal error 400/409 dan user klik 2 kali, tercatat `2` `register_completed` palsu; sebaliknya user yang mendaftar lewat tombol *"Daftar dengan Google"* (`:227-238`) **tidak punya atribut `data-engagement`** sama sekali!
  3. **Double-Fire dengan `nav_click` & Tanpa Konteks Emiten:** Di `engagement-instrument.tsx:189-195`, komentar di `:191` menulis *"cta_label eksplisit tetap menang utk tombol yang ter-tag"*, tetapi kode di bawahnya **tidak memakai `else` atau `return`**! Akibatnya setiap `<a data-engagement="...">` internal menembakkan **dua baris sekaligus** (`cta_click` DAN `nav_click`). Selain itu skema `EngagementEvent` tidak menyimpan metadata target (mis. ticker mana yang dibintangi).

##### 4. `nav_click` — **OPTIMAL-SETENGAH (Terpotong & Kehilangan Makna)**
- **Lokasi Kode:** `src/components/engagement-instrument.tsx:111-140,194`.
- **Bukti Angka:** `88` baris dalam 7 hari.
- **3 Masalah Kualitas:**
  1. **Pemotongan 2 Segmen Path (`slice(0, 2)`):** Pada baris `:124`, `clean.split("/").filter(Boolean).slice(0, 2).join("_")` memangkas semua URL dalam menjadi 2 segmen saja. Klik ke `/akademi/glosarium/rsi` dan `/akademi/glosarium/macd` keduanya melebur menjadi `nav:akademi_glosarium`; klik ke `/saham/bbca/kenapa-naik-hari-ini` kehilangan konteks template dan menjadi `nav:saham_bbca`; klik ke `/stocks?view=screener&preset=rsi_oversold` kehilangan query string (`:123`) menjadi `nav:stocks`.
  2. **Pemotongan Ganda 20/24/32 Karakter & Heuristik Tombol Palsu:** Pada baris `:134-136`, semua `<button>` yang teksnya diawali kata `cari|lihat|buka|bandingkan|...` dianggap navigasi halaman dan dipotong `slice(0, 20)`. Tombol UI dalam-halaman (seperti membuka modal pencarian atau toggle panel) ikut memicu `nav_click` palsu dengan teks terpotong.
- **Fix Konkret:** Tambahkan `if (label) return;` setelah `cta_click` (`:190`) agar tidak double-fire; naikkan kolom `EngagementEvent.label` dari `VarChar(32)` ke `VarChar(64)` + tambahkan kolom opsional `meta VARCHAR(64)` (untuk menyimpan kode saham/preset/slug tujuan tanpa memotong label); untuk `<a href>` internal simpan pola template terstruktur (mis. `nav:/stocks/[ticker]`, `nav:/berita/[slug]`) + simpan path tujuan di `meta`.

##### 5. `ShareEvent` — **SALAH / TERCEMAR LOG KUOTA**
- **Lokasi Kode:** `src/components/ui/guest-stock-tracker.tsx:56-62`, `src/app/api/track/share/route.ts:28-38`, `src/app/api/admin/guest-quota/route.ts:32,60,73`.
- **Bukti Angka:** `214` baris total / `165` baris 7 hari.
- **Masalah:** `GuestStockTracker` membajak tabel `ShareEvent` dengan mengirim `{ target: "guest_quota", context: String(q.count) }` setiap kali pengunjung anonim membuka ticker unik. Walaupun `analytics.service.ts:1175` memfilter `target !== "guest_quota"`, pembacaan tabel `ShareEvent` langsung menyesatkan karena ~85–87% isinya bukan aktivitas berbagi. Selain itu `/api/admin/guest-quota/route.ts:60,66,73` masih menghardcode batas `if (n >= 6) hitCap += 1` (sisa kuota lama 5 saham/hari), padahal `GUEST_DAILY_FREE` di `src/lib/guest-pass.ts:24` sudah dinaikkan menjadi **`25` saham/hari**!
- **Fix Konkret:** Pindahkan beacon kuota guest keluar dari `ShareEvent` ke `EngagementEvent` (`type: "quota_view", valueNum: q.count, path: "/stocks/" + ticker` yang sudah otomatis membawa `anonId`!), dan perbarui konstanta cap di `/api/admin/guest-quota/route.ts` agar mengimpor `GUEST_DAILY_FREE` (`25`) dari `src/lib/guest-pass.ts:24`.

---

### Pertanyaan 3 — IDENTITY & JOIN: Konsistensi `anonId`, Matriks Join, dan Vektor Kebocoran ID

#### A. Matriks Join Lintas Instrumen Saat Ini (Status per 30 Okt 2026)

| Tabel / Instrumen | Kunci Identitas yang Tersimpan | Bisa Join ke `PageView.anonId`? | Bukti Kode (`file:baris`) | Catatan Kritis |
|---|---|---|---|---|
| **`PageView`** | `userId`, `anonId` *(baru)*, `ip` | **Basis Utama** *(mulai 30 Okt)* | `prisma/schema.prisma:1078-1084`, `prisma/migrations/20261030090000_pageview_anonid/migration.sql:2-3` | Histori sebelum deploy 30 Okt memiliki `anonId = NULL` (`1.378` dari `1.386` baris 7h hanya punya `ip`/`userId`). |
| **`EngagementEvent`** | `anonId` **saja** *(tanpa `userId`, tanpa `ip`)* | **YA (OKE ke depan)** | `prisma/schema.prisma:1121`, `src/hooks/use-page-view.ts:38`, `src/components/engagement-instrument.tsx:37` | Kedua instrumen membaca key `localStorage` yang sama: `"eng_anon"`. Namun sebelum 30 Okt, `2.794` baris `EngagementEvent` yatim-piatu (tak bisa di-join ke `PageView`). |
| **`ShareEvent`** | `userId`, `ip`, `userAgent` (**TANPA `anonId`**) | **TIDAK BISA** | `prisma/schema.prisma:1099-1116`, `src/lib/track-share.ts:5-16`, `src/app/api/track/share/route.ts:28-38` | Payload `trackShare()` tidak mengirim `anonId` dan tabel DB tidak punya kolom `anonId`. |
| **`GuestPass`** | Cookie HTTP `guest_pass` (`{day, tickers[]}`) | **TIDAK BISA (0 baris DB)** | `src/lib/guest-pass.ts:17,26-29,74-78`, `src/app/api/track/guest-pass/route.ts:12-24` | `GuestPass` **tidak disimpan di PostgreSQL** sama sekali (murni cookie stateless 24 jam). Log pendampingnya di `/api/admin/guest-quota/route.ts:32` mengelompokkan `COALESCE(userId, ip)` — bias CGNAT! |
| **`TelegramWatch`** | `chatId`, `ticker`, `active` | **TIDAK BISA** | `scripts/telegram-bot/poll.mjs:35,44`, `scripts/telegram-bot/digest.mjs:26` | Tabel bahkan **tidak terdaftar di `prisma/schema.prisma`**. Tidak ada kolom `anonId` maupun `userId` yang menjembatani pengunjung web ke `chatId` Telegram. |
| **`User` (Akun Terdaftar)** | `id` (`userId`), `signupIp` | **PUTUS SAAT DAFTAR** | `src/app/api/auth/register/route.ts:12-19`, `src/lib/retention.service.ts:113` | Saat pengunjung anonim mendaftar, `anonId` pra-registrasi tidak disimpan ke `User` atau di-backfill ke `PageView`. Satu orang dihitung sebagai **2 identitas berbeda** sebelum vs sesudah login! |
| **`SignalFeedback`** | `ipHash` (SHA IP+UA harian) | **TIDAK BISA** | `prisma/schema.prisma:1064-1072` | Tidak menyimpan `anonId`. |

#### B. Audit Konsistensi `localStorage["eng_anon"]`
- **Yang Sudah Konsisten (`OKE`):** Baik `src/hooks/use-page-view.ts:38-45` maupun `src/components/engagement-instrument.tsx:37-45` membaca dan menulis key `localStorage` yang persis sama (`"eng_anon"`) dengan generator `crypto.randomUUID()` (36 karakter hex+dash) dan fallback 32 karakter hex.
- **3 Ketidakkonsistenan Kode yang Wajib Dirapikan (`SALAH`):**
  1. **Crash `localStorage` Tanpa `try/catch` Lokal di `EngagementInstrument`:** Di `src/hooks/use-page-view.ts:37-48`, akses `localStorage` dibungkus `try/catch` tersendiri sehingga aman di Safari Private Mode / WebView ketat (tetap lanjut mengirim `PageView` tanpa `anonId`). Sebaliknya di `src/components/engagement-instrument.tsx:36-46,147-208`, `getAnonId()` tidak punya `try/catch` internal — jika `localStorage.setItem` melempar `QuotaExceededError` / `SecurityError` pada baris `:44`, eksekusi langsung melompat ke `catch` luar di `:208` dan **membatalkan pemasangan seluruh event listener (`dwell`, `scroll`, `click`, `visibilitychange`)**!
  2. **Perbedaan Regex Validasi Server:** `schemas.pageview` (`src/lib/validation.ts:249`) mengizinkan huruf besar/kecil `/^[a-f0-9-]+$/i`, sedangkan `schemas.engagement` (`src/lib/validation.ts:271`) menolak huruf besar `/^[a-f0-9-]{8,36}$/`. Jika ada ID uppercase, `PageView` menerima tetapi `EngagementEvent` diam-diam membuangnya jadi `204`.
  3. **Duplikasi Fungsi Generator:** Logika baca/buat `"eng_anon"` diduplikasi di 2 file, bukan diekspor dari satu modul utilitas `src/lib/anon-id.ts`.

#### C. Kapan `anonId` Reset, Bocor, atau Bias? (6 Vektor Nyata + 2 Bug Retensi/Dedup)
1. **In-App Browser Sosmed (Threads, Instagram, WhatsApp, Telegram) → Browser Utama:** `localStorage` terisolasi per aplikasi. Saat user klik link dari Threads (`22` views 7h) atau Telegram Digest, WebView internal membuat `anonId_A`. Jika user memilih *"Open in Safari/Chrome"*, browser utama membuat `anonId_B`.
2. **Safari iOS ITP (*Intelligent Tracking Prevention* — Reset 7 Hari):** Safari iOS menghapus seluruh penyimpanan yang ditulis via JavaScript (`localStorage`) jika domain tidak dikunjungi selama `>7 hari` berturut-turut, **kecuali** identitas didukung oleh *first-party cookie* yang di-set melalui HTTP response header (`Set-Cookie`) dari server same-origin `teknikal.id`.
3. **Mode Privat / Incognito & Standalone Home Screen (PWA iOS):** `localStorage` di iOS WebClip (Add to Home Screen) terpisah total dari tab Safari biasa, dan di mode Incognito musnah saat tab ditutup. (Catatan: `public/sw.js:1-22` sudah berupa *kill-switch* tanpa cache SW, jadi tidak ada isu state SW basi — **OKE** di `public/sw.js:5-19`).
4. **Split Identitas Saat Konversi `Anon → Register`:** Pada `src/lib/retention.service.ts:113`, query memakai `COALESCE(pv."userId", pv."anonId", pv.ip) AS dev`. Jika pengunjung dengan `anonId = X` datang hari Senin lalu mendaftar akun `userId = U` hari Rabu, kunjungan Senin tercatat atas `X` (1 hari aktif) dan kunjungan Rabu atas `U` (1 hari aktif) → **0 returning device**, padahal user tersebut justru user paling loyal!
5. **Bug Dedup `PageView` 5 Detik di Server Masih Memakai `ip` (Bias CGNAT):** Di `src/app/api/track/pageview/route.ts:130`, kode menulis:
   ```ts
   const scope = userId ? { userId } : ip ? { ip } : null;
   ```
   `anonId` **lupa dimasukkan** ke `scope`! Di jaringan seluler Indonesia (Telkomsel/Indosat CGNAT di mana ribuan HP berbagi 1 IP publik), jika 2 user anonim berbeda membuka `/` atau `/stocks` dalam selisih `<5 detik`, user kedua dianggap duplikat dan **`PageView`-nya dibuang**! Ubah menjadi: `userId ? { userId } : anonId ? { anonId } : ip ? { ip } : null`.
6. **Bug Double-Shift `+7 hours` & Kebutaan Anonim di `retention.service.ts`:**
   - Di `src/lib/retention.service.ts:22-29`, `wibWeekStart()` sudah menggeser awal minggu `-7 jam` ke UTC (`Minggu 17:00 UTC = Senin 00:00 WIB`). Di query `weekRows` (`:116`), perbandingan `pv."createdAt" >= wk` sudah benar. **TETAPI** di query `cohortRows` (`:131-132`), kode menulis `(u."createdAt" + interval '7 hours') >= w.week_start` — menggeser `+7 jam` sekali lagi! Akibatnya batas minggu cohort bergeser ke **Minggu 17:00 WIB**.
   - Selain itu, tabel cohort D1/D7 (`:125-145`) **hanya** menghitung `User` terdaftar (`n=31`), sama sekali belum menyediakan cohort D1/D7 untuk pengunjung `anonId` (yang mencakup **79% trafik**).
7. **Tidak Ada `sessionId`:** Tanpa `sessionId` (`sessionStorage`, TTL tidak aktif 30 menit), `analytics.service.ts:649-661` menghitung *Bounce Rate* sebagai *"IP yang hanya punya 1 PageView sepanjang 7 hari penuh"*, bukan persentase sesi 1-halaman yang sesungguhnya.

- **Fix Konkret Arsitektur Identitas:**
  1. Buat satu helper `getOrCreateAnonId()` di `src/lib/anon-id.ts` (aman dengan `try/catch` + fallback cookie first-party `tek_anon` `Max-Age=31536000; SameSite=Lax; Path=/` yang di-set server di `proxy.ts` jika belum ada — ini **cookie teknis first-party murni tanpa pelacak pihak ketiga**, sehingga tahan reset 7-hari Safari ITP tanpa memerlukan cookie-banner vendor).
  2. Tambahkan kolom `anonId VARCHAR(36)` ke `ShareEvent` dan `User` (`initialAnonId`), lalu saat `/api/auth/register` atau login pertama, simpan `anonId` agar SQL retensi dapat melakukan *identity stitching* `COALESCE(u.id, pv."userId", pv."anonId")`.
  3. Tambahkan `sessionId VARCHAR(36)` (disimpan di `sessionStorage["tek_sid"]` dengan rolling expiry 30 menit) ke `PageView` dan `EngagementEvent`.

---

### Pertanyaan 4 — FUNNEL TERUKUR: Definisi Funnel Formal End-to-End & Gap Pengukurannya

#### A. Mengapa 2 Funnel yang Ada di Admin Saat Ini Tidak Memadai?
1. **`/api/admin/funnel/route.ts:35-55`** hanya menghitung jumlah total baris harian `PageView` → view `/auth/signin` & `/auth/register` → jumlah baris `User` baru hari itu. Ini bukan *user-level cohort funnel* (1 user me-refresh `/auth/register` 5 kali dihitung 5), dan mengabaikan 79% user anonim serta jalur pantauan guest & Telegram.
2. **`/api/admin/engagement/route.ts:85-104`** hanya membaca tabel `EngagementEvent` (`viewed → dwell_tick >= 60 → sembarang cta_click → kembali di hari berikutnya`). Karena `EngagementEvent` baru aktif bila ada event yang ter-flush (user bounce <5 detik tanpa scroll tidak masuk denominator `viewed`), serta `dwell_tick` sedang bias tab background dan `GuestStar` tidak menembakkan `cta_click`, angka funnel ini tidak mencerminkan perjalanan produk yang sebenarnya.

#### B. Definisi Funnel Formal 5-Tahap `teknikal.id` (Standar Baru Berbasis Identitas)

Unit analisis funnel adalah **`actor_id = COALESCE(user.initialAnonId, pv.anonId)`** (manusia non-bot, `isBot = false`) dalam jendela kohort akuisisi (`hari H0` = tanggal kunjungan pertama `actor_id` dalam WIB `+ interval '7 hours'`).

| Tahap | Nama Tahap | Definisi Operasional Deterministik (SQL / Event) | Pertanyaan Produk yang Dijawab |
|---|---|---|---|
| **Tahap 1** | **Visitor** *(Datang)* | `actor_id` unik dengan `≥ 1` baris di `PageView` (`isBot = false`). Dipecah per saluran masuk (`landingPath` & `entryChannel`: SEO Google, SEO Bing, Sosmed/Threads, Telegram Digest, Direct). | Seberapa besar trafik manusia baru yang berhasil ditarik tiap saluran & template SEO? |
| **Tahap 2** | **Engage** *(Paham / Aha)* | Dari Tahap 1, `actor_id` yang membuka halaman analisa (`/stocks/[TICKER].JK`, `/saham/[ticker]/kenapa-naik-hari-ini`, `/pasar`, atau preset `/saham-*`) **DAN** mencapai minimal salah satu: `dwell_tick >= 15` (waktu aktif tab visible) **ATAU** aksi eksplorasi (`rincian_skor_buka`, `indikator_awam_klik`, `grafik_periode_ubah`, `saringan_preset_klik`, `cari_saham_pilih`). | Apakah pengunjung langsung kabur (*bounce*), atau benar-benar membaca skor sinyal & grafik? |
| **Tahap 3** | **Simpan Pantauan** *(Komitmen Mikro)* | Dari Tahap 2, `actor_id` yang melakukan minimal satu penyimpanan saham/strategi pada `H0..H7`: `cta_click` berlabel `pantau_tambah` (guest star maupun watchlist akun), `saringan_simpan`, **ATAU** `tg_pantau_klik`. | Berapa persen pembaca aktif yang cukup peduli pada sebuah saham hingga menyimpannya untuk dipantau? |
| **Tahap 4** | **Balik `≤ 7 Hari`** *(Retained D1–D7)* | Dari Tahap 3 (dibandingkan kontrol Tahap 2 tanpa simpan!), `actor_id` yang mencatat `≥ 1` `PageView` pada hari kalender WIB berbeda dalam rentang **`H0 + 1 hari` s.d. `H0 + 7 hari`** (`hari_kunjungan - H0 BETWEEN 1 AND 7`). | Apakah menyimpan pantauan & melihat `delta_pantauan_tampil` benar-benar melipatgandakan rasio user balik dibanding yang tidak menyimpan? |
| **Tahap 5** | **Owned Habit Channel** *(Telegram Aktif / Akun Terdaftar)* | Dari Tahap 3/4, `actor_id` yang terhubung ke saluran milik sendiri yang tahan hapus browser: **(5a)** `TelegramWatch` aktif (`active = true` dengan `anonId` terjembatani atau klik balik `utm_source=tg_digest`), **ATAU (5b)** registrasi akun tuntas (`daftar_berhasil` server-side dengan `User.initialAnonId = actor_id`). | Berapa user yang berhasil dikunci menjadi pelanggan habit jangka panjang yang bisa dijangkau setiap hari bursa? |

#### C. Daftar Tepat Event & Jembatan Data yang KURANG untuk Mengukur Funnel Ini End-to-End

1. **Event `pantau_tambah` (+ `meta = kodeEmiten`)** di `GuestStar` (`src/components/stock/guest-star.tsx:32`), `StockActionBadge` (`src/components/stock/stock-action-badge.tsx:42`), dan `RepeatVisitHint` (`src/components/stock/repeat-visit-hint.tsx:69`) → **Tanpa ini, Tahap 3 buta untuk 79% user anonim.**
2. **Event `tg_pantau_klik` di seluruh 6 permukaan CTA Telegram + Token Jembatan Web-ke-Telegram (`anonId` prefix):**
   - Saat ini link bot adalah `https://t.me/TeknikalidBot?start=BBCA_JK` (batas parameter `start` Telegram Bot API adalah **64 karakter** `[A-Za-z0-9_-]`).
   - Ubah format deep-link di client menjadi `?start=BBCA_JK__a_<12_hex_pertama_anonId>` (total ~27 karakter, jauh di bawah batas 64 karakter; untuk batch `watch_BBCA_BMRI__a_<12hex>` juga muat hingga 7 ticker!).
   - Di `scripts/telegram-bot/poll.mjs:26`, pisahkan suffix `__a_([a-f0-9]{12})` dan simpan ke kolom baru `"TelegramWatch"."anonPrefix" VARCHAR(16)`. Dengan perubahan 8 baris ini, **untuk pertama kalinya `PageView.anonId` bisa di-JOIN langsung ke `TelegramWatch.chatId`** (`LEFT(pv."anonId", 8)` / `REPLACE(LEFT(pv."anonId", 13), '-', '')`) untuk mengukur persis konversi *Klik Tombol Telegram di Web → Benar-benar Klik `/start` di Bot Telegram*!
3. **Event `delta_pantauan_tampil` & `delta_pantauan_klik`** di `MorningDeltaCard` dan `WelcomeBackBanner` → Membuktikan kausalitas Tahap 3 → Tahap 4.
4. **Event `daftar_berhasil` dari Server (Bukan Klik Tombol Submit) + Kolom `User.initialAnonId`:**
   - Kirim `anonId` pada body `POST /api/auth/register` (`src/app/auth/register/page.tsx:86` → `src/app/api/auth/register/route.ts:12`) dan simpan cookie `tek_anon` agar jalur Google OAuth (`NextAuth` event `createUser`) juga mencatat `initialAnonId` + menulis baris `EngagementEvent(type: 'cta_click', label: 'daftar_berhasil')` hanya ketika user **benar-benar berhasil dibuat di DB**.
   - Bonus penting retensi produk yang ditemukan di `src/app/auth/complete-profile/page.tsx:54-75`: saat ini pasca-register hanya memigrasikan 1 ticker dari `sessionStorage["pending_post_register"]`, tetapi **lupa memigrasikan isi `localStorage["guest_watchlist"]`** ke tabel `Watchlist` akun baru!

---

### Pertanyaan 5 — ERROR & HEALTH: Risiko Blind Spot Tanpa Sentry & Arsitektur Paling Murah (`Rp 0`)

#### A. Audit Blind Spot Aktual di Kode Saat Ini

1. **Ilusi Sentry (Terpasang di Bundle, Tetapi 100% Mati & Diblokir CSP):**
   - `package.json` memuat `@sentry/nextjs`, dan tiga error boundary (`src/app/error.tsx:14`, `src/app/global-error.tsx:14`, `src/app/(public)/stocks/[ticker]/error.tsx:15`) memanggil `Sentry.captureException(error)`.
   - Namun: **`SENTRY_DSN` tidak dikonfigurasi**, tidak ada file `instrumentation.ts` / `sentry.client.config.ts` / `sentry.server.config.ts`, dan `src/proxy.ts:21` menetapkan header keamanan `Content-Security-Policy: ... connect-src 'self' ws: wss:;` yang **secara aktif memblokir pengiriman ke domain eksternal mana pun**. Artinya `@sentry/nextjs` saat ini hanyalah beban ukuran bundle tanpa menangkap 1 pun error!
2. **Halaman `/admin/errors` Buta terhadap API `500`, Crash SSR, JS Client, & Bot Telegram:**
   - `src/app/api/admin/errors/route.ts:37-60` **hanya** meng-query tabel `CronLog` (`status = 'failed'`) dan `AgentJob` (`status = 'failed'`).
   - Jika endpoint `/api/stocks/[ticker]/chart`, `/api/auth/register`, atau `/api/me/morning-delta` melempar `500` Prisma error, `handleApiError()` (`src/lib/api-error.ts:9`) hanya menulis `console.error` ke stdout Docker yang hilang saat container berputar — **0 baris masuk ke `/admin/errors`**.
   - Skrip eksternal `scripts/telegram-bot/poll.mjs:59,73` dan `digest.mjs:59,117` juga hanya menulis `console.error` lokal di Mac mini tanpa menulis ke `CronLog`, sehingga jika bot Telegram mati 3 hari tidak ada sinyal di dashboard admin.
3. **Bug Traffic Log Middleware Menghardcode Semua Request API sebagai HTTP `200`:**
   - Pada `src/proxy.ts:247`, middleware memanggil `recordApiRequest(ip, request.nextUrl.pathname, 200)` **sebelum** route handler dieksekusi! Bahkan jika route handler gagal dengan HTTP `500` atau `400`, statistik traffic internal mencatatnya sebagai sukses `2xx`.
4. **Kegagalan Beacon Tracking Ditelan Senyap (`Silent 204` Tanpa Counter):**
   - `/api/track/pageview/route.ts:168`, `/api/public/engagement/route.ts:53,64`, dan `/api/track/share/route.ts:40` menangkap seluruh error DB maupun gagal validasi Zod lalu mengembalikan `204 No Content` tanpa `console.error` dan tanpa counter di memori. Ketika URL panjang (>255 karakter) gagal validasi Zod di `pageview` (`route.ts:91`), data hilang tanpa seorang pun tahu.
   - Jika terjadi unhandled JS exception pada hidrasi komponen di halaman saham sebelum `useEffect` `PageViewTracker` atau `EngagementInstrument` selesai jalan, seluruh beacon di halaman tersebut mati senyap.

#### B. Usul Arsitektur Error & Health Paling Murah (`Rp 0`, First-Party Postgres, Lolos CSP `'self'`)

Tidak perlu layanan berbayar. Manfaatkan PostgreSQL + bot Telegram owner yang **sudah berjalan**:

1. **Satu Tabel Ringkas `AppErrorLog` dengan Deduplikasi Fingerprint (Anti-Banjir Disk):**
   ```prisma
   model AppErrorLog {
     id          Int      @id @default(autoincrement())
     fingerprint String   @unique @db.VarChar(64) // hash(source + location + message_prefix)
     source      String   @db.VarChar(16)         // "api" | "client" | "ssr" | "tgbot" | "beacon"
     path        String   @db.VarChar(255)
     message     String   @db.VarChar(500)
     stack       String?  @db.Text
     statusCode  Int?
     anonId      String?  @db.VarChar(36)
     occurrences Int      @default(1)
     firstSeenAt DateTime @default(now())
     lastSeenAt  DateTime @default(now())

     @@index([lastSeenAt(sort: Desc)])
     @@index([source, lastSeenAt(sort: Desc)])
   }
   ```
   *Mengapa desain `UPSERT` (`ON CONFLICT (fingerprint) DO UPDATE SET occurrences = occurrences + 1, "lastSeenAt" = NOW()`) sangat murah?* Jika sebuah bug client menimpa 5.000 pengunjung, DB hanya menyimpan **1 baris** dengan `occurrences = 5000` (bukan 5.000 baris), ditambah cron pembersih otomatis `DELETE WHERE "lastSeenAt" < NOW() - INTERVAL '30 days'`.
2. **3 Titik Tangkap Otomatis (Effort Total `< 2 Jam`):**
   - **Server API (`src/lib/api-error.ts:9`):** Karena 60+ route API sudah melewati satu pintu `handleApiError(error, context)`, tambahkan 1 panggilan *fire-and-forget* `logAppError({ source: "api", path: context, error, statusCode: 500 })` di sana → otomatis mencakup seluruh API!
   - **Client & React Error Boundary (`src/app/error.tsx`, `global-error.tsx`, + `window.addEventListener("error" / "unhandledrejection")`):** Ganti panggilan `Sentry.captureException` yang mati dengan `navigator.sendBeacon("/api/track/error", ...)` (same-origin `'self'`, langsung lolos CSP tanpa membuka domain luar, rate-limit `10/menit/IP`, dan hapus `@sentry/nextjs` dari bundle client!).
   - **Beacon Drop Counter & Heartbeat Telegram Bot:** Simpan counter in-memory sederhana `beaconDrops = { pageview400: 0, engagement400: 0, dbErr: 0 }` yang diekspos ke `/api/admin/health-checks`; tambahkan `INSERT INTO "CronLog"` di akhir `digest.mjs:117`; dan kirim pesan alert langsung ke `chatId` Telegram owner (yang sudah ada di `TelegramWatch`!) apabila `AppErrorLog` mencatat `≥ 5` error `500` baru dalam 10 menit.
   - **Tampilkan di `/api/admin/errors/route.ts:37`:** Gabungkan hasil `AppErrorLog` bersama `CronLog` dan `AgentJob` di UI `/admin/errors` yang sudah ada.

---

### Pertanyaan 6 — UTM & AKUISISI + VALIDASI SEO 90-HARI

#### A. Audit Alur UTM: Apakah Hook `usePageView` Benar-Benar Mengirim & Menyimpan UTM?

**Verdict: SALAH / BOCOR DI 6 TITIK.** Kolom `utmSource`, `utmMedium`, dan `utmCampaign` memang ada di `PageView` (`prisma/schema.prisma:1081-1083`), tetapi implementasi ujung-ke-ujung mengalami kebocoran serius berikut:

1. **Bug Kritis #1 — URL Kampanye/Sosmed Panjang (`>255` Karakter) Ditolak HTTP `400` (Kehilangan `PageView` + UTM Sekaligus!):**
   - **Bukti Kode:** `src/hooks/use-page-view.ts:52` menggabungkan `path: pathname + search`. Lalu di server (`src/app/api/track/pageview/route.ts:90`), `parseBody(request, schemas.pageview)` dijalankan **SEBELUM** `extractPageviewAttribution(data.path)` (`:95`) memotong query string!
   - Padahal `schemas.pageview` (`src/lib/validation.ts:244`) memaksa `path: z.string().min(1).max(255).startsWith("/")`.
   - Saat pengunjung klik tautan dari **Threads, Instagram, Facebook, atau Google Ads**, platform otomatis menempelkan `?utm_source=threads&utm_medium=social&fbclid=IwZXh0bgNhZW0CMTAAAR...` (`fbclid` standar panjangnya 180–240 karakter!). Ditambah path seperti `/saham/bbca/kenapa-naik-hari-ini` (33 karakter), panjang `pathname + search` menjadi **270–320 karakter** → **Zod melempar HTTP `400`** → bukan hanya UTM-nya hilang, **seluruh `PageView` pengunjung sosmed tersebut hilang tak tercatat!**
2. **Bug Kritis #2 — Canonical Redirect Saham di `proxy.ts` Menghapus Seluruh Query UTM (`url.search = ""`):**
   - **Bukti Kode:** `src/proxy.ts:371-383`. Jika materi promosi/postingan Threads menautkan `https://teknikal.id/stocks/bbca?utm_source=threads&utm_campaign=launching` (huruf kecil atau tanpa `.JK`), middleware melakukan `301` redirect ke `/stocks/BBCA.JK` dan pada baris **`:381`** mengeksekusi **`url.search = "";`**! Seluruh parameter `utm_*` musnah sebelum halaman sempat dimuat di browser. (Padahal tujuan komentar di `:379` hanya ingin membuang parameter internal `_rsc`, yang seharusnya dilakukan spesifik dengan `url.searchParams.delete("_rsc")`).
3. **Bug #3 — Ekstraksi `gclid` & Field Top-Level `utm*` di Hook Client Dibuang oleh Zod Server:**
   - **Bukti Kode:** `src/hooks/use-page-view.ts:27-30,56-58` bersusah payah mendeteksi `params.get("gclid")`, mengisi `utmSource = "google", utmMedium = "cpc"`, dan mengirim `{ utmSource, utmMedium, utmCampaign }` di JSON body.
   - Namun `schemas.pageview` (`src/lib/validation.ts:240-250`) **tidak mendefinisikan field `utmSource/Medium/Campaign`**, sehingga Zod otomatis membuangnya! Server hanya membaca ulang query string mentah lewat `extractPageviewAttribution(data.path)` (`src/lib/validation.ts:120-127`) yang **tidak mengecek `gclid`**. Akibatnya klik ber-`gclid` tercatat `utmSource = null`.
4. **Bug #4 — Regex `parseUtmParam` Terlalu Sempit (`32` Char & Tolak Titik) + Tidak Ada Persistensi Sesi ke `/auth/register`:**
   - **Bukti Kode:** `src/lib/validation.ts:95-98` membatasi semua parameter UTM dengan `/^[a-z0-9_-]{1,32}$/`. Pertama, kolom `PageView.utmCampaign` di DB (`prisma/schema.prisma:1083`) lebarnya `VarChar(64)`, tetapi dipotong mati di 32 karakter (kampanye >32 char jadi `null`). Kedua, nilai umum seperti `utm_source=linktr.ee` atau `t.me` (mengandung titik `.`) ditolak menjadi `null`, dan baris `:124` (`if (!pathOnly.startsWith("/auth/") && !utmSource)`) langsung ikut me-`null`-kan `utmMedium` dan `utmCampaign`!
   - Ketiga, saat user mendarat di `/?utm_source=threads` lalu klik tombol Daftar ke `/auth/register`, parameter UTM tidak dibawa di URL maupun `sessionStorage`, sehingga tabel atribusi `/api/admin/funnel/route.ts:81-89` (`WHERE path = '/auth/register' GROUP BY "utmSource"`) hampir selalu bernilai `NULL`.
5. **Bug #5 — Link `/berita` di Digest Telegram Lupa Parameter UTM:**
   - **Bukti Kode:** Di `scripts/telegram-bot/digest.mjs:88`, link tiap saham sudah benar memakai `?utm_source=tg_digest` (**OKE**), tetapi hanya 26 baris di bawahnya (`digest.mjs:114`), link `👉 Analis Sore hari ini: ${SITE}/berita` **tidak diberi `?utm_source=tg_digest`**, sehingga klik ke Analis Sore dari Telegram bocor menjadi `(direct)`.
6. **Bug Kritis #6 — Mengapa `bing.com = 55` Terinflasi? `document.referrer` di SPA Tidak Pernah Berubah!**
   - **Bukti Kode:** `src/hooks/use-page-view.ts:10` membaca `document.referrer` setiap kali `pathname` berubah di React `useEffect`.
   - Dalam aplikasi SPA (Next.js `<Link>` / `history.pushState`), browser **TIDAK memperbarui `document.referrer`**! Jika **1 pengunjung** datang dari `https://www.bing.com/`, mendarat di `/stocks/BBCA.JK`, lalu mengklik 10 halaman saham lain secara internal, **kesebelas baris `PageView`** dikirim dengan `referrer: "https://www.bing.com/"`! Sebaliknya, referrer internal (`internal /stocks 154`) hanya muncul ketika user melakukan *hard reload* atau membuka link di tab baru.
   - **Fix Konkret UTM & Referrer:**
     1. Di `usePageView` (`src/hooks/use-page-view.ts:51-65`), kirim `pathname` murni di `path` (`≤255` char) dan kirim `utmSource/Medium/Campaign` sebagai field terpisah di `schemas.pageview` (`validation.ts:240-250`, izinkan karakter `.` pada `utmSource` dan `max(64)` pada `utmCampaign`). Simpan juga `first_touch_utm` di `sessionStorage` agar terbawa saat user mencapai `/auth/register`.
     2. Kirim `document.referrer` eksternal **hanya pada pageview pertama sesi SPA** (`const isLanding = lastTracked.current === null`); untuk navigasi SPA ke-2 dst, kirim `referrer: window.location.origin + prevPathname` + tambahkan flag boolean `isEntry: isLanding` (atau turunkan dari `sessionId`).
     3. Di `src/proxy.ts:381`, ganti `url.search = ""` menjadi `url.searchParams.delete("_rsc")`.
     4. Di `scripts/telegram-bot/digest.mjs:114`, ubah `${SITE}/berita` menjadi `${SITE}/berita?utm_source=tg_digest&utm_medium=bot`.

#### B. Mengapa `Bing (55) > Google (~0)` & Apa yang Harus Diukur untuk Validasi SEO 90-Hari (Baseline GSC: `885` Impr / `5` Klik / Pos `67,9`)?

##### Diagnosis Teknis `Bing > Google` pada Kode & Baseline GSC:
- **Fakta GSC (`885` impresi, `5` klik, posisi rata-rata `67,9`):** Google **sudah mengindeks** halaman `teknikal.id` (terbukti dari 885 impresi), tetapi menempatkannya di halaman 7 pencarian (posisi ~68) karena usia domain baru pada kategori finansial (*YMYL — Your Money Your Life*), sementara algoritma Bing jauh lebih cepat mengangkat domain baru yang memiliki struktur HTML SSR + Schema JSON-LD lengkap (dan indeks Bing juga menyuplai pencarian Copilot/ChatGPT/DuckDuckGo).
- **2 Temuan Kebocoran SEO di Kode yang Menghambat Kenaikan Posisi Google:**
  1. **URL Redirect `308` Masih Terdaftar di `sitemap.xml` (`SALAH`):** `src/app/sitemap.ts:263` masih mendaftarkan `{ url: "${baseUrl}/harga-saham-hari-ini", priority: 0.8 }`, padahal `src/proxy.ts:439-441` sudah melakukan redirect permanen `308` `/harga-saham-hari-ini` → `/stocks`! Mengiklankan URL redirect di sitemap membuang *crawl budget* Googlebot dan mengaburkan sinyal kanonik.
  2. **Duplikasi `public/robots.txt` vs `src/app/robots.ts` (`OPTIMAL-SETENGAH`):** Repo memiliki **dua** sumber `robots.txt` sekaligus (`public/robots.txt:1-30` statis dan `src/app/robots.ts:12-33` dinamis). Walaupun isinya saat ini mirip, keberadaan file statis `public/robots.txt` membayangi route handler `src/app/robots.ts` sehingga perubahan aturan crawler di TypeScript ke depan tidak akan berefek; hapus salah satu agar satu pintu di `src/app/robots.ts`.

##### 4 Instrumen Wajib untuk Validasi SEO 90-Hari (Menuju Pos `<20` & Klik Organik Nyata):
Saat ini `PageView` hanya hidup lewat JavaScript client, sehingga kita **buta total terhadap aktivitas `Googlebot`** dan kualitas halaman pendaratan organik. Untuk memvalidasi eksperimen SEO 90-hari secara objektif per minggu, ukur 4 metrik berikut:

1. **Log Crawl Bot Pencari Server-Side (`SearchBotCrawlDaily` di `proxy.ts`):**
   - Deteksi User-Agent crawler resmi di `src/proxy.ts` (`Googlebot`, `Google-InspectionTool`, `Bingbot`, `OAI-SearchBot`, `PerplexityBot`) pada request HTML (`isHtmlPage`) dan agregasikan harian ringan per **kelompok template SEO**:
     - `stocks_detail` (`/stocks/[TICKER].JK` — ~956 halaman)
     - `kenapa_gerak` (`/saham/[ticker]/kenapa-naik-hari-ini`)
     - `preset_seo` (`/saham-oversold`, `/saham-golden-cross`, `/aliran-dana-asing`, `/kalender-dividen`, `/ihsg-hari-ini`)
     - `berita_riset` (`/berita/*`)
     - `akademi_glosarium` (`/akademi/*`)
   - **Indikator Leading 30 Hari Pertama:** Sebelum klik Google naik di hari ke-60..90, frekuensi `Googlebot hits/hari` dan `% template unik yang di-crawl dengan status 200 (0 redirect/404)` **wajib naik duluan**. Jika template `/saham/*/kenapa-naik-hari-ini` tidak pernah di-crawl Googlebot, kita langsung tahu internal linking ke template tersebut kurang kuat tanpa menunggu 90 hari!
2. **Metrik `Organic Landing Sessions` Murni (Hanya `isEntry = true` per Kelompok Template):**
   - Pisahkan `PageView` pendaratan pertama (`isEntry = true` dengan referrer `google.` / `bing.`) dari klik halaman ke-2 dst. Ukur `Organic Entry Views → Engage Rate (Tahap 2) → Simpan Pantauan Rate (Tahap 3) → D7 Return Rate` per template SEO. Ini menjawab: *"Template SEO mana yang tidak hanya mendatangkan klik Google, tapi menghasilkan user yang balik?"*
3. **Snapshot Mingguan Metrik GSC per Kelompok Template (`SeoWeeklySnapshot`):**
   - Simpan 1 baris per minggu per kelompok template (5 template × 12 minggu = 60 baris saja, via tarik GSC API gratis atau impor CSV mingguan di admin): `impressions`, `clicks`, `ctr`, `avgPosition`, `indexedPages`. Target sehat 90 hari: `avgPosition` bergerak `67,9 → <35 (H+30) → <20 (H+60) → Top 10 di long-tail ticker/preset (H+90)`.
4. **Pelacakan Pencarian Internal & `404` Path (`AppErrorLog` / `PageView status=404`):**
   - Catat URL `not-found.tsx` yang dimasuki dari referrer eksternal/bot agar broken backlink atau slug lama yang terindeks langsung ketahuan dan di-redirect `308`.

---

### Pertanyaan 7 — PRIORITAS: Metodologi Ranking `(Nilai Data ÷ Effort)`

Untuk mengurutkan seluruh temuan secara disiplin tanpa menguras waktu engineering, setiap gap dinilai menggunakan:
- **Nilai Data (Skala `1–10`):** Seberapa langsung perbaikan ini membuka jawaban atas pertanyaan bisnis utama (*"apa yang membuat user balik?"*, akurasi funnel retensi/Telegram, pemulihan akuisisi yang bocor, dan penghapusan bias data yang menyesatkan keputusan).
- **Effort (Jam Kerja Realistis):** Estimasi jam kerja implementasi + verifikasi di repo Next.js/Prisma saat ini (semakin kecil jam kerja untuk nilai data tinggi, semakin besar rasio **`Skor = Nilai Data ÷ Effort`**).

Tabel lengkap 14 gap terurut dari skor tertinggi ke terendah disajikan pada **Bagian 3**, diikuti spesifikasi eksekusi **TOP-5 Minggu Ini** pada **Bagian 4**.

---

## 3. Tabel Gap Prioritas (Ranked by `Nilai Data ÷ Effort`)

| Rank | ID Gap | Temuan / Gap Pengukuran | Area | Nilai Data (1–10) | Effort (Jam) | Skor (`Nilai ÷ Jam`) | Pertanyaan Bisnis yang Terjawab | File Target Utama |
|---:|---|---|---|---:|---:|---:|---|---|---|
| **1** | **GAP-01** | **Perbaiki `GuestStar` (bug `<a>` dalam `<button>` + 0% tracking) & pasang event `pantau_tambah` / `pantau_hapus` (+ kode saham)** di Guest, Login, & RepeatHint | Q1, Q4 | **10** | **1,0 j** | **10,0** | Berapa user yang menyimpan pantauan, saham apa yang paling sering dipantau, dan apakah penyimpan pantauan punya retensi D7 `2–3x` lebih tinggi? | `src/components/stock/guest-star.tsx`, `stock-action-badge.tsx`, `repeat-visit-hint.tsx` |
| **2** | **GAP-02** | **Tutup kebocoran UTM & Referrer SPA:** pisahkan `path` vs `utm*` (cegah drop `400` di URL `>255` char/`fbclid`), jaga UTM di `proxy.ts:381`, kirim `gclid`, betulkan `document.referrer` SPA (`isEntry`), tambah UTM di `digest.mjs:114` & hapus URL 308 dari `sitemap.ts:263` | Q6 | **10** | **1,5 j** | **6,7** | Dari saluran mana pengunjung & pendaftar benar-benar berasal (tanpa kehilangan trafik Threads/IG ber-`fbclid` dan tanpa inflasi Bing 5x)? | `src/hooks/use-page-view.ts`, `src/lib/validation.ts`, `src/proxy.ts`, `src/app/sitemap.ts`, `scripts/telegram-bot/digest.mjs` |
| **3** | **GAP-03** | **Tag seluruh 6 permukaan CTA Telegram (`tg_pantau_klik`), lengkapi `?start={TICKER}_JK` yang hilang, & jembatani `anonId` prefix ke `TelegramWatch`** | Q1, Q3, Q4 | **9** | **1,5 j** | **6,0** | Mengapa subscriber bot baru `n=1`? Apakah tombol di web tidak diklik, atau user batal klik `/start` setelah pindah ke aplikasi Telegram? | `src/app/(public)/stocks/[ticker]/page.tsx`, `src/components/telegram/subscribe-cta.tsx`, `scripts/telegram-bot/poll.mjs` |
| **4** | **GAP-04** | **Perbaiki siklus hidup SPA `EngagementInstrument`:** reset `dwell_tick` & `scroll_max` tiap ganti `pathname`, pause `dwell` saat tab hidden, hapus flush `scroll_max` dari interval 5 dtk, tambah `try/catch` di `getAnonId()`, cegah double-fire `cta+nav`, & perbaiki SQL `AVG(MAX(valueNum))` | Q2, Q3 | **9** | **1,5 j** | **6,0** | Halaman mana yang sungguh-sungguh dibaca user (bukan ditinggal di tab background atau terkunci `scroll_max = 1%` di detik ke-5)? | `src/components/engagement-instrument.tsx`, `src/app/api/admin/engagement/route.ts` |
| **5** | **GAP-05** | **Ukur Impresi & Klik Delta Harian (`delta_pantauan_tampil` & `delta_pantauan_klik`)** pada `MorningDeltaCard` dan `WelcomeBackBanner` | Q1, Q4 | **8** | **1,0 j** | **8,0** *(digabung sprint Top-5)* | Apakah ringkasan perubahan skor/harga pantauan benar-benar dilihat dan diklik oleh pengunjung yang kembali? | `src/components/home/morning-delta-card.tsx`, `src/components/ui/welcome-back-banner.tsx` |
| **6** | **GAP-06** | **Perbaiki dedup CGNAT `PageView` (`anonId` sebelum `ip`), fix bug double-shift `+7h` di `retention.service.ts:131`, & tambah cohort D1/D7 untuk `anonId`** | Q3 | **8** | **1,5 j** | **5,3** | Berapa angka retensi D1 & D7 yang akurat untuk 79% pengunjung anonim dan untuk pendaftar hari Minggu sore? | `src/app/api/track/pageview/route.ts`, `src/lib/retention.service.ts` |
| **7** | **GAP-07** | **Bersihkan `ShareEvent` & lengkapi `ShareToggleButton`:** pindahkan beacon `guest_quota` ke `EngagementEvent`, tambah `trackShare()` di `ShareToggleButton` & `TickerFab`, tambah kolom `anonId` ke `ShareEvent`, & update cap `6 → 25` di `/api/admin/guest-quota` | Q1, Q2, Q3 | **7** | **1,5 j** | **4,7** | Berapa jumlah share organik asli (WA/Telegram/Story/Copy) terutama di mobile, dan berapa user anonim yang menembus kuota 25 saham/hari? | `src/components/ui/share-buttons.tsx`, `guest-stock-tracker.tsx`, `src/app/api/admin/guest-quota/route.ts`, `prisma/schema.prisma` |
| **8** | **GAP-08** | **Event Registrasi Server-Side (`daftar_berhasil`) + Identity Stitching `User.initialAnonId` + Migrasi `guest_watchlist` saat Complete Profile** | Q2, Q3, Q4 | **8** | **2,0 j** | **4,0** | Berapa konversi daftar yang nyata (termasuk Google OAuth, bebas klik gagal) tanpa memecah histori retensi user menjadi 2 identitas? | `src/app/api/auth/register/route.ts`, `src/app/auth/register/page.tsx`, `src/app/auth/complete-profile/page.tsx`, `prisma/schema.prisma` |
| **9** | **GAP-09** | **Event Pemahaman Analisa Saham:** `rincian_skor_buka`, `indikator_awam_klik`, `indikator_semua_buka`, `grafik_periode_ubah`, `grafik_periode_kunci`, & `IntersectionObserver` seksi (`#chart`, `#indikator`, `#asing`) | Q1 | **8** | **2,0 j** | **4,0** | Komponen analisa mana di halaman saham yang menciptakan *Aha moment* dan mendorong retensi pemula? | `src/components/stock/signal-breakdown-details.tsx`, `indicator-panel.tsx`, `src/components/chart/chart-section.tsx` |
| **10** | **GAP-10** | **First-Party Error & Health Log (`AppErrorLog` `Rp 0`):** hook `handleApiError`, endpoint `/api/track/error` (gantikan `@sentry/nextjs` mati), counter drop beacon, log `CronLog` di `digest.mjs`, & alert Telegram owner | Q5 | **8** | **2,5 j** | **3,2** | Apakah ada API `500`, crash JS di HP user, atau kegagalan bot Telegram yang sedang membunuh trafik/beacon secara diam-diam? | `prisma/schema.prisma`, `src/lib/api-error.ts`, `src/app/error.tsx`, `src/app/api/admin/errors/route.ts`, `scripts/telegram-bot/digest.mjs` |
| **11** | **GAP-11** | **Telemetri Pencarian Saham (`cari_saham_pilih` & `cari_saham_kosong`) dan Screener (`saringan_preset_klik`, `saringan_simpan`)** | Q1 | **7** | **2,0 j** | **3,5** | Kata kunci/merek apa yang gagal ditemukan pemula, dan preset screener mana yang paling sering dipakai berulang? | `src/components/home/hero-search.tsx`, `src/components/stock/stock-table.tsx`, `src/components/screener/screener-client.tsx` |
| **12** | **GAP-12** | **Endpoint & Dashboard Funnel Formal 5-Tahap berbasis `actor_id` (`Visitor → Engage → Simpan Pantauan → Balik ≤7h → Telegram/Register`)** | Q4 | **8** | **2,5 j** | **3,2** | Di tahap mana persisnya kebocoran terbesar terjadi setiap minggu, per saluran akuisisi? | `src/app/api/admin/funnel/route.ts`, `prisma/schema.prisma` (daftarkan model `TelegramWatch`) |
| **13** | **GAP-13** | **Cookie First-Party Same-Origin `tek_anon` + `sessionId` (`tek_sid`) + Perlebar `EngagementEvent.label` ke `VarChar(64)` & kolom `meta VarChar(64)`** | Q2, Q3 | **7** | **2,5 j** | **2,8** | Menjaga kontinuitas `anonId` melewati batas 7-hari Safari ITP, menghitung *session bounce rate* asli, & menghentikan pemotongan `nav_click` 32 char. | `src/lib/anon-id.ts`, `src/proxy.ts`, `prisma/schema.prisma` |
| **14** | **GAP-14** | **Instrumen Validasi SEO 90-Hari:** log harian `SearchBotCrawlDaily` (`Googlebot`/`Bingbot` per template SEO di `proxy.ts`), hapus duplikat `public/robots.txt`, & tabel `SeoWeeklySnapshot` | Q6 | **7** | **2,5 j** | **2,8** | Apakah Googlebot sudah mulai meng-crawl ratusan halaman saham/preset secara rutin sebelum peringkat GSC menembus halaman 1–2? | `src/proxy.ts`, `public/robots.txt`, `src/app/api/admin/analytics/comprehensive/route.ts` |

*(Catatan Urutan Rank 4–5: `GAP-05` memiliki skor `8,0` dan masuk langsung ke paket **TOP-5 Minggu Ini** bersama `GAP-01`, `GAP-02`, `GAP-03`, dan `GAP-04` karena kelimanya saling mengunci untuk menghasilkan data retensi & akuisisi bersih dalam `< 6,5 jam` total kerja.)*

---

## 4. TOP-5 Rekomendasi Minggu Ini (Action Plan Konkret, Total `~6,5 Jam`)

Kelima pekerjaan di bawah ini dirancang tanpa ketergantungan vendor luar, mematuhi label bahasa awam Indonesia (`≤ 32` karakter sehingga langsung kompatibel dengan kolom `EngagementEvent.label VARCHAR(32)` saat ini sambil menyiapkan kolom `meta`), mempertahankan tap target `≥ 44px` (`min-h-11`), dan menggunakan token warna resmi `teknikal.id`.

### 1. Hidupkan Pengukuran "Simpan Pantauan" & Delta Harian (`GAP-01` + `GAP-05` — `2,0 Jam`)
- **Masalah yang Diselesaikan:** Menutup blind spot `0%` pada dua fitur inti retensi (`GuestStar` dan `MorningDeltaCard` / `WelcomeBackBanner`) sekaligus memperbaiki bug klik link Telegram di dalam `<button>` `GuestStar` yang tidak sengaja menghapus bintang saham.
- **Langkah Teknis:**
  1. Di `src/components/stock/guest-star.tsx:43-73`: pisahkan chip status (`baris 61-72`) keluar dari `<button>` ke wrapper `<div className="relative inline-flex items-center">`; pastikan `<button>` memakai `min-h-11 min-w-11` dan warna aktif `text-accent`; panggil `trackCtaEvent(result.added ? "pantau_tambah" : "pantau_hapus")` di `handleClick` (`:32`).
  2. Tambahkan `trackCtaEvent` yang sama pada `src/components/stock/stock-action-badge.tsx:42` dan `src/components/stock/repeat-visit-hint.tsx:69`.
  3. Di `src/components/home/morning-delta-card.tsx:33,58` dan `src/components/ui/welcome-back-banner.tsx:58,92`: tembakkan `delta_pantauan_tampil` sekali per sesi saat daftar perubahan saham berhasil dirender (`bullets.length > 0`), dan pasang `data-engagement="delta_pantauan_klik"` pada link baris saham.
- **Target Metrik Minggu Depan:** Kita bisa menarik query pertama dalam sejarah `teknikal.id`: *"% D7 Return pengguna dengan `pantau_tambah` vs tanpa `pantau_tambah`"* dan *"CTR `delta_pantauan_klik ÷ delta_pantauan_tampil`"*.

### 2. Perbaiki Bias `dwell_tick` & `scroll_max` pada Navigasi SPA (`GAP-04` — `1,5 Jam`)
- **Masalah yang Diselesaikan:** Menghentikan inflasi `dwell_tick` dari tab background, memperbaiki `scroll_max` yang membeku di angka `1–2%` pada detik ke-5, dan mencegah crash `localStorage` di Safari Private Mode mematikan seluruh listener.
- **Langkah Teknis:**
  1. Di `src/components/engagement-instrument.tsx:36-46`, bungkus akses `localStorage` di `getAnonId()` dengan `try/catch` (fallback UUID di memori sesi bila storage diblokir).
  2. Pantau `pathname = usePathname()` di `EngagementInstrument`: setiap kali `pathname` berubah, kirim satu baris `scroll_max` halaman sebelumnya (jika `scrollHeight > innerHeight * 1.2` dan `maxScroll > 0`), lalu reset `activeSeconds = 0`, `ticksSent = 0`, `maxScroll = 0`, `scrollSent = false`.
  3. Pada interval 1 detik (`:154`), hanya tambah `activeSeconds++` bila `document.visibilityState === "visible"`. Pada interval 5 detik (`:207`), panggil `flush(false)` **tanpa** menyentuh `scrollSent` (biarkan `scroll_max` hanya dikirim saat ganti halaman / `visibilitychange: hidden` / `pagehide`).
  4. Tambahkan `if (label) return;` di `onClick` (`:190`) agar elemen ber-`data-engagement` tidak mengirim `nav_click` ganda, dan ubah query `/api/admin/engagement/route.ts:75-77` agar merata-rata `MAX("valueNum")` per `(anonId, path, hari)`.

### 3. Tutup 6 Kebocoran Akuisisi UTM, Referrer SPA, & Sitemap Redirect (`GAP-02` — `1,5 Jam`)
- **Masalah yang Diselesaikan:** Mencegah URL sosmed ber-`fbclid` (`>255` char) ditolak HTTP `400`, mencegah redirect saham `/stocks/bbca` menghapus UTM, menghentikan penggandaan `bing.com = 55` di navigasi SPA, dan membersihkan URL redirect dari `sitemap.xml`.
- **Langkah Teknis:**
  1. Di `src/hooks/use-page-view.ts:51-65`, kirim `path: pathname` (tanpa query string agar selalu `<255` char), kirim `utmSource`, `utmMedium`, `utmCampaign` (termasuk fallback `gclid → google/cpc`) sebagai field JSON eksplisit + simpan first-touch UTM di `sessionStorage["tek_utm"]`. Hanya kirim `document.referrer` eksternal saat `lastTracked.current === null`; pada navigasi SPA berikutnya kirim `referrer: window.location.origin + prevPath`.
  2. Di `src/lib/validation.ts:95-98,240-250`, terima field opsional `utmSource` (`/^[a-z0-9._-]{1,32}$/`), `utmMedium` (`/^[a-z0-9._-]{1,32}$/`), dan `utmCampaign` (`/^[a-z0-9._-]{1,64}$/`).
  3. Di `src/proxy.ts:381`, ubah `url.search = ""` menjadi `url.searchParams.delete("_rsc")`. Di `src/app/api/track/pageview/route.ts:130`, ubah urutan scope dedup menjadi `userId ? { userId } : anonId ? { anonId } : ip ? { ip } : null` (bebas drop CGNAT).
  4. Di `scripts/telegram-bot/digest.mjs:114`, tambahkan `?utm_source=tg_digest` pada link `/berita`. Di `src/app/sitemap.ts:263`, hapus baris `/harga-saham-hari-ini` (karena sudah di-redirect `308` ke `/stocks`) dan hapus duplikat statis `public/robots.txt`.

### 4. Pasang Telemetri Penuh & Jembatan Identitas Funnel Telegram (`GAP-03` — `1,5 Jam`)
- **Masalah yang Diselesaikan:** Mengetahui secara pasti di mana letak kebocoran funnel Telegram (`TelegramWatch n=1`): apakah kurang klik di web atau putus saat berpindah ke aplikasi Telegram.
- **Langkah Teknis:**
  1. Tangkap seluruh klik `<a href*="t.me/TeknikalidBot">` di `ctaLabel()` (`src/components/engagement-instrument.tsx:92`) sebagai `tg_pantau_klik` + pasang atribut eksplisit per lokasi (`tg_pantau_skor`, `tg_pantau_kartu`, `tg_pantau_bawah`, `tg_pantau_daftar`) dengan tap target `min-h-11` dan warna `bg-accent` / border resmi.
  2. Di `src/app/(public)/stocks/[ticker]/page.tsx:752` dan `src/components/stock/guest-star.tsx:69`, tambahkan parameter `?start=${kode}_JK` yang saat ini terlupa.
  3. Sertakan 12 karakter hex pertama `anonId` pada parameter `start` (`?start=BBCA_JK__a_<12hex>`), lalu di `scripts/telegram-bot/poll.mjs:26-45` ekstrak suffix `__a_<12hex>` dan simpan ke kolom `"TelegramWatch"."anonPrefix" VARCHAR(16)` serta daftarkan model `TelegramWatch` secara resmi di `prisma/schema.prisma`.

### 5. Pasang Jaring Pengaman Error First-Party `Rp 0` (`GAP-10` — Paket Inti `1,0–1,5 Jam` di Sprint Ini / Awal Sprint Berikut)
- **Masalah yang Diselesaikan:** Menghilangkan kebutaan total atas error `500` API, crash JS di HP pengunjung, dan kegagalan pengiriman digest Telegram tanpa biaya langganan bulanan.
- **Langkah Teknis:**
  1. Buat tabel `AppErrorLog` dengan `fingerprint` unik di `prisma/schema.prisma`, sambungkan ke satu pintu `handleApiError()` di `src/lib/api-error.ts:9`, dan tampilkan hasilnya di `/api/admin/errors/route.ts:37`.
  2. Arahkan `src/app/error.tsx:14` dan `src/app/global-error.tsx:14` (serta listener `window.onerror`) ke endpoint same-origin `POST /api/track/error` (lolos CSP `connect-src 'self'`), tambahkan pencatatan `CronLog` di akhir `scripts/telegram-bot/digest.mjs:117`, dan kirim notifikasi ke Telegram owner saat terjadi lonjakan error baru.
