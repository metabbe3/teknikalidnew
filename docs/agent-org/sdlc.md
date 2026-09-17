# SDLC Agent Org — teknikal.id & hivePOS

> Owner mandate 17 Sep 2026: "Flow: CEO → bisnis → product → CTO spec untuk deployment
> dan requirement sebagai batu pijakan deploy." Satu pipeline, tiap tahap menggerbang
> tahap berikutnya. Tidak ada yang melewati tahap.

## Pipeline

```
CEO              Product Agent           CTO                    Reviewer/QA        Monitor
(strategi bisnis)→(PRD data-first)      →(tech spec + build    →(verify konten/   →(watchdog,
 prioritas WHY/    user story, acceptance   + deploy via            kualitas post-     GSC, backup)
 WHAT, north star   criteria, bukti data    claude code)           deploy)
```

## Kontrak tiap tahap

1. **CEO — bisnis saja.** Tulis prioritas sebagai entry `idea` di product-backlog.json
   (why / untuk siapa / dampak ke north star). CEO TIDAK menulis spec fitur,
   TIDAK menjalankan riset product sendiri.
2. **Product Agent — PRD.** Riset data-first (SQL funnel, returning cohort, competitor,
   GSC demand). Entry naik status `idea → researching → spec_ready` HANYA dengan bukti.
   `spec_ready` wajib: user_story, acceptance_criteria (tertestable), data_evidence
   (angka), impact/effort. PRD = kontrak scope — perubahan balik lewat Product.
3. **CTO — spec & deploy gate.** Task fitur di cto-queue WAJIB merujuk `prd_id`
   spec_ready; tanpa itu = tolak (tandai `blocked: butuh PRD`). Sebelum build, isi
   tech-spec di entry: design, file yang disentuh, DONE WHEN, baseline curl, rollback
   anchor. **Spec = batu pijakan deploy — tidak ada deploy tanpa spec terisi.**
   type=ops (bug produksi, pipeline data, typo) BEBAS langsung tanpa PRD.
4. **Reviewer/QA** — verifikasi post-deploy/konten (teknikal: Reviewer 07:00;
   hivePOS: CTO slot 2 QA fallback).
5. **Monitor** — watchdog, GSC, backup; metrik balik ke CEO (loop).

## Escape hatch (insiden)
P0 bug produksi / data rusak: siapa pun menemukan boleh langsung dispatch CTO dengan
`type=ops`. Retro wajib menulis lesson — tapi tetap TIDAK jadi pintu masuk fitur tanpa PRD.

## Ritme (jadwal nyata)
- teknikal.id: Product Senin+Kamis 10:15 → CEO dispatch pagi berikutnya 08:15 →
  CTO 18:30 build → Reviewer 07:00. Siklus fitur penuh ~2 hari; ops tetap hari yang sama.
- hivePOS: Product Rabu+Sabtu 01:30 (window malam) → Night CEO dispatch 00:30
  berikutnya → CTO slot 01:00/02:30. Siklus fitur 1-2 malam; ops tetap malam itu.


## RACI per tahap (final 17 Sep malam — jawaban audit SDLC)

| Tahap SDLC | teknikal.id | hivePOS | Catatan |
|---|---|---|---|
| Discover (data/sinyal) | Product Agent Sen+Kam 10:15 | Product Agent Rab+Sab 01:30 | tide-first, backlog |
| Define (PRD) | Product Agent | Product Agent | spec_ready = gate fitur |
| Prioritize (bisnis) | CEO pagi 08:15 | Night CEO 00:30 | verdict APPROVE/REJECT/HOLD |
| Design (tech spec) | CTO 07:30/18:30 | CTO slot1 01:00 | spec = batu pijakan deploy |
| Develop | CTO (claude code pipeline) | CTO (claude code pipeline) | type=ops bebas tanpa PRD |
| **QA/Verify deploy** | **Reviewer 07:00 (diperluas: cek deploy semalam)** | **CTO slot2 02:30 (diperluas: QA checklist deploy slot1)** | empat mata: pembangun ≠ pemeriksa |
| **Record (pencatatan)** | CTO append changelog.md + Reviewer flip queue | CTO slot1 append changelog + slot2 flip | changelog.md = sumber kebenaran riwayat |
| Release notes | changelog.md (publik kelak) | changelog.md | format siap jadi release notes |
| Monitor | Watchdog + GSC + Mandor 06:30 | Health monitor + GSC + Watchdog | metrik balik ke CEO |
| Impact verify (H+N) | Sunday Council baca impact_check_due | Evolution 04:00 baca impact_check_due | baru diukur beberapa hari kemudian |
| Retro | Sunday Council 08:00 | Evolution + Council teknikal | lesson → decisions.md |

## Lifecycle status task (standard kedua queue)
`pending → in_progress → deployed → qa_pass → done` (+ `blocked/rejected/superseded`)
- Field wajib saat done: `result` (evidence: commit/image/verify angka), `completed_at`,
  `qa_verified: true/false + oleh siapa`, `deployed_at`, `impact_check_due: YYYY-MM-DD`.
- ADMIN DEBT RULE (pola 2x terjadi): queue flip + commit + changelog WAJIB di slot yang sama
  dengan deploy. Reviewer/CTO-slot2 pagi berikutnya = penagih utang administratif
  (temukan in_progress kemarin → selesaikan bookkeeping-nya, laporkan).

## Konvensi pencatatan (single source of truth)
1. `product-backlog.json` — ide + PRD (Product Agent punya)
2. `cto-queue.json` — task engineering + lifecycle (CEO tulis, CTO jalan, QA flip)
3. `docs/agent-org/changelog.md` — riwayat deploy per task (CTO tulis saat DONE WHEN)
4. `docs/agent-org/decisions.md` — keputusan + lesson (semua agent append)
5. `docs/agent-org/handoff.md` — state antar slot (5 baris per slot)
