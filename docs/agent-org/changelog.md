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
