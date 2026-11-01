# SEO Sprint-1 Build & Verification Report — teknikal.id

**Tanggal:** 2026-11-01  
**Branch:** `fix/seo-sprint1` (dari `main`)  
**Status:** ALL TASKS COMPLETED (Tasks A, B, C, D) — Tests PASS, TypeScript 0 Error, Build SUCCESS  

---

## 1. Executive Summary & Diff Summary

Sprint SEO-1 mengeksekusi perbaikan komprehensif pada arsitektur on-page, template metadata, segmentasi crawling programmatic, eliminasi kanibalisasi, dan internal linking untuk ribuan halaman indeks Bursa Efek Indonesia di teknikal.id.

### Ringkasan Perubahan per Scope

#### TASK A — Title & Template On-Page (P0)
- **Eliminasi Dobel Brand:** Menghapus suffix manual `| TeknikalID` dan `— TeknikalID` dari 30+ file halaman publik di `src/app/(public)/` (`waitlist`, `crypto`, `saham-stochastic-oversold`, `bottom-fishing`, `laporan-pasar`, `screener`, `saham-volume-spike`, `kalender-dividen`, `aliran-dana-asing`, `saham-modal-100-ribu`, `saham-blue-chip`, `saham-dividen`, dll) sehingga template root `%s | TeknikalID` di `layout.tsx` tidak lagi menghasilkan brand ganda. Hasil: 0 kemunculan `TeknikalID | TeknikalID` di seluruh `src/`.
- **`/kalender-dividen`:**
  - Title: `Kalender Dividen BEI 2026 — Cum Date & Yield` (57 char)
  - Meta Description: `Jadwal pembagian dividen saham BEI terbaru: cum date, ex date, tanggal pembayaran, nominal, dan estimasi yield — cek sebelum beli.`
- **`/aliran-dana-asing`:**
  - Title: `Aliran Dana Asing Hari Ini — Net Foreign Buy BEI`
  - Meta Description: `Saham net foreign buy & sell terbesar BEI hari ini dari data resmi IDX, plus skor sinyal teknikal tiap emiten. Update tiap hari bursa.`
- **`/stocks`:**
  - Title: `Harga Saham Hari Ini — 956 Emiten IDX Real-Time`
  - Meta Description: `Daftar harga saham IDX hari ini untuk 956 emiten — update real-time tiap detik pasar buka. Filter sektor, RSI, MACD & golden cross gratis, tanpa login.`
  - H1: Diubah dari `Radar Saham IDX` menjadi `Harga Saham IDX Hari Ini`, dengan `Radar Saham IDX` sebagai eyebrow kecil di atas H1.
- **`/sektor`:**
  - Title: `Sektor Saham BEI — Harga & Analisa per Sektor`
  - Penambahan sektor `kesehatan` (Healthcare) di `src/lib/sectors.ts` melengkapi 12 sektor resmi BEI.
  - Implementasi tabel SSR 12 baris (nama sektor, jumlah saham, saham naik, saham turun, rata-rata perubahan % hari ini, dan saham utama).

#### TASK B — Template Ticker 616 Halaman (P0)
- **Sanitizer Nama Emiten (`src/lib/normalize-ticker-title.ts`):**
  - Membersihkan suffix korporat: `(Persero)`, `(Perser`, `(Persero`, `(Tbk.)`, `Tbk`, `Tb`, `T`.
  - Memperbaiki bug nama terpotong di database (kasus BRIS `Bank Syariah Indonesia (Perser` → `Bank Syariah Indonesia`, BBRI `Bank Rakyat Indonesia (Persero` → `Bank Rakyat Indonesia`, ADRO `Alamtri Resources Indonesia Tb` → `Alamtri Resources Indonesia`).
  - Menjaga kurung non-korporat tetap utuh (kasus `Bank Rakyat Indonesia (BRI)` tetap `Bank Rakyat Indonesia (BRI)`).
  - Truncation maksimal 30 karakter tanpa memotong kata di tengah dan tidak memotong di tengah kurung.
- **H1 Ticker Page (`src/app/(public)/stocks/[ticker]/page.tsx`):**
  - Format H1: `Saham {SHORTNAME} ({TICKER}) — Harga Rp{price} & Analisa Teknikal Hari Ini`.
