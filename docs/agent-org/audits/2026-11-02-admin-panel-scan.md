# Deep-Scan Audit Admin Panel — teknikal.id
**Tanggal Audit:** 2026-11-02  
**Target:** `src/app/admin/**` (28 halaman/view) + `src/app/api/admin/**` (44 route) + Layout Auth Guard  
**Database Snapshot:** PostgreSQL (`teknikalidnew-db-1`) — Verified Read-Only Queries  
**Auditor:** Antigravity (Advanced Agentic Pair Programmer)

---

## 1. RINGKASAN EKSEKUTIF

1. **Total Temuan Terverifikasi Bukti:** 20 temuan (3 P0 Blocker, 11 P1 High, 5 P2 Medium, 1 P3 Low).
2. **Data Salah / Rumus Rusak (Scan 1):** 8 temuan (enum mismatch fatal pada prediksi, active sessions selalu 0, AppErrorLog buta di Error Hub, timezone shift 7 jam, rumus likes salah, KPI artikel potong 40 snapshot, in-memory array kosong, agregat client atas query LIMIT 30).
3. **Fitur Double / Tumpang Tindih (Scan 2):** 4 area tumpang tindih besar (7 halaman stub redirect ke Pipelines, double funnel v1 vs v2, fragmentasi editor Articles vs Review, dan kartu Overview duplikat 100% data Pipelines & Retention).
4. **Tracking Gap (Scan 3):** 5 gap strategis (Revenue/Payment Midtrans Rp0 visibility di admin [P0], event registrasi baru 1 Nov tidak berpanel, AI Chat/Eval 101 percakapan tak terjamah, GSC News sitemap blind spot, dan query PageView 19k baris tanpa LIMIT).
5. **Arsitektur & Keamanan (Scan 4):** 3 temuan (layout auth guard client-side tanpa Next.js middleware, 24 dari 28 halaman admin tanpa server-side guard, dan 1 route API unhandled error 500).
6. **Aksesibilitas & UI/UX:** 0 fitur Export CSV di seluruh admin, hanya 1 tab memiliki Date Filter, dan 3 sistem styling bertabrakan (Shadcn Slate vs Main Site vs Ad-hoc).
7. **Status Pipeline Eksisting:** Seluruh cron pipeline sehat di database, namun indikator teknikal 19-field yang dihitung di backend `/api/admin/indicators` ditinggalkan yatim (tidak pernah dipanggil UI).
8. **Dampak Finansial & Operasional:** Owner buta terhadap status transaksi Midtrans dan tidak menyadari 110 error API runtime harian karena Error Hub hanya membaca CronLog.
9. **Kesiapan Data:** Semua data mentah tersimpan lengkap di PostgreSQL (`Payment`, `AiChatLog`, `AppErrorLog`, `EngagementEvent`); gap terjadi murni pada agregasi, filter, dan antarmuka admin.
10. **Rekomendasi Utama:** Konsolidasi 7 stub ke 1 Pipeline Center, satukan review ke tab Articles, pasang panel Revenue P0, dan perbaiki enum prediksi sebelum fitur komunitas dibuka penuh.

---

## 2. TABEL TEMUAN LENGKAP (BERBASIS BUKTI)

