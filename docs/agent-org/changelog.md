## [2026-10-01 07:5x] reviewer — QA 1 Okt: 42 artikel + deploy verify wid-27-1 + bookkeeping [read-only + 1 task P1]
- Type: QA/ops  |  PRD: -
- Deploy: TIDAK ADA (QA + bookkeeping; 1 task ke queue)  |  Rollback: -
- QA konten: 42 artikel 24jm — 40 snapshot DAILY_SNAPSHOT: harga+pct title EXACT vs StockPrice 30 Sep (40/40, pct=prev-close). Brief30: GOTO 32/-13,51% (prev 37), vol 857,2jt, breadth Selasa 312/387/167 vs Senin 550, BBRI/BBCA, movers SOFA/BMTR/LPKR/UNTR/ANTM + vol 288,8jt/373,6jt, DSNG GC 29 Sep, IKAI DC, RSI BBSI/ARTO/PTPP/LPKR — SEMUA EXACT. Rekap September: breadth 866/590/230/46 (close 1 vs 30 Sep, 22 hari), movers SEMA+323/FORU-91,5 (basis close 1 Sep), bank dua-digit 13 emiten, GC 81/DC 13 vs Agustus 47/25, EMA 171/430 — EXACT; judul 'Bank Rontok Dua Digit' valid (13 bank ≤-10%). TEMUAN FATAL 1 → qa-2026-10-01-01: brief30 "BBSI RSI 11,7 (paling ekstrem)" — DB 29 Sep non-gorengan RSI<30: GOTO 0,04/BABP 0,05/REAL 4,10/CPRO 5,03/BSBK 5,10 di bawahnya (BBSI #6); superlatif ke-4 di brief sama, lolos QA kemarin → pola ke-3, lessons dicatat. MINOR 2: rekap tanpa disclaimer inline (dibundel task); wid-27-1 AC hub /saham 404 (10/10 chip topikal OK).
- Deploy verify: wid-2026-09-27-1 → qa_verified: live /stocks 200, 'Jelajahi sinyal lain' x2, 10/10 href chip SSR, flex-wrap; widget mingguan utuh; app image 61a0efb9 (07:35, commit merge 1e4d517). ops-2026-09-30-01 → qa_verified: backlog_health.py 2 run exit 0 (tknkl 6/hPOS 1/AegisGo 6 live, 0 stale), alert via stdout. Bookkeeping lain: qa-2026-09-30-01 qa_pass (patch D-1 live+DB), ops-2026-09-29-01 qa_verified (itsec 2 run exit 0), council-2026-09-27-02 qa_verified. Queue dual-file disinkronkan (38 entry, IDs identik kedua path).
- Impact check: 2026-10-02 — brief 1 Okt bebas superlatif-tanpa-ranking; patch qa-2026-10-01-01 live ('(paling ekstrem)'=0 + disclaimer rekap).


## 2026-09-30 — qa-2026-09-30-01: brief 30 Sep content patch (3 klaim fatal)
- `582 saham turun` → `550` (582=Jumat 25/9; Senin=550) · SOFA `terbesar non-gorengan` → `kedua, di bawah IFSH +24,80%` · LPKR `terbesar di bursa` → `di antara saham lapis satu`. SQL patch tanpa deploy (ISR 300s), backup /tmp/article_backup_20260930.sql, live-verified curl. Angka GOTO/breadth/movers utuh. Root-cause + rule anti-recurrence di decisions.md. Utang reviewer (qa-27-01, cto-26-01) → qa_pass.

## [2026-09-29 18:5x] ops-2026-09-29-01 — fix itsec_brief.py auth-err query (bug quoting httpStatus) + finding monitoring gap 401/403 teknikalid
- Type: ops  |  PRD: sec-2026-09-28-02 (owner-approved 07:42)
- Deploy: tanpa deploy — script lokal ~/.hermes/scripts/itsec_brief.py saja  |  Rollback: itsec_brief.py.bak-20260929
- Verify: DONE WHEN 4/4 — 2 run berturut exit 0; hivePOS ErrorLog 7d tampil (500×5, 401/403=0); teknikalid baris eksplisit via to_regclass(\"ErrorLog\")=f ('0 events / tidak tersedia di DB teknikalid'); grep 'does not exist' = 0; py_compile OK. ROOT CAUSE: kolom mixed-case httpStatus unquoted → postgres fold httpstatus; query memang men-target hivePOS (label backlog menyesatkan, verifikasi spec ke repo/env aktual).  |  QA: reviewer 30 Sep — 2 run script + grep output
- Impact check: 2026-10-06 — pre-run IT-SEC Senin berikutnya jalan tanpa 'column does not exist'; FINDING terbuka: 401/403 anonim teknikalid tak tercatat di DB (AuditLog authed-only, FK userId NOT NULL) → kandidat instrumentasi app-layer (council/owner, area security).

## [2026-09-28 07:5x] qa-2026-09-27-01 — Rekap Mingguan 26 Sep: 28→9 GC / 13→2 DC + definisi SMA50×SMA200; + bonus brief-28 lot×3 (impact check cto-26-01 FAIL→patched)
- Type: ops/QA-fix  |  PRD: -
- Deploy: tanpa deploy — SQL content patch + sanitizer jalur Mandor (teknikalid_growth.py, script-only)  |  Rollback: restore db-20260928.sql.gz (01:15)
- Verify: DB post-check residual 0 (28/13dc/SMA-20/lot); angka lain utuh (breadth 525/114, UNSP 63,11%, 5 ticker cross-date, SHID/TRUK/MAPB volume exact vs StockPrice 25 Sep). LIVE 2 URL 200 + grep: '9 saham' x3 / '28 saham' 0 / 'SMA 20 memotong' 0 / lot residual 0. METODE 9/2 tervalidasi anchor 21/4 (qa-20-01) — replicasi eksak LATERAL + isGorengan=false. ROOT CAUSE: cross-count dihitung LLM Mandor (market-brief-data tanpa angka cross; AgentJob kosong sejak 25 Sep) — bukan pipeline repo. Sanitizer jalur Mandor di-ship + unit test 3/3.
- QA: reviewer 29 Sep pagi — cek brief 29 Sep bebas lot/saam (jalur Mandor + sanitizer baru) & rekap live.
- Impact check: 2026-09-29 — brief/rekap berikutnya (29 Sep & 3 Okt) bebas unit-lot & hitungan cross LLM; generator gap → kandidat task Mandor-prompt (cross-count harus dari DB, bukan hitung LLM).

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

## [2026-09-23 07:2x] reviewer — QA konten 24 jam: 43 live 200, 40/40 angka EXACT; brief 23 Sep 2 FATAL → qa-23-01; 'saam' hari ke-3 → reviewer-23-01; botgate-21-01 & ops-22-01 qa_verified
- Type: QA/ops  |  PRD: -
- Deploy: tanpa deploy — QA + bookkeeping + 2 task ke queue  |  Rollback: -
- Verify: 43 artikel 24 jam live 200 (curl semua slug). **40 artikel saham**: close/%% di title EXACT vs StockPrice 22 Sep (0 mismatch); high/low/body/volume cocok; disclaimer+meta desc 40/40; judul bebas double-brand; link /stocks/TICKER.JK kanonik. **Brief 23 Sep**: breadth 552/144/170 EXACT (SQL lag-window); 12 harga+RSI+cross-date EXACT (BSSR +11,28% vol 11,5M saham vs 0,7M kemarin; ISAT 114,4M vs 47,9M; BRIS RSI 23,73 oversold-claim valid; ULTJ cross 17 Sep ✓). TEMUAN FATAL → qa-2026-09-23-01: (1) "tiga golden cross baru (22 Sep)" SALAH — DB non-gorengan smaCrossDate 22 Sep = 5 (AMAN/ARII/BOBA/LUCK/MAPA), INAI cross-nya 21 Sep; (2) unit "lot" 4x padahal StockPrice.volume = SAHAM → magnitudo 100x (regresi pertama brief dalam 30 hari); minor: link brief kemarin 404 (tanpa /berita/), "dua hari hijau post-sinyal" INAI off-by-one. TEMUAN → reviewer-2026-09-23-01: typo "saam" masih live di 3 PUBLISHED — task kemarin reviewer-qa-2026-09-22-01 TIDAK PERNAH tertulis di queue (gagal persist, lessons 23 Sep).
- QA: reviewer — konten 41/43 PASS (2 fatal terkonsentrasi di 1 brief), **botgate-2026-09-21-01 qa_verified=true** (grep 2404:c0 di .next = 0 hit; app restart 06:42 dgn image baru; retro PageView prefix = 474 rows semua isBot=false, 0 tersisa; nobot 128/164 exact), **ops-2026-09-22-01 qa_verified=true** (healthcheck+probe pkill bracket ada di Config.Healthcheck; worker Up 12h healthy; RestartCount=1 konsisten simulasi kemarin), **prd-2026-09-17-01 partial**: AC1 'Simpan Screen' SSR guest di /stocks?view=screener ✓, AC3 'Pantau' di BBRI ✓, AC4 no-gating ✓, /auth/register 200 — flow register→auto-save (AC2/AC3 interaktif) menunggu QA browser.
- Impact check: 2026-09-24 — brief 24 Sep bebas unit-lot & hitungan GC baru benar; sweep 'saam' PUBLISHED = 0.
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

## [2026-09-22 19:15] prd-2026-09-17-01 — Register Hook: Simpan Screen + Watchlist (fitur pertama era SDLC) [deploy sore 1]
- Type: feature  |  PRD: prod-2026-09-17-01 (spec_ready 17 Sep, CEO approve 20 Sep)
- Deploy: image app a1598f40260d, commit 55c42d6 (4 file: save-screen-prompt.tsx baru + screener-client + stock-action-badge + complete-profile)  |  Rollback: git revert 55c42d6 + rebuild (anchor lama 17c0d2e3361f)
- Verify: tsc --noEmit exit 0 full repo; DONE WHEN 4/4 — guest bar 'Simpan Screen' SSR live di /stocks preset golden_cross (×1) + hasil screener tetap render (NO gating, 'Pilih Filter' ada); /stocks/BBRI.JK 200 'Pantau' ×2; /auth/register 200; marker pending_post_register di 4 titik. Baseline-then-deploy: 7 URL 200 sebelum = 7 URL 200 sesudah; SavedScreener/Watchlist/User = 2/12/20 tak berubah (tidak ada write liar).
- Worker paralel A (4 file FE) + B (worker/compose) — non-overlap verified; commit tetap sempit per-task oleh CTO.
- QA: slot berikutnya (pembangun ≠ pemeriksa) — test full flow register+auto-save di staging/browser.
- Impact check: 2026-10-20 (4 minggu) — AC5 gate: register-page IP dari /stocks ≥10 IP ATAU ≥8 register selesai (baseline 3 IP / 2 user).

## [2026-09-22 19:15] ops-2026-09-22-01 — worker healthcheck + self-heal kill (bukan PID1) [deploy sore, sama slot]
- Type: ops  |  PRD: - (backlog sre-2026-09-19-1)
- Deploy: image worker 5545cb136d1f → recreate dgn probe v2; commits 88da219 + 576c6b5  |  Rollback: git revert 576c6b5 88da219 + docker compose up -d worker
- Verify: DONE WHEN 5/5 — docker ps 'Up (healthy)'; Config.Healthcheck terpasang; SIMULASI GAGAL REAL: SIGSTOP node+tsx 19:07:33 → heartbeat stale >180s → probe exit 1 → pkill → npm SIGKILL exit → container restart OTOMATIS 19:10:17 (RestartCount 0→1) → healthy lagi dalam 2m44s (<10mnt req); heartbeat fresh pasca-restart; pipeline tetap jalan (worker poll normal); 0 port/endpoint baru.
- LESSON PENTING: SIGKILL ke PID1 dari DALAM PID namespace diabaikan kernel (test round-1 bukti: exit 1 tapi container tetap jalan); restart:unless-stopped hanya bereaksi EXIT. Fix: pkill proses worker asli (pattern 'agent-worke[r]' bracket self-exclusion) → npm exit → container exit → revive.
- Impact check: 2026-09-25 — worker uptime berkelanjutan + 1 siklus health log normal.

## 2026-09-23 pagi (agent-utama, owner mandate "gas jalankan sekarang")
- **botgate-21-01 EXECUTED** (approve 22 Sep → eksekusi 23 Sep, ≤1 hari ✓ proposal #13): hapus blanket prefix-block 2404:c0 (Telkomsel residential v6) dari ip-blocklist.ts; pertahanan bot = per-IP BlockedIp + rate limit + ASN tripwire. tsc 0, commit fix(analytics), deploy image 06:41, site 200, prefix hilang dari bundle.
- **Retro SQL: 902 PageView re-classed isBot=false** (backup db-20260923 01:15 fresh). Dampak harian: Senin 21 Sep nobot 38→128, Selasa 22 Sep 130→164. register 7d tetap 0 (blocker distribusi, bukan bot-flag).

## [2026-09-23 07:57] qa-2026-09-23-01 + reviewer-2026-09-23-01 — brief 23 Sep fix + typo sweep + sanitizer pipeline [deploy pagi 1/1]
- Type: ops  |  PRD: - (QA reviewer dispatch)
- Deploy: image app baru (build 07:5x), commit 080daf4 (2 file: content-sanitizer.ts BARU + article.service.ts wiring+prompt)  |  Rollback: git revert 080daf4 + rebuild (anchor lama 9e4c839f2830)
- qa-23-01 SQL patch (backup 23 Sep 01:15 valid): brief-pasar-idx-2026-09-23 — tiga→lima golden cross + bullets AMAN/BOBA/LUCK (data DB verif: cross 22 Sep, RSI 32,9/38,4/52,4) + INAI reword; 4 unit 'lot'→'saham' (11,5 jt/1 jt/692 rb/114,4 jt); link kemarin +prefix /berita/ (sebelumnya 404); frasa 'dua hari berturut-turut' dikoreksi (post-sinyal hanya 1 hari). Post-check DB: tiga_gc=0, lot=0, link_lama=0, breadth 552/144 utuh; live 'lima golden cross' ×2.
- reviewer-23-01 SQL patch: 3 artikel 'saam'→'saham' (UPDATE 3, residual ILIKE saam=0, sham/saahm=0); brief-22 live saam=0/saham=4; amrt+arto kini stale-308 by design (bukti DB-level).
- Root cause + guard: brief prompt tanpa baris satuan volume; LLM stochastic slip. Fix pipeline: sanitizeGeneratedContent() di 4 call-site provider.generateArticle + re-sanitize fact-check correctedContent (bug $3→$2 diperbaiki manual — magnitude word hampir hilang); brief prompt + 'Volume di data dalam SATUAN SAHAM — juta/ribu saham, JANGAN lot'. Unit-test regex 8/8 PASS (node), tsc --noEmit exit 0.
- Baseline-then-deploy: 4 URL 200 sebelum = 4 URL 200 sesudah (/, /stocks, brief-23, golden-cross); TTFB 0,13-2,1s noise-level; marker sanitizer live di chunks/7977.js.
- Impact check: 2026-09-26 — brief 24-26 Sep: grep ' lot' residual=0 (sanitizer kerja) + review QA reguler.

## [2026-09-24 07:4x] qa-reviewer-2026-09-24 — QA 42 artikel + verifikasi deploy [read-only, 1 task P1 dibuat]
- QA: 42 artikel 24jm — 40 saham EXACT vs DB (harga+pct, sign), 2 brief angka exact; 1 FATAL: brief24 satuan 'lot' x3 (klaim 100x) — REGRESI pola qa-23-01. Root cause: deploy sanitizer 23 Sep hanya app; worker image basi 22 Sep 11:45 → guard tak pernah jalan di jalur brief. Task qa-2026-09-24-01 (SQL patch + rebuild worker) → slot CTO pagi.
- Minor: 0. SEO bersih (slug/excerpt/0 double-brand); link internal valid. LIVE 42/42 komponen dicek 200 + disclaimer.
- Deploy verify: qa-23-01 & reviewer-23-01 → qa_pass (qa_verified=true); prd-17-01 AC live di browser guest ('Simpan Screen' x1, NO gating); ops-22-01 sudah terbukti sebelumnya (healthy, RestartCount 1). Lessons baru: deploy kode worker-shared WAJIB build app+worker bersama.

## [2026-09-24 07:4x] qa-2026-09-24-01 — brief24 'lot'→'saham' x3 (SQL patch) + worker rebuild sanitizer [deploy pagi 1/1, worker-only]
- Type: ops  |  PRD: - (QA reviewer dispatch 24 Sep)
- Deploy: worker image 5545cb136d1f (22 Sep, basi) → 88fd17fa2ff6 (24 Sep 07:33); commit sudah ada 080daf4 (ancestor HEAD)  |  Rollback: docker tag 5545cb136d1f teknikalidnew-worker:latest && docker compose up -d worker
- Verify: DONE WHEN — (a) LIVE brief24 ' lot' 6→0, 'juta saham' 0→6, angka 112,3/29,7/671 + breadth 461 UTUH; (b) worker recreated + sanitizer marker 'saam' & prompt 'SATUAN SAHAM' ADA di chunks/7977.js container worker; (c) brief 25 Sep bebas lot → impact check QA pagi 25 Sep; (d) tsc tidak relevan (0 perubahan kode; commit 080daf4 sudah di HEAD). SQL: backup 24 Sep 01:15 fresh, preview 1|1|1, UPDATE 1×3 transaksi tunggal, post residual=0.
- Root cause: deploy sanitizer 23 Sep hanya rebuild APP — generateDailyBrief jalan di WORKER, image worker masih 22 Sep → guard tak pernah dieksekusi utk brief. LESSON: deploy kode worker-shared = build app+worker BERSAMA.
- Impact check: 2026-09-25 (QA pagi) — brief 25 Sep ' lot'=0.

## [2026-09-24 18:5x] prd-2026-09-24-01 — Widget 'Sinyal Minggu Ini' di /stocks [deploy sore 1/1; org 2/2]
- Type: feature  |  PRD: prod-2026-09-19-01 (spec_ready 21 Sep, CEO approve 22 Sep)
- Deploy: commit b19b71c → image app fecbc607a367 (18:41)  |  Rollback: git revert b19b71c + rebuild (anchor lama b64b629e59f9)
- Verify: curl anon /stocks SSR: 'Sinyal minggu ini (21-24 Sep): 10 golden cross · 3 death cross' == DB (COUNT DISTINCT stockId smaCrossDate>=2026-09-21); href /saham-golden-cross + /saham-death-cross; valid 5/5 200; tsc 0; fixture stale/boundary/zero-state PASS.
- Paralel ops-24-01 (non-overlap): sre_brief.py classify SELF-HEAL vs REAL ERROR (replay 22 Sep PASS, inject PASS, OOM-KILLED PASS) — tanpa deploy, skrip Hermes saja.
- Baseline AC6: DC views 4-wk=2, weekend signal views/hari=4.5 → gate: DC>=5/4-wk ATAU weekend>=6/hari. impact_check_due: 2026-10-22.

## [2026-09-26 07:4x] cto-2026-09-26-01 — sanitizer variant-3: excerpt+title LLM tak tersanitize (brief 25 Sep 'saam' x9 live) [deploy pagi 1/1]
- Type: ops  |  PRD: - (self-dispatch dari impact check brief 25 Sep)
- Deploy: commit d6635b2 → app e903ac65dc44 + worker 06082d2e2c25 (build 07:41, KEDUA image — lesson qa-24-01)  |  Rollback: git revert d6635b2 + rebuild; anchor lama app fecbc607a367 / worker 88fd17fa2ff6
- Temuan: impact check qa-24-01 (brief 25 Sep ' lot'=0 PASS) menemukan 'saam' x9 live — semua dari EXCERPT DB (content/title bersih). Root cause: sanitizeGeneratedContent dipanggil utk result.content (5 site) tapi result.excerpt TIDAK PERNAH; worker claude juga tutup 2 lubang bonus: resolveTitle fallback H2 baca raw content + factCheck.correctedTitle (jalur brief persis).
- Fix kode: excerpt wrap 5/5 (`sanitizeGeneratedContent(result.excerpt ?? "").slice(0,500)`), title wrap 4/4 resolveTitle, correctedTitle L357; unit test BARU content-sanitizer.test.ts (node:test, 6/6 PASS via npx tsx --test); tsc --noEmit exit 0 (verify sendiri). Marker bundle: 'excerpt??""' x5 di app DAN worker; 'saam' marker ada di keduanya.
- SQL patch (protokol: backup db-20260926 01:15 fresh <24h, preview excerpt ILIKE saam = 1 row hanya brief25, excerpt-lot-sweep = 0, UPDATE 1 transaksi tunggal, log decisions.md): post DB saam=0, live saam 9→0, 'watchlist saham' x9.
- Baseline-then-deploy: 5 URL 200 before = 5 URL 200 after (/, /stocks, brief25, golden-cross, BBRI.JK); brief25 saam 0.
- QA: slot berikutnya (reviewer); impact_check_due: 2026-09-29 — brief Senin 28 Sep: saam=0 + lot=0 di content+excerpt+title (regenerasi pertama lewat guard baru).

## [2026-09-27 22:00-23:12] mobile-all-pages + admin geo breakdown — 3 waves, 4 deploys [owner-directed night sprint]
- Type: feature/UX  |  PRD: idea-2026-09-27-geo (breakdown-not-filter) + owner direct ("mobile friendly all pages")
- Deploys: wave-1 4ad1b0d /stocks card-list (22:10) · geo 6e32d15+dd800d6 views-geo API · wave-2 27d9f65 tap-target 44px (22:32) · wave-3 d10e835 44 file community/screener/compare/paper-trading/akademi/berita/home-login (23:12). Commits pendukung: 7654413, fc862c6, 7109371, 65444fd (backlog).
- Konteks: mobile = 93.4% traffic; community sidebar dulunya hidden lg:flex = data sosial HILANG total di mobile → stacked-below-feed (NORTH STAR easy-to-use).
- Verify (agent-utama): tsc --noEmit 0 TIAP wave; live 11/11 URL 200; 433 card rows SSR /stocks mobile-UA; md:hidden + lg:hidden terlihat di HTML; proxy.ts:300 auth-mask 404 utk /api/admin unauth = BY DESIGN (parity funnel) — data geo via dashboard admin login.
- Geo: label-only breakdown (bukan filter — jangan buang data), prefix map coverage 688/716=96,1%, unknown='??' honest.
- QA: slot Senin 28 Sep (mobile UX spot-check + geo dashboard); impact_check_due: 2026-10-25 (retention mobile vs baseline).
- Lesson: className-only waves di-commit SELEKTIF dari working tree bercampur WIP; claude menulis, agent-utama verify+commit+build+deploy.

## [2026-09-28 06:50] SEO de-emphasis crypto + double-brand fix — owner direct
- Type: SEO/UX | commits: ce60ee2 + 17eb15f | deploys: 2 (docker image rebuild)
- Owner ask: "crypto hapus dari title, fokus saham dulu"
- Changes: (1) homepage title → "Analisa Teknikal Saham IDX & Chart Real-Time" (page-level metadata menimpa layout — dua-duanya di-fix); (2) OG/Twitter title root → IDX-only; (3) /crypto/* title tanpa kata "Crypto" + FIX double-brand "| TeknikalID | TeknikalID" (suffix manual + template); (4) crypto pages memang sudah noindex + nav hidden + CRYPTO_ENABLED=false — tinggal URL langsung yang hidup (by design, redirect /crypto → /stocks).
- Verify live: homepage + /crypto/BTC title baru ter-serve, /stocks 200, berita today 200.
- Catatan SEO: GSC resubmit 13 Sep; sitemap 0 crypto. Expect: Google recrawl homepage dalam 1-7 hari → title SERP update.


## [2026-09-28 18:45] qa-2026-09-28-01 + qa-2026-09-28-02 — brief28 GC 0→10 emiten + tabel EMA akademi (SQL patch, TANPA deploy)
- Type: ops (content QA)  |  PRD: - (Content Reviewer QA 28 Sep 07:0x)
- Deploy: TIDAK ADA (SQL content patch; ISR revalidate=300)  |  Rollback: revert string via UPDATE balik (backup db-20260928 01:15)
- brief28: GC '0 emiten' → '10 emiten' + ticker list (DB EXACT: smaCrossDate 21-25 Sep non-gorengan = 10; INAI 21/9 … TGKA 25/9); 'golden cross nol' reword. LIVE: 10 emiten x2, INAI/TGKA ada, 'golden cross nol'=0, lot=0 (patch pagi utuh), breadth 119/582 utuh.
- akademi EMA: 358→359, 113→114 (x2), MDKA rally 24→23 Sep (+8,83% sesi 23 Sep DB EXACT). LIVE: 114 x2, sesi 23 Sep x2, 113=0, 24 Sep=0, MAPI/383 utuh.
- VERDICT: klaim reviewer 383→379 & 113→344 & 15→56 DITOLAK setelah replikasi 8 varian — 383 = field kanonik emaCrossSignal (basis signal page, 383+359=742=universe rekap); 344/56 tak ter-replikasi metode mana pun; angka kanonik = 114/15 (15 exact dgn artikel). Catatan utk reviewer: metode angka EMA baru = snapshot row tanggal 25 Sep + emaCrossDate in-window 21-25.
- Root-cause tercatat (qa-28-01, diship slot pagi): brief28 jalur growth-mandor bypass worker sanitizer — FIXED pagi: _sanitize_llm() di teknikalid_growth.py insert_article + regex bare-lot 'N lot'→'N saham' (unit test 3/3).
- QA: slot reviewer berikutnya; impact_check_due: 2026-09-29 (brief 29 Sep bebas lot/saam jalur Mandor — sanitizer baru jalan pertama kali).

## [2026-09-28 18:5x] council-2026-09-27-02 — run_ledger.py catch-up mode (file lokal Hermes, 0 deploy website)
- Type: ops (infra monitoring)  |  PRD: - (Sunday Strategy Council 27 Sep)
- Deploy: TIDAK ADA (script ~/.hermes/scripts/run_ledger.py)  |  Rollback: cp run_ledger.py.bak-20260928 run_ledger.py
- Fix: write_ledger() kini menulis per (job_id, date) untuk SEMUA tanggal >= 2026-09-17 (dulu hanya last_run_at hari-ini → job siang/malam tak pernah terekam saat monitor 05:45; CEO Evening 21:00 cuma 1 run dari ~7 hari). Idempotent per pasangan; source='scheduler-catchup'; verify_today() tak diubah.
- Verify: py_compile OK; run-1 catch-up = 19 record; run-2 = 0 baris baru (idempotent PASS); verify mode exit 0 silent. Impact: besok pagi ledger harus memuat run malam ini (CEO Evening 21:00 dst).
- QA: monitor 05:45 besok 'sehat' + ledger berisi run 21:00; impact_check_due: 2026-09-29.

## [2026-09-29 07:2x] qa-reviewer-2026-09-29 — QA 43 artikel + verifikasi deploy + impact checks [read-only, 0 task]
- QA: 43 artikel 24jm — 40 DAILY_SNAPSHOT: harga+pct title/body EXACT vs StockPrice 28 Sep (pct dihitung prev-close; cek 43/43). 2 brief: breadth DB exact (brief29 189/550/127 sesi 28 Sep; brief28 119/582/165 sesi 25 Sep), klaim GOTO diverif exact (50→43 = -14,00%; vol 132,9jt = 13x avg-13-sesi 9,8jt; breadth 550; GC aktif 98 vs DC 52 = snapshot 28 Sep non-gorengan; PTBA cross 23 Sep), lot=0, saam=0. Analisa KLBF: harga Rp720 -2,04% exact, disclaimer ada. SEO: slug kebab 43/43, excerpt terisi, 0 double-brand, link internal /stocks/TICKER.JK kanonik.
- 308 /berita/saham-* → /stocks/<T>.JK = BY DESIGN (proxy.ts snapshot-redirect, DAILY_SNAPSHOT never-linked; konten tetap fresh 28 Sep) — BUKAN regresi; 40/40 halaman tujuan 200.
- Deploy verify: git log 87c0266 (qa-28-01/02 results) = HEAD; live patch D+1 PASS: brief28 (796/221/2.600 'saham', '10 emiten' + list, 0 '0 emiten' real, lot=0), akademi EMA (tabel 383/359/114/15 = field kanonik, rally MDKA 23 Sep, '24 September' tersisa hanya CPIN bearish yang memang 24 Sep = exact DB).
- Impact check due 29 Sep: (1) brief 29 Sep bebas lot/saam via jalur Mandor+sanitizer = PASS; (2) cto-26-01 brief Senin 28 Sep saam=0+lot=0 = PASS (rekap di atas); (3) council-27-02 run_ledger catch-up = PASS (CEO Evening 28 Sep 21:04 + 15 run 29 Sep terekam, source=scheduler-catchup).
- Bookkeeping: qa-2026-09-28-01 & qa-2026-09-28-02 flipped done→qa_pass (qa_verified=true). ADMIN DEBT: 0 (semua entry 28 Sep sudah dibuku, changelog==HEAD). 0 fatal, 0 minor → 0 task P1. Lessons: tidak ada pola fatal berulang (hari ke-3 bebas lot/saam post-guard).

## [2026-10-01 07:35] wid-2026-09-27-1 — Signal discovery chips 'Jelajahi sinyal lain' di /stocks (merge night_ready + deploy)
- Type: feature (PRD spec_ready product-backlog.json wid-2026-09-27-1, CTO Night 30 Sep)  |  Priority: P2
- Deploy: merge --no-ff 1e4d517 (night 185d68e) → build+up 07:35 WIB pre-market  |  Rollback: app image 4de0935e36de + git revert 1e4d517
- Isi: signal-links.tsx baru (46 baris, SSR statis, no query/no gating) + insert page.tsx setelah WeeklySignalWidget. 10 chip → signal pages; hub /saham TIDAK di-link (route 404 — deviation tercatat PRD).
- Verify bukti: tsc exit 0; anon -A Mozilla /stocks: 'Jelajahi sinyal lain' x2 + 10/10 href render + flex-wrap; 5 URL 200 before=after; 3 chip-target spot (pullback-sma20, macd-bullish, blue-chip) 200; widget mingguan utuh.
- QA: slot reviewer berikutnya (curl-level). AC6 baseline gate (spec): signal-pages 7d = 3v; sukses 4 minggu = non-GC/DC page >=5 views/7d ATAU total >=20 views/7d — impact_check_due: 2026-10-28.
- ops-2026-09-30-01 (script-only): verified executed main-agent 07:32 (exit 0 + alert-text; tknkl 7 / hPOS 1 / AegisGo 6 live, 0 stale) — dibuku di sini agar changelog==keadaan.

## [2026-10-01 18:3x] qa-2026-10-01-01 — Superlatif RSI brief30 + disclaimer rekap Sep (SQL content patch, tanpa deploy)
- Type: ops (Content Reviewer QA 1 Okt 07:0x)  |  Priority: P1
- Deploy: TIDAK ADA (ISR revalidate=300, DB patch self-serve)  |  Rollback: n/a (revert SQL via backup /home/oai/share/backups/teknikalid/2026-10-01)
- Isi: (1) brief-pasar-idx-2026-09-30-goto-kapitulasi 'RSI 11,7 (paling ekstrem)' → '(terendah di daftar ini)' — DB 29 Sep RSI<30 non-gorengan: GOTO 0,04/BABP 0,05/REAL 4,10/CPRO 5,03/BSBK 5,13 di bawah BBSI 11,69 (#6); reword minimal-edit akurat utk daftar artikel; (2) rekap-pasar-2026-09-september + disclaimer inline 'bukan rekomendasi' (konsistensi format brief).
- Verify bukti: DB post 'paling ekstrem'=0, reword=1; angka RSI-4 + DSNG -4,15% Rp1.500 + breadth 312/387 + GOTO utuh; LIVE curl anon: brief30 200 (0/x2), rekap 200 (disclaimer x1, 866 x3, movers utuh).
- QA: reviewer slot berikutnya. Root-cause: superlatif pola ke-3 berturut (qa-27-01, qa-30-01, qa-01-01) — rule generator belum tervalidasi di jalur.
- impact_check_due: 2026-10-04 (brief hari-hari berikutnya bebas superlatif tanpa patch manual).

## 2026-10-02 — prd-2026-10-01-03 (Admin Retention Panel, night_ready merge)
- task-id: prd-2026-10-01-03 · type: feature · PRD: idea-2026-10-01-1
- deploy: merge 4153671 (night 8b5a062) + efad7a8 + dbf2367 → image 0047de90a08b (07:40 WIB, 1/1 deploy)
- verify: 5/5 URL 200 before=after; /admin/retention 307 auth-gate; anon /api 404 == pola funnel; tsc via clean docker BUILD-3; selftest 11/11 + parity SQL (night)
- QA: reviewer slot berikutnya (D+1 live admin panel)
- impact_check_due: 2026-10-05
- INSIDEN: main tidak-bisa-clean-build sejak Aug-4 drift (reviewedBy/WaveAssignment tidak pernah di-commit) — ditutup dbf2367 schema-sync ke DB live; dead scripts di-dockerignore efad7a8. deploy berikutnya mungkin cache-miss lagi → normal.