- **generateMetadata Title & Description:**
  - Title: `Harga Saham {TICKER} Hari Ini Rp{price} — Analisa & Sinyal` (tanpa suffix manual agar template layout mengisi brand sekali).
  - Nama perusahaan dipindahkan ke meta description: `Harga saham {shortName} ({fullName}) hari ini Rp{price}...`.
- **Unit Test Sanitizer (`tests/shortname-sanitizer.test.ts`):** 6 test cases mencakup kasus BRIS, BBRI, BRI, pemotongan kata, kurung terbuka, dan alias.

#### TASK C — Kenapa-Naik vs Kenapa-Turun (P0)
- **Rute Sibling `kenapa-turun-hari-ini` (`src/app/(public)/saham/[ticker]/kenapa-turun-hari-ini/page.tsx`):**
  - Membuat rute sibling yang me-reuse komponen melalui `movement-page-helper.tsx`.
  - Konten naik HANYA benar saat `changePercent > 0`; turun saat `changePercent < 0`.
- **Mismatch Detection & Canonical Protection:**
  - Jika user/bot membuka URL `kenapa-naik` untuk saham yang sedang turun (atau sebaliknya): halaman menampilkan banner peringatan arah pergerakan riil dan menyajikan link canonical ke rute yang benar.
- **Meta Description Generator Semantik (`src/lib/kenapa-meta.ts`):**
  - Menyelesaikan kontradiksi semantik SERP (arah harga × arah sinyal) menjadi kalimat bahasa Indonesia koheren.
  - Unit test 6 kombinasi lengkap di `tests/kenapa-meta.test.ts` (naik+menguat, naik+melemah technical rebound, naik+netral, turun+melemah, turun+menguat buy on weakness, turun+netral).
- **Segmentasi Sitemap (`src/app/sitemap.ts`):**
  - Query data EOD bursa terakhir:
  - Ticker hijau (`changePercent > 0`): hanya emit `kenapa-naik-hari-ini` (110 URL).
  - Ticker merah (`changePercent < 0`): hanya emit `kenapa-turun-hari-ini` (405 URL).
  - Netral (`changePercent === 0`): tidak emit keduanya.

#### TASK D — Orphan Pages, NewsArticle JSON-LD & 301 Kanibalisasi (P1)
- **Internal Linking Footer (`src/components/layout/footer.tsx`):**
  - Menambahkan kolom "Data Pasar & Tools" berisi: Kalender Dividen (`/kalender-dividen`), Aliran Dana Asing (`/aliran-dana-asing`), Indeks LQ45 & JII (`/indeks/lq45`), Radar Saham Diskon (`/bottom-fishing`), Setup Swing Hari Ini (`/swing`), Sektor Saham BEI (`/sektor`), dan Laporan Pasar Mingguan (`/laporan-pasar`).
- **NewsArticle JSON-LD (`src/app/(public)/berita/[slug]/page.tsx`):**
  - Menghapus pembatasan `isFreshNews` 48 jam sehingga seluruh artikel berita dan analisis saham memiliki schema `NewsArticle` & `Article`.
  - `headline`, `datePublished` (dari DB `publishedAt` / `createdAt`), `dateModified` (dari DB `updatedAt`), `author` (Organization `TeknikalID`), `publisher.logo`, `image` (ogImageUrl), dan `about` (Corporation tickerTag).
- **Sitemap News 30 Hari (`src/app/sitemap-news.xml/route.ts`):**
  - Memperluas window filter dari 48 jam ke 30 hari penuh (`30 * 24 * 60 * 60 * 1000`) dan mencakup tipe berita, analisis saham, dan pergerakan pasar.
- **Server-rendered Pagination Berita (`/berita?page=N`):**
  - Parameter `?page=N` dengan perhitungan `skip/take` server-side, kontrol pagination UI (Halaman Sebelumnya/Berikutnya), dan tag HTML `<link rel="prev">` serta `<link rel="next">`.
  - 5 artikel terkait per ticker overlap terbaru di setiap halaman artikel (`/berita/[slug]`).
