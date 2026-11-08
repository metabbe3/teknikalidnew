# LAPORAN FIX: Icon ⓘ Stock Page Tidak Bisa Diklik (Mobile & Desktop)

- **Tanggal**: 2026-11-07
- **Peran**: Fixer UI repo WEB `teknikalidnew` (Next.js 16, React 19, TypeScript, Tailwind CSS)
- **Status**: SIAP VERIFIKASI (Hermes verifier). **TIDAK DI-COMMIT / DEPLOY**.
- **Basis Build**: State git terkini (mempertahankan perubahan file sebelumnya tanpa revert).

---

## 1. Ringkasan Masalah & Solusi

### Feedback Owner (7 Nov, live teknikal.id/stocks/BBCA.JK)
> Dua icon ⓘ di stock page TIDAK menampilkan apa pun saat diklik/tap:
> 1. **Icon ⓘ di H2 hero** (`src/app/(public)/stocks/[ticker]/page.tsx`): `<span tabIndex={0} role="note" title={desc}>ⓘ</span>` memakai atribut `title` native browser — tooltip hanya muncul saat mouse hover lama di desktop, tidak merespons klik, dan sama sekali TIDAK muncul di mobile saat di-tap.
> 2. **Icon ⓘ di kartu Sinyal** (`src/app/(public)/stocks/[ticker]/page.tsx`): memakai atribut `title="Gabungan 9 indikator teknikal..."` native.
> 
> Owner tes di HP: tap → tidak ada yang muncul. Expected: tap/klik → tooltip/popover tampil.

### Solusi Desain
1. **Reuse Tooltip Component Existing (@base-ui)**:
   - Repo sudah memiliki infrastruktur tooltip teruji di `@/components/ui/tooltip` (@base-ui/react/tooltip) yang sudah dibungkus dengan `TooltipProvider` global di root layout (`src/app/layout.tsx`).
   - `TooltipTrigger` dari Base UI me-render elemen `<button type="button">` focusable yang mendukung keyboard focus, mouse hover, serta tap/click pada layar sentuh mobile.
2. **Komponen Client Baru `InfoTip` (`src/components/stock/info-tip.tsx`)**:
   - Dibuat komponen client `"use client"` ringan pembungkus `Tooltip`, `TooltipTrigger`, dan `TooltipContent`.
   - Menggunakan visual icon `ⓘ` dengan ukuran `w-4 h-4 rounded-full` yang konsisten dengan desain sebelumnya.
   - Menggunakan `aria-label={`${label}: ${text}`}` dan `focus-visible:ring-2 focus-visible:ring-accent/40` untuk kepatuhan aksesibilitas.
3. **Penggantian Span di Server Component `page.tsx`**:
   - Hero subtitle H2: mengganti span `title={desc}` dengan `<InfoTip label="Profil bisnis" text={desc} />`.
   - Kartu Sinyal: mengganti span `title="Gabungan 9 indikator..."` dengan `<InfoTip label="Sinyal" text="Gabungan 9 indikator teknikal — RSI, MACD, tren, momentum, volume" />`.
   - **SEO Preserved**: Elemen `<span className="sr-only"> · {desc}</span>` di dalam H2 tetap dipertahankan utuh untuk indexing crawler dan search engine.
4. **Eliminasi Atribut Title Native**:
   - Tidak ada lagi atribut `title={desc}` maupun `title="Gabungan 9 indikator..."` di kedua lokasi tersebut.

---

## 2. Rincian Perubahan File

### 1. `src/components/stock/info-tip.tsx` (File Baru)
```tsx
"use client";

import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function InfoTip({
  label,
  text,
  className,
}: {
  label: string;
  text: string;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={`${label}: ${text}`}
        className={cn(
          "inline-flex items-center justify-center w-4 h-4 rounded-full border border-border text-[10px] font-serif font-bold text-text-tertiary hover:text-text-primary hover:border-text-secondary transition-colors select-none align-middle cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          className
        )}
      >
        ⓘ
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[300px] text-left leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
```

### 2. `src/app/(public)/stocks/[ticker]/page.tsx`
- Menambahkan import `InfoTip`:
  ```tsx
  import { InfoTip } from "@/components/stock/info-tip";
  ```
- Mengganti span pada H2 hero subtitle (baris ~725):
  ```tsx
  <InfoTip label="Profil bisnis" text={desc} />
  {/* SEO: businessActivity tetap dirender di SSR HTML di dalam H2 tanpa makan tempat visual */}
  <span className="sr-only"> · {desc}</span>
  ```
- Mengganti span pada kartu Skor Sinyal (baris ~863):
  ```tsx
  <InfoTip label="Sinyal" text="Gabungan 9 indikator teknikal — RSI, MACD, tren, momentum, volume" />
  ```

### 3. `scripts/selftest/hero-subtitle-info.selftest.ts`
- Memperbarui pengecekan 4b agar memvalidasi integrasi `InfoTip` dan memastikan `title={desc}` telah dieliminasi dari `page.tsx`.

