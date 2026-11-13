# SPRINT-WEBFIX-T1-REPORT: teknikal.id web-fix batch T1

**Status Batch:** SELESAI & TERVERIFIKASI  
**Waktu:** 2026-11-14T06:38:30+07:00  
**Repo:** `~/Documents/teknikalidnew` (Next.js 16.4.3 App Router + React 19 + TypeScript)  
**Aturan Push:** NIGHT-GATE DIPATUHI — JANGAN PUSH (5 commit existing dipush via cron 07:02 ea1286b1082a; commit T1 disiapkan untuk push manual pagi oleh owner/CTO).

---

## 1. Status Gate & Verifikasi Fisik

| Gate | Perintah | Status | Keterangan |
|---|---|---|---|
| **TypeScript Typecheck** | `npx tsc --noEmit` | **PASS (0 error)** | Selesai tanpa error tipe |
| **Production Build** | `npm run build` | **PASS (code 0)** | 130/130 static pages, compiled 21.7s, total build ~1m 03s (baseline normal) |
| **Dependency & API Guard** | Diff Audit | **PASS** | 0 dependency baru; proxy.ts/auth/api tidak disentuh; gaya existing terjaga |

---

## 2. Rincian Per Item

### T1-A (P1 BUG): review reject — Cancel di prompt tetap menolak
- **File & Baris:** [src/app/admin/review/page.tsx](file:///Users/nicholasandriansurjadi/Documents/teknikalidnew/src/app/admin/review/page.tsx#L63-L76)
- **Akar Masalah:** `note = window.prompt(...) ?? ""` mengembalikan `""` saat tombol Cancel ditekan (`null`), sehingga `fetch("/api/admin/articles/review")` dengan `action: "reject"` tetap dieksekusi secara tidak sengaja oleh editor.
- **Solusi:** Guard saat `vars.action === "reject"`: jika `promptNote === null`, return awal tanpa mutasi (aborted). Jika string kosong di-OK, tetap lanjut reject tanpa catatan.
- **Diff:**
```diff
--- a/src/app/admin/review/page.tsx
+++ b/src/app/admin/review/page.tsx
@@ -64,3 +64,5 @@ export default function ArticleReviewPage() {
       let note: string | undefined;
       if (vars.action === "reject") {
-        note = window.prompt("Alasan penolakan (opsional, tercatat di riwayat):") ?? "";
+        const promptNote = window.prompt("Alasan penolakan (opsional, tercatat di riwayat):");
+        if (promptNote === null) return;
+        note = promptNote;
       }
```
- **Status Gate:** PASS (tsc + build)

---

### T1-B (P1): reports — Hapus Konten & Ban User tanpa konfirmasi
- **File & Baris:** [src/app/admin/reports/report-actions.tsx](file:///Users/nicholasandriansurjadi/Documents/teknikalidnew/src/app/admin/reports/report-actions.tsx#L36-L64)
- **Akar Masalah:** Dua aksi destruktif permanen (Hapus Konten & Ban User) langsung memanggil `action.mutate(...)` tanpa konfirmasi dialog, berisiko misklik admin.
- **Solusi:** Tambahkan guard `window.confirm("Hapus konten ini? Tindakan tidak bisa dibatalkan.")` pada tombol delete, dan `window.confirm("Ban user ini? Tindakan tidak bisa dibatalkan.")` pada tombol ban. Tombol dismiss (abaikan) tetap instan tanpa konfirmasi.
- **Diff:**
```diff
--- a/src/app/admin/reports/report-actions.tsx
+++ b/src/app/admin/reports/report-actions.tsx
@@ -41,3 +41,6 @@ export function ReportActions({ reportId, targetType, targetId }: ReportActionsP
         disabled={action.isPending}
-        onClick={() => action.mutate("delete")}
+        onClick={() => {
+          if (!window.confirm("Hapus konten ini? Tindakan tidak bisa dibatalkan.")) return;
+          action.mutate("delete");
+        }}
@@ -59,3 +62,6 @@ export function ReportActions({ reportId, targetType, targetId }: ReportActionsP
         disabled={action.isPending}
-        onClick={() => action.mutate("ban")}
+        onClick={() => {
+          if (!window.confirm("Ban user ini? Tindakan tidak bisa dibatalkan.")) return;
+          action.mutate("ban");
+        }}
```
- **Status Gate:** PASS (tsc + build)

---

### T1-C (P1 a11y massal): tabel saham-* 62 route — scope="col" + wrapper fokusable
- **File & Baris Utama:**
  - [src/components/seo/signal-landing-template.tsx](file:///Users/nicholasandriansurjadi/Documents/teknikalidnew/src/components/seo/signal-landing-template.tsx#L152-L165)
  - [src/app/(public)/saham-oversold/page.tsx](file:///Users/nicholasandriansurjadi/Documents/teknikalidnew/src/app/(public)/saham-oversold/page.tsx#L141-L153)
  - [src/app/(public)/kalender-dividen/page.tsx](file:///Users/nicholasandriansurjadi/Documents/teknikalidnew/src/app/(public)/kalender-dividen/page.tsx#L175-L189) (Jadwal Mendatang & Riwayat Terlewat)
  - [src/app/(public)/aliran-dana-asing/page.tsx](file:///Users/nicholasandriansurjadi/Documents/teknikalidnew/src/app/(public)/aliran-dana-asing/page.tsx#L132-L171) (Top Net Buy & Top Net Sell)
  - [src/app/(public)/laporan-pasar/[minggu]/page.tsx](file:///Users/nicholasandriansurjadi/Documents/teknikalidnew/src/app/(public)/laporan-pasar/[minggu]/page.tsx#L169-L177)
  - Seluruh varian individual `saham-*`: `saham-stochastic-oversold`, `saham-macd-bullish`, `saham-golden-cross`, `saham-overbought`, `saham-death-cross`, `saham-volume-spike`, `saham-pullback-sma20`, `saham-ema-cross`, `saham-undervalued`, `saham-value-growth`, `saham-dividen`, `saham-modal-100-ribu`.
- **Akar Masalah:** Elemen `<div className="overflow-x-auto">` tidak dapat difokuskan keyboard saat terjadi overflow di viewport sempit; elemen `<th>` tidak memiliki `scope="col"` untuk panduan screen reader.
- **Solusi:** Tambahkan `tabIndex={0} role="region" aria-label="<nama tabel>"` pada wrapper scroll horizontal, dan tambahkan `scope="col"` pada seluruh kolom header tabel.
- **Diff Ringkas (Template):**
```diff
--- a/src/components/seo/signal-landing-template.tsx
+++ b/src/components/seo/signal-landing-template.tsx
@@ -152,11 +152,16 @@ export async function SignalLandingTemplate({
-        <div className="overflow-x-auto">
+        <div
+          className="overflow-x-auto"
+          tabIndex={0}
+          role="region"
+          aria-label={`Tabel ${title}`}
+        >
           <table className="w-full text-sm">
             <thead>
               <tr className="border-b border-border text-left">
-                <th className="py-2 pr-4 font-semibold text-text-primary">Ticker</th>
+                <th scope="col" className="py-2 pr-4 font-semibold text-text-primary">Ticker</th>
...
```
- **Status Gate:** PASS (tsc + build)

---

### T1-D (P1 a11y): header mobile nav tertutup tapi tetap tabbable
- **File & Baris:** [src/components/layout/header.tsx](file:///Users/nicholasandriansurjadi/Documents/teknikalidnew/src/components/layout/header.tsx#L224-L229)
- **Akar Masalah:** Dropdown nav mobile hanya menggunakan `max-h-0 opacity-0` tanpa menyembunyikan visibility, sehingga link navigasi di dalamnya tetap dapat di-Tab oleh keyboard saat menu tertutup.
- **Solusi:** Saat closed, terapkan class `invisible pointer-events-none` dan `aria-hidden={!menuOpen}`; saat opened terapkan `visible opacity-100`. Transisi Tailwind `transition-all duration-200 ease-out` menjaga animasi tetap mulus.
- **Diff:**
```diff
--- a/src/components/layout/header.tsx
+++ b/src/components/layout/header.tsx
@@ -225,5 +225,6 @@ export function Header() {
       <nav
         className={`sm:hidden border-t border-border bg-bg-surface overflow-y-auto transition-all duration-200 ease-out ${
-          menuOpen ? "max-h-[calc(100dvh-3.5rem)] opacity-100" : "max-h-0 opacity-0 border-t-0"
+          menuOpen ? "max-h-[calc(100dvh-3.5rem)] opacity-100 visible" : "max-h-0 opacity-0 border-t-0 invisible pointer-events-none"
         }`}
         aria-label="Main navigation"
+        aria-hidden={!menuOpen}
```
- **Status Gate:** PASS (tsc + build)

---

### T1-E (P1 UX): /stocks kolom terpotong tablet 768-978px
- **File & Baris:** [src/components/stock/stock-table.tsx](file:///Users/nicholasandriansurjadi/Documents/teknikalidnew/src/components/stock/stock-table.tsx#L197)
- **Akar Masalah:** Div scroll vertikal menggunakan `max-h-[70vh] overflow-y-auto overflow-x-hidden` dengan header & virtual row `min-w-[946px]`. Di rentang tablet (768px-978px), kolom RSI dan volume terpotong dan tidak bisa di-scroll horizontal.
- **Solusi:** Ganti `overflow-x-hidden` menjadi `overflow-x-auto`.
- **Diff:**
```diff
--- a/src/components/stock/stock-table.tsx
+++ b/src/components/stock/stock-table.tsx
@@ -197,3 +197,3 @@ export function StockTable({ stocks, sectors, linkBase = "/stocks" }: StockTable
-          <div ref={scrollRef} className="max-h-[70vh] overflow-y-auto overflow-x-hidden">
+          <div ref={scrollRef} className="max-h-[70vh] overflow-y-auto overflow-x-auto">
```
- **Status Gate:** PASS (tsc + build)

---

### T1-F (P2 a11y): baris tabel /stocks tanpa keyboard access
- **File & Baris:** [src/components/stock/stock-table.tsx](file:///Users/nicholasandriansurjadi/Documents/teknikalidnew/src/components/stock/stock-table.tsx#L219-L230)
- **Akar Masalah:** Baris virtual adalah `div` dengan `onClick` tanpa `tabIndex`, `role`, atau handler keyboard. Pengguna keyboard tidak bisa menavigasi ke detail saham.
- **Solusi:** Samakan dengan pola `screener-results.tsx`: tambahkan `role="row"`, `tabIndex={0}`, `aria-label`, class `outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset`, dan handler `onKeyDown` (Enter/Space → `router.push`).
- **Diff:**
```diff
--- a/src/components/stock/stock-table.tsx
+++ b/src/components/stock/stock-table.tsx
@@ -219,6 +219,10 @@ export function StockTable({ stocks, sectors, linkBase = "/stocks" }: StockTable
                   <div
                     key={stock.ticker}
                     data-index={virtualRow.index}
-                    className={`absolute top-0 left-0 w-full grid ${gridCols} items-center border-b border-border/50 cursor-pointer transition-all duration-100 ${
+                    role="row"
+                    tabIndex={0}
+                    aria-label={`Detail saham ${stripJk(stock.ticker)}`}
+                    className={`absolute top-0 left-0 w-full grid ${gridCols} items-center border-b border-border/50 cursor-pointer transition-all duration-100 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset ${
                       virtualRow.index % 2 === 0 ? "bg-bg-card/30" : ""
                     } hover:bg-accent/[0.04]`}
@@ -227,2 +231,8 @@ export function StockTable({ stocks, sectors, linkBase = "/stocks" }: StockTable
                     onClick={() => router.push(`${linkBase}/${stock.ticker}`)}
+                    onKeyDown={(e) => {
+                      if (e.key === "Enter" || e.key === " ") {
+                        e.preventDefault();
+                        router.push(`${linkBase}/${stock.ticker}`);
+                      }
+                    }}
```
- **Status Gate:** PASS (tsc + build)

---

### T1-G (P2 SEO): /track-record OG fallback generik
- **File & Baris:** [src/app/(public)/track-record/page.tsx](file:///Users/nicholasandriansurjadi/Documents/teknikalidnew/src/app/(public)/track-record/page.tsx#L13-L41)
- **Akar Masalah:** Objek `metadata` tidak memuat `openGraph` dan `twitter`, sehingga saat di-share di media sosial/crawler fallback ke OG default homepage.
- **Solusi:** Ganti menjadi `generateMetadata()` spesifik dengan title "Track Record — TeknikalID", canonical `/track-record`, `openGraph.type = "website"`, OG image `/api/og?title=Track+Record&type=berita`, dan Twitter card `summary_large_image`.
- **Diff:**
```diff
--- a/src/app/(public)/track-record/page.tsx
+++ b/src/app/(public)/track-record/page.tsx
@@ -5,2 +5,3 @@ import { getTrackRecordDataCached, type TrackRecordData } from "@/lib/track-reco
 import { dateLabel } from "@/lib/utils";
+import { SITE_URL } from "@/lib/constants";
 
@@ -13,7 +14,23 @@ export const dynamic = "force-dynamic";
-export const metadata: Metadata = {
-  title: "Track Record Sinyal — Akurasi Diukur dari Database",
-  description:
-    "Skor akurasi sinyal golden cross & death cross TeknikalID, dihitung otomatis dari database harga sendiri. Tanpa survivorship bias.",
-  alternates: { canonical: "/track-record" },
-  robots: { index: false, follow: true },
-};
+export function generateMetadata(): Metadata {
+  const title = "Track Record — TeknikalID";
+  const description =
+    "Skor akurasi sinyal golden cross & death cross TeknikalID, dihitung otomatis dari database harga sendiri. Tanpa survivorship bias.";
+  return {
+    title,
+    description,
+    alternates: { canonical: "/track-record" },
+    robots: { index: false, follow: true },
+    openGraph: {
+      title,
+      description,
+      url: `${SITE_URL}/track-record`,
+      type: "website",
+      images: [
+        {
+          url: `${SITE_URL}/api/og?title=Track+Record&type=berita`,
+          width: 1200,
+          height: 630,
+        },
+      ],
+    },
+    twitter: {
+      card: "summary_large_image",
+      title,
+      description,
+    },
+  };
+}
```
- **Status Gate:** PASS (tsc + build)

---

### T1-H (P2 performa): hero artikel lazy (LCP)
- **File & Baris:** [src/app/(public)/berita/[slug]/page.tsx](file:///Users/nicholasandriansurjadi/Documents/teknikalidnew/src/app/(public)/berita/[slug]/page.tsx#L329)
- **Akar Masalah:** Gambar cover hero artikel di atas fold menggunakan `loading="lazy"`, menunda proses download gambar dan memperburuk skor LCP (Largest Contentful Paint).
- **Solusi:** Ganti `loading="lazy"` menjadi `loading="eager" fetchPriority="high"`.
- **Diff:**
```diff
--- a/src/app/(public)/berita/[slug]/page.tsx
+++ b/src/app/(public)/berita/[slug]/page.tsx
@@ -329,3 +329,3 @@ export default async function BeritaArticlePage({
                   <div className="rounded-xl overflow-hidden mb-6 aspect-[2/1] max-h-[400px]">
-                    <img src={article.coverImageUrl} alt={article.title} width={1200} height={600} className="w-full h-full object-cover" loading="lazy" />
+                    <img src={article.coverImageUrl} alt={article.title} width={1200} height={600} className="w-full h-full object-cover" loading="eager" fetchPriority="high" />
                   </div>
```
- **Status Gate:** PASS (tsc + build)

---

### T1-I (P2 a11y): login admin tanpa autocomplete/label
- **File & Baris:** [src/app/admin/login/page.tsx](file:///Users/nicholasandriansurjadi/Documents/teknikalidnew/src/app/admin/login/page.tsx#L101-L128)
- **Akar Masalah:** Input email dan password form login admin tidak memiliki label yang terhubung secara programatis serta tidak memiliki atribut `autoComplete`, menghambat autofill password manager & screen reader.
- **Solusi:** Tambahkan `<label htmlFor="..." className="sr-only">`, `aria-label`, serta `autoComplete="email"` dan `autoComplete="current-password"`.
- **Diff:**
```diff
--- a/src/app/admin/login/page.tsx
+++ b/src/app/admin/login/page.tsx
@@ -101,18 +101,28 @@ export default function AdminLoginPage() {
             <form onSubmit={handleSubmit} className="space-y-3">
-              <Input
-                type="email"
-                placeholder="Email"
-                value={email}
-                onChange={(e) => setEmail(e.target.value)}
-                required
-                autoFocus
-                className="h-11 border-gray-200 focus:border-blue-400 focus:ring-blue-400/20"
-              />
-              <Input
-                type="password"
-                placeholder="Password"
-                value={password}
-                onChange={(e) => setPassword(e.target.value)}
-                required
-                className="h-11 border-gray-200 focus:border-blue-400 focus:ring-blue-400/20"
-              />
+              <div>
+                <label htmlFor="admin-email" className="sr-only">Email</label>
+                <Input
+                  id="admin-email"
+                  type="email"
+                  autoComplete="email"
+                  aria-label="Email"
+                  placeholder="Email"
+                  value={email}
+                  onChange={(e) => setEmail(e.target.value)}
+                  required
+                  autoFocus
+                  className="h-11 border-gray-200 focus:border-blue-400 focus:ring-blue-400/20"
+                />
+              </div>
+              <div>
+                <label htmlFor="admin-password" className="sr-only">Password</label>
+                <Input
+                  id="admin-password"
+                  type="password"
+                  autoComplete="current-password"
+                  aria-label="Password"
+                  placeholder="Password"
+                  value={password}
+                  onChange={(e) => setPassword(e.target.value)}
+                  required
+                  className="h-11 border-gray-200 focus:border-blue-400 focus:ring-blue-400/20"
+                />
+              </div>
```
- **Status Gate:** PASS (tsc + build)

---

### T1-J (P3 perf): admin errors search fetch per keystroke
- **File & Baris:** [src/app/admin/errors/page.tsx](file:///Users/nicholasandriansurjadi/Documents/teknikalidnew/src/app/admin/errors/page.tsx#L58-L76)
- **Akar Masalah:** `queryKey` TanStack Query langsung menyertakan `search` dari input text tanpa debounce, memicu HTTP fetch ke `/api/admin/errors` pada setiap keystroke pengguna.
- **Solusi:** Pisahkan state input instan (`search`) dengan state query ter-debounce 300ms (`debouncedSearch` via `useEffect`), sehingga input tetap responsif instan tanpa lag namun request network hanya dikirim setelah jeda ketik 300ms.
- **Diff:**
```diff
--- a/src/app/admin/errors/page.tsx
+++ b/src/app/admin/errors/page.tsx
@@ -3,3 +3,3 @@
-import { useState } from "react";
+import { useState, useEffect } from "react";
@@ -60,4 +60,12 @@ export default function ErrorHubPage() {
   const [search, setSearch] = useState<string>("");
+  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
+
+  useEffect(() => {
+    const timer = setTimeout(() => {
+      setDebouncedSearch(search);
+    }, 300);
+    return () => clearTimeout(timer);
+  }, [search]);
 
   const { data, isLoading } = useQuery<ErrorData>({
-    queryKey: ["admin-errors", source, period, search],
+    queryKey: ["admin-errors", source, period, debouncedSearch],
     queryFn: async () => {
@@ -68,3 +76,3 @@ export default function ErrorHubPage() {
-      if (search.trim()) params.set("search", search.trim());
+      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
```
- **Status Gate:** PASS (tsc + build)

---

## 3. Ringkasan File Terdampak & Verifikasi Akhir

- **Komponen & Halaman:**
  - `src/app/admin/review/page.tsx`
  - `src/app/admin/reports/report-actions.tsx`
  - `src/app/admin/login/page.tsx`
  - `src/app/admin/errors/page.tsx`
  - `src/components/layout/header.tsx`
  - `src/components/stock/stock-table.tsx`
  - `src/components/seo/signal-landing-template.tsx`
  - `src/app/(public)/track-record/page.tsx`
  - `src/app/(public)/berita/[slug]/page.tsx`
  - 16 rute public tables (`kalender-dividen`, `aliran-dana-asing`, `laporan-pasar/[minggu]`, serta seluruh varian `saham-*`).
- **Verifikasi Kompilasi & Build:**
  - `npx tsc --noEmit` → **0 errors**
  - `npm run build` → **0 errors**, seluruh 130 rute sukses digenerate.
- **Git Push Policy:** Tidak ada git push yang dilakukan. Perintah commit & push diserahkan kepada owner/CTO pasca night-gate 07:00.