- **301 Kanibalisasi Akademi (`next.config.ts`):**
  - Menambahkan 8 aturan redirect 301 permanen:
    - `/akademi/tanya/cara-memilih-saham-untuk-pemula-bb7c51` → `/akademi/tanya/cara-memilih-saham-untuk-pemula` (301)
    - `/akademi/tanya/cara-memilih-saham-untuk-pemula-cthzrv` → `/akademi/tanya/cara-memilih-saham-untuk-pemula` (301)
    - `/akademi/tanya/cara-memilih-saham-untuk-pemula-i7cx5q` → `/akademi/tanya/cara-memilih-saham-untuk-pemula` (301)
    - `/akademi/tanya/strategi-swing-trading-saham-uo62xv` → `/akademi/tanya/strategi-swing-trading-saham` (301)
    - `/akademi/tanya/apa-itu-flipping-dalam-pasar-saham` → `/akademi/tanya/apa-itu-flipping` (301)
    - `/akademi/tanya/bollinger-bands-cara-menggunakan-indikator-saham` → `/akademi/tanya/bollinger-bands-dan-cara-menggunakannya` (301)
    - `/akademi/golden-cross-vs-death-cross-arti-cara-membaca-contoh-saham` → `/akademi/beda-golden-cross-vs-death-cross` (301)
    - `/akademi/golden-cross-dan-death-cross-sinyal-strategi-saham` → `/akademi/beda-golden-cross-vs-death-cross` (301)

---

## 2. Bukti Fisik Verifikasi

### A. TypeScript Check (`npx tsc --noEmit`)
```
Command: npx tsc --noEmit
Exit code: 0
Output: (0 error, clean)
```

### B. Unit Tests (`npx tsx --test tests/shortname-sanitizer.test.ts tests/kenapa-meta.test.ts`)
```
▶ kenapa-meta (arah harga × arah sinyal 6 kombinasi)
  ✔ kombinasi 1: naik + sinyal menguat (0.299458ms)
  ✔ kombinasi 2: naik + sinyal melemah (technical rebound) (0.047791ms)
  ✔ kombinasi 3: naik + sinyal netral (0.041917ms)
  ✔ kombinasi 4: turun + sinyal melemah (0.042584ms)
  ✔ kombinasi 5: turun + sinyal menguat (buy on weakness / pullback) (0.037333ms)
  ✔ kombinasi 6: turun + sinyal netral (0.04225ms)
✔ kenapa-meta (arah harga × arah sinyal 6 kombinasi) (0.9745ms)
▶ shortname-sanitizer
  ✔ strips corporate suffixes like (Persero) Tbk (0.434083ms)
  ✔ fixes (Perser unclosed suffix bug from database (0.054208ms)
  ✔ keeps non-corporate parentheses like (BRI) intact (0.035167ms)
  ✔ truncates to max 30 characters without cutting words in half (0.0685ms)
  ✔ does not truncate in the middle of parentheses (0.041791ms)
  ✔ works with normalizeTickerTitle alias (0.0445ms)
✔ shortname-sanitizer (1.130125ms)
ℹ tests 12
ℹ suites 2
ℹ pass 12
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 137.152583
```

### C. Build Check (`npm run build`)
```
> teknikalid@0.1.0 build
> next build --webpack

▲ Next.js 16.4.3 (webpack)
- Environments: .env
✓ Running next.config.ts took 101ms
- Experiments (use with caution):
  · optimizePackageImports

  Creating an optimized production build ...
✓ Compiled successfully in 15.4s
  Finished TypeScript in 11.1s    ✓ Finished TypeScript in 11.1s 
  Collecting page data using 9 workers in 928ms    ✓ Collecting page data using 9 workers in 928ms 
...
├ ƒ /saham-golden-cross
├ ƒ /saham-macd-bullish
├ ƒ /saham-modal-100-ribu
├ ƒ /saham-overbought
├ ƒ /saham-oversold
├ ƒ /saham-pullback-sma20
├ ƒ /saham-stochastic-oversold
├ ƒ /saham-undervalued
├ ƒ /saham-value-growth
├ ƒ /saham-volume-spike
├ ƒ /saham/[ticker]/kenapa-naik-hari-ini
├ ƒ /saham/[ticker]/kenapa-turun-hari-ini
├ ƒ /screener
├ ƒ /sektor
├ ƒ /sektor/[slug]
├ ○ /settings
├ ƒ /sitemap-news.xml
├ ƒ /sitemap.xml
├ ƒ /stocks
├ ƒ /stocks/[ticker]
├ ƒ /stocks/[ticker]/indikator
├ ƒ /swing
├ ○ /terms                                             1d      1y
├ ƒ /track-record
├ ƒ /trading-plan
├ ƒ /waitlist
└ ƒ /watchlist

ƒ Proxy (Middleware)
○  (Static)   prerendered as static content
●  (SSG)      prerendered as static HTML (uses generateStaticParams)
ƒ  (Dynamic)  server-rendered on demand
Exit code: 0
```

