# SEO Audit teknikal.id — 12 Nov 2026 (fokus GSC query gap)

Metodologi: skill `seo-audit` v2.5 (claude-seo vendored — metodologi + struktur skor; pengecekan dijalankan langsung).
Scope: halaman penerima query GSC 3-bulan (40 kueri teratas), robots, sitemap, headers, schema, SSR depth.

## Data dasar (GSC 3 bulan)
Klik 9 · Tayangan 784 · CTR 1,1% · pos rata2 60,8. 35/40 kueri di posisi 61+. 74% tayangan = query ticker.

## Skor per kategori (bobot seo-audit)

| Kategori | Bobot | Skor | Catatan |
|---|---|---|---|
| Technical SEO | 22% | 82 | robots AI-friendly, sitemap 964 URL segar, canonical benar, tapi /radar 404 & /screener 308 |
| Content Quality | 23% | 55 | stock page 1.967 kata SSR bagus; /saham/* gated 360 kata = thin utk Google |
| On-Page SEO | 20% | 78 | title/H1/H2 stock page sangat baik (pola "Harga Saham X Hari Ini"); FAQPage + 12 H2 per halaman |
| Schema | 10% | 88 | Stock+FinancialProduct+FAQPage+Breadcrumb — salah satu yang terbaik di kelasnya; license Dataset baru diperbaiki |
| Performance | 10% | 75 | TTFB 214-291ms baik (server-side); /stocks tabel client-side |
| AI Search Readiness | 10% | 85 | llms.txt 200, 6 baris AI crawler di robots, teks SSR bersih |
| Images | 5% | 70 | og_image ada di semua halaman |

**SEO Health Score: ~74/100** — fondasi teknikal kuat, masalahnya di KEDALAMAN konten halaman ujung & konten gated.

## Temuan (prioritas)

### P0 — halaman ujung query kosong
1. **`/radar` = 404** padahal query "idx radar" ranking pos 12 (hampir page-1) — halaman radar-section hanya hidup di /pasar. Query ini KEHILANGAN landing page-nya sendiri. Fix: page /radar standalone (atau 301 ke /pasar#radar) + title "IDX Radar".
2. **`/stocks` tabel tidak SSR** — target utama cluster "harga saham hari ini" (25+ impr, pos 70-85). SSR cuma 10 emiten + ringkasan; tabel 956 emiten client-side → Google tak melihat harga. Fix: SSR-render top 50-100 baris tabel (atau blok "Top harga hari ini" statis per hari).
3. **`/saham/*/*` (128 URL, gated) = 360 kata + login-wall** — artikel "kenapa naik/turun" di sitemap tapi konten tipis/terkunci. Ini thin content massal yang menyeret kualitas domain. Fix: ungkap 2-3 paragraf pertama + FAQ, gate sisanya.

### P1 — konten cluster
4. **Cluster KLBF/Kalbe (8 kueri ~54 impr, pos 74-91)**: stock page bagus tapi sendirian. Butuh 1-2 artikel pendukung ("Analisa KLBF minggu ini") + internal link dari berita/akademi → topic authority.
5. **"aplikasi analisis teknikal saham" (pos 89,8)** — intent produk persis. Tidak ada landing page khusus; homepage tidak membidik frasa ini. Fix: /aplikasi-analisis-teknikal atau pakai /metodologi + H2 frasa.
6. **"eastspring idx esg leaders plus kelas a" (25 impr, kueri tunggal #1, pos 85,7)** — kemungkinan mendarat di halaman indeks SRI-KEHATI. Layak halaman indeks-detail dgn nama produk reksadana lengkap.

### P2 — polish
7. `/screener` 308 → `?view=screener` — redirect chain kecil, biarkan tapi pastikan canonical /stocks.
8. `dateModified` null di semua halaman — tambah ke WebPage schema (sinyal freshness utk query "hari ini").
9. HEAD request diblok 403 (UA sniff) — pastikan Googlebot HEAD diizinkan (minor, GET ok).

## Yang SUDAH bagus (jangan diutak-atik)
- Stock page template: H1 "TICKER — Harga Saham Nama Hari Ini", 12 H2 termasuk RSI/MACD/MA per-ticker, FAQPage, Stock+FinancialProduct schema — ini pola yang menang di pos 1-2.
- robots.txt AI-friendly + llms.txt + CSP/HSTS lengkap.
- Sitemap 964 URL dengan lastmod segar.

## Quick wins (urutan eksekusi)
1. Buat /radar page (30 menit) — panen query pos 12 yang sudah hampir matang.
2. SSR top-N tabel /stocks (1-2 jam) — buka cluster "harga saham hari ini" 25+ impr.
3. Ungkap cuplikan /saham/* gated (1 jam) — hilangkan thin content 128 URL.
4. Artikel KLBF + internal link (AGY flash).
5. dateModified schema semua stock page.

---

# AUDIT PENUH (52 halaman, 12 Nov 2026)

## Crawl summary
- 47/52 halaman 200 OK. 5 non-200: CKRA/XPTD/HDTX/BBTN=404 (bukan bug — emiten tak lagi di universe DB; GSC tayang sisa sejarah, wajar) + /harga-saham-hari-ini=308→/stocks (by design).
- Semua halaman PUNYA H1, meta description, canonical (kecuali /agent & /billing — halaman app, ok).
- TTFB umum 200-400ms; terberat /stocks 724ms, /pasar 604ms.

## Kedalaman konten per tipe
- stock: avg 1.977 kata ⭐ (fondasi terkuat)
- berita: avg 952 kata (bagus)
- akademi: avg 738 (beragam 259-1.267)
- saham-* strategi: 313-1.072 (cukup)
- **/saham/* kenapa-naik/turun: avg 374 kata + gated = thin (128 URL)** ⚠️
- /compare 170, /billing 180, /kontak 230, /laporan-pasar 271 (expected utk utility/legal)

## E-E-A-T
- author byline + datePublished di semua berita ✅ (Nicholas Andrian Surjadi)
- metodologi page ada (490 kata) ✅
- GAP: halaman author (/author/nicholas) tidak ada → E-E-A-T naik kalau ada bio page + sameAs.

## Internal linking
- stock page: 88-100 internal links — sehat.

## /pasar NOINDEX (penting!)
`/pasar` (Koran Saham Live) = `robots: {index: false}` SEJAK lahir (commit 6528d86) — halaman live-sesi ini tak diindeks. Ini mungkin disengaja (konten duplikatif vs /stocks?) TAPI /pasar kini jadi halaman kaya (1.111 kata + radar). Kalau /radar mau jadi page, JANGAN ikut noindex. KEPUTUSAN OWNER DIPERLUKAN.

## H1 STOCK PAGE (konfirmasi owner)
Visual H1 = ticker saja ("BBCA"); crawler baca "BBCA — Harga Saham Bank Central Asia Hari Ini" via span sr-only. Ini setup ideal: UX bersih + SEO keyword lengkap. TIDAK DIUBAH. ✓

## Konsolidasi P0 final (urutan dampak)
1. `/radar` page standalone (query pos 12 tanpa rumah) — title "IDX Radar — Pantau Sinyal Saham Hari Ini"
2. SSR tabel /stocks top ~100 baris (cluster "harga saham hari ini")
3. Ungkap cuplikan /saham/* gated (128 URL thin)
4. Keputusan noindex /pasar (kalau tetap noindex, pastikan /radar terpisah & indexable)
5. Author bio page + dateModified schema
6. Artikel KLBF cluster + internal link
