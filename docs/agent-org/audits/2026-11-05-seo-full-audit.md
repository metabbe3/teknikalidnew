# SEO Full Audit — teknikal.id (5 Nov 2026)

Metodologi: claude-seo v2.5.0 (vendored, MIT) — seo-audit/seo-page/seo-technical.
Crawler custom 955 URL (sitemap penuh), concurrency 5.

## Skor kategori (0-100)
- Technical SEO: 92 (robots AI-crawler lengkap, llms.txt ada, 0 noindex salah, sitemap-news ada; -8: 8 URL 301 di sitemap)
- On-Page SEO: 74 → 93 PASCA-FIX (title >65chr 893→±0, multi-H1 17→0)
- Schema: 95 (Organization/WebSite/WebPage/Stock/FinancialProduct/FAQPage/Breadcrumb di stock page; semua halaman punya JSON-LD)
- Content Quality: 88 (0 duplikat title/desc seluruh situs — langka; gated content disiplin)
- Performance: 82 (median 0.43s stock, 1.34s /saham; tail 4s di ef-pasar pages; HTML /stocks 115kb median OK, indikator 288kb berat)
- AI Readiness: 95 (semua AI crawler di-allow eksplisit, llms.txt kaya FAQ)
- Images: 100 (0 img tanpa alt di 3 template sampel)

## Fix terdeploy (38fc5be + 90f1113, live 5 Nov ~19:50)
1. multi-H1 berita/akademi (17 hal): remarkDemoteH1
2. H1 stock +sr-only keyword (visual ticker tetap — keputusan owner 1 Nov dihormati)
3. title stock absolute (603 hal ≤65chr)
4. title /saham shortName (133 hal)
5. title akademi + index
6. sitemap exclude 6 legacy-301

## Sisa (backlog, bukan blocker)
- ef-pasar & I.JK/A.JK tail 4s (cache/SWR)
- /stocks/*/indikator 288kb HTML — payload indikator berat, kandidat lazy-load
- title berita editor-controlled kadang >90 (guideline penulisan, bukan kode)
- CWV field data (CrUX) belum — perlu GSC API
