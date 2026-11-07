# LAPORAN BUILD: Hapus Blok Mati — Sentimen Komunitas + Diskusi (Stock Page)

- **Tanggal**: 2026-11-07
- **Peran**: Implementer UI repo WEB `teknikalidnew` (Next.js 16, React 19, TypeScript, Tailwind CSS)
- **Status**: SIAP VERIFIKASI (Hermes verifier). **TIDAK DI-COMMIT / DEPLOY**.
- **Basis Build**: State git terkini (mempertahankan build `desktop-grid-balance` dan `hero-subtitle` tanpa revert).

---

## 1. Ringkasan Eksekusi & Data Pendukung

### Data Pendukung
Berdasarkan query DB historis pada tabel `Comment`:
- Total komentar sepanjang sejarah platform: 1 komentar.
- 0 komentar dalam 30 hari terakhir.
- Blok `<SentimentGauge />` dan `<StockDiscussion />` pada semua ticker selalu menampilkan state kosong (*"Belum ada data sentimen"* & *"Belum ada diskusi untuk TICKER"*). Ini adalah noise visual murni yang menurunkan perceived quality halaman bagi investor.

### Tindakan yang Dilakukan
1. **Pembersihan Halaman Saham (`src/app/(public)/stocks/[ticker]/page.tsx`)**:
   - Menghapus import `StockDiscussion` dari `@/components/community/stock-discussion`.
   - Menghapus import `SentimentGauge` dari `@/components/stock/sentiment-gauge`.
   - Menghapus render `<SentimentGauge ticker={ticker} />` dan `<StockDiscussion ticker={ticker} />`.
   - Menjaga komponen `RegistrationInlinePrompt ticker={ticker}` yang berdiri mandiri untuk funnel registrasi unauthenticated guest sebelum section FAQ.

2. **Penghapusan File Komponen Tak Terpakai (Orphaned Components)**:
   - `src/components/stock/sentiment-gauge.tsx` (dihapus).
   - `src/components/community/stock-discussion.tsx` (dihapus).
   - `src/components/community/comment-list.tsx` (dihapus — diverifikasi hanya diimpor oleh `stock-discussion.tsx`).

3. **Integritas Batas Domain & Komponen Tetap Aman**:
   - Tabel database dan skema Prisma (`Comment`, `Post`, dll.) **TIDAK disentuh**.
   - Endpoint API backend (`/api/stocks/[ticker]/comments`, `/api/stocks/[ticker]/sentiment`, `/api/comments`) **TIDAK disentuh** (tersedia utuh bila backend atau fitur lain memerlukan).
   - Blok FAQ (`faq-tab-section`, `StockFAQWidget`, FAQ Schema JSON-LD) **TIDAK disentuh**.
   - `domains/stock/indicator.service.ts` **TIDAK disentuh**.
   - Komponen `comment-form.tsx` dibiarkan utuh di folder `community/` untuk kehati-hatian reusabilitas.

4. **Pembersihan Anchor / Nav / Aria**:
   - Dilakukan audit pencarian `#diskusi`, `#sentimen`, `id="diskusi"`, `id="sentimen"`.
   - Hasil: Tidak ada anchor link internal atau nav tab mati yang mengarah ke blok yang dihapus.

5. **Pemeriksaan SEO**:
   - Teks state kosong seperti *"Jadilah yang pertama berbagi analisa"* dan *"Belum ada diskusi"* tidak lagi ter-render di SSR HTML.
   - Tidak ada link internal yang rusak (*broken anchor*).
   - H1, title tag, openGraph, breadcrumbs, dan structured data JSON-LD tetap utuh.

---

## 2. Bukti Fisik Verifikasi

### A. Next.js Production Build
```bash
$ npm run build
> teknikalid@0.1.0 build
> next build --webpack

▲ Next.js 16.4.3 (webpack)
- Environments: .env
✓ Compiled successfully in 8.1s
✓ Finished TypeScript in 3.3s
✓ Collecting page data using 9 workers in 737ms
✓ Generating static pages using 9 workers in 2.6s
✓ Finalizing page optimization
Exit code: 0 (SUCCESS)
```

