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

## [2026-09-21 07:25] reviewer — QA konten 24 jam: brief 21 Sep 2 FATAL naratif + title /akademi/ double-brand; qa-20-01 & jkse-17-01 dibuku
- Type: QA/ops  |  PRD: -
- Deploy: tanpa deploy — QA + bookkeeping + 3 task ke queue  |  Rollback: -
- Verify: 2 artikel 24 jam live 200. **Akademi pullback SMA20**: tabel 5/5 EXACT vs StockIndicator/StockPrice 18 Sep (TMAS close 144/SMA20 142,15/RSI 60,83/cross 18 Sep; ADMF 8.725/8.707,5/57,99/16 Sep; TSPC, KINO, MPMX ✓); kontras DUTI EXACT (RSI 80,41); kanonik /akademi/ benar; sitemap ✓. **Brief 21 Sep**: breadth 460/208/866 & Kamis 402/252 EXACT; 12 harga+%% EXACT (BYAN +19,96→13.825, FORU -14,97, JARR -14,08, LPKR -8,62→53, ULTJ +8,42, MOLI +8,57, bank big cap ✓); RSI watchlist 5/5 EXACT (18,68/23,31/24,77/22,21/25,69); 90 GC vs 76 DC EXACT (smaCrossSignal non-gorengan 18 Sep); GC baru Jumat 3 EXACT. TEMUAN FATAL: (1) "7 saham pada Rabu 16/9" — DB snapshot 16 Sep: Rabu=6 (ADMF BMSR KICI MDIY SCCO SWID), 7=Selasa 15/9 (brief-16 melaporkan sesi Selasa) → qa-2026-09-21-01; (2) "LPKR volume terbesar di seluruh papan" — BUMI 3,4 M & BRMS 872 jt > LPKR 866,9 jt (ke-4) → qa-2026-09-21-01. FATAL template: title /akademi/* = "— Akademi TeknikalID | TeknikalID" (3 slug diverifikasi) → qa-2026-09-21-02. Minor: /berita/<slug-edu> render homepage 200 hari ke-2 → qa-2026-09-21-03 (P2); typo "harga closes"/"bagupun" (akademi) dicatat.
- QA: reviewer PASS 1/2 konten, 2 FATAL angka-klaim + 1 FATAL template  |  Utang dibayar: qa-2026-09-20-01 qa_verified=true (live "21 golden cross" x11/"20" 0/SMA50 x2) + jkse-2026-09-17-01 impact-check ✓ (^JKSE 18 Sep C=6441,16 OHLC lengkap pasca EOD — safety net + enrich jalan).
- Impact check: 2026-09-22 — brief 22 Sep bebas klaim superlatif salah; title SERP akademi setelah qa-21-02 fix.

## [2026-09-20 07:2x] reviewer — QA konten 24 jam + utang qa-19-01/02 dibuku + P1 baru qa-2026-09-20-01
- Type: QA/ops  |  PRD: -
- Deploy: tanpa deploy — QA + bookkeeping  |  Rollback: -
- Verify: 3 artikel 24 jam live 200. Listicle basic materials: 7/7 skor+RSI+close EXACT vs StockIndicator/StockPrice 18 Sep (MDKA 0,54 = qa-19-02 PASS); top-7 sektor valid (tie 0,54 -> MDKA dipilih sbg paling likuid, defensible). Akademi pullback SMA20: 5/5 tabel + kontras DUTI EXACT (close/SMA20/jarak/RSI/cross-date); hidup di /akademi/ (sitemap 713 URL benar arah); minor: /berita/<slug-edu> render homepage 200 (soft-duplikat, tanpa redirect) + typo 'harga closes'. Rekap mingguan: breadth 5/5 hari (228/448, 324/330, 210/451, 402/252, 208/460), 10 movers, proxy BBCA -0,40/BBRI +1,22, TOWR -8,81 pekanan & -6,33 Jumat, TUGU +12,0 — semua EXACT vs DB; TEMUAN P1: '20 golden cross' = snapshot s.d. 17 Sep (full-week non-gorengan = 21) + definisi 'SMA20×SMA50' salah -> qa-2026-09-20-01. qa-19-01/02 flip done+qa_verified dari bukti live (eksekusi 19 Sep sore belum dibuku CTO — utang dibayar reviewer).
- QA: reviewer PASS 2/3, 1 P1 content patch  |  Impact check: 2026-09-22 — rekap mingguan W39 tidak mixed-freshness (generate setelah indicator EOD Jumat).

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

## [2026-09-20 07:45] qa-2026-09-20-01 — rekap mingguan: 20→21 golden cross + definisi GC fix [tanpa deploy]
- Type: ops (SQL content patch)  |  PRD: -
- Deploy: tanpa deploy — ISR revalidate=300 serve fresh  |  Rollback: SQL reverse-replace (21→20, frasa SMA200→lama) bila perlu
- Verify: DB POST title/excerpt/body '21 golden cross' 1/1/1 & '20 golden cross' 0; LIVE 2-pass: '21 golden cross' 3 hit / '20' 0; 'SMA50 memotong ke atas SMA200' 2 / 'SMA20 memotong' 0; angka lain utuh (lead 208/460 x3, TOWR x4, DC=4 x2). Baseline-then-deploy: before 20gc=3/21gc=0/sma20m=2 -> after 21gc=3/20gc=0/sma20m=0.
- QA: reviewer besok pagi (pembangun != pemeriksa) — konten rekap penuh.
- Impact check: 2026-09-23 — pola mixed-freshness rekap mingguan berikutnya (generasi 26 Sep) pakai indikator sesi terakhir.
- SQL log: decisions.md (backup 20 Sep 01:15 valid; preview COUNT 1/1/1; UPDATE 1 row; WHERE slug+PUBLISHED+LIKE guard).


## [2026-09-21 18:50] isr-2026-09-19-01 — signal pages fail-open (bookkeeping sore; eksekusi pagi 07:37) [deploy pagi 1/1]
- Type: ops  |  PRD: -
- Deploy: pagi 21 Sep image 2acfc8dfdaea, commit 2cebf97 (10 file)  |  Rollback: git revert 2cebf97 + rebuild
- Verify (sore): marker fail-open live (.next/server/chunks/7977.js); /saham-golden-cross live 30 ticker; home+signal 200.
- QA: slot berikutnya. Impact check: 2026-09-24 — pasca deploy berikutnya, signal pages tidak menampilkan empty-state palsu (jendela ≤2mnt).

## [2026-09-21 18:40] qa-2026-09-21-01 — brief 21 Sep: GC Rabu 7→6 + klaim LPKR volume [tanpa deploy]
- Type: ops (SQL content patch)  |  PRD: -
- Deploy: tanpa deploy, ISR 300  |  Rollback: reverse-replace SQL
- Verify: DB post old=false/new=true x2; LIVE: '6 saham pada Rabu 16/9' x2 + 'terbesar ke-4 di seluruh papan' x2, frasa lama 0; guard 460/BYAN utuh. Backup 01:15 valid; log decisions.md.
- Impact check: 2026-09-24 — brief berikutnya angka GC cross-count konsisten query reviewer.

## [2026-09-21 18:50] qa-2026-09-21-02 — akademi title single-brand [deploy sore 1/1]
- Type: ops  |  PRD: -
- Deploy: image 264a67f61480, commit 75033e1 (1 file)  |  Rollback: git revert 75033e1 + rebuild (anchor lama 2acfc8dfdaea)
- Verify: tsc clean; LIVE 2/3 slug dicek 'TeknikalID' 1x di title (before: 2x). Worker paralel A + verify CTO sendiri.
- Impact check: 2026-09-24 — GSC title /akademi mulai tampil single-brand.

## [2026-09-21 18:50] qa-2026-09-21-03 — guard edu 404 /berita [deploy sore, CAVEAT]
- Type: ops  |  PRD: -
- Deploy: image 264a67f61480, commit e3ecbfe (1 file)  |  Rollback: git revert e3ecbfe + rebuild
- Verify: tsc clean; guard live; NEWS tetap 200; sitemap bersih. CAVEAT: status live /berita/<edu> TETAP 200 — root cause struktural root loading.tsx soft-404 sitewide -> task baru soft404-2026-09-21-01 (P1).
- Impact check: 2026-09-24 — setelah soft404-01, edu slug = 404 end-to-end.

## [2026-09-21 18:45] council-2026-09-20-01 — verdict isBot IPv6 [read-only]
- Verdict: HUMAN (owner sendiri, Telkomsel AS23693); prefix-block blanket 2404:c0: salah sasaran; dampak nobot pekan 14-20 Sep +76% bila re-class. Follow-up: botgate-2026-09-21-01 (blocked_for_owner).

## [2026-09-21 18:39] council-2026-09-20-02 — konsolidasi ceo-decisions.md [docs]
- Merge 9 entri + symlink data-dir -> repo restored; jalur tunggal kanonik.

## [2026-09-22 07:2x] qa-reviewer-2026-09-22 — QA 42 artikel + verifikasi deploy semalam [read-only]
- QA: 41/42 bersih, 0 fatal; 1 minor typo 'saam' (pola ke-3 → task P2 reviewer-qa-2026-09-22-01: SQL patch 3 slug). Brief 21 & 22 Sep: semua klaim exact vs DB (detail di decisions.md [REVIEWER]).
- Verify deploy: image 264a67f61480 live; isr-01 signal pages 4/4 terisi tanpa empty-state → qa_pass; qa-21-02 title single-brand ✓; qa-21-03 guard aktif (soft-404 residual = tracked soft404-01); sitemap bersih.
- Buku: isr-01 done→qa_pass di cto-queue.json; lessons typo berulang; 42/42 live 200.

## [2026-09-22 08:0x] soft404-2026-09-21-01 — sitewide soft-404 fix [deploy pagi 1/1]
- Type: ops  |  PRD: -
- Deploy: image 17c0d2e3361f, commits b94d8de (hapus 6 loading.tsx: root + stocks/ + stocks/[ticker]/ + profile/[username]/ + community/ + community/post/[id]/) + b507823 (admin/login Suspense wrap)  |  Rollback: git revert b507823 b94d8de + rebuild (anchor lama 264a67f61480 / 41cbdd2b)
- Verify: tsc clean; bogus slug before 200×8 → after 404×7 + 1×307 auth-gate (profile — middleware redirect, bukan soft-404); valid 7/7 tetap 200; TTFB / 0.130→0.164s, /stocks 0.140→0.124s (tanpa regresi); /admin/login 200 (prerender fix).
- Lesson: root loading.tsx = boundary untuk useSearchParams() di /admin/login — build-1 gagal prerender; dependency tersembunyi boundary root, grep pemakai useSearchParams WAJIB sebelum hapus boundary.
- Impact check: 2026-09-25 — GSC mulai baca 404 asli (crawl budget pulih); spot-check slug ngaco tetap 404.
