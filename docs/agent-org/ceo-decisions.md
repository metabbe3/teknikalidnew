# CEO & Council Decisions (canonical — repo)

## 2026-09-14 07:30 — CTO pagi: council-2026-09-13-01 DONE
- Register CTA live di 3 signal pages (oversold/golden-cross/volume-spike), commit 15c49b8, deploy pre-market + live-check 200/UTM OK. Detail: cto-queue.json result.
- Catatan spec: komponen dibuat SERVER-SIDE (bukan reuse RegisterCtaBar yang useSession/client — SSR-invisible untuk curl & berisiko CLS). IG carousel debut hari ini 17:30 → CTA sempat live sebelum trafik IG datang.
- Freshness gate: skrip bilang STALE (expected 2026-09-11, actual 2026-09-14=hari ini) — false positive logic hari-kerja (Senin: expected harus Jumat, bukan Minggu). Worker/DB healthy, data lebih baru dari ekspektasi. Tidak ada P0.

## 2026-09-15 07:00 — Content Reviewer QA [REVIEWER]
- Scope: 44 artikel 24 jam terakhir (42 harian saham + 2 brief pasar).
- Fact-check close/pct/high-low 40 ticker vs StockPrice: 0 divergensi. Brief (breadth 447/228/190, WINS +12,73%, top movers PTSN/ULTJ/FOLK/EMAS/MDKA, volume bank big cap) = persis DB.
- SEO: 0 double-brand, slug kebab semua, meta ada. Kualitas: disclaimer dirender template (footer + blok DYOR) di semua halaman. Live 42/42 HTTP 200 + render.
- ❌ FATAL sistemik: 40 artikel harian menulis volume "juta lot"; StockPrice.volume = SAHAM → klaim 100x lebih besar. Brief sudah benar ("juta saham"). Task P1 reviewer-2026-09-15-01 ke cto-queue (slot 07:30). Minor: 3 judul terpotong "(Persero (BBNI/BBRI/PGAS)" — pola pemotongan nama emiten di template title.
- Verdict: 2 artikel brief PASS; 42 harian PASS angka, FAIL unit label volume (sistemik, fix via queue).

## 2026-09-19 07:55 WIB — CTO slot pagi 19 Sep: repo TCC-blocked, semua build task GAGAL diakses
- ~/Documents/teknikalidnew UNREADABLE oleh agent sejak hermes 0.21.3 (semua syscall open/stat/git/ls EINTR; ~/.hermes & docker & curl normal). Konsisten dgn protocol-note snapshot queue 07:45.
- isr-2026-09-19-01 → blocked_external + field needs (restore TCC Full Disk Access utk hermes). 2 task QA P1 (qa-2026-09-19-01/02) tetap scheduled 16:45 sore — akan kena block sama kalau TCC belum direstore.
- Health: curl teknikal.id 200 (0.52s), semua container healthy, data FRESH s/d 18 Sep (Jumat; Sabtu libur IDX).
- [ESCALATE] owner: System Settings > Privacy & Security > Full Disk Access / Files & Folders → berikan ke terminal/hermes agent, lalu restart session.

## 2026-09-19 22:5x WIB — OWNER AGENT: hotfix qa-2026-09-19-01 + qa-2026-09-19-02 (darurat weekend, jalur preseden hotfix CEO Evening)
- qa-01 REKAP MINGGUAN (grw26091906339e8ihsnf): kronologi shift mundur 1 hari dikonfirmasi via SQL breadth harian (Sen 228/448 · Sel 324/330 · Rab 210/451 TUGU+12,0 WINS+8,8 · Kam 402/252 rebound bank · Jum 208/460 merah). Fix: lead (Kamis rebound 402, Jumat merah 208/460), 5 bullet kronologi rewrite angka DB, outlook "Rebound Kamis yang pupus di Jumat", excerpt replace. VERIFY live: 401 hilang → 402×13 + 208/460×11.
- qa-02 LISTICLE BM (grw2609190633dj17ysk7): MDKA skor 0,56 → 0,54 (DB StockIndicator.signalScore 18/9 = 0,54 ✓; INCI & BMSR 0,56 TETAP — verified benar). VERIFY live: "Skor 0,54" 2×.
- Cache flush: app container restart (Sabtu malam traffic rendah) — kedua artikel render fresh 200.
- PRASYARAT dipenuhi: backup harian 19 Sep 01:15 (last-success verified) < 24h ✓; SQL UPDATE narrow WHERE by id ✓; preview angka di laporan ✓.
- Root cause QA: writer pakai data Kamis utk narasi Jumat (kronologi off-by-one seragam) — perlu gate generator "breadth query by trade-date" di brief source.

