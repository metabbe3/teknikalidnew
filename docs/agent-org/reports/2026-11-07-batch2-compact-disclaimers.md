# LAPORAN BUILD: Batch-2 Sembunyikan Teks Panjang (Disclaimer + Warning Kedua)

- **Tanggal**: 2026-11-07
- **Peran**: Implementer UI repo WEB `teknikalidnew` (Next.js 16 App Router, React 19, TS, Tailwind)
- **Status**: SIAP VERIFIKASI (Hermes verifier). TIDAK DI-COMMIT / DEPLOY.
- **Basis Build**: State lokal terbaru di atas Batch-1 (hero-subtitle ⓘ + trading plan warnings collapse).

---

## 1. Ringkasan Implementasi

Tiga blok teks panjang yang sebelumnya memakan ruang vertikal di layar mobile (terutama di atas/sekitar trading plan) telah dibuat kompak dan bersih secara visual, dengan **konten 100% tetap utuh di SSR HTML untuk keperluan SEO dan aksesibilitas**:

### Task 1: Warning Kedua Trading Plan → Masuk Collapse Risiko
- **File**: `src/components/stock/trading-plan-card.tsx`
- **Sebelumnya**: Baris teks `"Setup belum layak (Rugi : Untung 1 : X) — angka peluang di atas hanya simulasi statistik, bukan sinyal entry."` dirender terpisah di atas trading plan (memakan ~26-30px vertikal).
- **Perubahan**:
  - Baris render terpisah dihapus (posisi lama dikosongkan).
  - Teks dimasukkan ke dalam daftar peringatan pada `<details data-engagement="trading_plan_warnings_buka">` ("catatan risiko") yang dibangun pada batch sebelumnya.
  - Peringatan ini ditandai dengan icon / prefix `🔬` (`isSim: true`).
  - Jumlah pada summary otomatis menghitung seluruh catatan risiko (termasuk risiko simulasi statistik jika setup belum layak).
  - String asli tetap utuh di DOM untuk crawler / SEO.

### Task 2: Disclaimer Analisa Harian → 1 Baris Muted
- **File**: `src/components/stock/daily-analysis-section.tsx`
- **Sebelumnya**: `<p className="text-xs text-text-secondary leading-relaxed max-w-xl">` (memakan 2 baris 39px).
- **Perubahan**:
  - Diubah menjadi `<p className="text-[10px] text-text-tertiary leading-snug">`.
  - Teks tetap 100% utuh tanpa pemotongan maupun `line-clamp`:
    *"Analisa ini berdasarkan data teknikal & fundamental historis — bukan rekomendasi jual/beli. Selalu lakukan riset mandiri sebelum mengambil keputusan investasi."*
  - Tampilan visual lebih kecil dan abu-abu (muted), menghemat tinggi blok footer analisa harian.

### Task 3: Disclaimer Jejak Dana Asing → 1 Baris Muted
- **File**: `src/app/(public)/stocks/[ticker]/page.tsx`
- **Sebelumnya**: `<p className="text-xs text-text-tertiary">`
- **Perubahan**:
  - Diubah menjadi `<p className="text-[10px] text-text-tertiary leading-snug">`.
  - Teks utuh dan link internal SEO `<a className="text-accent hover:underline" href="/pasar">Koran Saham Live</a>` tetap dipertahankan persis seperti sebelumnya.

---

## 2. File yang Disentuh

1. `src/components/stock/trading-plan-card.tsx`
   - Menyusun `allWarnings` gabungan dari `plan.warnings` dan peringatan simulasi Monte Carlo saat `mc && !setupLayak`.
   - Mengosongkan baris terpisah di bawah box Monte Carlo.
   - Merender item simulasi dengan icon `🔬` di dalam `<details>` catatan risiko.
2. `src/components/stock/daily-analysis-section.tsx`
   - Mengubah ukuran teks disclaimer footer dari `text-xs text-text-secondary` menjadi `text-[10px] text-text-tertiary leading-snug`.
3. `src/app/(public)/stocks/[ticker]/page.tsx`
   - Mengubah ukuran teks disclaimer foreign flow dari `text-xs text-text-tertiary` menjadi `text-[10px] text-text-tertiary leading-snug`.
4. `scripts/selftest/mobile-stock-card.selftest.tsx`
   - Menambahkan test case `1i`, `1j`, `1k`, `1l`, `1m` untuk memverifikasi struktur collapse catatan risiko beserta disclaimers analisa harian.

---

## 3. Bukti Verifikasi Fisik

### A. Selftest Mobile Stock Card (`scripts/selftest/mobile-stock-card.selftest.tsx`)
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

### B. Selftest Web Retention W1 (`scripts/selftest/web-retention-w1.selftest.ts`)
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

### C. Typecheck TypeScript (`npx tsc --noEmit`)
```bash
$ npx tsc --noEmit
# Exit code: 0 (No type errors)
```

### D. Production Build (`npm run build` / `next build --webpack`)
```bash
$ npm run build
▲ Next.js 16.4.3 (webpack)
✓ Compiled successfully in 7.5s
✓ Finished TypeScript in 3.2s
✓ Generating static pages using 9 workers (132/132) in 958ms
# Exit code: 0
```

### E. Grep Bukti Keberadaan Teks di Source Code
```bash
$ grep -c "angka peluang di atas hanya simulasi" src/components/stock/trading-plan-card.tsx
1

$ grep -c "Analisa ini berdasarkan data teknikal & fundamental historis" src/components/stock/daily-analysis-section.tsx
1

$ grep -c "Jejak dana institusi asing = konteks informasi" src/app/\(public\)/stocks/\[ticker\]/page.tsx
1
```

### F. Grep Bukti Keberadaan Teks di Output Build (`.next/server/`)
```bash
$ grep -rn "angka peluang di atas hanya simulasi" .next/server/ .next/static/
# Ditemukan di .next/server/app/(public)/stocks/[ticker]/page.js (Exit code: 0)

$ grep -rn "Analisa ini berdasarkan data teknikal" .next/server/ .next/static/
# Ditemukan di .next/server/app/(public)/stocks/[ticker]/page.js (Exit code: 0)

$ grep -rn "Jejak dana institusi asing = konteks informasi" .next/server/ .next/static/
# Ditemukan di .next/server/app/(public)/stocks/[ticker]/page.js (Exit code: 0)
```

---

## 4. Kepatuhan Rules
- **SEO & SSR**: Semua teks lengkap dipertahankan di SSR HTML, tidak ada teks yang di-truncate atau dihapus dari DOM.
- **Styling**: Murni Tailwind CSS (`text-[10px] text-text-tertiary leading-snug`), tanpa library baru.
- **Integritas**: Tidak menyentuh `guest-quota.tsx`, H1, canonical URL, JSON-LD, `api/`, maupun `billing`.
- **Eksekusi**: Kode telah terpasang dan lolos build + selftest tanpa git commit atau deployment.
