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
