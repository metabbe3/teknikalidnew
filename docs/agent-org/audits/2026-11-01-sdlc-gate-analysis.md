# Audit SDLC Gate teknikal.id — 2026-11-01

**Pemicu:** keluhan owner — "right now its mostly fixing bugs? not shipping features with less bugs?" (~50%+ task minggu terakhir = bugfix).
**Sumber:** skill verifier-gate + code-review, decisions.md (872 baris, tail 400), ~/.hermes/cron/jobs.json (123 job), changelog.md (1009 baris), cto-queue.json (217 entry).

---

## (a) Gate yang ada sekarang & titik bug lolos

### Gate aktif (inventaris)

| # | Gate | Waktu/Mekanisme | Sifat |
|---|------|-----------------|-------|
| 1 | `sdlc_lint.py` (Tahap-0) | ruff/go-vet/tsc/json, 0 token, sebelum LLM verifier (owner 4 Okt) | Pre-DONE, deterministik |
| 2 | `verify.py` LLM verifier (GLM z.ai) | tiered FULL/LITE, lint-first, ladder revisi maks 2× (aktif 28 Sep) | Pre-DONE, klaim-konsistensi |
| 3 | Stop-gate deterministik (24 Okt) | lint merah = DONE ditolak; bukti fisik fresh (curl/grep/SQL) wajib sebelum tulis DONE | Pre-DONE, blocking |
| 4 | GateGuard pre-flight di `claude_gated.sh` | max 2 run, exit 3 = fallback manual CTO | Pre-build |
| 5 | Hard-gate 21:45–07:00 | hook shell tolak push/merge ke main | Struktural |
| 6 | Schema-shield | 0 file migrations/prisma/sql di --cached saat merge | Pre-merge |
| 7 | Researcher gate 08:30 (pra-backlog) | job cron `teknikalid researcher` | Pre-backlog |
| 8 | **QA Verifier Gate (dual-org)** | cron 03:30 harian, read-only, verdict `qa_verified` di cto-queue | **Post-deploy, 1×/hari** |
| 9 | Content Reviewer 08:40 | QA konten: angka vs DB, superlatif rank-cek, live curl | **Post-publish** (artikel terbit 06:30) |
| 10 | Data Integrity Watchdog 07:00 + Midday 10:30 (weekday) | script deterministik no-agent | Data |
| 11 | Watchdog 502 (*/5) + teknikalid (*/15) | script | Infra |
| 12 | Rollback anchor + BASELINE-THEN-DEPLOY | dicatat tiap deploy di decisions | Mitigasi |
| 13 | Kereta malam (T-10xx-N, 22:00–01:30) | window deploy terpusat | Struktural |

**Yang TIDAK ada sebagai gate:** E2E browser otomatis (Playwright) di jalur deploy — verifikasi interaktif manual saja, dan browser harness HeadlessChrome justru ter-filter bot (perlu CDP setUserAgentOverride, decisions 10 Okt). Skill `code-review` (two-axis Standards/Spec) ter-install tapi **tidak dipakai di jalur SDLC manapun** (tidak ada di prompt job manapun).

### Titik bug lolos (4 celah)

1. **Jalur owner-direct / main-agent bypass queue.** 8 marker sejak 11 Okt ("OWNER dispatch", "owner-directed", deploy tak-tercatat, bookkeeping gap). Bukti: 12 Okt 3 fitur kompetitor deploy 09:0x → 20 menit kemudian fix FATAL RSI/MACD "Value is null" (bug LATEN panel lama, dibuka jalur preset baru, crash 100%); 19 Okt insiden P3009 = 4 deploy + ±15 mnt downtime (migration Prisma invalid 2×); 27–28 Okt deploy sore tak-tercatat + straggler worktree tak-ter-commit. Jalur ini tidak lewat queue → tidak pernah dapat `qa_verified`.
2. **Gate QA post-hoc, bukan blocking.** QA Verifier jalan 03:30 (sekali/hari); deploy terjadi 07:30/16:45/weekend/malam → verifikasi telat sampai 20 jam. **57 entry sejak 12 Okt** (sejak gate aktif) ber-status done/deployed **tanpa** `qa_verified=True`; total 82 dari 217 sepanjang queue (108 True, 103 None, 3 False). Verifier juga **fail-open** (error/timeout → lanjut tanpa blokir) dan job QA kena HTTP 429 kuota z.ai (Content Reviewer 31 Okt, dsb) → jendela tanpa QA sama sekali.
3. **Bug konten tertangkap SETELAH publish.** Pola superlatif/salah-hari/cross-date/satuan berulang **8×** sejak 19 Sep (qa-19-01 → qa-11-01) karena guard ranking hanya ada di jalur worker; jalur python-growth (Mandor) "masih polos" (keputusan 23 Okt) — dan root-cause generator yang sama ditemukan berulang 30 Sep, 1 Okt, 11 Okt tanpa guard pre-publish. QA konten 08:40 = bug publik hidup ≥2 jam.
4. **Tidak ada regression test jalur-lama saat fitur baru.** Kasus RSI/MACD: "fitur baru yang membuka jalur UI lama = test jalur itu juga" (lesson 12 Okt) — tapi tidak ada gate yang mengeksekusinya; hanya catatan.