| Tingkat | Kategori | Lokasi File / URL | Temuan & BUKTI (Query / Kode Nyata) | Fix Konkret |
| :--- | :--- | :--- | :--- | :--- |
| **P0** | Data Salah | `src/app/api/cron/resolve-predictions/route.ts:98`<br>`src/lib/constants.ts:1`<br>`src/lib/validation.ts:141`<br>`src/app/admin/_components/predictions-tab.tsx:86` | **FATAL: Enum Direction Mismatch — 100% Prediksi Akan Dinilai INCORRECT**.<br>• `validation.ts:141`: input form hanya valid untuk lowercase `z.enum(["bullish", "bearish"])`.<br>• `resolve-predictions/route.ts:98`: cron mengecek `direction === PREDICTION_DIRECTION.UP` (`"UP"`) dan `DOWN` (`"DOWN"`).<br>• Bukti: `"bullish" === "UP"` SELALU FALSE → blok `else` selalu dieksekusi → semua prediksi berstatus `INCORRECT`!<br>• UI `predictions-tab.tsx:86`: mengecek `r.predictionDirection === "BULLISH"` (uppercase) vs DB `"bullish"`, sehingga styling badge warna hijau/merah tidak pernah muncul. | Ganti cek di `resolve-predictions/route.ts` menjadi `direction.toLowerCase() === "bullish"` (atau samakan `PREDICTION_DIRECTION` kanonik). Update `predictions-tab.tsx` untuk handle lowercase `"bullish"`/`"bearish"`. |
| **P0** | Tracking Gap | `src/app/admin/**`<br>`src/app/api/admin/**`<br>PostgreSQL table: `Payment` | **Zero Revenue / Billing Admin Panel (Midtrans Live)**.<br>• Transaksi user aktif diproses via `/api/payment` dan skema DB `Payment` memiliki 11 kolom (`orderId`, `userId`, `planId`, `amount`, `status`, `paidAt`, `expiresAt`, dll).<br>• Bukti: `grep -rn "Payment\|payment\|midtrans" src/app/admin/` = **0 hasil**. Admin tidak memiliki cara melihat omset harian/bulanan, transaksi pending/success, churn langganan, atau nomor order Midtrans. | Buat `/admin/billing` (atau tab Billing di Dashboard) dengan query agregat: Total Revenue (MTD/YTD), Status Transaksi (settlement, pending, expire), dan tabel rincian transaksi Midtrans dengan filter tanggal. |
| **P0** | Data Salah | `src/app/api/admin/auth-health/route.ts:21`<br>`src/app/admin/_components/auth-tab.tsx:47` | **Fake Metric: "Active Sessions" Selalu 0 di UI**.<br>• Query: `prisma.session.count({ where: { expires: { gt: now } } })`.<br>• Bukti DB: `SELECT count(*) FROM "Session";` = **0 baris** (sedangkan `User` = 31, `Account` = 30).<br>• Penyebab: NextAuth dikonfigurasi strategi JWT (`session.strategy = "jwt"`), sehingga tabel `Session` tidak pernah ditulis.<br>• Komentar di `route.ts:24` mengakui ini, namun angka 0 tetap dikirim ke KPI "Active Sessions". Owner mengira tidak ada user login sama sekali. | Ganti metrik dengan "Active Users 24h / 7d" berbasis `PageView` / `EngagementEvent` (`SELECT count(DISTINCT "userId") WHERE "createdAt" >= NOW() - interval '24 hours'`). |
| **P1** | Data Salah | `src/app/api/admin/errors/route.ts:40`<br>`src/app/admin/errors/page.tsx:160`<br>PostgreSQL table: `AppErrorLog` | **Error Hub Buta Terhadap 110+ Error Aplikasi Nyata**.<br>• Halaman Error Hub mengklaim *"Unified view of all system errors"* tetapi API HANYA membaca `CronLog` dan `AgentJob`.<br>• Bukti DB: `SELECT count(*) FROM "CronLog" WHERE status='failed' AND "startedAt" >= NOW() - interval '24 hours'` = **0**.<br>• Sedangkan di `AppErrorLog`: terdapat **8 fingerprint** dan **113+ kejadian error**, termasuk `fetch morning delta: b.getTime is not a function` (**110x hit** pada 1 Nov 2026), Dynamic server usage pada `/api/stocks`, dan client chunk loading errors.<br>• UI menampilkan "0 Cron Failures" dan seolah sistem sehat, menyembunyikan bug fatal aplikasi dari owner. | Gabungkan `prisma.appErrorLog.findMany({ orderBy: { updatedAt: 'desc' } })` ke dalam pipeline agregasi `/api/admin/errors`, tambahkan badge sumber "API" / "Client". |
| **P1** | Data Salah | `src/app/api/admin/user-analytics/route.ts:128`<br>`src/app/admin/_components/users-tab.tsx` | **Heatmap Peak Hours Tergeser 7 Jam (UTC vs WIB)**.<br>• Di `buildPeakHours`: `const d = new Date(item.createdAt); grid[d.getDay()][d.getHours()]++;`.<br>• Bukti: Node.js container berjalan di UTC tanpa TZ override. `d.getHours()` mengembalikan jam UTC (0–23).<br>• User aktif jam 14:00 WIB (07:00 UTC) tercatat di kolom jam 07:00 pagi. User posting Minggu 02:00 WIB tercatat di hari Sabtu 19:00 UTC. Seluruh grafik sebaran waktu salah total. | Gunakan fungsi helper `wibHour(d)` dan `wibShifted(d).getUTCDay()` dari `@/lib/datetime-wib` agar jam dan hari dihitung tepat di WIB. |
| **P1** | Data Salah | `src/app/api/admin/community-stats/route.ts:209`<br>`src/app/admin/_components/community-tab.tsx` | **Timezone Cutoff 7 Jam di `aggregateDaily`**.<br>• Di `community-stats`: `since` dihitung dari `wibDayStart()` (17:00 UTC hari sebelumnya), tetapi bucket key memakai `entry.createdAt.toISOString().slice(0, 10)` (UTC date string).<br>• Bukti: Event antara pukul 00:00–06:59 WIB memiliki tanggal UTC H-1. Akibatnya, aktivitas pagi hari masuk ke statistik tanggal kemarin. | Ganti `new Date(entry.createdAt).toISOString().slice(0, 10)` dengan `wibDayKey(entry.createdAt)` dari `@/lib/datetime-wib`. |
| **P1** | Data Salah | `src/app/api/admin/community-stats/route.ts:142`<br>`src/app/admin/_components/community-tab.tsx:55` | **Rumus Metrik "Likes Today" Salah Kaprah**.<br>• Query: `prisma.post.aggregate({ _sum: { likesCount: true }, where: { createdAt: { gte: todayStart } } })`.<br>• Bukti: Query ini menghitung total like pada **postingan yang dibuat hari ini**, BUKAN like yang diberikan hari ini!<br>• Post lama yang di-like 100 orang hari ini menghasilkan 0 di metrik ini. Tabel `Like` di DB (`\d Like`) bahkan tidak memiliki kolom `createdAt` (`id`, `userId`, `postId`). | Tambahkan kolom `createdAt DateTime @default(now())` pada model `Like` di Prisma, lalu hitung `prisma.like.count({ where: { createdAt: { gte: todayStart } } })`. |
| **P1** | Data Salah | `src/domains/article/article.repository.ts:80`<br>`src/app/admin/articles/page.tsx:165`<br>PostgreSQL table: `Article` | **Stats Artikel Mengabaikan 40 Artikel Snapshot**.<br>• Bukti DB: `SELECT "articleType", count(*) FROM "Article" GROUP BY "articleType";` menghasilkan: `STOCK_ANALYSIS`: 25, `EDUCATIONAL`: 43, `NEWS`: 60, `DAILY_SNAPSHOT`: 40 (Total: 168).<br>• `getStats()` di repository hanya menghitung `stockAnalysis`, `educational`, `news`, dan `general` (total: 128). 40 artikel `DAILY_SNAPSHOT` hilang dari agregasi tipe.<br>• Tombol filter di `articles/page.tsx` tidak memiliki opsi `DAILY_SNAPSHOT`. Operator tidak bisa memfilter snapshot harian. | Tambahkan `dailySnapshot` dan `movementAnalysis` ke `getStats()` dan buat tombol filter `Snapshot` di halaman `/admin/articles`. |
| **P1** | Data Salah | `src/app/api/admin/eod-logs/route.ts:48`<br>`src/app/api/admin/intraday-logs/route.ts:16`<br>`src/lib/activity-log.ts:12` | **Recent Activity Menggunakan In-Memory Array yang Menguap**.<br>• `activityEntries` mengambil data dari `getRecentActivity(50)` yang membaca `const log: ActivityEntry[] = []` di memori RAM.<br>• Bukti: Setiap restart container atau running serverless instance, array kosong `[]`.<br>• Developer telah memperbaiki ini di `src/app/api/admin/status/route.ts:14` dengan membaca `CronLog`, tetapi lupa memperbarui `eod-logs` dan `intraday-logs`. | Ganti pemanggilan `getRecentActivity` di `eod-logs` dan `intraday-logs` dengan fallback pembacaan tabel `CronLog` seperti di `status/route.ts`. |
| **P1** | Data Salah | `src/app/api/admin/status/route.ts:61`<br>`src/app/admin/_components/overview-tab.tsx:155` | **False Alarm: EOD & Intraday Sync Berstatus "Stale" Tiap Akhir Pekan**.<br>• Query: `latestPrice = prisma.stockPrice.findFirst({ orderBy: { date: 'desc' } })`. Status stale jika `date < now - 24h`.<br>• Bukti DB: `StockPrice.date` terakhir adalah Jumat 2026-10-30. Pada hari Minggu 2026-11-01 (>24 jam), status otomatis menjadi "stale" berwarna kuning/merah, padahal bursa BEI tutup di akhir pekan!<br>• `lastIntradaySync` juga membaca tabel `StockPrice` (harga harian EOD), bukan data intraday riil. | Cek status hari bursa (Senin–Jumat) atau baca langsung status job execution terakhir dari `CronLog` (`sync-eod` status === 'success'). |
| **P1** | Data Salah | `src/app/admin/_components/insight-tab.tsx:101`<br>`src/app/api/admin/engagement/route.ts:124` | **KPI "Klik CTA 7 hari" Terpotong Karena Agregat Atas Query LIMIT 30**.<br>• Query di `engagement/route.ts`: `SELECT type, label, count(*) FROM "EngagementEvent" ... GROUP BY type, label ORDER BY n DESC LIMIT 30`.<br>• Bukti di `insight-tab.tsx:101`: KPI dihitung dengan `.filter(c => c.type === 'cta_click').reduce((s, c) => s + c.count, 0)`.<br>• Label CTA di luar ranking 30 besar dibuang oleh SQL sebelum masuk ke `.reduce()`, menyebabkan angka klik CTA undercounted. | Hitung total klik CTA langsung di SQL: `SELECT count(*) FROM "EngagementEvent" WHERE type = 'cta_click' AND "createdAt" >= since7d`. |
| **P1** | Tracking Gap | `src/app/auth/register/page.tsx:225`<br>`src/lib/register-funnel.ts:103`<br>`src/app/admin/**` | **Event Registrasi Baru (1 Nov) Tidak Ada Panel Pemantau**.<br>• Event baru diimplementasikan: `funnel_paper_gate_cta`, `register_submit_final`, `register_success`, `register_success_ctx`.<br>• Bukti: `grep` di seluruh direktori `src/app/admin/` dan `src/app/api/admin/` = **0 kemunculan**.<br>• Admin tidak dapat memantau rasio konversi drop-off antara klik form registrasi hingga user berhasil terverifikasi. | Tambahkan visualisasi step-funnel di `/admin/retention` atau tab Analytics: `Gate CTA → Submit Step 1 → Submit Final → Register Success`. |
| **P1** | Tracking Gap | PostgreSQL tables: `AiChatLog`, `AiEvalRun`<br>`src/app/admin/**` | **101 Tanya AI Chat & 32 Evaluasi Kualitas Yatim dari Admin Panel**.<br>• Bukti DB: `SELECT count(*) FROM "AiChatLog"` = **101 baris**; `SELECT count(*) FROM "AiEvalRun"` = **32 baris**.<br>• Data memuat latencyMs, model/provider (Gemini/OpenAI), mode, pertanyaan user, dan skor evaluasi kualitas (routingScore, qualityScore, fitScore).<br>• Admin sama sekali tidak memiliki dashboard untuk melihat volume tanya-jawab AI, biaya token, pertanyaan terpopuler, atau error rate. | Bangun tab/halaman `/admin/ai-analytics` yang menampilkan volume chat harian, latency p95 per provider, kata kunci terbanyak, dan log evaluasi model. |
| **P1** | Tracking Gap | `src/domains/analytics/analytics.service.ts:270`<br>`src/domains/analytics/analytics.service.ts:400`<br>`src/app/api/admin/user-analytics/route.ts:107`<br>`src/app/admin/reports/page.tsx:29` | **Query Database Skala Besar Tanpa LIMIT / Pagination (Risiko OOM)**.<br>• `getComprehensiveAnalytics`: menarik `prisma.pageView.findMany` tanpa batas `take` (Bukti DB: **19.129 baris** ditarik ke memory server).<br>• `getShareAnalytics`: menarik seluruh baris `ShareEvent` tanpa limit.<br>• `user-analytics/route.ts:107`: menarik seluruh postingan dan komentar tanpa limit.<br>• `reports/page.tsx:29`: menarik seluruh laporan pending tanpa pagination. | Tambahkan paging cursor/offset atau lakukan agregasi di level SQL PostgreSQL (`$queryRaw`) alih-alih me-load seluruh array objek ke V8 RAM. |
| **P1** | Keamanan / Auth | `src/app/admin/layout.tsx:215`<br>`src/app/admin/**/page.tsx`<br>`src/app/api/admin/views-geo/route.ts:13` | **Layout Guard Client-Side Saja + 24 Halaman Admin Tanpa Server Guard**.<br>• Tidak ada `middleware.ts` di proyek.<br>• `AdminLayout` adalah Client Component (`"use client"`), mengecek `session.user.role !== 'ADMIN'` hanya via `router.replace` di browser.<br>• Bukti: Hanya **4 halaman** (`announcements`, `articles/[id]/preview`, `reports`, `retention`) yang mengecek `await requireAdmin()` di server. 24 halaman lainnya terbuka untuk SSR scraping jika JS dinonaktifkan.<br>• `views-geo/route.ts:13` memanggil `await requireAdmin()` di luar blok `try/catch`, mengakibatkan crash HTTP 500 jika gagal auth alih-alih 403. | Tambahkan Next.js `middleware.ts` untuk proteksi prefix `/admin/:path*` dan `/api/admin/:path*`, serta bungkus `views-geo/route.ts` dengan `try/catch` + `handleApiError`. |
| **P2** | Fitur Overlap | `src/app/admin/cron-monitor/page.tsx`<br>`src/app/admin/cron-config/page.tsx`<br>`src/app/admin/queue-monitor/page.tsx`<br>`src/app/admin/eod-logs/page.tsx`<br>`src/app/admin/intraday-logs/page.tsx`<br>`src/app/admin/indicators/page.tsx`<br>`src/app/admin/api-keys/page.tsx` | **7 Halaman Stub Redirect Menghantui Struktur Proyek**.<br>• 7 halaman di atas semuanya hanya berisi `redirect("/admin/pipelines")`.<br>• Bukti: Semua halaman tersebut adalah dead stubs. Namun API pendukungnya (`/api/admin/cron-monitor`, `/api/admin/queue/status`, `/api/admin/indicators`) tetap ada di disk.<br>• Tab "Indicators" di `pipelines/page.tsx` justru memanggil `/api/admin/intraday-logs`, sementara API canggih `/api/admin/indicators` (yang menghitung 19 indikator teknikal) 100% ditinggalkan dan tidak pernah dipanggil siapapun. | Hapus ke-7 file `page.tsx` stub, pasang Next.js `redirects` di `next.config.js`. Hubungkan tab "Indicators" di Pipelines ke `/api/admin/indicators`. |
| **P2** | Fitur Overlap | `src/app/admin/_components/analytics-tab.tsx:447`<br>`src/app/admin/_components/insight-tab.tsx:81` | **Double Funnel: Funnel v1 vs Funnel v2 dengan Definisi Bertolak Belakang**.<br>• Tab Analytics menampilkan `FunnelSection` (`/api/admin/funnel`): funnel berbasis PageView 30 hari (`/auth/signin → /auth/register → signups`).<br>• Tab Insight menampilkan `FunnelV2` (`/api/admin/funnel-v2`): funnel berbasis actor ID 21 hari (T1 Datang → T2 Paham → T3 Simpan → T4 Balik → T5 Habit).<br>• Bukti: Dua tab berbeda di dashboard yang sama menampilkan funnel konversi dengan angka dan tahapan yang saling bertentangan, membingungkan operator. | Gabungkan funnel ke tab Insight dengan nama jelas: "User Acquisition Funnel" (v1) dan "Product Stickiness Funnel" (v2). |
| **P2** | Fitur Overlap | `src/app/admin/articles/page.tsx`<br>`src/app/admin/review/page.tsx`<br>`src/app/admin/layout.tsx:64-65` | **Fragmentasi Workflow Editorial: Articles vs Review Artikel Terpisah**.<br>• Sidebar menampilkan "Articles" (`/admin/articles`) dan "Review Artikel" (`/admin/review`) secara berdampingan.<br>• Bukti: Editor yang ingin mereview artikel harus ke `/admin/review`, namun jika ingin mengedit atau melihat status draft harus berpindah ke `/admin/articles`. Riwayat audit review terisolasi di halaman review. | Jadikan "Review Antrian" sebagai tab ke-3 di dalam `/admin/articles` (`Artikel` | `Performa` | `Antrian Tinjauan`). Hapus menu sidebar ganda. |
| **P2** | Data Accessibility | `src/app/admin/**` | **Nol Fitur Export CSV di Seluruh Admin Panel**.<br>• Bukti: `grep -rn "CSV\|csv\|export" src/app/admin/` = **0 fitur ekspor**.<br>• Operator tidak dapat mengekspor daftar user, performa artikel SEO, log error, maupun data retensi ke Excel/Google Sheets untuk reporting mingguan. | Tambahkan utilitas reusable `exportToCsv(filename, headers, rows)` pada komponen `AdminDataTable`. |
| **P3** | UI/UX & Mobile | `src/app/admin/review/page.tsx:69`<br>`src/app/admin/articles/page.tsx:150` | **Inkonsistensi Styling Token & Kerusakan Tata Letak di 360px Mobile**.<br>• Bukti: `review/page.tsx` memakai class tema website utama (`bg-bg-card`, `text-text-primary`, `depth-shadow`), sedangkan halaman lain memakai tema admin (`bg-white`, `border-gray-200/80`, `slate-50`).<br>• Di mobile 360px: grid 3-kolom KPI di `review/page.tsx` (`grid-cols-3`) hancur dengan lebar kartu hanya ~105px, menyebabkan teks Indonesia terpotong. Action bar di `articles/page.tsx` membengkak jadi 5 baris wrapping. | Standarisasikan seluruh halaman admin ke komponen `AdminPageHeader` dan `AdminKpiCard`. Gunakan `grid-cols-1 sm:grid-cols-3` untuk kartu KPI review. |