### D. Ad-Hoc 20 Ticker Verification (Data Nyata DB)
Loop 20 ticker random/prioritas dari database PostgreSQL teknikal.id:
```
[01] KLBF.JK  | Title: "Harga Saham KLBF Hari Ini Rp730 — Analisa & Sinyal" | H1: "Saham Kalbe Farma (KLBF) — Harga Rp730 & Analisa Teknikal Hari Ini"
[02] ASII.JK  | Title: "Harga Saham ASII Hari Ini Rp4.800 — Analisa & Sinyal" | H1: "Saham Astra International (ASII) — Harga Rp4.800 & Analisa Teknikal Hari Ini"
[03] BBCA.JK  | Title: "Harga Saham BBCA Hari Ini Rp4.980 — Analisa & Sinyal" | H1: "Saham Bank Central Asia (BBCA) — Harga Rp4.980 & Analisa Teknikal Hari Ini"
[04] BBRI.JK  | Title: "Harga Saham BBRI Hari Ini Rp2.800 — Analisa & Sinyal" | H1: "Saham Bank Rakyat Indonesia (BBRI) — Harga Rp2.800 & Analisa Teknikal Hari Ini"
[05] BBNI.JK  | Title: "Harga Saham BBNI Hari Ini Rp3.320 — Analisa & Sinyal" | H1: "Saham Bank Negara Indonesia (BBNI) — Harga Rp3.320 & Analisa Teknikal Hari Ini"
[06] BRIS.JK  | Title: "Harga Saham BRIS Hari Ini Rp1.005 — Analisa & Sinyal" | H1: "Saham Bank Syariah Indonesia (BRIS) — Harga Rp1.005 & Analisa Teknikal Hari Ini"
[07] TLKM.JK  | Title: "Harga Saham TLKM Hari Ini Rp1.980 — Analisa & Sinyal" | H1: "Saham Telkom Indonesia (TLKM) — Harga Rp1.980 & Analisa Teknikal Hari Ini"
[08] PGAS.JK  | Title: "Harga Saham PGAS Hari Ini Rp1.320 — Analisa & Sinyal" | H1: "Saham Perusahaan Gas Negara (PGAS) — Harga Rp1.320 & Analisa Teknikal Hari Ini"
[09] AADI.JK  | Title: "Harga Saham AADI Hari Ini Rp11.475 — Analisa & Sinyal" | H1: "Saham Adaro Andalan Indonesia (AADI) — Harga Rp11.475 & Analisa Teknikal Hari Ini"
[10] AALI.JK  | Title: "Harga Saham AALI Hari Ini Rp9.625 — Analisa & Sinyal" | H1: "Saham Astra Agro Lestari (AALI) — Harga Rp9.625 & Analisa Teknikal Hari Ini"
[11] ABBA.JK  | Title: "Harga Saham ABBA Hari Ini Rp30 — Analisa & Sinyal" | H1: "Saham Mahaka Media (ABBA) — Harga Rp30 & Analisa Teknikal Hari Ini"
[12] ABDA.JK  | Title: "Harga Saham ABDA Hari Ini Rp4.970 — Analisa & Sinyal" | H1: "Saham Asuransi Bina Dana Arta (ABDA) — Harga Rp4.970 & Analisa Teknikal Hari Ini"
[13] ABMM.JK  | Title: "Harga Saham ABMM Hari Ini Rp2.600 — Analisa & Sinyal" | H1: "Saham ABM Investama (ABMM) — Harga Rp2.600 & Analisa Teknikal Hari Ini"
[14] ACES.JK  | Title: "Harga Saham ACES Hari Ini Rp324 — Analisa & Sinyal" | H1: "Saham Aspirasi Hidup Indonesia (ACES) — Harga Rp324 & Analisa Teknikal Hari Ini"
[15] ACRO.JK  | Title: "Harga Saham ACRO Hari Ini Rp43 — Analisa & Sinyal" | H1: "Saham Samcro Hyosung Adilestari (ACRO) — Harga Rp43 & Analisa Teknikal Hari Ini"
[16] ACST.JK  | Title: "Harga Saham ACST Hari Ini Rp73 — Analisa & Sinyal" | H1: "Saham Acset Indonusa (ACST) — Harga Rp73 & Analisa Teknikal Hari Ini"
[17] ADCP.JK  | Title: "Harga Saham ADCP Hari Ini Rp50 — Analisa & Sinyal" | H1: "Saham Adhi Commuter Properti (ADCP) — Harga Rp50 & Analisa Teknikal Hari Ini"
[18] ADES.JK  | Title: "Harga Saham ADES Hari Ini Rp32.900 — Analisa & Sinyal" | H1: "Saham Akasha Wira International (ADES) — Harga Rp32.900 & Analisa Teknikal Hari Ini"
[19] ADHI.JK  | Title: "Harga Saham ADHI Hari Ini Rp133 — Analisa & Sinyal" | H1: "Saham Adhi Karya (ADHI) — Harga Rp133 & Analisa Teknikal Hari Ini"
[20] ADMF.JK  | Title: "Harga Saham ADMF Hari Ini Rp7.800 — Analisa & Sinyal" | H1: "Saham Adira Dinamika Multi Finance (ADMF) — Harga Rp7.800 & Analisa Teknikal Hari Ini"
```

