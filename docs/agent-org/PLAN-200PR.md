# PLAN 200-PR — teknikal.id (owner directive 1 Nov 2026)

> Target: **200 PR/minggu · bug ratio <5–10% · agent saling komunikasi (tidak saling menimpa) · linter wajib**
> Status: APPROVED owner 1 Nov ("Kamu plan dulu... Pokoknya 200 pr/minggu")
> Sumber: 4 audit 1 Nov (bug-vs-feature, sdlc-gate, load-roi, agy second-opinion) di `docs/agent-org/audits/`

## Prinsip dasar (dari data, bukan opini)

Volume naik 12→85 task/minggu membawa bug dari 9%→20%. Kenaikan volume TANPA intervensi = bug ikut naik. Jadi: **densitas defect harus turun dulu di volume rendah, baru volume dinaikkan bertahap.** Ramp: 20 → 40 → 80 → 160 → 200 PR/minggu, tiap step butuh 2 minggu bug ratio <10% (amenstik jika 3 hari berturut <5%).

## Fase 0 — Fondasi (HARI INI, 1 Nov, sebelum 21:00)

### F0.1 KERETA BULANAN 200-PR (jadwal kerja baru)
- Kereta `T-1101-M` → `T-1130-M` (30 kereta bulan Nov, 1/malam): cap **40 PR/malam** (mix fitur + fix + konten), ALL-CLEAR `04:30`.
- Cap harian divisikan otomatis: kalau queue pending >50 → malam itu cap konten/fix, bukan fitur baru.
- WIP keras: PR yang belum `qa_verified` maks **8 concurrent**; lebih dari itu kereta MALAM ITU stop ambil kargo baru (slot sisa jadi konten/polis).
- Kereta dipimpin night CTO (sudah ada slotnya). tidak ada builder siang baru.

### F0.2 LINTER BLOKING di jalur paling hulu — `sdlc_lint.py` exit≠0 = PR DITOLAK
- Sudah ada (`~/.hermes/scripts/sdlc_lint.py`: ruff/tsc/go-vet). Naikkan jadi BLOCKING dengan hook: `pre-commit` di repo teknikalidnew → `sdlc_lint.py --staged` exit≠0 → commit ditolak.
- Tambah check eksplisit: `git diff --cached` mengandung `console.log`/`debugger`/`.only(` di test / file `*.env*` / `dump*` → tolak.
- Pesan error membawa perbaikan: setiap hit menampilkan perintah fix ("ruff check --fix", "tsc --noEmit").

### F0.3 REPLAY-SQL GATE PRA-PUBLISH (kills bug kelas terbesar: ≥29 task koreksi konten)
- Script deterministik `~/.hermes/scripts/replay_sql_gate.py`:
  1. Parser: artikel draft → ekstrak SEMUA klaim angka (ranking "teratas/#1", jumlah saham, persentase, tanggal) via regex + posisi.
  2. Replay: angka di-query ulang ke DB kanonik (market-snapshot.service = satu pintu).
  3. Verdict: mismatch >toleransi (mis. 2%) = PUBLISH DITOLAK + laporan diff angka.
- Terpasang di 2 titik: (a) jalur generator konten (sebelum INSERT Article), (b) job Content Reviewer 08:40 (re-verify terbitan hari itu).
- Scope versi-1: artikel rekap/mingguan + superlatif ranking (kelas bug terbanyak). Halaman SSR statis menyusul.

### F0.4 SENTINEL — gate QA blocking (PRD → lint → build → QA verdict → deploy)
- Job baru `QA Sentinel (teknikal)` id `sentinel-2200`, expr `0 22 * * *` (slot 22:00 kosong, hanya PRD Night Buffer 22:00 → geser PRD buffer ke 22:30).
- Mandat: sweep SEMUA PR yang flip `done` hari itu → jalankan verify ladder (verifier-gate skill) → tulis `qa_verified` di queue. Entry `done` TANPA `qa_verified` >24 jam = **revert-candidate list** utk night CTO.
- Kuota: maks 6 verdict/hari (tiered: FULL utk P0/P1/deploy/SQL, LITE flash utk P3); 429 = `qa_pending` BUKAN auto-pass (fail-open dilarang).
- Pra-deploy sweep (07:15/18:15) bisa jadi fase-2; mulai dari 22:00 dulu (post-day sweep, murah, sudah memotong 19% bypass).

