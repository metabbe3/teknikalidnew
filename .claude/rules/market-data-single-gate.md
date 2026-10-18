---
description: Use when touching any market-data code (movers, breadth, sector, IHSG, prev-close, change%, live quotes) — enforces the single-gate API Reuse Rule before new endpoints or compute paths are written.
globs: src/domains/stock/**, src/app/api/**
alwaysApply: false
---

# Market Data = SATU PINTU (owner directive 17 Okt 2026)

Sebelum membuat endpoint/service/fungsi data baru:

1. **REUSE DULU** — cek `market-snapshot.service.ts` (EOD movers/breadth/sektor/IHSG), `live-quotes` (intraday), `technicalAnalysisService` (radar/sinyal), `stockMarketService` (list/detail/compare). Data sama sudah ada → pakai/improve yang lama. **JANGAN buat jalur compute baru.**
2. **IMPROVE, BUKAN DUPLIKAT** — endpoint lama kurang? Extend response backward-compatible; konsumen lama tidak boleh putus.
3. **Compute change/breadth/movers DI LUAR snapshot service = DILARANG** — prev-close via doctrine LATERAL per-saham, sesi ber-volume asli, EQUITY only, exclude `^` (kecuali IHSG row). Konsistensi cross-page = invariant: tiap deploy market-related WAJIB consistency-test (curl home + /stocks + /api/market — angka Top Gainer identik).
4. Endpoint baru hanya untuk domain benar-benar baru — wajib catat alasan di header comment route.