### E. Bukti Grep: 0 Kemunculan `TeknikalID | TeknikalID`
```bash
grep -rn "TeknikalID | TeknikalID" src/
# Output: Exit code 1 (0 matches)
```

Pengecekan manual title berakhiran `| TeknikalID"`:
```bash
grep -rn "| TeknikalID\"" src/app/
src/app/layout.tsx:44:  title: { default: "Analisa Teknikal Saham IDX & Chart Real-Time — TeknikalID", template: "%s | TeknikalID" },
src/app/(public)/harga-saham-hari-ini/page.tsx:29:    // absolute — cegah double-suffix dari layout template "%s | TeknikalID" (AC3 exact-title)
src/app/(public)/stocks/[ticker]/page.tsx:110:  // SEO-optimized title — shortName ≤ 30 chars (suffix stripped, word-boundary cut; root template adds "| TeknikalID" = ~13 chars → total < 60)
src/app/(public)/akademi/[slug]/page.tsx:33:    // absolute: opt out of root layout's "%s | TeknikalID" template — avoids double brand
# Output: Hanya template root layout dan komentar penjelasan dokumentasi. Semua title halaman bebas dobel brand.
```

### F. Sitemap URL Counts: Kenapa-Naik vs Kenapa-Turun
```
=== SITEMAP KENAPA-NAIK VS KENAPA-TURUN ===
Total URLs in sitemap: 1316
kenapa-naik-hari-ini count: 110
kenapa-turun-hari-ini count: 405

Sample 5 kenapa-naik:
  1. https://teknikal.id/saham/aadi/kenapa-naik-hari-ini
  2. https://teknikal.id/saham/aali/kenapa-naik-hari-ini
  3. https://teknikal.id/saham/abmm/kenapa-naik-hari-ini
  4. https://teknikal.id/saham/aces/kenapa-naik-hari-ini
  5. https://teknikal.id/saham/admf/kenapa-naik-hari-ini

Sample 5 kenapa-turun:
  1. https://teknikal.id/saham/acro/kenapa-turun-hari-ini
  2. https://teknikal.id/saham/ades/kenapa-turun-hari-ini
  3. https://teknikal.id/saham/agar/kenapa-turun-hari-ini
  4. https://teknikal.id/saham/agii/kenapa-turun-hari-ini
  5. https://teknikal.id/saham/agro/kenapa-turun-hari-ini
```

---

## 3. Limitasi & Catatan Teknis

1. **Database Read-Only**: Sesuai brief, tidak ada mutasi data database yang dilakukan. Bug nama perusahaan terpotong di DB (misal `Bank Syariah Indonesia (Perser` dan `Adira Dinamika Multi Finance T`) ditangani secara elegan di level aplikasi via sanitizer deterministik (`sanitizeShortName`).
2. **Sitemap Dynamic Refresh**: `sitemap.ts` diatur dengan `export const dynamic = "force-dynamic"` dan `revalidate = 3600`. Pada setiap regenerasi hourly, distribusi URL `kenapa-naik` vs `kenapa-turun` akan otomatis mencerminkan status hijau/merah EOD terakhir.
3. **No Deploy / No Push**: Seluruh perubahan tersimpan di branch lokal `fix/seo-sprint1` dan siap di-review oleh tim/owner.