### B. Selftest Validasi Regresi Stock Page
```bash
$ npx tsx scripts/selftest/mobile-stock-card.selftest.tsx
=== SELFTEST: MOBILE-FIRST STOCK CARD ===
PASS  1a. Trading Plan memiliki judul yang tepat
PASS  1b. Baris meta memuat Sumber: Pivot & ATR
PASS  1c. Baris meta memuat badge strategi BOW
PASS  1d. Baris meta memuat Keyakinan: Sedang
PASS  1e. Catatan risiko dibungkus native <details> yang collapsible
PASS  1f. Details catatan risiko default tertutup (tanpa atribut open)
PASS  1g. Summary menampilkan satu baris ringkas dengan jumlah risiko
PASS  1h. Isi lengkap catatan risiko tetap dirender di DOM (SEO & aksesibilitas)
PASS  1i. Warning simulasi statistik masuk ke dalam collapse catatan risiko (total 2)
PASS  1j. Warning simulasi statistik memiliki prefix 🔬 dan teks lengkap di DOM
PASS  1k. Tidak ada baris warning simulasi terpisah di luar details
PASS  1l. Disclaimer analisa harian tetap utuh di DOM untuk SEO
PASS  1m. Disclaimer analisa harian menggunakan kelas compact text-[10px] text-text-tertiary
PASS  2a. Rincian indikator menggunakan native <details>
PASS  2b. Summary memiliki aria-label berisi rincian indikator teknikal
PASS  2c. Teks penjelas 9 indikator tetap ada di DOM untuk SEO
PASS  3a. CTA compact membawa data-engagement=agent_deeplink_compact
PASS  3b. Deeplink membawa tag src_ask_BBCA
PASS  3c. Teks tombol compact berformat '🤖 Tanya AI soal BBCA · gratis 3x →'
PASS  4a. Chips prompt ada di dalam details
PASS  4b. 3 tombol chip lengkap di dalam details
PASS  5a. Posisi offsetTop elemen trading plan di viewport 375px = ~164px (≤ 600px)

RESULT: ALL PASS
```

```bash
$ npx tsx scripts/selftest/web-retention-w1.selftest.ts
=== SELFTEST: W1 WEB RETENTION ===
PASS  1a. Kunjungan 1 BBCA terbuka
PASS  1b. Kunjungan 2 BBRI terbuka
PASS  1c. Kunjungan 3 BMRI terbuka
PASS  1d. Revisit BBCA tetap terbuka
PASS  1e. Kunjungan 4 ASII ter-blur (gated)
PASS  1f. Rollover tanggal baru reset kuota (ASII terbuka)
PASS  2a. data-premium ADA di DOM saat within quota
PASS  2b. data-premium NULL di DOM saat ter-blur (TradingPlanGate)
PASS  2c. data-premium NULL di DOM saat ter-blur (GuestQuota wrapper)
PASS  3a. Banner memuat label reg_free_banner
PASS  3b. Banner memuat label agent_deeplink_banner
PASS  3c. Label CTA lapis 1 dan lapis 2 berbeda
PASS  3d. Deeplink membawa tag src_stock_BBCA
PASS  4a. Kunjungan pertama sesi: inline strip tampil (true)
PASS  4b. sessionStorage tersimpan flag 1x
PASS  4c. Kunjungan kedua sesi yang sama: inline strip tidak tampil (false)
PASS  4d. Sesi baru: inline strip kembali tampil 1x
PASS  4e. Label inline strip = agent_deeplink_inline
PASS  4f. Deeplink inline strip = src_ask_BBCA
PASS  5a. Logged-in user buka 10 saham berbeda: semua terbuka (isGated=false)
PASS  5b. Storage guest quota tidak berubah/tersentuh
PASS  5c. Logged-in: konten trading plan ada di DOM (data-premium)
PASS  5d. Logged-in: banner overlimit tidak dirender

RESULT: ALL PASS
```

```bash
$ npx tsx scripts/selftest/desktop-grid-balance.selftest.ts
=== SELFTEST: DESKTOP GRID BALANCE (2-KOLOM SEIMBANG) ===
PASS  1a. Grid memiliki kelas 2-kolom desktop lg:grid-cols-2
PASS  1b. Kolom Trading Plan membawa order-1 lg:order-2 (mobile pertama, desktop kanan)
PASS  1c. Kolom Skor Sinyal & Pasar membawa order-2 lg:order-1 (mobile kedua, desktop kiri)
PASS  1d. Blok Bandingkan dengan berada di dalam kolom kiri (child1)
PASS  1e. Blok OHLC berada di dalam kolom kiri (child1)
PASS  1f. Blok Ringkas untuk pemula berada di dalam kolom kiri (child1)
PASS  1g. GuestQuotaProvider tetap membungkus seluruh grid
PASS  1h. Konten SSR tunggal tanpa duplikasi DOM
PASS  2a. Mobile (375px): Trading Plan berada di atas Kolom Overview
PASS  2b. Mobile (375px): OffsetTop Trading Plan = ~164px (≤ 272px)
PASS  2c. Desktop (1440px): Kolom Overview berada di KIRI (x < 700)
PASS  2d. Desktop (1440px): Kolom Trading Plan berada di KANAN (x > 700)
PASS  2e. Desktop (1440px): Kedua kolom sejajar vertikal di atas (y identik)
PASS  2f. Selisih tinggi kolom kiri vs kanan ≤ 120px (hasil: 57.6px)

RESULT: ALL PASS
```