### F0.5 KOMUNIKASI ANTAR-AGENT (anti saling-menimpa)
- **Single-writer state**: SEMUA tulis queue/backlog lewat `statejson.py` (sudah ada: flock + optimistic concurrency + auto-backup). Patch semua job yang masih load/dump manual.
- **Broadcast log**: file `~/.hermes/data/teknikalid-growth/agent-bus.md` (append-only):
  - Format baris: `2026-11-01T22:03 | CTO | DEPLOY image=abc123 scope=stock-page | baseline=commit^`
  - SEMUA agent WAJIB baca 30 baris terakhir sebelum mulai shift (inject di prompt: "BUS: tail -30 agent-bus.md dulu") dan WAJIB append saat: deploy, image rebuild, schema change, branch merge, file state ditulis, bug P0/P1 ditemukan.
  - Ini menutup bug "deploy menimpa main", "worker image basi", "dua writer menimpa".
- **Rebuild atomik**: patch prompt night-builder — `docker compose build app worker` SATU perintah (never app-only). verify image CreatedAt app==worker.
- **Slot de-collision** (akar 429 31 Okt): CEO Daily 08:35→06:50, Researcher 08:30→10:05, Content Reviewer 08:40→07:05, IG Pagi 08:25→07:10, Briefing 08:20→06:40, Analis Sore 16:45→18:35, Broadcaster 17:45→21:10, Threads 12:10→10:15, Sosmed Brain `5 7-21`→`5 7-10,18-20`, hapus Builder siang 09:30 (20% terpakai), Idea Miner gabung ke Mandor.

## Fase 1 — Stabilisasi (minggu 1–2: 3–8 Nov) @ 40 PR/malam

- Ukur tiap pagi (script `board_metrics.py`, no_agent 06:45): PR merged, bug ratio 7-hari, qa_verified coverage, bypass count.
- Kalau bug ratio 7-hari <10% selama 2 minggu → naik Fase 2. Kalau >10% → WIP turun 20→30/malam.
- SENTINEL catch-up: 41 entry historis tanpa qa_verified → sweep batch 10/malam sampai habis (≤5 malam).
- Rekap mingguan ke owner tiap Senin (blok MEASUREMENT, angka DB).

## Fase 2 — Akselerasi (minggu 3–4: 9–15 Nov) @ 80 PR/malam

- Parallel lanes: fitur (2 builder malam) + konten SEO (generator + replay-SQL gate) + fix-lane (agy-flash worker mode: bug <P1 kuhandelkan ke agy, aku verify).
- E2E smoke jalur-lama via CDP (setUserAgentOverride anti-bot-filter) untuk fitur yang menyentuh UI publik — wajib sebelum promote.
- Soak: fitur non-kritis nginap staging 1 siklus market (deploy window 22:00–01:30 tetap satu-satunya jalur prod).

## Fase 3 — 200 PR/minggu (minggu 5+: 16 Nov+) @ 160→200 PR/minggu

- Syarat naik: bug ratio 7-hari <10% stabil + qa_verified coverage >95% + 0 bypass 7 hari.
- Komposisi 200: ±100 konten SEO (replay-SQL gate + tickerTag wajib) + ±60 fitur/fix kecil + ±40 chore/refactor/doc (linter-enforced).
- Kapasitas fixing: agy-flash pool 5-jam (regen cepat, Rp0) — flash utk fix kecil, aku utk fix berat + verify semua.
- Kill-switch: bug ratio >15% mingguan → otomatis turun 1 step ramp + freeze konten generator 24 jam.

## KPI dashboard ( Owner Digest Senin)

- PR/minggu (git log count) · bug ratio 7-hari · qa_verified coverage · bypass count · deploy atomik rate (app==worker CreatedAt) · angka konten: artikel terbit vs ditolak replay-gate · agy runs & kuota.

## Roles of record

- Mandor/planner: agent utama (aku). Eksekusi malam: night CTO + builders (Z.ai). Fix murah: agy-flash. Verify: aku + SENTINEL. Owner: approval gate Fase naik/turun + P0 domain (auth/payments/security).
# lint test
