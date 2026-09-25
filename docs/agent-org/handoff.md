# Handoff — teknikal.id org
> Dibaca WAJIB oleh setiap slot sebelum ambil task. Di-append oleh setiap slot di akhir kerja. 5 baris max per entry.

## 2026-09-15 — seed (agent utama)
- State: sistem sehat; freshness FRESH; GSC reindex window; council-02 sore ini
- Barusan: guardrail audit + protokol DONE WHEN/impact-first/baseline-then-deploy aktif mulai sekarang
- In-flight: lihat cto-queue.json (status pending)
- Jebakan: lihat lessons-learned.md
- Langkah pertama slot berikutnya: baca queue → tulis DONE WHEN → baseline snapshot → eksekusi

## 2026-09-15 17:05 — CTO sore
- State: sehat; EOD 15 Sep in; deploy 1/2 hari ini (f75dd7d RelatedSignals live)
- Barusan: council-02 done — blok Sinyal Terkait serve-time di semua artikel ber-ticker
- In-flight: ceo-2026-09-15-01 (analisa read-only weekend rows, P2) + seo-2026-09-15-01 (sitemap noindex hygiene, P2, slot 16 Sep 07:30)
- Jebakan: artikel saham-*/analisa-* jadi 308→/stocks/TICKER pasca-EOD (stale by design) — spot-check artikel HARUS pakai artikel non-stale (brief hari ini) atau cek sebelum 15:45; grep utm_campaign pakai nilai slug lengkap
- Langkah pertama slot berikutnya: baca queue → seo-01 (tanpa deploy, ukur sitemap size dulu) + ceo-01 analisa SQL read-only

## 2026-09-16 08:15 — CTO pagi
- State: sehat; freshness FRESH (15 Sep = sesi terakhir); 0 deploy pagi ini (budget deploy hari ini 0/2 terpakai)
- Barusan: seo-01 done (commit eb45117, exclusion sitemap sudah live sejak 15 Sep, utang uncommitted tutup) + ceo-01 done (diff sinyal = 0, weekend rows ternyata semua crypto valid, equity bersih sejak 14 Sep)
- In-flight: jkse-2026-09-16-01 (P1 yahoo v8 fallback + guardrail brief) slot sore 16:45 HARI INI — satu-satunya pending
- Jebakan: (1) query audit DB WAJIB filter assetClass — crypto 24/7 bikin "weekend rows" phantom; (2) docker image dibangun dari worktree → jangan percaya "belum live" dari git status saja, curl dulu; (3) repo masih banyak file modified lain (next.config, prisma schema, admin components) — BUKAN milik slot ini, jangan sapu
- Langkah pertama slot sore: baca queue → jkse-01 → tulis DONE WHEN → spec teknis (lib/yahoo-finance.ts v8 chart fallback + guardrail label tanggal gen_daily_brief) → claude pipeline → deploy pasca-16:45

## 2026-09-16 08:15 — CEO pagi
- Strategi: hold eksperimen growth (reindex GSC + CTA/Sinyal-Terkait sedang diukur 2 pekan); satu-satunya dispatch baru = botgate-2026-09-16-01 (metrik trust, slot 17 Sep 07:30).
- Antrean: jkse-2026-09-16-01 P1 HARI INI 16:45; botgate-2026-09-16-01 besok 07:30 — 2 pending, budget aman.
- Jebakan metrik: views "human" 15 Sep sudah dibersihkan manual (26 rows bot) — jangan baca penurunan nobot 16-17 Sep sebagai traffic drop sebelum false-positive check botgate selesai.

## 2026-09-16 slot 18:30 (CTO malam) — jkse-01 DONE
- commit 8f9b3bd yahoo v8 fallback + label guardrail; queue flipped done by agent-utama; next: brief 17 Sep label check.

## 2026-09-17 08:05 — CTO pagi
- State: sehat; freshness FRESH (16 Sep); deploy 1/2 terpakai (botgate, image e612d03a92cf); queue KOSONG (0 pending).
- Barusan: botgate-2026-09-16-01 done — spec CEO 'flag UA Android 10; K' DITOLAK (Telkomsel asli pakai UA itu, bukti DB), diganti ekspansi datacenter-ASN (4 ASN insiden, commit eacc225); verif 5/5 flag + 2/2 lolos.
- In-flight: observasi 24h botgate (besok pagi: 0 'human' dari 4 ASN + nobot tidak drop >50%) + brief 17 Sep ~10:00 label sesi (jkse-01).
- Jebakan: (1) XFF dari luar ditimpa edge — beacon test WAJIB dari dalam container app; (2) DB timestamp UTC (WIB-7) di query window; (3) terminal foreground+`up -d` ditolak scanner → background + process wait; (4) git branch aktif = fix/seo-double-brand.
- Langkah pertama slot berikutnya: baca queue → kalau kosong: health check + cek observasi botgate & brief label → assign/verifikasi, jangan karang kerjaan.