### C. Grep Verification di Direktori `src/`
```bash
$ grep -rn "StockDiscussion\|SentimentGauge" src
src/components/community/feed.tsx:21:interface StockDiscussionFeedProps extends BaseFeedProps {
src/components/community/feed.tsx:27:export type FeedProps = CommunityFeedProps | StockDiscussionFeedProps;
src/components/community/feed.tsx:44:    <StockDiscussionFeedInner
src/components/community/feed.tsx:131:function StockDiscussionFeedInner({
```
*Catatan Penjelasan*: Sisa kemunculan `StockDiscussion` di atas murni berada di `src/components/community/feed.tsx`, yaitu definisi internal props/tipe variant feed komunitas (`StockDiscussionFeedProps` & `StockDiscussionFeedInner`). Komponen `StockDiscussion` maupun `SentimentGauge` pada stock page sudah **0 match**.

### D. Selftest Khusus Penghapusan Blok Komunitas Mati
Dibuat selftest khusus di `scripts/selftest/remove-dead-community-blocks.selftest.ts`:
```bash
$ npx tsx scripts/selftest/remove-dead-community-blocks.selftest.ts
=== SELFTEST: REMOVE DEAD COMMUNITY BLOCKS ===
PASS: sentiment-gauge.tsx sudah dihapus
PASS: stock-discussion.tsx sudah dihapus
PASS: comment-list.tsx sudah dihapus
PASS: Stock page tidak lagi mengimpor/merender SentimentGauge
PASS: Stock page tidak lagi mengimpor/merender StockDiscussion
PASS: Tidak ada tag <SentimentGauge di stock page
PASS: Tidak ada tag <StockDiscussion di stock page
PASS: Tidak ada anchor link #diskusi di stock page
PASS: Tidak ada anchor link #sentimen di stock page
PASS: String 'Belum ada diskusi' tidak ada di stock page
PASS: String 'Sentimen Komunitas' tidak ada di stock page
PASS: SentimentGauge 0 match di seluruh src/
PASS: StockDiscussion hanya tersisa di feed.tsx (sisa internal feedProps yang dijelaskan), bukan stock page.

RESULT: ALL PASS
```

### E. Verifikasi Bundle SSR / Output Server
```bash
$ grep -rn "Belum ada diskusi\|Sentimen Komunitas" .next/server/app/\(public\)/stocks/\[ticker\]/
# Hasil: 0 match / NOT FOUND
```
String "Belum ada diskusi" dan "Sentimen Komunitas" terbukti bersih dan tidak ada di output server stock page.

---

## 3. Catatan Pengujian E2E (Untuk Hermes / QA)
- File `e2e/authenticated/stock-discussion.spec.ts` (test lawas Playwright dari Mei 2026) menguji pengiriman komentar pada stock page. Sesuai instruksi brief ("hanya ubah UI stock page, tabel/API comments biarkan"), file e2e ini dibiarkan untuk diputuskan tim QA/Hermes apakah di-archive atau diarahkan ke API testing.

---

## 4. Status File Git
- `src/app/(public)/stocks/[ticker]/page.tsx` — Modified (hapus import & render blok mati)
- `src/components/stock/sentiment-gauge.tsx` — Deleted
- `src/components/community/stock-discussion.tsx` — Deleted
- `src/components/community/comment-list.tsx` — Deleted
- `scripts/selftest/remove-dead-community-blocks.selftest.ts` — Created (selftest guard)
- `docs/agent-org/reports/2026-11-07-remove-dead-community-blocks.md` — Created (laporan ini)
- **TIDAK ADA git commit / deploy dilakukan**. Siap diserahkan kepada Hermes verifier.