## [2026-09-20 07:2x] [REVIEWER] QA 24 jam + verifikasi deploy semalam
3 artikel 24 jam live 200. Listicle basic materials & akademi pullback: EXACT vs DB (skor/RSI/close/cross-date; qa-19-02 verified). Rekap mingguan: breadth 5/5 hari + 10 movers + proxy BBCA/BBRI + TOWR exact — FATAL-kecil: headline '20 golden cross baru' = snapshot basi s.d. 17 Sep (full-week non-gorengan = 21) + definisi tertulis 'SMA20×SMA50' (salah; harus SMA50×SMA200) -> P1 qa-2026-09-20-01 (SQL content patch, tanpa deploy). ADMIN DEBT DIBAYAR: qa-19-01/02 flip done+qa_verified dari bukti live (dieksekusi CTO 19 Sep sore tanpa buku changelog — diingatkan). Pola mixed-freshness rekap hari ke-2 -> lessons-learned.md.

## [COUNCIL] 2026-09-20 08:05 WIB — Sunday Strategy Council (pekan 14–20 Sep)
DATA (isBot=false): views 385 vs 617 (-38% WoW) · register 0 vs 2 · user baru 1 · returning IP 19,4% (7/36) vs 10%.
- ✅ WORKS: brief dgn judul 1-mover spesifik (Tugu 17/9: 18 views; brief generik 0–3 dua pekan) · /stocks 138 = 36% trafik, halaman inti stabil · evergreen sinyal persisten (pullback-sma20 11, golden-cross 10 views) · CTA register live di signal pages (curl verify 20/9: 2 hit/page).
- ❌ DOESN'T: trafik -38% WoW — base anonim menyusut, bukan failure konten baru · register views 0 (CTA tampil, tak ada klik) · /saham-oversold 21→1.
- ❓ CONFUSING: (1) Selasa 15/9: 168 raw → 4 bersih karena 1 IPv6 (2404:c0::) = 105 views ter-flag bot — mungkin power-user, bukan bot → audit, jangan buru-buru re-class. (2) Klaim Mandor 'sitemap 710 vs 1355 artikel' TIDAK match DB (Article=99, sitemap 713 URL incl. 307 stock pages) → WEEKEND-IDEA widget sinyal = HOLD sampai sumber angka jelas.
- 🛑 STOP: artikel berita generik tanpa hook mover tunggal (0–3 views = noise) · edu tanpa bridge internal-link ke halaman evergreen.
- 🎯 PRIORITAS 21–27 Sep: P1 brief 1-mover+angka tiap hari bursa, terbit ≤08:30 (target median ≥15 views, ≥3 hari). P2 edu 'strategi-pullback-sma20-untuk-pemula' Senin + link ke /saham-pullback-sma20 (target 2 edu ≥5 views + ≥3 internal link). P3 data reliable: ISR fail-open (isr-2026-09-19-01, slot Senin 07:30) + audit isBot (council-01) — target 0 QA FATAL angka salah.
- MANDOR (baca 06:30): pekan depan = brief 1-mover tiap hari bursa + 2 edu bridge; weekend cukup rekap+listicle (terbukti QA-pass); klaim angka WAJIB sitasi query/DB (kasus 1355).
- ⚙️ CTO: +council-2026-09-20-01 (audit isBot IPv6 power-user, slot Senin 18:30) +council-2026-09-20-02 (konsolidasi ceo-decisions.md ganda → repo canonical).
- 🤖 ORG: semua job sehat 19–20 Sep, 0 fail (ledger + watchdog ok); CTO Builder malam & CEO pagi weekday-only by design (next_run Mon ✓, bukan skip); IG carousel paused (owner 17/9); Growth Weekly Retro (Senin 08:00) overlap Council → kandidat merge, keputusan owner.
- utk owner: tidak ada gate owner pekan ini (auth/monetisasi tak tersentuh).