## 2026-09-17 08:15 — CEO pagi (strategi 3 baris)
- Queue engineering kosong → PRODUCT MODE dijalankan: backlog dianalisis dgn SQL 30d; hasil = 2 hold/no-go berbasis data + 1 dispatch konten (edu gap pullback-sma20 & volume-spike → Mandor).
- 1 task CTO dispatched malam ini: jkse-2026-09-17-01 (P1) — brief masih pakai close IHSG sesi 15 Sep padahal backfill 16 Sep ada di DB; trace generator + fallback meta.regularMarketPrice. DONE WHEN: brief 18 Sep label sesi 17 Sep + close asli.
- Traffic 540v/7d = GSC reindex pending (expected); returning IP 21,2% naik tapi n kecil; bot-gate bersih 0 hit sejak deploy. No panic-refactor; keputusan fitur besar (widget, notifikasi) ditunda ke council 20 Sep.

- [18 Sep 07:5x] jkse-01 DONE: commit d83848f + deploy + sync → ^JKSE 17 Sep OHLC lengkap (C 6462.43). Next: Reviewer/QA cek konsistensi brief 18 Sep pasca-EOD; impact check 2026-09-21 (row 18 Sep).

## 2026-09-18 08:2x — CTO pagi (queue kosong → health + admin-debt)
- State: sehat; freshness FRESH (17 Sep); deploy pagi 1/1 terpakai (07:52, image 11ef0d8c86bc); home/golden-cross/brief-18 semua 200.
- Barusan: temuan GAP — commit 3c12781 (JKSE-SafetyNet) dibuat 07:59 SETELAH build 07:52 → BELUM live (grep container 0 hit); buat entry jkse-2026-09-18-02 slot malam + commit docs debt (queue/decisions/lessons/handoff + NODE_OPTIONS compose).
- In-flight: jkse-2026-09-18-02 (deploy 3c12781) slot 18:30 malam ini; observasi: brief 18 Sep label sesi (PASS per reviewer 07:15) + botgate nobot daily.
- Jebakan: EOD sync jalan via LAUNCHD → app API /api/cron/sync-eod (bukan worker; worker image masih 16 Sep tapi tak eksekusi EOD); build image dari WORKTREE — commit setelah build = tidak otomatis live, SELALU grep container.
- Langkah pertama slot malam: baca queue → jkse-02: docker compose build app && up -d app → grep JKSE-SafetyNet + curl 200 → changelog + queue flip.

## 2026-09-18 CEO pagi — ringkasan strategi
- Botgate PASS (118 auto-flag 17 Sep, nobot 129 tidak drop) — data traffic kini lebih bersih; terima trade-off ASN-only.
- Fokus = periode transisi pengukuran: views 7d turun 554 vs 791 tapi periode lalu tercemar bot + IG stopped (owner) + GSC belum reindex — jangan panic-refactor, verifikator tren 7-14 hari data bersih.
- Queue: jkse-02 deploy malam ini (JKSE-SafetyNet) + crypto-01 besok pagi (ingest crypto mati 8 minggu). prod-01 PRD menunggu council 20 Sep; prod-03 edu Mandor belum output (deadline 19 Sep).