---

## 3. TABEL OVERLAP FITUR (SCAN 2)

| Fitur A (Lokasi) | Fitur B (Lokasi) | Data Sumber Sama? | Status Analisis | Rekomendasi Konkret |
| :--- | :--- | :--- | :--- | :--- |
| `/admin/errors` (Error Hub) | `/admin/auth-health` (API Cache Usage) | **Sebagian** (keduanya memantau kesehatan infrastruktur) | Cache usage ditaruh salah tempat di Auth Health; Error Hub tidak membaca AppErrorLog. | **MERGE**: Pindahkan tabel "API Cache Usage" dari Auth Health ke `/admin/pipelines` (tab Services & Config). Tambahkan `AppErrorLog` ke Error Hub. |
| `/admin/cron-monitor`, `cron-config`, `queue-monitor`, `eod-logs`, `intraday-logs`, `indicators`, `api-keys` (7 stub) | `/admin/pipelines` (Data Pipelines) | **YA (100% Sama)** | 7 halaman tersebut sudah usang dan hanya berisi kode `redirect("/admin/pipelines")`. | **KUBUR (DELETE)**: Hapus 7 file `page.tsx` stub tersebut. Pindahkan rule redirect ke `next.config.js`. Pertahankan rute API yang masih aktif di Pipelines. |
| `/admin/pipelines` (Tab Indicators) | `/api/admin/indicators` (Unused Route) | **TIDAK (Salah Panggil)** | Tab "Indicators" di Pipelines malah memanggil `/api/admin/intraday-logs` (yang hanya membaca max date StockPrice). API `/api/admin/indicators` riil menghitung 19 indikator teknikal tapi menganggur. | **RE-WIRE**: Ubah tab "Indicators" di Pipelines agar memanggil `/api/admin/indicators` riil sehingga admin melihat kelengkapan RSI, MACD, Moving Average 800+ saham. |
| `/admin/articles` (Manajemen Artikel) | `/admin/review` (Antrian Tinjauan) | **YA** (sama-sama objek `Article` status DRAFT / PUBLISHED) | Workflow terpecah dua halaman berdampingan di sidebar menu. | **MERGE**: Satukan `/admin/review` menjadi tab ketiga di `/admin/articles` (`Tab: Artikel | Performa | Review Antrian`). Hapus item sidebar "Review Artikel". |
| `/admin/announcements` (Broadcast) | `/admin/insight` (Engagement Telemetry) | **TIDAK** | Keduanya berbeda fungsi: Announcements = outbound push broadcast banner/bell; Insight = inbound telemetri engagement user. | **TAHAN**: Pertahankan keduanya terpisah. |
| `/admin/api-keys` (Stub) | `/admin/pipelines` (Tab Services & Config) | **YA** | Status API Keys (Gemini, OpenAI, QStash, Yahoo) sudah ditampilkan lengkap di tab Services & Config pada Pipelines. | **KUBUR**: Hapus `/admin/api-keys/page.tsx`. |
| `/admin` (Overview Dashboard) | `/admin/pipelines` & `/admin/retention` | **YA (90% Redundant)** | Kartu DB/Yahoo/QStash/Sentry di Overview duplikat Pipelines; sparkline returning IP duplikat Retention. | **MERGE / STREAMLINE**: Rampingkan Overview menjadi Executive Summary murni: KPI Revenue (P0), User Aktif Harian, Error Terkini, dan Status Sync — sisanya cukup link ke sub-halaman. |
| `/admin` (Analytics Tab: Funnel v1) | `/admin` (Insight Tab: Funnel v2) | **Sebagian** (PageView vs Actor Engagement) | Muncul dua grafik corong konversi dengan metodologi beda di dua tab terpisah tanpa penjelasan. | **MERGE**: Satukan dalam satu tab visualisasi funnel bertingkat: Acquisition (v1) dan Product Activation/Stickiness (v2). |