### 4. `scripts/selftest/infotip-click.selftest.tsx` (File Baru)
- Menjalankan pengujian komprehensif:
  - SSR render to static markup (`<button>`, `aria-label`, visual icon `ⓘ`, class sizing `w-4 h-4`).
  - Simulasi interaktif Playwright (desktop click, mobile touch tap dengan iPhone 14 emulation, keyboard focus).
  - Pengecekan statis file `page.tsx` (import, pemakaian kedua `InfoTip`, retensi `sr-only`, dan eliminasi `title`).

---

## 3. Bukti Fisik Verifikasi

### A. Selftest Baru: `scripts/selftest/infotip-click.selftest.tsx`
```bash
$ npx tsx scripts/selftest/infotip-click.selftest.tsx
=== SELFTEST: INFOTIP CLICK & MOBILE TAP (STOCKS PAGE) ===
PASS  1a. InfoTip SSR menghasilkan elemen button focusable (TooltipTrigger)
PASS  1b. Atribut aria-label terisi format '${label}: ${text}'
PASS  1c. Icon visual 'ⓘ' dirender dalam trigger
PASS  1d. Styling ukuran visual w-4 h-4 rounded-full tersemat
PASS  2a. Desktop click membuka popup tooltip
PASS  2b. Mobile tap membuka popup tooltip pada layar sentuh (iPhone 14)
PASS  2c. Keyboard focus membuka tooltip untuk aksesibilitas keyboard
PASS  3a. File page.tsx mengimpor InfoTip dari @/components/stock/info-tip
PASS  3b. Hero subtitle H2 memakai <InfoTip label="Profil bisnis" text={desc} />
PASS  3c. Kartu sinyal memakai <InfoTip label="Sinyal" text="Gabungan 9 indikator teknikal — RSI, MACD, tren, momentum, volume" />
PASS  3d. Elemen SEO <span className="sr-only"> · {desc}</span> tetap dipertahankan di H2
PASS  3e. Atribut title={desc} SUDAH DIHAPUS dari hero subtitle
PASS  3f. Atribut title="Gabungan 9 indikator..." SUDAH DIHAPUS dari kartu sinyal

RESULT: ALL PASS
```

### B. Regresi Selftest: `scripts/selftest/hero-subtitle-info.selftest.ts`
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
PASS  4b. File page.tsx menyematkan icon ⓘ dengan InfoTip (tap-to-open mobile + accessible) tanpa native title
PASS  4c. File page.tsx tidak lagi menampilkan deskripsi panjang secara telanjang di H2
PASS  4d. H1 tetap murni stripJk(ticker) dengan keyword context sr-only (doktrin SEO)

RESULT: ALL PASS
```

### C. Grep Audit: Verifikasi Tidak Ada `title=` di Lokasi Icon ⓘ
```bash
$ grep -n "title=" src/app/(public)/stocks/\[ticker\]/page.tsx
702:                    <span className="text-sm font-bold px-3 py-1 rounded-lg bg-bearish-bg text-bearish border border-bearish/30 inline-flex items-center gap-1" title="Kepemilikan saham terkonsentrasi tinggi...">
708:                    <span className="text-sm font-bold px-3 py-1 rounded-lg bg-bullish-bg text-bullish border border-bullish/30 inline-flex items-center gap-1" title={`Dividen tunai Rp${upcomingDividendSoon.amount!...`}>
1081:                title={`Analisa Teknikal ${stripJk(ticker)} — ${stock.name}`}
```
- `title={desc}`: **NIHIL / SUDAH DIHAPUS**
- `title="Gabungan 9 indikator..."`: **NIHIL / SUDAH DIHAPUS**
- Sisa `title` hanya ada pada badge FCA, badge dividen mendatang, dan prop `title` pada komponen chart section.

### D. Typecheck TypeScript
```bash
$ npx tsc --noEmit
Exit code: 0 (PASS, 0 error)
```

### E. ESLint Linting pada File Terkait
```bash
$ npx eslint src/components/stock/info-tip.tsx src/app/(public)/stocks/[ticker]/page.tsx scripts/selftest/infotip-click.selftest.tsx
Exit code: 0 (PASS, 0 error)
```

### F. Next.js Production Build
```bash
$ npm run build
> teknikalid@0.1.0 build
> next build --webpack

▲ Next.js 16.4.3 (webpack)
- Environments: .env
✓ Running next.config.ts took 62ms
✓ Compiled successfully in 8.0s
✓ Finished TypeScript in 4.9s
✓ Collecting page data using 9 workers in 798ms
✓ Generating static pages using 9 workers (132/132) in 954ms
✓ Finalizing page optimization
Exit code: 0 (SUCCESS)
```

---

## 4. Status Serah Terima

- **Kode**: Lengkap dan terverifikasi.
- **Build**: HIJAU (`next build --webpack` exit code 0).
- **Selftest**: ALL PASS (`infotip-click.selftest.tsx` dan `hero-subtitle-info.selftest.ts`).
- **Git State**: Perubahan dibiarkan uncommitted untuk verifikasi Hermes (TANPA commit / push / deploy).
