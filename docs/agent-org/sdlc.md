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
