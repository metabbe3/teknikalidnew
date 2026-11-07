# LAPORAN BUILD: Hero Subtitle ⓘ (SEO-Safed) + Trading Plan Warnings Collapsible

- **Tanggal**: 2026-11-07
- **Peran**: Implementer UI di repo WEB `teknikalidnew` (Next.js 16 App Router, React 19, TS, Tailwind)
- **Status**: SIAP VERIFIKASI (Hermes verifier). TIDAK DI-COMMIT / DEPLOY.
- **Basis Build**: State lokal terbaru di atas commit hotfix `adbacd9` (beserta commit mobile-card `ad8f9df` dan W1 `bbc886c`).

---

## 1. Ringkasan Masalah & Solusi

### Feedback Owner (7 Nov)
> **Feedback 1 (Hero Subtitle)**:
> *"Bisa di hide juga? Seperti icon i? Itu cuman buat SEO kan?"*
> Contoh nyata `AADI.JK`: `"Harga Saham Hari Ini & Analisa Teknikal Adaro Andalan Indonesia · Perkebunan kelapa sawit, karet dan tanaman penghasil getah lain, perusahaan holding, dan konsultasi manajemen lainnya"` → memakan 2-3 baris layar mobile.
>
> **Feedback 2 (Trading Plan Warnings)**:
> *"Ini di minimize dan bisa di maximize / open?"*
> Setiap warning (mis. *"Market Structure menunjukkan Lower Lows (downtrend terkonfirmasi). Risiko menangkap pisau jatuh sangat tinggi. Sangat disarankan Wait & See hingga ada konfirmasi reversal."*) tampil penuh memakan tinggi card di layar kecil.

### Solusi & Keputusan Desain

#### Task 1 — H2 Subtitle Hero: Deskripsi Panjang → ⓘ (SEO-Safed)
1. **Subtitle Visual Ringkas**:
   - Subtitle di H2 kini hanya: `"Harga Saham Hari Ini & Analisa Teknikal {name}"` + icon `ⓘ` kecil di ujung.
   - Tidak lagi menampilkan string deskripsi bisnis panjang secara visual yang menumpuk baris di mobile.
2. **SEO & Aksesibilitas Terjaga Penuh (SSR 100%)**:
   - Deskripsi emiten (`stock.businessActivity` atau fallback `stock.subSector`) dipindahkan ke:
     - Atribut `title={desc}` pada elemen icon `ⓘ` (tooltip hover native browser).
     - Atribut `aria-label="Profil bisnis {stock.name}: {desc}"` pada icon `ⓘ`.
     - Elemen tersembunyi `<span className="sr-only"> · {desc}</span>` tepat di dalam `<h2>`.
   - Googlebot dan crawler membaca konten di dalam `<h2>` secara utuh tanpa hambatan CSS rendering.
3. **Bebas Hydration Mismatch & Bebas Clipping**:
   - Menggunakan elemen inline phrased (`<span>`) dengan atribut native `title`, bukan `<details>` di dalam `<h2>`. Dalam spesifikasi HTML5, `<details>` adalah flow content dan otomatis menutup tag `<h2>` pada parser browser, yang dapat memicu hydration mismatch di React 19.
   - Tooltip native OS/browser tidak terpengaruh oleh pembatas `overflow-hidden` pada card header.
4. **Doktrin H1 & Metadata**:
   - `H1` tetap murni `{stripJk(ticker)}` (dengan sr-only keyword context).
   - Canonical URL, JSON-LD schema, dan generateMetadata tidak disentuh sama sekali.

#### Task 2 — Trading Plan Warnings → Collapsible
1. **Satu Baris Compact**:
   - Blok warning diubah menjadi satu baris kompak: `⚠️ {jumlah} catatan risiko` + label aksi `lihat ▾` (berganti menjadi `tutup ▴` saat dibuka).
   - Menggunakan native HTML `<details>` zero-JS yang default tertutup (`open` tidak di-set).
2. **Konsistensi**:
   - Baik terdapat 1 catatan risiko maupun lebih, format tetap seragam dan konsisten.
3. **Styling Amber Compact**:
   - Menggunakan styling amber `bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-400 text-[11px] rounded-lg px-2.5 py-1.5`.
   - Menghemat ruang vertikal hingga ~80px di mobile fold ketika emiten memiliki catatan risiko panjang.
4. **DOM & SEO Preserved**:
   - Seluruh teks warning (`plan.warnings.map(...)`) tetap dirender lengkap di dalam DOM SSR, sehingga informasi risiko tetap terbaca oleh bot, crawler, dan pembaca layar.
   - Ditambahkan instrumen telemetri `data-engagement="trading_plan_warnings_buka"`.