## 2026-09-20 08:20 WIB — CEO pagi (Minggu): verdict backlog, 0 dispatch baru
- RITUAL [PRODUCT]: 0 entry pending (terakhir approve_prd 17 Sep 08:17). CTO queue 3 pending (isr-01, council-01, council-02) > budget 2 aktif/hari → TIDAK dispatch baru (council sudah pakai jatah 2/hari ini).
- prod-2026-09-17-01 (register hook PRD): Council 08:05 SKIP review — CEO review pengganti: PRD konsisten verdict 17 Sep (no gating screener, save-screen intent, scope register-hook only) → APPROVE konten. Build w/c 22 Sep SETELAH data-reliability tasks. FYI owner: sentuh UI flow register (bukan core auth/security), bukan blocked_for_owner.
- sre-2026-09-19-1 (HEALTHCHECK worker): PROMOTE type=ops — data-reliable lensa (worker hang = data basi senyap = trust). Dispatch Selasa 22 Sep pagi setelah isr-01/council-01 clear.
- prod-2026-09-17-03 (2 edu bridge): deadline eskalasi Senin 06:30 pasca-Mandor — tap CEO Senin. prod-04 + prod-19-01 → Product Agent Senin 10:15 (agenda sudah ada; tidak buat mandat baru — dup-check lolos).
- Metrik 7d: register 0 (MATI — masalah value-prop, PRD approved menunggu build); returning IP 17,9% vs ~10% WoW (TUMBUH); traffic clean 385 vs 617 (-38% WoW — base anonim menyusut, verdict council: watch bukan panic-refactor); EOD fresh 18 Sep = benar utk weekend.
- Standing guard: crypto + IG BY DESIGN — tidak disentuh. Repo TCC accessible lagi (CTO 07:41 eksekusi qa-2026-09-20-01 via repo).

[CTO] 2026-09-21 07:4x WIB — slot pagi, START isr-2026-09-19-01 (fail-open signal pages)
- Rollback anchor PRE-DEPLOY: image app 0ed98e5ed73a / commit HEAD fc66967 (worktree kotor file lama milik slot lain — tidak disentuh).
- Plan: helper fetchScreenerRows (retry 1x + error log) + branch `failed` di 9 signal pages; tsc; 1 commit sempit; deploy ≤08:45.
- Baseline: 4 signal pages 200 @30 rows (golden-cross/oversold/volume-spike/pullback-sma20), freshness FRESH (18 Sep, weekend benar).

## 2026-09-21 07:25 WIB — [REVIEWER] QA pagi: 2 FATAL angka-klaim brief 21 Sep + 1 FATAL template title
- QA 2 artikel 24 jam: akademi pullback SMA20 PASS penuh (5/5 tabel + DUTI EXACT vs DB); brief 21 Sep angka inti EXACT (breadth 460/208, 12 harga/%%, RSI 5/5, 90vs76, GC baru 3) TAPI 2 klaim naratif salah vs DB: "7 GC pada Rabu 16/9" (fakta: Rabu=6; 7=Selasa 15/9, brief-16 melaporkan sesi Selasa) dan "LPKR volume terbesar di seluruh papan" (BUMI 3,4M & BRMS 872jt > LPKR 866,9jt; LPKR ke-4). FATAL template: title /akademi/ "Akademi TeknikalID | TeknikalID" double-brand (3 slug). Task: qa-2026-09-21-01 (SQL patch, CTO 07:30), qa-2026-09-21-02 (template fix, deploy), qa-2026-09-21-03 P2 (soft-dup /berita/ edu hari ke-2). Utang dibuku: qa-2026-09-20-01 qa_verified + jkse-2026-09-17-01 impact-check ✓ (^JKSE 18 Sep lengkap). READ-ONLY dikepati — tidak ada edit artikel/DB langsung.

## 2026-09-21 (CEO pagi, Senin)
- 2026-09-21 | NO DISPATCH hari ini | CTO queue 6 pending (isr-01 P2 umur 3 hari, council-20-01/02, qa-21-01..03) vs budget 2 aktif/hari; QA-01/02 (P1) = trust-debt konten paling tajam | verify: laporan CTO slot 09:30/14:30 + CEO malam
- 2026-09-21 | Prioritas CTO hari ini: qa-2026-09-21-01 lalu qa-2026-09-21-02 | brief 21 Sep 2 klaim naratif salah vs DB (trust) + <title> akademi salah brand; isr-01 menyusul | verify: diff konten vs DB post-fix
- 2026-09-21 | BACKLOG audit: verdict sre-2026-09-19-1 SUDAH ADA 20 Sep (promote_ops, dispatch Selasa 22 Sep setelah isr-01+council-01 clear) — konfirmasi konsisten, no overwrite | verify: backlog entry ceo_verdict utuh
- 2026-09-21 | [ESCALATE-ringan] prod-2026-09-17-01 spec_ready 4 hari (rule >3 hari) | stall = queue congestion (QA debt), BUKAN Product stall — owner perlu tahu, no action wajib; dispatch prod-01 begi queue < 2 | verify: queue drain
- RITUAL [PRODUCT]: 0 entry pending (terakhir approve_prd 17 Sep). Metric 7d: views 457 (-26% w/w, expected: GSC reindex pending + IG pause by design), register_views 0 vs baseline 9, returning IP 19.5%, signal pages 33v. EOD fresh (Jum 18/9 = sesi terakhir). Traffic dip = NOISE jangan panic-refactor.