## (b) Task deploy TANPA QA pass

- **57 entry** done/deployed sejak 12 Okt (era gate QA 03:30) tanpa `qa_verified=True` — 26% dari 217 total; konsisten tiap minggu (16 Okt: 5; 20 Okt: 7; 26 Okt: 4; 29–30 Okt: 15).
- **Total sepanjang queue: 82 tanpa verdict** (103 None termasuk superseded/pending).
- Pattern 'deploy langsung'/'owner direct' di decisions: **8 insiden** sejak 11 Okt — 2 owner-dispatch eksplisit, 2 eksekusi main-agent direct (SQL patch tanpa entry), 1 deploy tak-tercatat oleh sesi lain (27 Okt), 3 bookkeeping/straggler gap.

## (c) Agent QA permanen atau ad-hoc?

**Permanen tapi tipis.** Ada 2 job QA permanen di cron: **QA Verifier Gate (dual-org)** 03:30 harian (glm-5.3, skill verifier-gate/webapp-testing/verification-before-completion) dan **Content Reviewer** 08:40 harian (flash). Keduanya **post-hoc** (setelah deploy/publish), sekali sehari, dan sama-sama rawan 429. **Tidak ada** agent QA khusus bugfix, tidak ada E2E browser, dan prinsip "pembangun ≠ pemeriksa" hanya berlaku di slot 03:30 — jalur sore, weekend, dan owner-direct memverifikasi klaim sendiri. Bugfix dikerjakan CTO/owner langsung tanpa reviewer independen kedua.

## (d) Rekomendasi: agent specialist QA/bugfix — **"Sentinel" (QA Gate teknikal.id)**

Siap pakai, buat 1 job cron + 1 aturan queue:

- **Nama peran:** TeknikalID Sentinel — QA gate blocking + regression, bukan builder. Pembangun (CTO/BE/UX/Backoffice) ≠ pemeriksa (Sentinel) di SEMUA slot.
- **Skill attach:** `verifier-gate`, `webapp-testing`, `systematic-debugging`, `verification-before-completion`, `debugging-and-error-recovery`.
- **Jadwal:** (1) **pre-deploy 07:15 & 18:15** harian (5 menit sebelum slot CTO — verdict WAJIB sebelum `docker compose up`); (2) **post-deploy +30 menit** tiap kereta/insiden; (3) keep slot 03:30 sebagai sweep utang. Bukan cuma 03:30.
- **Done-when (gate jadi blocking):** entry cto-queue TIDAK BOLEH flip ke `done/deployed` tanpa `qa_verified` diisi Sentinel (mirror job bisa menolak flip); backlog `qa_verified=None >6jam` = 0; tiap fitur baru yang membuka jalur UI lama WAJIB 1 smoke E2E jalur itu (browser via CDP setUserAgentOverride — bukan headless polos); konten: fact-check pre-publish (superlatif rank-cek + breadth cross-day via SQL) SEBELUM insert artikel, bukan review 08:40.
- **Batas kuota:** maks 6 verdict/hari, tiered — FULL (glm-5.3) untuk P0/P1 + semua yang deploy/auth/SQL-write; LITE (flash, fisik 100% + sample 20%) untuk P3. QUIET ZONE 11:00–18:00 idle kecuali P0. Anti-loop 2×/verdict, fail-open DILARANG untuk P0/P1 (kalau verifier 429 → entry tetap `qa_pending`, bukan auto-pass).
- **Bugfix-lane (opsional, minggu ke-2):** sub-mode Sentinel "bugfix intake" — semua bug dari owner/watchdog masuk 1 entry `fix-*` dengan repro-dulu (tangkap latent-path bug ala RSI/MACD sebelum hotfix), max 2 bugfix/hari agar tidak memakan lane fitur; target organisasi: rasio bugfix < 30% task.

**Satu kalimat diagnosis:** gate-nya banyak dan bagus, tapi semuanya *setelah* fakta — bug lolos bukan karena tidak ada QA, tapi karena QA tidak berada di antara build dan deploy, dan tiga jalur (owner-direct, generator konten, slot sore) sama sekali tidak melewatinya.

---
*Audit oleh subagent Hermes, 2026-11-01. Metode: pembacaan skill + log + queue; angka diverifikasi programatik dari cto-queue.json (217 entry) dan decisions.md.*
