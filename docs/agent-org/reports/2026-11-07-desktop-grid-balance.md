# LAPORAN BUILD: DESKTOP KOLOM KANAN SEIMBANG (Grid 2-Kolom Stock Page)

- **Tanggal**: 2026-11-07
- **Peran**: Implementer UI di repo WEB `teknikalidnew` (Next.js 16, React 19, TS, Tailwind)
- **Status**: SIAP VERIFIKASI (Hermes verifier). **TIDAK DI-COMMIT / DEPLOY**.
- **Basis Build**: State git terkini (mempertahankan build hero-subtitle + batch2-compact tanpa revert).

---

## 1. Ringkasan Masalah & Solusi

### Feedback Owner
> *"trading plan panjang jadi aneh di kanan kosong… bisa ditaruh di kanan? di bawah pembanding?"*

### Masalah Baseline (Desktop 1440px)
Sebelum perbaikan:
- **Child 0 (KIRI)**: Trading Plan + Tanya AI compact = tinggi ~567px.
- **Child 1 (KANAN)**: Skor Sinyal hero + Stronger Peers = tinggi ~319px.
- Blok *Anti-dead-end peers*, *Member indices*, *Ringkas untuk pemula*, *Bandingkan dengan*, dan *OHLC* dirender membentang penuh (full-width) di **bawah** grid.
- **Dampak**: Terdapat ruang kosong/blank space ±248px di bawah kolom kanan sebelum konten bawah dimulai.

### Solusi & Keputusan Desain (Mobile-First Preserved, Desktop Balanced)
1. **Penyusunan Ulang Konten Grid 2-Kolom**:
   - Blok *Anti-dead-end peers*, *Member indices*, *Ringkas untuk pemula*, *Bandingkan dengan*, dan *OHLC* dipindahkan ke dalam container kolom indikator & ringkasan saham (child 1).
   - Di **Desktop (1440px)**:
     - **Kolom KIRI (`lg:order-1`)**: Skor Sinyal hero (gauge + sinyal outlook + ⓘ) + Rincian 9 indikator (collapsed) + Arah 5 sesi terakhir + Tombol "Simpan ke pantauan" + Stronger Peers Strip + Bridge Peers + Member Indices + Ringkas untuk pemula + Bandingkan dengan + OHLC & 52-week strip. (Tinggi: **~517px**).
     - **Kolom KANAN (`lg:order-2`)**: Trading Plan card (GuestTradingPlanGate / LoginGate) + Baris compact Tanya AI + Prompt chips collapse. (Tinggi: **~575px**).
     - **Selisih Tinggi Antar Kolom**: **57.6px** (jauh di bawah batas toleransi `≤ 120px`). Kedua kolom sejajar rapi dari atas dan berakhir seimbang.
2. **Mobile (Viewport < 1024px) Invariant Terjaga**:
   - Menggunakan utility flex/grid `order-1 lg:order-2` (Trading Plan) dan `order-2 lg:order-1` (Skor Sinyal & Ringkasan).
   - Di mobile (`grid-cols-1`), urutan tampilan visual dan DOM adalah:
     `Harga Header → Trading Plan + Tanya AI (order-1) → Skor Sinyal & Ringkasan (order-2) → dst`.
   - OffsetTop Trading Plan di mobile 375px tetap **~164px (≤ 272px)**, tanpa regresi.
3. **SEO & DOM Integrity**:
   - Tanpa duplikasi DOM (1 salinan komponen di SSR HTML).
   - `GuestQuotaProvider` tetap membungkus grid, menjaga gate kuota freemium W1.
   - Tidak menyentuh H1, canonical, JSON-LD, billing, atau route API.

---

## 2. Struktur Grid Baru & Estimasi Tinggi

