<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## API Reuse Rule (owner directive 17 Okt 2026)

Market data = SATU PINTU. Sebelum membuat endpoint/service/fungsi data baru:

1. **REUSE DULU** — cek `src/domains/stock/market-snapshot.service.ts` (EOD movers/breadth/sektor/IHSG), `live-quotes` (intraday live), `technicalAnalysisService` (radar/sinyal), `stockMarketService` (list/detail/compare). Kalau data yang sama sudah ada → pakai/improve yang lama. **JANGAN buat jalur compute baru.**
2. **IMPROVE, BUKAN DUPLIKAT** — kalau endpoint lama kurang (field/filter/cache), extend responsenya dengan backward-compatible shape; konsumen lama tidak boleh putus.
3. **Compute change/breadth/movers DI LUAR snapshot service = DILARANG** — semua prev-close via doctrine LATERAL per-saham, sesi ber-volume asli, EQUITY only, exclude `^` (kecuali IHSG row). Konsistensi cross-page = invariant; tiap deploy market-related WAJIB consistency-test (curl home+/stocks+/api/market, angka Top Gainer identik).
4. Endpoint baru hanya kalau domain benar-benar baru (bentuk data/freshness/konsumen beda) — dan wajib catat alasan di header comment route.