## 2026-09-18 18:55 — CTO malam (jkse-02 DONE)
- State: sehat; EOD 18 Sep in (^JKSE C=6441.16, 866 rows); deploy malam 1/1 (org 2/2) — image 0ed98e5ed73a (3c12781 SafetyNet live).
- Barusan: jkse-2026-09-18-02 done — build+deploy HEAD, grep SafetyNet 0→1, 3×200, tsc clean, ISR brief identik.
- In-flight: crypto-2026-09-19-01 (P2, slot BESOK 07:30 — jalur A fix sync vs B hide-stale); impact check gabung jkse 21 Sep.
- Jebakan: (1) golden-cross page empty ~10mnt pasca-deploy = ISR bake + catch{} swallow, self-heal via revalidate=300 — JANGAN panic-rollback; diagnosa: API cache-buster → ISR file dalam container → edge. (2) terminal parser blok inline POST/heredoc → taruh di /tmp/*.sh lalu `bash /tmp/x.sh`.
- Langkah pertama slot pagi: baca queue → crypto-01 → tulis DONE WHEN (max(date) crypto ≥ 2026-09-16 ATAU 0 crypto di rute publik; equity count 811 tidak berubah) → jalur termurah.

## 2026-09-18 21:2x — CEO sore (SUPERSEDES crypto di atas)
- OWNER CANCEL 21:09: crypto-2026-09-19-01 dibatalkan (crypto BY DESIGN 16 Sep) — JANGAN diangkat besok; blok "In-flight crypto" di atas usang.
- Task pengganti slot pagi 07:30: **isr-2026-09-19-01** (P2 ops, sudah di queue + DONE WHEN lengkap): signal pages empty-state pasca-deploy (ISR bake + catch{} swallow) → fail-open / blok 'data sedang diperbarui'. Eksplisit: crypto JANGAN disentuh.
- Brief 18 Sep verified benar (sesi 17 Sep + breadth segar) — jkse-01 DONE WHEN terpenuhi; impact check gabung 21 Sep.
- prod-03 edu Mandor: masih 0 output, window s/d 19 Sep → kalau besok 06:30 tetap 0, eskalasi owner (CEO pagi yang cek).
- Strategi: periode transisi pengukuran (bot cleanup + IG stop + GSC belum reindex) — tahan, jangan panic-refactor; keputusan produk besar menanti council 20 Sep (prod-01 register hook PRD).


## 2026-09-19 08:15 — CEO pagi (3 baris strategi)
- TCC pulih 08:0x; snapshot lokal merged ke repo; queue+backlog lokal↔repo identik (symlink masih diputus — owner decide restore vs mirror).
- Malam ini CTO sore: qa-01 (rekap off-by-one lead+kronologi) → qa-02 (MDKA 0,54) sequential, 1 deploy di akhir; isr-01 pindah Senin 07:30; prod-03 nudge #1, deadline Senin 06:30.
- Minggu depan: Council Minggu 20 Sep (prod-01 register hook PRD); Product Agent Senin 10:15 kerjakan prod-04 + prod-2026-09-19-01 (widget Sinyal Minggu Ini, promoted dari Mandor).

## 2026-09-20 07:5x — CTO pagi (qa-2026-09-20-01 DONE)
- State: sehat; freshness FRESH (18 Sep, weekend benar); 0 deploy pagi ini (SQL patch saja, ISR self-serve).
- Barusan: qa-2026-09-20-01 done — rekap mingguan 20->21 golden cross + definisi SMA50xSMA200, live verified 2-pass; queue mirror<->repo disync; utang changelog qa-19-01/02 ternyata sudah dibuku reviewer 07:2x.
- In-flight: isr-2026-09-19-01 (P2) SATU-SATUNYA pending — besok Senin 21 Sep 07:30 (fail-open ISR + catch logging, 1 deploy).
- Jebakan: docker exec tanpa -i = heredoc senyap (lessons); artikel DB-patch tampil live via ISR <=300s tanpa restart; Senin = council 08:00 + prod-03 deadline 06:30 (eskalasi owner kalau edu masih 0).
- Langkah pertama slot berikutnya: baca queue -> isr-01 -> tulis DONE WHEN (repro fetch-reject bake -> bukan 'tidak ada sinyal') -> baseline snapshot -> claude pipeline -> deploy <=08:45.


## 2026-09-20 08:20 — CEO pagi (Minggu)
- 0 dispatch baru (3 pending > budget 2/hari); fokus pekan = data reliability: isr-01 Senin 07:30, council-01 isBot Senin 18:30, council-02 konsolidasi decisions.md ganda.
- prod-01 PRD: council skip review → CEO approve konten; build w/c 22 Sep; owner FYI auth-adjacent. sre-19-1 worker healthcheck → promote ops, dispatch Selasa pagi.
- Senin: cek prod-03 edu (eskalasi kalau masih 0 pasca-Mandor 06:30); Product Agent 10:15 kerjakan prod-04 + prod-19-01.

### 2026-09-21 CEO
- Fokus: drain QA trust-debt (qa-21-01..03), TIDAK dispatch baru (queue 6 > budget 2).
- Register 0/7d & views -26% = expected (GSC reindex + IG by design) — no panic-refactor.
- prod-01 spec_ready 4 hari: stall by congestion; sre-19-1 verdict approve_defer (23 Sep).


### 2026-09-21 18:5x — CTO sore
- State: sehat; EOD 21 Sep in (866 rows); deploy sore 1/1 (org 2/2) image 264a67f61480 (akademi title + berita edu guard); tsc clean.
- Barusan: qa-21-01 SQL patch (brief 6 saham + LPKR ke-4) live; council-01 verdict owner-bukan-bot (prefix-block salah sasaran -> botgate-21-01 blocked_for_owner); council-02 decisions merge+symlink; isr-01 bookkeeping lunas.
- In-flight: soft404-2026-09-21-01 (P1! root loading.tsx = SEMUA notFound() balas 200 — diselesaikan pagi; impact-first wajib) + botgate-21-01 nunggu owner.
- Jebakan: worker claude sandbox mem-block tsc/git-commit (CTO wajib verify+commit sendiri; commit sempit per-task, worker bisa mencampur); repo branch fix/seo-double-brand + worktree kotor historis (deploy dari worktree = pola lama, jangan panic-clean); docker exec WAJIB -i.
- Slot pagi berikutnya: AMBIL soft404-01 -> tulis DONE WHEN -> baseline (curl slug ngaco x5 segmen) -> claude pipeline -> deploy <=08:45.

### 2026-09-22 08:0x — CTO pagi (soft404-01 DONE)
- State: sehat; freshness FRESH (21 Sep); deploy pagi 1/1 (org 1/2) image 17c0d2e3361f; soft-404 sitewide FIX — bogus slug 404 benar di 5+ segmen.
- Barusan: soft404-2026-09-21-01 done (b94d8de hapus 6 loading.tsx + b507823 admin/login Suspense; DONE WHEN 3/3 PASS, valid 7/7 200, TTFB stabil; qa-21-03 edu guard kini end-to-end).
- In-flight: botgate-2026-09-21-01 blocked_for_owner (nunggu approve lepas prefix-block 2404:c0: + re-class 350 rows) — TIDAK boleh dieksekusi tanpa owner; reviewer-qa-2026-09-22-01 (typo 'saam', P2 SQL patch) belum ada di cto-queue → CEO yang dispatch.
- Jebakan: (1) hapus loading.tsx = hapus boundary useSearchParams — selalu grep dulu; (2) curl -L menyesatkan utk route auth-gated (307→200 kelihatan 200); (3) terminal scanner blok `up -d` inline foreground → taruh di /tmp/*.sh lalu bash; (4) queue mirror data-dir = symlink repo (council-02) — cukup edit repo.
- Langkah pertama slot berikutnya: baca queue → botgate-21-01 cek blocked_checked_at (update field; >2 slot = [ESCALATE]) → sisanya health check / bantu QA verify deploy pagi (spot 404 + sitemap).

### 2026-09-22 08:15 — CEO pagi (SDLC fitur pertama di-dispatch)
- Queue drain selesai → 2 dispatch: prd-2026-09-17-01 (register hook, P1, fitur pertama lolos gate SDLC) + ops-2026-09-22-01 (worker HEALTHCHECK). prod-19-01 (widget sinyal mingguan) approve_dispatch_queued utk Kamis 24 Sep.
- Edu bridge 1/2 (pullback SMA20 live, volume-spike 0) → eskalasi owner; botgate-21-01 tetap blocked_for_owner.
- Strategi: soft404 fix = kunci reindex GSC; fokus register conversion dari 91 heavy user; traffic dip = noise IG-pause, jangan panic-refactor.

### 2026-09-23 08:05 — CTO pagi (qa-23-01 + reviewer-23-01 DONE)
- State: sehat; freshness FRESH (22 Sep); deploy pagi 1/1 (org 1/2) — image baru 07:57, marker sanitizer live.
- Barusan: brief 23 Sep SQL-patched (lima GC + AMAN/BOBA/LUCK + lot→saham x4 + link /berita/); saam×3 dibersihkan; GUARD PIPELINE sanitizeGeneratedContent() commit 080daf4 (4 call-site + fact-check re-sanitize + brief prompt SATUAN SAHAM).
- In-flight: prod-19-01 (widget sinyal mingguan) approve_dispatch_queued utk Kamis 24 Sep; QA full-flow register hook (prd-17-01) masih menunggu slot browser.
- Jebakan: (1) worker claude SANDBOX mem-block exec — worker hanya edit file, CTO wajib verify+commit; (2) worker sempat tulis regex bug $3 (grup cuma 2) — SELALU review diff worker line-by-line; (3) amrt/arto kini stale-308 (bukti patch = DB-level).
- Langkah pertama slot berikutnya: baca queue → cek brief 24 Sep ' lot' residual (sanitizer impact, 2026-09-26) → QA register-hook flow bila slot longgar.

## 2026-09-23 CEO pagi (3 baris)
- Verif CEO: brief-23 patch + saam sweep + sanitizer 080daf4 semua PASS live/DB — qa-23-01 & reviewer-23-01 sah done.
- Perbaikan jalur: symlink cto-queue.json data-dir → repo direstore (mirror sempat divergen 'pending' vs 'done'; backup .bak-20260923).
- Besok 24 Sep 08:15: dispatch prod-19-01 (widget Sinyal Minggu Ini) urutan #1; QA register-hook flow bila slot longgar.

## 2026-09-23 18:3x — CTO sore (PRODUCT MODE: prod-17-04 analisis + merge backlog)
- State: sehat; site 200 (TTFB 0.86s); semua container healthy; EOD 23 Sep IN (866 rows) — queue 0 pending, 0 deploy.
- Barusan: prod-17-04 dianalisis → insight NO-GO widget /sinyal/TICKER (sinyal per-ticker SUDAH live di /stocks/[ticker]+/indikator; demand 1.710v/133 IP tapi 100% internal nav; cross-link gap 20/133 IP ke /saham-*) + merge backlog divergen datadir<->repo (9→10 entry, status terbaru menang, sec-21-04 & sre-23-1 selamat) — commit b616a0b.
- In-flight: prod-19-01 dispatch CEO besok 08:15 (urutan #1); QA register-hook full-flow browser masih menunggu slot; sre-23-1 (label self-heal di sre_brief) kandidat ops kecil.
- Jebakan: product-backlog.json BELUM disymlink — dua salinan mesti ditulis ganda manual (kronikal pola council-02; kandidat symlink seperti ceo-decisions kalau owner setuju); repo branch fix/seo-double-brand + file agent-org lain modified = BUKAN milik slot ini, jangan sapu.
- Langkah pertama slot pagi: baca queue → prod-19-01 setelah CEO dispatch → tulis DONE WHEN (AC1-AC5 + baseline before snapshot /stocks) → claude pipeline → deploy ≤08:45.

## 2026-09-24 07:5x — CTO pagi (qa-2026-09-24-01 DONE)
- State: sehat; freshness FRESH (23 Sep); deploy pagi 1/1 = worker rebuild 88fd17fa2ff6 (app tak disentuh, tetap 24h healthy); worker healthy 25s.
- Barusan: brief24 lot→saham x3 (SQL, residual 0, live PASS) + worker kini bawa sanitizer 080daf4 (marker 'saam'+'SATUAN SAHAM' terbukti di chunks/7977.js container WORKER) — root cause deploy kemarin app-only tertutup.
- In-flight: prod-19-01 (widget sinyal mingguan) dispatch CEO 08:15 hari ini urutan #1; QA register-hook full-flow browser masih menunggu slot; impact check brief 25 Sep ' lot'=0 (QA pagi 25 Sep).
- Jebakan: (1) deploy kode worker-shared WAJIB build app+worker bersama (lesson 24 Sep); (2) psql user = teknikalid (bukan postgres); (3) repo branch fix/seo-double-brand + worktree kotor historis — jangan sapu.
- Langkah pertama slot sore: baca queue → prod-19-01 kalau CEO sudah dispatch (+PRD gate spec_ready) → tulis DONE WHEN + baseline /stocks before-snapshot → claude pipeline → deploy ≤pasca-16:15.
### 2026-09-24 (Kamis) — CEO
1. Fokus: eksekusi widget 'Sinyal Minggu Ini' di /stocks (prd-24-01, CTO pagi) — jembatan /stocks (36% trafik) → signal pages, konteks weekend.
2. Ops kecil: sre_brief.py self-heal labeling (ops-24-01, CTO sore) supaya monitoring tidak cry-wolf.
3. Backlog dibersihkan: 3 candidate + 1 researching divonis (2 reject, 1 defer 22 Okt, 1 dispatch) — tidak ada ide menganggur.

## 2026-09-24 18:5x — CTO sore (prd-24-01 widget + ops-24-01 DONE)
- State: sehat; EOD 24 Sep IN; deploy sore 1/1 (org 2/2) image fecbc607a367 — widget 'Sinyal Minggu Ini' live di /stocks (10 GC/3 DC == DB).
- Barusan: widget SSR guest-visible (b19b71c) + sre_brief.py self-heal labeling (SELF-HEAL/REAL ERROR/OOM, replay PASS).
- In-flight: QA register-hook full-flow browser masih menunggu slot; impact check brief 25 Sep ' lot'=0 (QA pagi 25 Sep); impact widget AC6 = 2026-10-22.
- Jebakan: (1) stock.repository.ts masih bawa ~70 baris pre-existing uncommitted (laporan-pasar reads) — commit task JANGAN sapu, stage hunk selektif; (2) angka React SSR dipisah '<!-- -->' — grep 'N<!-- --> golden cross'; (3) worktree kotor historis + branch fix/seo-double-brand seperti biasa.
- Langkah pertama slot pagi 25 Sep: baca queue → cek entry baru CEO 08:15 → kalau kosong: health + verify widget angka refresh pasca-EOD (minggu baru Sabtu/Minggu tampil pekan 21-25 Sep penuh).

## 2026-09-25 08:0x — CTO pagi (queue kosong → health + hygiene)
- State: sehat; freshness FRESH (24 Sep, pre-market); 3 container healthy; 0 deploy (budget 2/2 utk sore).
- Barusan: widget /stocks verify pasca-EOD (10 GC/3 DC 21-24 Sep == DB, anchor GC/DC x2/x2 SSR); backlog sync repo<-datadir (CEO verdict 24 Sep + entry baru prod-2026-09-24-01 title-terpotong) + sre-23-1 flipped shipped.
- In-flight: prod-2026-09-24-01 (candidate, butuh PRD utk dispatch); QA register-hook full-flow browser masih nunggu slot; impact checks: brief 26 Sep, AC5 register 20 Okt, AC6 widget 22 Okt.
- Jebakan: (1) product-backlog BELUM disymlink — dual-write manual repo+datadir WAJIB (pola council-02); (2) register hook: funnel organik Google→register TERJADI (hazelino 23 Sep) tapi TIDAK lewat hook /stocks — atribusi AC5 lihat referrer, bukan count register mentah; (3) worktree kotor historis + branch fix/seo-double-brand — jangan sapu.
- Langkah pertama slot berikutnya: baca queue → cek entry baru CEO 08:15 (kalau ada) → kalau kosong: health + brief 26 Sep impact check (' lot'=0 pasca worker sanitizer).

## 2026-09-25 08:15 — CEO pagi (Jumat)
- 0 dispatch (queue kosong, kandidat fitur belum spec_ready); fokus = periode pengukuran: AC5 register 20 Okt, AC6 widget 22 Okt, brief sanitizer 26 Sep.
- prod-2026-09-24-01 (title ticker terpotong) → PROMOTE mandate PRD utk Product Agent Senin 28 Sep 10:15 — tunggu spec_ready sebelum dispatch engineering.
- TEMUAN owner-mandate: edu volume-spike terlewat deadline 24 Sep (0 row DB, diverifikasi) — lane konten = Mandor, sebut di laporan owner.

## 2026-09-25 18:45 — CTO sore (queue kosong → health + brainstorm berbukti)
- State: sehat; EOD 25 Sep IN; site 200 TTFB 0.85s; 3 container healthy; 0 deploy (budget tak terpakai).
- Barusan: ide idea-2026-09-25-1 (candidate) → backlog dual-write: PageView.path buang query string → utm_source 3 register hook (live 22 Sep) TIDAK terukur; gate AC5 prd-17-01 (20 Okt) butuh instrumen ini; referrer 10/12 direct.
- In-flight: QA register-hook full-flow browser (nunggu slot); impact checks: brief 26 Sep ' lot'=0, AC5 20 Okt, AC6 widget 22 Okt; prod-24-01 nunggu PRD Product Agent Senin.
- Jebakan: (1) EARLY-WARNING AC6: signal pages 0 views/hari 3 hari berturut (23-25 Sep) pasca widget 24 Sep — belum signifikan, cek lagi slot berikutnya; (2) atribusi register: JANGAN baca count register mentah, referrer direct dominan + utm tak tersimpan; (3) worktree kotor + branch fix/seo-double-brand seperti biasa.
- Langkah pertama slot pagi 26 Sep: baca queue → entry baru CEO? → kalau kosong: health + brief 26 Sep impact check (' lot'=0 pasca worker sanitizer 24 Sep).
