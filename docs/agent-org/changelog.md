# Changelog — teknikal.id Agent Org

> Format: satu entri per deploy/task selesai. Ditulis CTO di slot yang sama (bagian dari
> DONE WHEN), dibaca QA slot berikutnya utk verifikasi + Council/owner utk retro.

## Template entri
```
## [YYYY-MM-DD HH:MM] <task-id> — <judul singkat>
- Type: fitur / ops / fix  |  PRD: <prd-id atau ->
- Deploy: <image/hash atau "tanpa deploy — data/admin saja">  |  Rollback: <anchor>
- Verify: <bukti curl/grep/test + angka>  |  QA: <nama-slot + hasil PASS/FAIL>
- Impact check: <tanggal YYYY-MM-DD — apa yang diukur utk north star>
```

## [2026-09-18 07:15] reviewer — QA konten 24 jam + verifikasi semalam (tanpa deploy baru)
- Type: QA/ops  |  PRD: -
- Deploy: tanpa deploy — QA saja  |  Rollback: -
- Verify: 42 artikel PUBLISHED 24h live 200 (curl semua slug); 40 artikel ticker: harga Rp & %% di title EXACT vs StockPrice 17 Sep (0 mismatch); brief 18 Sep breadth 401/252/212 + brief 17 Sep 450 turun & TUGU +12,03% = EXACT vs DB; label sesi brief 18 = "Kamis 17 September" (fix jkse-01 terbukti efektif, generate 23:30, tanpa angka IHSG stale); meta description + canonical + disclaimer 42/42; residual "juta lot" = 0; link internal kanonik /stocks/TICKER.JK ter-render (Sinyal Terkait + /stocks footer). Botgate-2026-09-16-01 → qa_verified=true (auto-flag 118 bot 17 Sep tanpa cleanup manual; nobot 129 vs 39 — tidak drop).
- QA: reviewer PASS (42/42)  |  Catatan: CTO malam 17 Sep tidak eksekusi jkse-2026-09-17-01 (masih pending — re-dispatch CEO pagi); IG STOP owner 19:20 berarti tugas IG 17:30 hari ini nonaktif.
- Impact check: 2026-09-19 — brief 18 Sep traffic/views + nobot daily 18 Sep (botgate clean-metrics DONE WHEN lanjutan).

## 2026-09-18 07:53 — fix ^JKSE EOD (jkse-2026-09-17-01) [deploy 1/2]
- **What**: fetchQuoteV8 enrich OHLC dari daily bar; buildPriceItems exception ^JKSE zero-volume (guard volume<100 selama ini drop indeks tiap EOD).
- **Bukti**: DB ^JKSE 17 Sep OHLC lengkap C=6462.43 H=6500.41 L=6418.13; app 200; brief-18 live 200.
- **Rollback**: git revert d83848f + rebuild.
- **impact_check_due**: 2026-09-21 — cek ^JKSE row 18 Sep muncul pasca EOD hari ini (~16:15).

## [2026-09-18 18:50] jkse-2026-09-18-02 — deploy commit 3c12781 (^JKSE EOD safety net) [deploy 1/2 malam]
- Type: ops  |  PRD: -
- Deploy: image 0ed98e5ed73a (build dari HEAD b2ed2fe ⊃ 3c12781)  |  Rollback: anchor image 11ef0d8c86bc / commit b2ed2fe → git revert 3c12781 + rebuild
- Verify: grep 'JKSE-SafetyNet' di .next container 0→1 file (.next/server/chunks/9071.js); 'regularMarketDayHigh' 3 hit; home/golden-cross/brief-18 = 200×3; tsc clean pre-deploy (HEAD); ISR brief pre/post diff = buildId saja. Baseline-then-deploy PASS (before: SafetyNet 0 hit, 3×200; after: 1 hit, 3×200).
- QA: slot berikutnya (pembangun ≠ pemeriksa) — cek pagi 19 Sep: ^JKSE row 18 Sep SUDAH ada (launchd sync ~16:30 SEBELUM deploy, C=6441.16 lengkap — bukti d83848f) + safety net berlaku utk EOD 21 Sep dst.
- Impact check: 2026-09-21 (gabung jkse-01) — ^JKSE row muncul tiap EOD tanpa manual sync.
- Catatan insiden minor (bukan regresi deploy): /saham-golden-cross sempat render empty-state ~18:35-18:45 (ISR bake saat container restart; page.tsx L41 catch{} menelan error render → fallback empty ter-cache s-maxage=300). Self-heal <10 mnt via revalidate=300; final: tabel 30 baris live (AMAR.JK, BFIN.JK, ...), API screener fresh = 100 rows exact vs DB. Lesson → lessons-learned.md (candidate fix: empty-state jangan di-cache saat ISR stale, atau error boundary).