---

## 4. DAFTAR TRACKING GAP TERURUT NILAI (SCAN 3)

*Diurutkan berdasarkan prioritas dampak bisnis owner: **Money > Data-Trust > Convenience**.*

### 1. [P0 — MONEY] Dashboard Transaksi & Revenue (Midtrans Live)
* **Status Saat Ini:** **BLIND SPOT TOTAL**. Transaksi Midtrans berjalan di `/api/payment`, skema PostgreSQL `Payment` sudah ada (orderId, planId, amount, status, paidAt, expiresAt), tetapi **tidak ada satupun halaman admin** yang menampilkan data ini.
* **Nilai Bisnis:** Owner tidak bisa mengetahui berapa uang yang masuk hari ini, siapa yang gagal bayar, pelanggan mana yang paketnya kedaluwarsa, atau memverifikasi settlement Midtrans tanpa login terpisah ke portal Midtrans.
* **Spesifikasi Solusi:** Bangun halaman `/admin/billing` dengan:
  - KPI: Total Revenue MTD, ARR/MRR estimasi, Transaksi Sukses vs Gagal vs Pending.
  - Tabel: Order ID, Nama User/Email, Paket (Basic/Pro), Nominal (IDR), Status Badge, Waktu Bayar, Tombol "Cek Midtrans Status".