```
Desktop (1440px) Grid 2-Kolom (`lg:grid-cols-2 gap-4 items-start`):
┌──────────────────────────────────────────────┬──────────────────────────────────────────────┐
│ KOLOM KIRI (child 1, `order-2 lg:order-1`)   │ KOLOM KANAN (child 0, `order-1 lg:order-2`)  │
│ Tinggi: ~517.4px                             │ Tinggi: ~575.0px                             │
├──────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ 1. Skor Sinyal Card (~190px)                 │ 1. Trading Plan Card (~515px)                │
│    - Score badge & verdict instan            │    - Area Beli, TP1, TP2, SL, R:R            │
│    - Rincian 9 indikator (collapsed)         │    - Probabilitas Monte Carlo                │
│    - Arah 5 sesi terakhir                    │    - Catatan risiko (collapsed)              │
│    - Simpan ke pantauan                      │    - Disclaimer analisa harian               │
│ 2. Stronger Peers Strip (~64px)              │ 2. Tanya AI Compact Bar (~48px)              │
│ 3. Bridge Peers & Member Indices (~35px)     │    - 🤖 Tanya AI soal {TICKER} · gratis 3x → │
│ 4. Ringkas untuk Pemula (~35px)              │    - 💡 Panduan cepat tanya AI chips         │
│ 5. Bandingkan dengan (~55px)                 │                                              │
│ 6. OHLC + 52-Week Range Strip (~75px)        │                                              │
└──────────────────────────────────────────────┴──────────────────────────────────────────────┘
 Selisih tinggi: |517.4px - 575.0px| = 57.6px (TARGET: ≤ 120px — MEMENUHI SYARAT)
```

---

## 3. Hasil Pengukuran & Verifikasi Fisik

### A. Pengukuran Bounding Box (Playwright Chromium)
```
--- PENGUKURAN TINGGI DESKTOP 1440px ---
Kolom Kiri  (Skor + Peers + Ringkas + Bandingkan + OHLC): 517.4px
Kolom Kanan (Trading Plan + Tanya AI compact):          575.0px
Selisih Tinggi (|Kiri - Kanan|):                        57.6px
-----------------------------------------
Posisi Kolom Kiri:  x = 136px (KIRI)
Posisi Kolom Kanan: x = 728px (KANAN)
Vertical Alignment: y = 16px (KEDUA KOLOM SEJAJAR DI ATAS)
```

### B. Hasil Selftest Baru: `desktop-grid-balance.selftest.ts`
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

### C. Hasil Selftest Regresi Mobile: `mobile-stock-card.selftest.tsx`
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

### D. Hasil Selftest Regresi W1: `web-retention-w1.selftest.ts`
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

### E. Next.js Production Build: `npm run build`
```bash
$ npm run build
> next build --webpack
▲ Next.js 16.4.3 (webpack)
✓ Compiled successfully in 6.7s
✓ Finished TypeScript in 3.1s
✓ Collecting page data using 9 workers in 833ms
✓ Generating static pages using 9 workers (132/132) in 928ms
Command exited with code 0.
```

---

## 4. File yang Diubah & Ditambahkan

1. `src/app/(public)/stocks/[ticker]/page.tsx`:
   - Penambahan utility `order-1 lg:order-2` pada kolom Trading Plan (child 0).
   - Penambahan utility `order-2 lg:order-1` pada kolom Overview/Indikator (child 1).
   - Pemindahan elemen *Bridge Peers*, *Member Indices*, *Ringkas untuk pemula*, *Bandingkan dengan*, dan *OHLC* ke dalam kolom Overview (child 1) di bawah `StrongerPeersStrip`.
   - Menghilangkan ruang kosong desktop ±250px menjadi selisih seimbang 57.6px.
2. `scripts/selftest/desktop-grid-balance.selftest.ts`:
   - Selftest otomatis untuk memvalidasi posisi grid mobile vs desktop, integritas SSR, dan pengukuran selisih tinggi kolom `≤ 120px` menggunakan Chromium Playwright.
3. `docs/agent-org/reports/2026-11-07-desktop-grid-balance.md`:
   - Laporan build dan bukti verifikasi fisik lengkap.
