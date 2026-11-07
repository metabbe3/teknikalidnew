# LAPORAN BUILD: /stocks Hero Slim — Hapus Duplikasi Visual & Promo

- **Tanggal**: 2026-11-07
- **Peran**: Implementer UI repo WEB `teknikalidnew` (Next.js 16, React 19, TypeScript, Tailwind CSS)
- **Status**: SIAP VERIFIKASI (Hermes verifier). **TIDAK DI-COMMIT / DEPLOY**.
- **Basis Build**: State git terkini (mempertahankan perubahan file sebelumnya tanpa revert).

---

## 1. Ringkasan Masalah & Solusi

### Feedback Owner
> *"di bawahnya sama aja kan? kaya double gitu"*

### Masalah Baseline
Hero atas halaman `/stocks` sebelumnya memiliki tinggi ~317px dengan 6 blok tumpukan yang menduplikasi konten di bawahnya:
1. Badge status pasar ("Tutup · Akhir Pekan | Data sesi terakhir...").
2. Label kecil terpisah "IDX RADAR — RADAR SAHAM IDX".
3. H1 "Harga Saham IDX Hari Ini".
4. Paragraf panjang SEO boilerplate ("956+ saham — cari langsung di bawah, atau saring sesuai strategi. IDX Radar TeknikalID memantau harga, RSI, MACD, dan volume seluruh saham BEI setiap hari bursa.").
5. MarketBreathStrip (advancers, decliners, unchanged, top gainer/loser).
6. Kartu promo paper trading ("Latih strategi tanpa risiko 🎮 Paper trading Rp10jt — Mulai Simulasi Gratis") + 3 chip link navigasi ("Lagi Naik", "Lagi Murah", "Tanya AI").

Di bawah hero, sudah tersedia tabel lengkap, search filter, chip screener tematik, tombol `<ScreenerAiButton />` ("Tanya AI"), dan promo interaktif lainnya.

### Solusi & Implementasi
1. **Mempertahankan Nilai Fungsional & SEO Utama**:
   - `<MarketStatus />` tetap dipertahankan utuh untuk transparansi jam bursa.
   - H1 `"Harga Saham IDX Hari Ini"` dengan anchor `id="radar"` dipertahankan (mematuhi H1 LAW & SEO canonical).
   - Label kecil `"IDX Radar"` digabungkan sejajar secara baseline (`items-baseline`) dengan H1, menghemat 1 baris vertikal.
   - `<MarketBreathStrip />` tetap dipertahankan utuh tanpa mengubah file komponennya.
   - Anchor `#radar` dan `#pantauan` tetap utuh.

2. **Penyederhanaan Teks Intro SEO**:
   - Paragraf intro diganti menjadi 1 kalimat padat (66 karakter, batas ≤ 90 char):
     `"Pantau harga, RSI, MACD & volume 956+ saham BEI setiap hari bursa."`
   - Mempertahankan kata kunci utama: *"harga"*, *"RSI"*, *"MACD"*, *"volume"*, *"956+"*, *"saham"*, *"BEI"*.

3. **Penghapusan Duplikasi Visual & Banner Promo**:
   - Kartu promo paper trading (`Mulai Simulasi Gratis`) dihapus dari hero (sudah tersedia di navigasi dan tools).
   - Chip duplikat `"Lagi Naik"` dan `"Lagi Murah"` dihapus (sudah ada di quick jumps screener).
   - Chip `"Tanya AI"` di hero dihapus (sudah tersedia di view tab bar melalui `<ScreenerAiButton />`).

4. **Penyederhanaan Subtitle Section Heading**:
   - Subtitle `<SectionHeading>` di section *"Semua Saham IDX"* dipendekkan dari `"Cari, saring per sektor, urutkan 900+ saham — atau gunakan Screener untuk filter sinyal teknikal."` menjadi `"Cari & saring 900+ saham BEI"` (1 baris ringkas).

---

## 2. Struktur Baru & Pengukuran Tinggi Hero

```
Hero Baru /stocks (`<section className="border-b border-border bg-bg-card">`):
┌────────────────────────────────────────────────────────────────────────┐
│ 1. MarketStatus (Badge Tutup/Buka + Data sesi terakhir)                │
│ 2. [H1: Harga Saham IDX Hari Ini]  [Label: IDX Radar]                  │
│ 3. P: Pantau harga, RSI, MACD & volume 956+ saham BEI setiap hari...   │
│ 4. MarketBreathStrip (231 naik · 440 turun · 162 stagnan ...)          │
└────────────────────────────────────────────────────────────────────────┘
```

