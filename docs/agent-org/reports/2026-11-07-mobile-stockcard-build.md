# LAPORAN BUILD: MOBILE-FIRST STOCK CARD — Trading Plan Langsung Kelihatan

- **Tanggal**: 2026-11-07
- **Peran**: Implementer UI di repo WEB `teknikalidnew` (Next.js 16, React 19, TS, Tailwind)
- **Status**: SIAP VERIFIKASI (Hermes verifier). TIDAK DI-COMMIT / DEPLOY.
- **Basis Build**: State lokal terbaru di atas commit W1 `bbc886c`.

---

## 1. Ringkasan Masalah & Solusi

### Feedback Owner (7 Nov)
> "tidak langsung kelihatan saya mau di mobile trading plan langsung keliatan? biar orang lihat valuenya"
> "mungkin tanya AI dihilangkan saja? bawah 3 nya sama saja kan? cuman di guide"
> "bisa dikecilkan heightnya? / icon information saja, tidak usah langsung ditulis, makan space di mobile"

### Solusi & Keputusan Desain
1. **Target A — Trading Plan bagian PERTAMA di mobile**:
   - Di mobile (`grid-cols-1`), Trading Plan ditempatkan langsung di bawah Price Header (nama saham, harga live, % change, 1 lot).
   - Di desktop (`lg:grid-cols-2`), Trading Plan menempati kolom kiri dan Skor Sinyal + StrongerPeers menempati kolom kanan berdampingan, menjaga layout desktop 2 kolom seimbang tanpa ruang kosong.
2. **Target B — Tanya AI disederhanakan 1 baris kecil**:
   - Tombol raksasa fold-1 (min-h-11) dan 3 chip prompt AI yang memenuhi 1 layar dihilangkan dari card Skor Sinyal.
   - Diganti dengan 1 baris ringkas tepat di bawah Trading Plan:
     `🤖 Tanya AI soal {TICKER} · gratis 3x →`
     - Deeplink: `https://t.me/TeknikalidAgentBot?start=src_ask_{TICKER}`
     - Tracking CTA: `data-engagement="agent_deeplink_compact"` (memicu event `cta_click` berlabel `agent_deeplink_compact`).
   - 3 chip prompt lama (entry, level, risiko) dipindahkan ke dalam `<details>` native bertajuk "💡 Panduan cepat tanya AI" yang default tertutup. Tetap ada di DOM untuk SEO & aksesibilitas, tanpa memakan tinggi di layar mobile.
3. **Target C & E — Skor Sinyal dipadatkan**:
   - Teks penjelas *"Gabungan 9 indikator teknikal — RSI, MACD, tren, momentum, volume"* digantikan oleh ikon info `ⓘ` dengan tooltip `title` dan `aria-label`.
   - Teks penjelas tetap tersedia di DOM di dalam `<details>` native rincian indikator saat dibuka.
   - Tinggi card Skor Sinyal menyusut drastis dari ~380px menjadi ~110px.
   - Angka skor sinyal (`raw.toFixed(2)`), badge label, sinyal outlook, dan meter bar tetap utuh.
4. **Target D — Baris meta Trading Plan 1 baris kecil `text-xs`**:
   - Judul dan meta disatukan menjadi 1 blok vertikal kompak.
   - Baris meta: `Sumber: Pivot & ATR · [Tunggu dulu / Antri Beli (BOW)] · Keyakinan: [Rendah/Sedang/Tinggi]` dalam satu baris `text-xs text-text-tertiary flex flex-wrap`.
   - Menghilangkan badge bongsor di kolom terpisah yang sebelumnya memaksa wrap 3 baris.
5. **Target F — SEO & H1 Law**:
   - H1 tetap satu dan tak berubah (`{stripJk(ticker)}`).
   - JSON-LD dan canonical URL tidak disentuh.
   - Gate freemium W1 (`GuestTradingPlanGate` & `GuestSignalBreakdownGate`) tetap berfungsi normal.

---

## 2. File yang Disentuh