---

## 2. File yang Disentuh

1. `src/app/(public)/stocks/[ticker]/page.tsx`
   - Subtitle H2 diubah: menampilkan `Harga Saham Hari Ini & Analisa Teknikal {stock.name}` + icon `ⓘ` ber-tooltip native `title` + hidden `<span className="sr-only"> · {desc}</span>`.
2. `src/components/stock/trading-plan-card.tsx`
   - Blok `plan.warnings` dibungkus dengan `<details data-engagement="trading_plan_warnings_buka">` collapsible bertajuk `⚠️ {plan.warnings.length} catatan risiko`.
3. `scripts/selftest/mobile-stock-card.selftest.tsx`
   - Ditambahkan check 1e-1h: memverifikasi bahwa catatan risiko dibungkus `<details>`, default tertutup, summary memuat `⚠️` dan jumlah risiko, serta teks lengkap risiko tetap ada di DOM.
4. `scripts/selftest/hero-subtitle-info.selftest.ts` *(Selftest baru)*
   - Verifikasi statis dan render komponen: awalan teks subtitle, nama emiten, icon `ⓘ`, atribut `title` & `aria-label`, elemen `sr-only`, penolakan deskripsi panjang pada tampilan visual, fallback `subSector`, dan integritas H1/SEO doctrine.

---

## 3. Bukti Verifikasi Fisik

### A. Selftest Baru: `scripts/selftest/hero-subtitle-info.selftest.ts`
```bash
$ npx tsx scripts/selftest/hero-subtitle-info.selftest.ts
=== SELFTEST: HERO SUBTITLE ⓘ (SEO-SAFED) ===
PASS  1a. Subtitle memuat awalan 'Harga Saham Hari Ini & Analisa Teknikal'
PASS  1b. Subtitle memuat nama emiten 'Adaro Andalan Indonesia'
PASS  1c. Icon ⓘ dirender di dalam subtitle
PASS  1d. Atribut title memuat deskripsi lengkap (diawali huruf kapital)
PASS  1e. Atribut aria-label memuat profil bisnis untuk aksesibilitas
PASS  1f. Konten deskripsi berada di dalam elemen <span class="sr-only"> untuk indeks crawler
PASS  1g. Subtitle visual (tanpa sr-only) TIDAK memuat teks deskripsi panjang
PASS  2a. SubSector dipakai sebagai fallback dengan huruf kapital awal
PASS  3a. Emiten tanpa deskripsi tidak menampilkan ⓘ maupun sr-only
PASS  4a. File page.tsx memuat elemen <span className="sr-only"> · {desc}</span>
PASS  4b. File page.tsx menyematkan icon ⓘ dengan title={desc} dan aria-label
PASS  4c. File page.tsx tidak lagi menampilkan deskripsi panjang secara telanjang di H2
PASS  4d. H1 tetap murni stripJk(ticker) dengan keyword context sr-only (doktrin SEO)

RESULT: ALL PASS
```

### B. Regresi Mobile Stock Card: `scripts/selftest/mobile-stock-card.selftest.tsx`
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

### C. Regresi W1 Web Retention: `scripts/selftest/web-retention-w1.selftest.ts`
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

### D. TypeScript Check
```bash
$ npx tsc --noEmit
# Exit code: 0 (0 error)
```

### E. Production Build: `npm run build`
```bash
$ npm run build
> next build --webpack
▲ Next.js 16.4.3 (webpack)
✓ Compiled successfully in 7.7s
✓ Finished TypeScript in 4.8s
✓ Collecting page data using 9 workers in 766ms
✓ Generating static pages (97/97) in 1845ms
# Exit code: 0 (BUILD SUKSES)
```

---

## 4. Checklist Aturan & Batasan
- [x] **Tailwind only & no new libs**: Memakai utilitas Tailwind bawaan dan native HTML `<details>`.
- [x] **Tanpa `console.log` di kode app**: File aplikasi bersih dari debug logging.
- [x] **File sensitif tak tersentuh**: `guest-quota.tsx`, `api/`, `billing/`, `auth/` tidak disentuh sama sekali.
- [x] **SEO Invariant**: H1 ticker murni, canonical URL, JSON-LD schema, dan meta description utuh. Deskripsi emiten tetap berada di SSR HTML via `title`, `aria-label`, dan `<span className="sr-only">`.
- [x] **Tanpa Commit & Deploy**: Seluruh modifikasi berada di workspace lokal, siap untuk verifikasi Hermes.