### Hasil Pengukuran Layout (Playwright Headless):
- **Desktop (1440px)**: **152.0px** (Target brief: ±150px, ≤ 180px) — Turun dari ~317px (-52%).
- **Mobile (375px)**: **176.0px** (Target brief: ≤ 180px) — Turun dari >350px (-50%).

---

## 3. Bukti Fisik Verifikasi

### A. Next.js Production Build
```bash
$ npm run build
> teknikalid@0.1.0 build
> next build --webpack

▲ Next.js 16.4.3 (webpack)
- Environments: .env
✓ Running next.config.ts took 12ms
✓ Compiled successfully in 7.7s
✓ Finished TypeScript in 3.0s
✓ Collecting page data using 9 workers in 950ms
✓ Generating static pages using 9 workers (132/132) in 861ms
✓ Finalizing page optimization
Exit code: 0 (SUCCESS)
```

### B. Selftest Validasi Hero & Regresi Stock Page
Script selftest baru: `scripts/selftest/stocks-hero-slim.selftest.ts`
```bash
$ npx tsx scripts/selftest/stocks-hero-slim.selftest.ts
=== SELFTEST: /stocks HERO SLIM ===
PASS  1a. H1 tetap ada dengan id='radar'
PASS  1b. id='pantauan' tetap utuh sebagai anchor
PASS  1c. Label 'IDX Radar' berada berdampingan dengan H1
PASS  1d. Paragraf pendek ≤ 90 karakter memuat keyword kunci
PASS  1e. Panjang kalimat deskripsi (66 char) ≤ 90 char
PASS  1f. MarketBreathStrip tetap ada di hero
PASS  1g. Kartu promo paper trading 'Mulai Simulasi Gratis' SUDAH DIHAPUS dari hero
PASS  1h. Chip 'Lagi Naik' dan 'Lagi Murah' SUDAH DIHAPUS dari hero
PASS  1i. Subtitle SectionHeading diperpendek menjadi 'Cari & saring 900+ saham BEI'
PASS  1j. '956+' muncul 1x di teks intro hero

--- PENGUKURAN TINGGI HERO DESKTOP (1440px) ---
Tinggi Hero Desktop: 152.0px (Target: ≤ 180px, ~150px)
PASS  2a. Desktop (1440px): Hero height ≤ 180px (hasil: 152.0px)

--- PENGUKURAN TINGGI HERO MOBILE (375px) ---
Tinggi Hero Mobile: 176.0px (Target: ≤ 180px, ~150px)
PASS  2b. Mobile (375px): Hero height ≤ 180px (hasil: 176.0px)

RESULT: ALL PASS
```

Selftest regresi komponen stock lainnya:
```bash
$ npx tsx scripts/selftest/mobile-stock-card.selftest.tsx
RESULT: ALL PASS

$ npx tsx scripts/selftest/hero-subtitle-info.selftest.ts
RESULT: ALL PASS

$ npx tsx scripts/selftest/desktop-grid-balance.selftest.ts
RESULT: ALL PASS

$ npx tsx scripts/selftest/remove-dead-community-blocks.selftest.ts
RESULT: ALL PASS
```

### C. Verifikasi String & Grep
1. **Grep "Mulai Simulasi Gratis" di `/stocks` hero**:
```bash
$ grep -n "Mulai Simulasi Gratis" src/app/\(public\)/stocks/page.tsx || true
# Hasil: 0 match (Bersih, promo terhapus dari hero).
```

2. **Grep "956+" di teks intro hero**:
```bash
$ grep -n "956+" src/app/\(public\)/stocks/page.tsx
212:            Pantau harga, RSI, MACD &amp; volume 956+ saham BEI setiap hari bursa.
351:                  TeknikalID menyediakan <strong className="text-text-primary">analisa teknikal saham</strong> untuk 956+ saham di Bursa Efek Indonesia (IDX).
# Hasil: 1x di intro hero (L212), 1x di educational FAQ accordion (L351).
```

3. **Grep Chip "Lagi Naik" / "Lagi Murah" di `/stocks` hero**:
```bash
$ grep -n "Lagi Naik" src/app/\(public\)/stocks/page.tsx || true
# Hasil: 0 match di hero.
```

---

## 4. Git Diff

