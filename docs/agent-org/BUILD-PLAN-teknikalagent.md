# BUILD-PLAN TeknikalAgent — Eksekusi Per Phase (owner green light 2 Nov)
Owner: "Kalau menurutmu sudah matang, lakukan saja. Bisa pakai AGY (flash). Setir per part/phase agar sesuai plan."
Status: MENUNGGU INFRA-CODE-SPEC (input terakhir) → mulai P0.

## Mode eksekusi (tetap, dari skill agy-on-demand worker mode)
- **Builder = agy `gemini-3.8-flash-high`** (kuota 70% weekly) per phase, di-launch dari cwd repo teknikal-agent sendiri
- **Steering & verify = agent utama (aku)**: rerun test sendiri, grep pelanggaran rules, cek fisik file — laporan agy = klaim, bukan bukti
- 1 fase = 1 brief = 1 commit batch; SATU build + verify per fase; tidak campur fase
- Semua rules PLAN §0 berlaku: copy-only (no import lintas repo), repo baru, docs rapi ala teknikalidnew, AGENTS.md rules

## Phases (gate antar-fase = verify lulus sebelum lanjut)
| # | Fase | Isi | Gate selesai |
|---|---|---|---|
| **P0** | Repo skeleton + rules | `teknikal-agent/` init, go.mod, AGENTS.md, README.md, docs/agent-org/ (salin PLAN+BLUEPRINT+THREAT+SPEC), .gitignore, .env.example, Makefile, .golangci.yml, pre-commit, gorfumpt | `make lint vet` lulus di skeleton; git init + first commit; AGENTS.md memuat done-when contract |
| **P1** | Fondasi internal | internal/config (env), internal/logx+trace (slog JSON trace_id), internal/task (cancellation), internal/resilience (circuit breaker COPY hivePOS), unit test | `make test race` hijau; coverage fondasi >80% |
| **P2** | Telegram layer | internal/telegram COPY+adapt AegisGo: client (Send/Edit/Markdown/Buttons), poll long-polling, edit streaming debounce, scheduler per-chat persist, inbox; test httptest | Test lulus; demo bot test-chat kirim+edit streaming (bot token staging) |
| **P3** | LLM provider + tools | internal/provider (anthropic-sdk-go → Z.ai glm-5.3-flash, streaming SSE), internal/tools registry (dualTool pattern COPY) + tools: quote/fundflow/fundamental/news/watchlist (HTTP mService-Token ke teknikal.id, scoped chatId, ticker allowlist) | Test provider (mock) + tools (httptest); 1 panggilan live Z.ai OK |
| **P4** | Queue + workers | River Postgres, 5 worker-group (chat×12/alert×8/brief×4/riset×4/learner×1), prioritas, graceful shutdown 5 tahap, jitter+dedupe alert | Drain test; kill -TERM saat fan-out → resume tanpa duplikat |
| **P5** | Security gate + guard | internal/router: fast-path non-LLM <100ms, postfilter.go (regex imperatif + audit log agent_output_audit), disclaimer footer server-side, sanitizer RSS ingest, cap input 4000 char | Red-team suite 20 prompt 20/20 PASS (THREAT-MODEL seksi B) |
| **P6** | Billing + onboarding + brief | internal/billing (midtrans.go COPY + sub state TRIAL→PAID→GRACE→FREE, order_id TA-*), planlimits caps adapt, onboarding /start deep-link anonId + honesty card, briefw snapshot 07:30→08:05, PDF gofpdf | End-to-end sandbox: /start → brief → bayar sandbox → status naik; brief 50 user test <3 mnt |

Post-P6 (sprint 2): learner memory, riset PDF penuh, alert berita, dashboard web, hardening prod → menunggu hasil P0-P6 diverifikasi.

## Rules keras tiap brief agy (template)
1. Hanya kerjakan fase X — jangan sentuh file fase lain
2. Copy-only dari path sumber yang ditentukan; DILARANG import module repo lain; DILARANG add dependency baru di luar whitelist fase
3. `make lint test race` WAJIB hijau sebelum lapor; laporan = file SPRINT-PX-REPORT.md (fitur → file → test → bukti)
4. Tidak push/merge/deploy; commit lokal branch fase
5. Done-when contract fase (gate tabel atas) harus terbukti fisik di laporan

## Tracking
- File ini diupdate tiap fase: status kolom + link report + hasil verify aku
- Setelah P6 → GATE-1 (re-review penuh hasil build) → keputusan owner deploy