### 2. [P1 — MONEY & GROWTH] Register Funnel Conversion Telemetry (Update 1 Nov)
* **Status Saat Ini:** Event baru (`funnel_paper_gate_cta`, `register_submit_final`, `register_success`, `register_success_ctx`) sudah ditembakkan oleh kode frontend auth, tetapi **tidak ada endpoint atau UI admin yang membacanya**.
* **Nilai Bisnis:** Owner tidak tahu titik kebocoran (drop-off rate) registrasi: apakah calon pengguna berhenti di pengisian form, gagal di validasi password, atau terganjal response API backend.
* **Spesifikasi Solusi:** Tambahkan visualisasi corong registrasi di `/admin/retention` atau tab Analytics yang memetakan:
  `Gate CTA (Paper Trading / Screener) → Register Form View → Submit Step 1 → Submit Final → Register Success (201)`.

### 3. [P1 — MONEY & COST] AI Usage & Cost Analytics (Tanya AI)
* **Status Saat Ini:** Tabel DB `AiChatLog` menyimpan **101 interaksi** user dan `AiEvalRun` menyimpan **32 hasil evaluasi**, lengkap dengan model provider, route, dan latencyMs. Namun datanya **100% yatim** tanpa panel admin.
* **Nilai Bisnis:** Tanpa visibility biaya token per hari per provider (Gemini Flash vs Groq vs OpenAI), owner berisiko mengalami lonjakan tagihan API AI (cost spike) mendadak tanpa deteksi dini.
* **Spesifikasi Solusi:** Bangun tab pemantau AI di admin:
  - Volume chat harian & distribusi provider (Gemini vs OpenAI vs fallback).
  - P95 latency per route query saham.
  - Top 10 pertanyaan / ticker yang paling sering ditanyakan ke Tanya AI.
  - Rata-rata skor evaluasi kualitas jawaban (routingScore, qualityScore, fitScore).