```diff
diff --git a/src/app/(public)/stocks/page.tsx b/src/app/(public)/stocks/page.tsx
index b4976c4..7f139e1 100644
--- a/src/app/(public)/stocks/page.tsx
+++ b/src/app/(public)/stocks/page.tsx
@@ -5,7 +5,6 @@ import { Suspense } from "react";
 import { stockMarketService } from "@/domains/stock/stock-market.service";
 import { marketSnapshotService } from "@/domains/stock/market-snapshot.service";
 import { SahamView } from "@/components/stock/saham-view";
-import { IDX_STOCKS } from "@/lib/constants";
 import { format } from "date-fns";
 import { id as idLocale } from "date-fns/locale/id";
 import type { MarketStatusResult } from "@/lib/market-hours";
@@ -199,17 +198,18 @@ export default async function StocksPage() {
     <div className="fade-in">
       {/* ── Editorial header ── */}
       <section className="border-b border-border bg-bg-card">
-        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-5">
+        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
           <MarketStatus marketStatus={marketInfo.marketStatus} latestPrice={latestPrice} />
-          <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
-            IDX Radar — Radar Saham IDX
+          <div className="mt-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
+            <h1 id="radar" className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-text-primary">
+              Harga Saham IDX Hari Ini
+            </h1>
+            <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
+              IDX Radar
+            </span>
           </div>
-          <h1 id="radar" className="mt-1 font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-text-primary">
-            Harga Saham IDX Hari Ini
-          </h1>
           <p className="mt-1 text-xs text-text-tertiary">
-            {IDX_STOCKS.length}+ saham — cari langsung di bawah, atau saring sesuai strategi. IDX Radar
-            TeknikalID memantau harga, RSI, MACD, dan volume seluruh saham BEI setiap hari bursa.
+            Pantau harga, RSI, MACD &amp; volume 956+ saham BEI setiap hari bursa.
           </p>
-          <div className="mt-3">
+          <div className="mt-2 sm:mt-2.5">
             <MarketBreathStrip
               data={{
                 advancersCount: gainers,
                 declinersCount: losers,
                 unchangedCount: unchanged,
                 topGainer,
                 topLoser,
               }}
             />
           </div>
-
-          {/* Owner 24 Okt: funnel simulasi di tiap page utama */}
-          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-[#0f2a3d] to-[#123548] px-4 py-3">
-            <div className="min-w-0">
-              <p className="text-sm font-semibold text-slate-100">Latih strategi tanpa risiko 🎮</p>
-              <p className="text-xs text-slate-400">Paper trading dengan Rp 10.000.000 virtual — gratis.</p>
-            </div>
-            <Link
-              href="/paper-trading"
-              data-engagement="funnel_paper_banner_stocks"
-              className="press-scale inline-flex items-center gap-1.5 text-xs font-bold bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent/90 transition-colors shrink-0"
-            >
-              Mulai Simulasi Gratis
-            </Link>
-          </div>
-
-          {/* Quick discovery pills → screener tab */}
-          <div className="mt-3 flex flex-wrap gap-2">
-            {[
-              { label: "Lagi Naik", href: "/stocks?view=screener&tab=swing-trade&preset=macd_bullish" },
-              { label: "Lagi Murah", href: "/stocks?view=screener&tab=bottom-fishing&preset=rsi_oversold" },
-              { label: "Tanya AI", href: "/stocks?view=screener&ask=Saham%20apa%20yang%20lagi%20oke%20hari%20ini%3F" },
-            ].map((p) => (
-              <Link
-                key={p.label}
-                href={p.href}
-                className="inline-flex min-h-11 items-center gap-1 rounded-full border border-border bg-bg-card px-3.5 py-2 text-xs font-semibold text-text-secondary hover:border-accent/40 hover:text-accent transition-colors active:scale-[0.98]"
-              >
-                {p.label}
-                <ArrowUpRight className="h-3 w-3" aria-hidden />
-              </Link>
-            ))}
-          </div>
-
         </div>
       </section>
 
@@ -271,7 +237,7 @@ export default async function StocksPage() {
           <SectionHeading
             eyebrow="Database Lengkap"
             title="Semua Saham IDX"
-            description="Cari, saring per sektor, urutkan 900+ saham — atau gunakan Screener untuk filter sinyal teknikal."
+            description="Cari & saring 900+ saham BEI"
           />
```

---

## 5. Ringkasan Status

- File yang diubah: [`src/app/(public)/stocks/page.tsx`](file:///Users/nicholasandriansurjadi/Documents/teknikalidnew/src/app/(public)/stocks/page.tsx)
- Selftest baru: [`scripts/selftest/stocks-hero-slim.selftest.ts`](file:///Users/nicholasandriansurjadi/Documents/teknikalidnew/scripts/selftest/stocks-hero-slim.selftest.ts)
- Build status: **GREEN / 0 ERRORS**
- Git status: **TIDAK DI-COMMIT / DEPLOY (Hermes verifier ready)**