1. `src/app/(public)/stocks/[ticker]/page.tsx`
   - Reordering blok di dalam `GuestQuotaProvider`: Kolom 1 (Trading Plan + compact Tanya AI) mendahului Kolom 2 (Skor Sinyal + StrongerPeersStrip).
   - Card Skor Sinyal dipadatkan: hapus tombol besar Tanya AI & chip prompt dari dalam card skor, ganti teks 9 indikator dengan ikon ⓘ.
   - Penambahan baris compact Tanya AI dengan `data-engagement="agent_deeplink_compact"` dan collapse `<details>` panduan cepat.
2. `src/components/stock/trading-plan-card.tsx`
   - Baris meta trading plan diubah menjadi satu baris kecil `text-xs` (`Sumber: Pivot & ATR · Keyakinan: ...`).
3. `src/components/stock/signal-breakdown-details.tsx`
   - Teks penjelas 9 indikator teknikal dipindahkan ke dalam elemen `<details>` native dan summary `aria-label` (SEO tetap terjaga).
4. `scripts/selftest/mobile-stock-card.selftest.tsx` *(selftest baru)*
   - Verifikasi DOM, meta bar, rincian indikator SEO, CTA instrumentation, dan simulasi offsetTop mobile.

---

## 3. Hasil Pengukuran Mobile Viewport (375px)

Pengukuran tinggi konten **SEBELUM** elemen Trading Plan pada viewport mobile 375px:
- Padding top container: 16px (`p-4`)
- Baris Logo + H1 Ticker + Badges: ~36px
- Baris H2 Deskripsi Emiten: ~20px
- Baris Harga Live + % Change + 1 Lot: ~76px
- Spacing margin grid (`mt-4`): 16px
- **Total offsetTop posisi Trading Plan**: **~164px**

**Kesimpulan**: Posisi offsetTop elemen Trading Plan adalah **~164px** (jauh di bawah batas toleransi `≤ ±600px`). Pengguna langsung melihat Trading Plan di viewport pertama saat membuka halaman saham di mobile.

---

## 4. Hasil Verifikasi Fisik

### A. Selftest W1 Web Retention Regression
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

### B. Selftest Mobile-First Stock Card
```bash
$ npx tsx scripts/selftest/mobile-stock-card.selftest.tsx
=== SELFTEST: MOBILE-FIRST STOCK CARD ===
PASS  1a. Trading Plan memiliki judul yang tepat
PASS  1b. Baris meta memuat Sumber: Pivot & ATR
PASS  1c. Baris meta memuat badge strategi BOW
PASS  1d. Baris meta memuat Keyakinan: Sedang
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

### C. Component Unit Tests
```bash
$ npx tsx --test src/components/stock/__tests__/*.test.ts
✔ parseSahamViewMode: maps valid view query params to SahamViewMode (0.309625ms)
✔ filterSwingCandidates: caps candidates at max (default 12) and handles null/empty safely (0.304458ms)
✔ computeBreadthRatios: computes percentage bars summing to 100% (0.068875ms)
✔ StockAiPromptChips: renders 3 chips with correct engagement attributes and deeplinks (0.697708ms)
✔ StockAiPromptChips: dynamic risk text for high RSI (>= 65) and low RSI (<= 35) (0.143875ms)
✔ StrongerPeersStrip: returns null when peers array is empty or has no valid signal scores (0.404292ms)
✔ StrongerPeersStrip: filters current ticker, sorts descending, caps at 3, and selects correct title (0.738083ms)
ℹ tests 7
ℹ suites 0
ℹ pass 7
ℹ fail 0
```

### D. TypeScript Check
```bash
$ npx tsc --noEmit
# Exit code 0 (clean, no errors)
```

### E. Next.js Production Build
```bash
$ npm run build
> next build --webpack
✓ Compiled successfully in 9.7s
✓ Finished TypeScript in 12.9s
✓ Generating static pages
...
✓ Finalizing page optimization
# Exit code 0 (sukses penuh)
```