### 4. [P1 — DATA-TRUST] Error Hub yang Mencakup Real-Time Application Errors (`AppErrorLog`)
* **Status Saat Ini:** Halaman Error Hub saat ini hanya menampilkan kegagalan Cron & Agent. Error runtime riil (seperti `b.getTime is not a function` yang terjadi 110 kali pada 1 Nov 2026) dicatat di `AppErrorLog` tapi diabaikan oleh halaman admin.
* **Nilai Bisnis:** Owner merasa aplikasi sehat karena Error Hub menunjukkan angka 0, padahal user di lapangan mengalami crash JavaScript atau error endpoint.
* **Spesifikasi Solusi:** Ingest tabel `AppErrorLog` ke dalam `/api/admin/errors`, kelompokkan berdasarkan fingerprint, dan berikan indikator frekuensi kenaikan (spike alert).

### 5. [P1 — DATA-TRUST] Monitor Freshness Data Saham EOD Cerdas Kalender Bursa
* **Status Saat Ini:** Log EOD dan Intraday status saat ini membaca `StockPrice.date` dengan batas kaku 24 jam. Pada hari Sabtu dan Minggu, status otomatis berubah menjadi "stale" (merah/kuning).
* **Nilai Bisnis:** Mengurangi kepercayaan owner terhadap sistem otomasi karena selalu muncul peringatan usang palsu setiap akhir pekan.
* **Spesifikasi Solusi:** Perbarui logika `status/route.ts` untuk memperhitungkan hari libur bursa (Jumat malam s/d Senin pagi dianggap fresh jika EOD Jumat sukses). Hubungkan status langsung ke log run `sync-eod` di `CronLog`.

### 6. [P2 — GROWTH] User Retention Cohort Pengguna Anonim (`anonId`)
* **Status Saat Ini:** Halaman `/admin/retention` hanya menampilkan tabel kohor D1/D7 untuk pengguna terdaftar (register), padahal 95%+ traffic pengunjung teknikal.id adalah pengguna tamu (`anonId`).
* **Nilai Bisnis:** Tidak ada visibilitas apakah artikel SEO atau landing page berhasil membuat pengguna tamu kembali berkunjung di minggu berikutnya sebelum mereka memutuskan untuk mendaftar.
* **Spesifikasi Solusi:** Tambahkan tabel kohor retensi mingguan berbasis `anonId` (Actor ID) dari tabel `PageView` (W1, W2, W4 retention).

### 7. [P2 — CONVENIENCE] Google Search Console / SEO News Sitemap Health
* **Status Saat Ini:** Proyek memiliki `sitemap-news.xml` untuk Google News dan `sitemap.ts`, tetapi tidak ada panel pemantau kesehatan indeks atau deteksi crawl error Googlebot.
* **Nilai Bisnis:** Artikel berita dan snapshot saham yang diproduksi setiap hari tidak terpantau apakah sudah terindeks oleh Googlebot atau mengalami masalah canonical/indexing.
* **Spesifikasi Solusi:** Buat kartu SEO Health di tab Articles yang menampilkan: Jumlah artikel masuk di `sitemap-news.xml` (maksimal umur 48 jam), waktu generate terakhir, dan log hit user-agent Googlebot dari `PageView`.

---

## 5. ROADMAP PENGEMBANGAN 3 SPRINT (SCAN 4)

*Prinsip Prioritas: **Money > Data-Trust > Convenience***

```mermaid
flowchart TD
    subgraph Sprint 1: Fix Fondasi & Revenue P0
        A[Fix Enum Prediksi<br>resolve-predictions] --> B[Bangun /admin/billing<br>Panel Midtrans Live]
        B --> C[Fix Error Hub<br>Ingest AppErrorLog]
        C --> D[Fix Timezone WIB<br>Peak Hours & aggregateDaily]
    end
    subgraph Sprint 2: Konsolidasi & Tracking Gap P1
        E[Kubur 7 Stub Pages<br>Pusatkan di Pipelines] --> F[Satukan Review Artikel<br>ke Tab /admin/articles]
        F --> G[Pasang Dashboard AI<br>AiChatLog & Eval]
        G --> H[Pasang Panel Telemetri<br>Register Funnel 1 Nov]
    end
    subgraph Sprint 3: Tata Kelola, Auth & Skalabilitas
        I[Next.js Middleware Guard<br>Proteksi /admin & /api/admin] --> J[Export CSV Engine<br>AdminDataTable]
        J --> K[Optimasi Query Skala Besar<br>Limit PageView 19k]
        K --> L[Standardisasi Desain UI<br>& Responsif 360px Mobile]
    end
    Sprint 1 --> Sprint 2 --> Sprint 3
```

### SPRINT 1: "Data Trust & Revenue Engine" (Hari 1–5)
**Fokus:** Menghilangkan data palsu/bug fatal dan memberikan visibilitas penuh terhadap uang masuk.
1. **[P0 Fix] Perbaiki Enum Prediksi:**
   - Ubah `src/app/api/cron/resolve-predictions/route.ts` agar mengecek nilai lowercase `"bullish"` dan `"bearish"` sesuai skema input form.
   - Perbaiki conditional rendering warna badge di `predictions-tab.tsx`.
2. **[P0 Fitur] Bangun Panel Billing & Transaksi (`/admin/billing`):**
   - Buat route `/api/admin/billing` yang melakukan query agregat terhadap tabel `Payment`.
   - Buat halaman admin `/admin/billing` dengan ringkasan omset harian/bulanan, rincian transaksi Midtrans, filter status, dan search order ID.
3. **[P1 Fix] Ingest `AppErrorLog` ke Error Hub (`/admin/errors`):**
   - Gabungkan query `prisma.appErrorLog` ke `/api/admin/errors/route.ts`.
   - Tampilkan error nyata aplikasi di tabel Error Feed lengkap dengan jumlah hit (count) dan path konteks.
4. **[P1 Fix] Koreksi Timezone WIB Seluruh Admin:**
   - Perbaiki `buildPeakHours` di `user-analytics/route.ts` memakai helper `wibHour`.
   - Perbaiki `aggregateDaily` di `community-stats/route.ts` memakai `wibDayKey`.
   - Ganti metrik Active Sessions di `auth-health/route.ts` dengan Active Users 24h riil.

### SPRINT 2: "Konsolidasi Fitur & Tracking Gap" (Hari 6–10)
**Fokus:** Mengeliminasi tumpang tindih navigasi dan melengkapi pemantauan produk (AI & Funnel).
1. **[P2 Cleanup] Bersihkan 7 Stub Pages & Re-wire Pipelines:**
   - Hapus 7 file stub `page.tsx` (`cron-monitor`, `cron-config`, `queue-monitor`, `eod-logs`, `intraday-logs`, `indicators`, `api-keys`).
   - Daftarkan redirect permanen 301 di `next.config.js` menuju `/admin/pipelines`.
   - Hubungkan tab "Indicators" di Pipelines ke route `/api/admin/indicators` agar data 19 indikator teknikal aktif.
2. **[P2 Workflow] Satukan Review Antrian ke Artikel:**
   - Pindahkan UI `/admin/review` menjadi tab ketiga di `/admin/articles` (`Artikel` | `Performa` | `Antrian Review`).
   - Hapus menu "Review Artikel" dari sidebar navigasi `src/app/admin/layout.tsx`.
3. **[P1 Tracking] Dashboard Penggunaan Tanya AI (`/admin/ai-analytics`):**
   - Bangun antarmuka untuk membaca 101+ data `AiChatLog` dan `AiEvalRun`.
   - Pantau latensi model, pertanyaan terpopuler, estimasi konsumsi token, dan skor akurasi routing.
4. **[P1 Tracking] Visualisasi Corong Registrasi 1 Nov:**
   - Buat komponen visual funnel step-by-step di tab Analytics / Retention untuk membaca event `funnel_paper_gate_cta` s/d `register_success`.

### SPRINT 3: "Security Hardening, UI Polish & Skalabilitas" (Hari 11–15)
**Fokus:** Keamanan otentikasi tingkat server, kemudahan ekspor data operator, dan optimasi beban server.
1. **[P1 Security] Implementasi Next.js Middleware Auth Guard:**
   - Buat `src/middleware.ts` untuk memverifikasi session JWT role `ADMIN` pada level edge/server sebelum merender rute `/admin/*` dan `/api/admin/*`.
   - Bungkus route `/api/admin/views-geo` dengan `try/catch` + `handleApiError` untuk mencegah crash unhandled exception 500.
2. **[P2 Usability] Engine Ekspor CSV Reusable:**
   - Tambahkan tombol "Export CSV" pada komponen `AdminDataTable`.
   - Izinkan operator mengekspor data tabel User, Transaksi Billing, Artikel, dan Error Logs dalam 1 klik.
3. **[P1 Performance] Capping & Pagination Query Berat:**
   - Pasang cursor pagination pada query `PageView` (19.129 baris) di `analytics.service.ts` dan batasi window default.
   - Tambahkan pagination pada `src/app/admin/reports/page.tsx` untuk query antrian moderasi.
4. **[P3 UI/UX] Harmonisasi Desain & Optimasi Mobile 360px:**
   - Hapus sisa styling lawas (`bg-bg-card`, `depth-shadow`) pada halaman admin, samakan ke design tokens Shadcn Admin.
   - Perbaiki responsive layout pada breakpoint 360px mobile (KPI grid wrap dan horizontal overflow-x pada header filter).

---

## 6. BATASAN & LIMITASI AUDIT

1. **Audit Read-Only:** Sesuai instruksi brief, tidak ada perubahan kode produksi, commit, atau deploy yang dilakukan selama pemindaian ini.
2. **Snapshot Waktu:** Data database diambil pada snapshot 2026-11-01 20:30 WIB.
3. **Kompilasi TypeScript:** Verifikasi kompilasi dijalankan tepat 1x (`npx tsc --noEmit`) dengan hasil **Exit Code 0** (0 error tipe statis pada snapshot repo).
