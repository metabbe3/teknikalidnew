# INFRA & CODE STRUCTURE SPEC — agentd (TeknikalAgent)

Tanggal: 2 Nov 2026 · Status: FINAL untuk eksekusi · Turunan: BLUEPRINT-teknikalagent.md (A.1–A.9), PLAN-saham-agent-1102.md (manifest reuse), THREAT-MODEL-teknikalagent.md (security gate)
Scope: keputusan infra & struktur kode repo Go `teknikal-agent/`. BUKAN dokumen implementasi — hanya spec + potongan pendek. Semua klaim di bawah diverifikasi dengan membaca kode aktual 3 repo (aegisgo, hivepos-api, teknikalidnew) pada 2 Nov 2026.

## 0. REUSE LAW (owner directive 2 Nov, mengikat seluruh dokumen)

1. **REUSE = COPY file/pattern ke folder baru di repo `teknikal-agent/` — DILARANG import module/package dari repo lain** (aegisgo, hivepos, teknikalidnew). Tidak ada `go.mod` `replace`, tidak ada path `aegisgo/internal/...` atau `github.com/hivepos/api/...` yang tersisa di kode. Semua kode jadi milik repo teknikal-agent sendiri, bersih dari sejarah repo lama (lisensi aman: semuanya milik owner).
2. Saat copy: ganti module path (`aegisgo/internal/logx` → `github.com/teknikalid/agentd/internal/logx`), ganti prefix env (`AEGIS_*` → `AGENTD_*`), tulis ulang komentar yang menyebut konteks AegisGo/hivePOS, dan HAPUS fitur yang tidak dipakai (HITL, digest, webhook transport, dst).
3. **Dependency eksternal TETAP dependency go.mod normal** di repo baru (`anthropic-sdk-go`, `river`, `gofpdf`, `pgx/v5`, `prometheus/client_golang`) — copy hanya untuk kode milik sendiri; library publik dipakai via `go get` seperti biasa.

---

## A. DECISION — TELEGRAM LIB: COPY AegisGo, BUKAN go-telegram-bot-api/v5

### A.1 Bedah aktual `aegisgo/internal/telegram` (27 file, ±5.974 baris termasuk test)

| File | Baris | Isi aktual (diverifikasi) |
|---|---|---|
| `client.go` | 280 | **Zero dependency** — stdlib murni (`net/http`, `encoding/json`). Interface `Client` 9 method: `GetMe`, `SendMessage`, `SendMarkdown`, `EditMessageText`, `GetUpdates` (long-poll, `allowed_updates` message+callback_query — bugfix live LL-008), `SendMessageWithButtons` (inline keyboard), `AnswerCallbackQuery`, `SetWebhook`/`DeleteWebhook`. 1 helper `call()` JSON-over-HTTPS, response cap 1MB, `http.Client.Timeout 90s` (long-poll-aware). API-base overridable utk test/fake server. |
| `poll.go` | 155 | `PollLoop`: long-poll 30s, **process-then-ack** (offset hanya maju melewati update yang selesai diproses — crash-safe, at-least-once), backoff eksponensial 1s→60s dengan reset saat sukses, high-water mark dari durable inbox, `Wait(d)` join-bound utk shutdown. |
| `edit.go` | 161 | `EditRegistry` + `editor` queue-drain: edit pesan ke state final via 1 goroutine background; kegagalan edit = log warn, tidak pernah fatal ("ledger is the truth, edit is polish"). **INI BUKAN streaming-debounce editor** — pola decision-edit; lihat A.3 gap. |
| `scheduler.go` | 247 | Cron per-chat `"/every 30m <cmd>"`, floor 1 menit, allowlist chat, **durable persist + rehydrate saat boot, next-run = now+interval (no catch-up burst)**, failure persist dijawab jujur. |
| `inbox.go`, `dispatcher.go`, `notify.go`, `webhook.go`, `render.go`, `digest.go`, `hitl.go` | — | Durable inbox (dedup update_id → idempotent reply), dispatcher transport-free (allowlist → command → engine → reply), fan-out notify, webhook transport alternatif, render 4096-cap. |
| Test | 16 file (`client_test`, `poll_test`, `edit_test`, `scheduler_test`, `scheduler_persist_test`, `dispatcher_test`, `inbox_test`, `notify_ttl_test`, `telegram_test` 459 baris, dll) | **`go test ./internal/telegram/` PASS 2.1s** (diverifikasi 2 Nov 2026). Fake `Client` meng-implement interface — semua path di-test tanpa network. |

### A.2 Perbandingan vs go-telegram-bot-api/v5

| Kriteria | AegisGo internal/telegram (COPY) | go-telegram-bot-api/telegram-bot-api/v5 (fresh) |
|---|---|---|
| Dependency bawaan | **0** (stdlib murni — konsisten budget RAM & audit supply-chain) | Library eksternal; **tanpa rilis baru sejak v5.5.1 (2021), repo maintainer di-arsipkan (2025)** → risk jadi orfan tepat saat produk monetize |
| Coverage test | 16 file test, seluruh poll/edit/scheduler/inbox teruji + fake Client utk e2e | Test milik upstream, tidak kita pegang; behavior 429/Retry-After tetap harus kita bungkus sendiri |
| Fitur yang kita butuh (BLUEPRINT A.3: "~6 endpoint") | Sudah ada SEMUA: poll offset-ack, edit, inline button, callback, markdown opt-in, dedup inbox | Ada, plus ~100 method yang tidak dipakai (permukaan API besar = bloat & godoc noise) |
| Streaming edit | `EditMessageText` primitive siap; debounce/belum (sama di keduanya — lihat A.3) | Sama — tidak ada di lib manapun |
| Kontrol retry 429 | Kode milik kita — tinggal tambah parse `Retry-After` di `call()` | Harus wrap `bot.Request` — bisa, tapi 1 lapis lagi di atas lib orang lain |
| Kesinambungan tim | Kode pattern-nya (logx/task/trace) SAMA dengan bagian lain agentd | Style beda dari sisa reuse |

### A.3 VERDICT

**COPY + ADAPT `aegisgo/internal/telegram` → `internal/tgclient` + `internal/tglistener` (copy file, sesuai REUSE LAW §0 — module path diganti, kode jadi milik agentd). JANGAN add go-telegram-bot-api/v5.**

Alasan (urut bobot):
1. **Nol dependency baru** — go.mod agentd tetap ramping (pgx, river, gofpdf, prometheus); tidak menarik lib yang diarsipkan maintainernya ke produk berbayar. Catatan REUSE LAW: copy kode sendiri = OK; dependency eksternal (anthropic-sdk-go dkk.) tetap lewat `go get` normal — AegisGo memang TIDAK membawa dependency Telegram (client-nya stdlib murni), jadi copy ini tidak menyelundupkan modul pihak ketiga.
2. **Sudah teruji & pola kode konsisten** — 16 file test hijau; paket ini memakai `logx.QuietCancel` + `task.WaitFor` yang memang kita COPY juga (bagian D) → satu bahasa kode.
3. **Semantik delivery lebih baik dari lib**: process-then-ack + durable inbox + dedup update_id = idempotent reply bawaan; lib umum tidak memberi ini.
4. **Ini meng-amend BLUEPRINT A.3** (yang menulis "go-telegram-bot-api v5" sebelum manifest reuse AegisGo ditemukan owner 2 Nov). PLAN manifest (owner-approved) sudah memutuskan "COPY + adapt" — spec ini meng-konfirmasi setelah bedah aktual: kode layak, lebih layak dari lib eksternal.

**Adaptasi WAJIB saat copy (gap yang harus ditutup, estimasi +2 hari):**
- [ ] `call()`: parse 429 + header `Retry-After` → hormati (BLUEPRINT E.2); rate limit global 25 msg/s + jitter 20% di `sender.go`.
- [ ] `streamEditor.go` BARU (bukan copy edit.go): debounce 900ms / delta ≥180 char / max 1 edit/dtk per chat; split >4.096 char → pesan "(lanjutan)"; gerbang postfilter di tiap flush (THREAT-MODEL V1-M3). Bangun DI ATAS `EditMessageText` + pola queue-drain `editor` aegisgo.
- [ ] Drop yang tak dipakai: HITL/approval flow, digest, webhook transport (long-poll only — BLUEPRINT A.3), allowlist admin-command (ganti: private-chat-only V8-M1).
- [ ] Ganti tipe pesan → `InMsg` blueprint (tgID, chatID, text, cbq, deepLink), termasuk field `chat.type` (sudah ada di struct `Chat`).

---

## B. REPO LAYOUT FINAL — REPO BARU STANDALONE `teknikal-agent/`

### B.1 Keputusan: repo baru (BUKAN subdir teknikalidnew)

| Pertimbangan | Repo baru `teknikal-agent/` ✅ | Subdir di teknikalidnew ❌ |
|---|---|---|
| Deploy | Binary systemd sendiri di VPS; lifecycle terpisah dari Next.js docker | Next repo tidak punya toolchain Go; deploy jadi terkopel |
| CI | Go pipeline (lint/test/race/e2e/redteam) terpisah, tanpa install Node | CI Node harus pasang Go (atau dua bahasa dalam satu workflow) |
| Tim | agent-org punya ownership & access-control sendiri | Commits agent tercampur riwayat web |
| go.mod | Bersih (pgx/river/gofpdf/prometheus saja) | Dep Go harus di-root monorepo besar |
| Kontrak API | `api/` dir sebagai kontrak dengan teknikalidnew (lihat B.3) — dua repo berkomunikasi lewat HTTP + DB schema, bukan shared code | Godaan shared-code = coupling |

Keterikatan yang TETAP ada (dikelola eksplisit, bukan alasan gabung repo): (1) Postgres yang sama → tabel `agent_*` dimigrasi dari repo ini, tapi didokumentasikan di `api/db-contract.md`; (2) endpoint teknikal.id dipanggil tools → kontrak di `api/teknikalid-api.md`; (3) webhook Midtrans lewat Next.js existing → forward ke agentd.

### B.2 Struktur direktori (file-per-file, 1 baris responsibility)

```
teknikal-agent/
├── cmd/agentd/main.go                  # entry tunggal: flag -role=all|listener|worker, -debug; wiring DI manual tanpa framework; SIGTERM → graceful shutdown 25s (A.5)
├── internal/
│   ├── tgclient/                       # COPY aegisgo/internal/telegram/client.go (A.3): stdlib Bot API client + fake utk test
│   │   ├── client.go                   # HTTPClient + interface Client (9 method) + 429/Retry-After handling (adaptasi)
│   │   ├── types.go                    # Update/Message/Chat/User/CallbackQuery/Button — subset wire-format
│   │   └── client_test.go              # httptest fake Bot API; tabel status code / 429 backoff
│   ├── tglistener/
│   │   ├── poll.go                     # COPY aegisgo poll.go: long-poll 25-30s, process-then-ack, backoff 1s→60s
│   │   ├── update.go                   # parse Update → InMsg{tgID, chatID, text, cbq, deepLink}; sanitasi input (V4-M2: zero-width, base64-run, cap 2000 char)
│   │   ├── streameditor.go             # BARU di atas pola editor aegisgo: debounce 900ms/Δ≥180char/1 edit/s; split 4096; gerbang postfilter per flush
│   │   └── sender.go                   # fan-out brief/alert: 25 msg/s global + jitter 20%, Retry-After, coalesce
│   ├── queue/
│   │   ├── enqueue.go                  # insert River job + priority chat=1 alert=2 brief=3 riset=4 housekeeping=5; bind chatId server-side (V3-M1)
│   │   ├── streams.go                  # 5 worker-group River client dgn queue-select ORDER BY priority; backpressure depth>100 tolak non-PRO
│   │   ├── jobs.go                     # JobArgs struct per tipe (chat/brief/research/alert/housekeeping) + serializer
│   │   └── dlq.go                      # dead-letter setelah retry^3 (30s,2m,10m) → alert admin TG + ta_dlq_total
│   ├── router/
│   │   ├── intent.go                   # fast-path non-LLM: /p <ticker>, watchlist CRUD, status, help — balas <100ms
│   │   ├── quota.go                    # usage_ledger cek per jam/hari (LRU in-mem 10k + persist 60s) — ADAPT planlimits.go (Kind: Turns/Riset/Watchlist)
│   │   ├── guard.go                    # pre-filter input: kamus minta-rekom + sinonim gaul → template patuh (V1-M2)
│   │   └── postfilter.go               # 🔴 regex imperatif/target-harga/jamin-untung + soft-rewrite + append disclaimer server-side (V1-M3, gate go-live)
│   ├── workers/
│   │   ├── chatw.go                    # chat worker: system prompt + tools + session ringkas; stream → streameditor; tool budget ≤3/turn
│   │   ├── briefw.go                   # 08:05 WIB: baca brief_snapshot → 1 flash call/user → kirim; idempotent resume dari snapshot
│   │   ├── researchw.go                # job riset async malam: ≤8 tool-calls, batch API, hasil → PDF + notifikasi
│   │   ├── alertw.go                   # sweep 60s: live-cache + rule user + news material → compose (flash / template data-only saat outage)
│   │   └── learnerw.go                 # 02:00 WIB: ekstrak kandidat memori → validator deterministik (V7-M1) → agent_memory
│   ├── tools/
│   │   ├── registry.go                 # COPY aegisgo tools/registry.go+tool.go: dualTool[In,Out] generic, Registry reject duplikat nama
│   │   ├── client.go                   # HTTP client ke API teknikal.id + mService-Token + circuit breaker + cache 60s
│   │   ├── quote.go                    # harga live/EOD/historis (GET /api/live-quotes, /api/stocks/[ticker])
│   │   ├── fundflow.go                 # foreign flow CDP, bandarmologi
│   │   ├── fundamental.go              # P/E, PBV, ROE, dividen vs median sektor
│   │   ├── news.go                     # berita emiten + klasifikasi materialitas (dari pipeline RSS sprint-1)
│   │   └── watchlist.go                # CRUD watchlist — schema TANPA parameter identitas (V3-M1); ticker allowlist ^[A-Z]{4}$ × 940
│   ├── llm/
│   │   ├── client.go                   # Z.ai anthropic-compatible; COPY pola aegisgo internal/provider; circuit breaker; retry max 2 + jitter
│   │   ├── stream.go                   # SSE parse → channel chunk; ctx cancel saat user stop; first-token timer → ta_first_token_seconds
│   │   └── batch.go                    # batch API utk riset+learner (malam, -50%)
│   ├── pdfgen/
│   │   └── pdfgen.go                   # gofpdf: brief 1-2 hal, riset 2-4 hal (gofpdf bukan chromedp — A.7); upload R2
│   ├── billing/
│   │   ├── midtrans.go                 # COPY hivepos midtrans.go (155 baris): Snap + Basic auth + VerifySignature sha512 + breaker 5/30s
│   │   ├── sub.go                      # state machine TRIAL→PAID→GRACE(H-3)→FREE soft; order_id TA-<tg_id>-<tier>-<periode>
│   │   └── webhook.go                  # terima forward dari Next.js /api/payment/notification: verify sig + idempotency (V6-M2) + amount==harga tier DB
│   ├── news/
│   │   ├── ingest.go                   # RSS fetcher: domain allowlist, TLS wajib, timeout 10s, cap 2MB, NO url-follow (V2-M1)
│   │   └── sanitize.go                 # 🔴 NFKC + zero-width strip + neutralizer imperatif + markup strip + cap 1500 char/sumber (V2-M1)
│   ├── store/
│   │   ├── pg.go                       # pgx/v5 pool (max 10, stmt timeout 5s, health 30s) — satu pool dipakai River
│   │   ├── repos.go                    # repo per agregat (agent_user, session, memory, alert_rule, ledger, research, subscription) — semua WHERE tg_id=$1
│   │   └── migrate.go                  # runner migrasi idempotent (embed SQL)
│   ├── observ/
│   │   ├── http.go                     # /healthz /readyz /metrics (bind 127.0.0.1:9101) — reuse pattern hivepos prometheus
│   │   ├── metrics.go                  # counter/histogram daftar F.3
│   │   └── adminalert.go               # alert admin via TG (DLQ>5/jam, P95>2.5s, poll-lag>60s)
│   ├── taskx/                          # COPY aegisgo internal/task: Group.Go/GoCancel/Wait — detached bg work + bounded join
│   ├── logx/                           # COPY aegisgo internal/logx: New(JSON/text), Or, QuietCancel, RotatingWriter (size-cap, stdlib-only)
│   ├── tracex/                         # COPY aegisgo internal/trace: New/From — trace_id mint 12-byte hex + ctx propagation
│   └── config/config.go                # env-only Load() pattern aegisgo (envOr/envTrim helper) — lihat D.4 + E.6
├── api/                                # KONTRAK (markdown/JSON, bukan kode)
│   ├── teknikalid-api.md               # endpoint teknikal.id yg dipanggil tools + shape respons + mService-Token header
│   ├── db-contract.md                  # tabel agent_* + prisma co-existence rule (web tidak menyentuh agent_*, agentd read-only ke tabel web)
│   ├── payment-forward.md              # kontrak webhook Next.js → agentd (auth internal + idempotency key)
│   └── openapi-agentd.yaml             # /healthz /readyz /metrics + webhook forward (opsional, versi minimum)
├── migrations/
│   ├── 0001_agent_core.sql             # 8 tabel BLUEPRINT A.8 + index
│   └── 0002_audit.sql                  # agent_output_audit (retensi 90 hr) + agent_payment_event (uniq idempotency)
├── deployments/
│   ├── systemd/agentd.service          # unit hardening (E.4)
│   ├── docker/Dockerfile               # multi-stage distroless utk dev Mac-mini join network teknikalidnew (E.5)
│   └── docker/agentd-compose.yml       # dev-only: external network teknikalidnew_internal
├── scripts/
│   ├── e2e.sh                          # staged e2e loopback (adaptasi pola aegisgo: bounded poll, PASS/FAIL per stage, EXIT trap)
│   └── pre-commit.sh                   # hook gate C.4
├── docs/                               # KONVENSI teknikalidnew (pola docs/agent-org/)
│   ├── agent-org/
│   │   ├── decisions.md                # log keputusan teknis + bukti (pola ceo-decisions.md teknikalidnew)
│   │   ├── changelog.md                # satu baris per perubahan behavioral, tanggal dulu (pola agent-org/changelog.md)
│   │   └── handoff.md                  # status sprint, next action, blocker — hidup antar sesi builder
│   └── specs/                          # spec teknis per subsistem (queue, streaming-editor, postfilter, billing)
├── .github/workflows/ci.yml            # gate C.5
├── .golangci.yml                       # C.2
├── .env.example                        # SEMUA var E.6 + komentar fungsi/contoh (tanpa nilai rahasia)
├── .gitignore                          # bin/, coverage.out, *.log, .env
├── AGENTS.md                           # rules utk agent/builder — lihat B.3
├── CLAUDE.md                           # pointer tipis: "baca AGENTS.md" + build commands (konvensi teknikalidnew punya keduanya)
├── README.md                           # apa produknya, quickstart dev (make hooks/test/lint/run), arsitektur 1 diagram Mermaid, link docs/
├── CHANGELOG.md                        # Keep a Changelog format; tiap release: fitur, fix, security
├── Makefile                            # E.2
└── go.mod                              # module github.com/teknikalid/agentd; go 1.26 — TANPA replace (REUSE LAW §0)
```

Aturan package (dipaksa linter + review): `internal/` saja — TIDAK ada `pkg/` (belum ada consumer eksternal; export publik hanya via `cmd/agentd`); dependensi antar-paket satu arah: `tglistener → router → queue → workers → {tools,llm,store}`; `tools`/`llm`/`store` tidak boleh import `workers` (cek `depguard`+review; worker inject dependency lewat constructor).

### B.3 AGENTS.md — rules untuk agent/builder (standar teknikalidnew, isi wajib)

Repo baru punya AGENTS.md sejak commit pertama (bukan menyusul). Struktur mengikuti teknikalidnew (project overview → build & test commands → architecture → conventions → rules), dengan konten Go:

1. **Project overview** — 3 kalimat: apa agentd, jalur pesan (TG long-poll → router → River → workers), binary tunggal `-role=all|listener|worker`.
2. **Build & test commands** — `make build/test/race/lint/vet/check/cover/e2e/redteam/hooks` + cara run dev (`make run` butuh `.env` dari `.env.example`). Semua command copy-paste ready.
3. **Clean code law (BLOCKING)**: gofumpt + `.golangci.yml` harus hijau SEBELUM commit — bukan "nanti diperbaiki"; `make check` (nol TODO/FIXME, nol Skip, semua pkg punya test) wajib lulus; context.Context selalu param pertama; error wrap `%w` + konteks aksi; cyclo ≤12; line ≤110; larangan GORM/testify/go-telegram-bot-api (depguard mengejar).
4. **Done-when contract + bukti fisik** (pola night-train teknikalidnew: DONE-WHEN green dengan physical proof): sebuah task tidak DONE sebelum (a) test hijau di CI, (b) bukti fisik ditempel ke PR/ticket — output `make lint`/`go test -race` bersih, `curl 127.0.0.1:9101/healthz` saat lokal, hitungan baris/query SQL — bukan klaim "sudah jalan".
5. **REUSE LAW §0** dinyatakan verbatim: tidak ada import lintas repo, tidak ada go.mod replace; copy = tulis ulang module path + prefix env + komentar.
6. **GATEGUARD pre-flight** (adaptasi teknikalidnew): sebelum deploy prod / migrasi DB / sentuh billing/env — tulis dulu di PR `targets:` / `blast:` / `rollback:`; tanpa blok itu task tidak boleh naik DONE.
7. **Konvensi dokumen**: perubahan behavioral → `docs/agent-org/changelog.md` + `decisions.md` di PR yang sama; diagram = Mermaid sebagai kode (bukan gambar manual), simpan di `docs/`.

---

## C. CLEAN CODE STANDARD

### C.1 Format: gofumpt (strict superset gofmt)

```bash
gofumpt -w -extra .
```
Semua kode lewat gofumpt; CI gagal bila `gofumpt -l .` menghasilkan output. `-extra` menolak: leading/trailing newline kosong di block, `if x { y }` satu-baris (kecuali func literal pendek di tabel test).

### C.2 `.golangci.yml` LENGKAP (final)

```yaml
version: "2"
run:
  timeout: 5m
  tests: true
  modules-download-mode: readonly

linters:
  enable:
    - errcheck        # error tidak diabaikan
    - govet           # go vet semua analyzer
    - staticcheck     # SA* + ST* + QF*
    - unused          # kode mati
    - gosimple        # simplifikasi
    - ineffassign     # assignment tak ber efek
    - gocritic        # style+perf checklist
    - gofmt
    - goimports       # import grouping (std | eksternal | github.com/teknikalid)
    - revive          # style ekstensibel (rules di bawah)
    - misspell
    - unconvert       # konversi tipe redundan
    - unparam         # param func tak pernah dipakai
    - prealloc        # preallocate slice pada range append
    - errorlint       # %w/errors.Is/errors.As, larang == comparison
    - noctx           # http request tanpa context
    - rowserrcheck    # Rows.Err dicek
    - sqlclosecheck   # Rows/Stmt Close di semua path
    - bodyclose       # resp.Body.Close
    - nakedret        # larang naked return di func panjang
    - gocyclo         # max cyclomatic
    - lll             # line length
    - depguard        # larang dep berat/tidak-sesuai
    - copyloopvar     # loop var capture (Go1.22+ hygiene)
    - sloglint        # konsistensi structured log (key-value, no fmt mixing)

  settings:
    gocyclo:
      min-complexity: 12          # HARD: >12 = pecah fungsi
    lll:
      line-length: 110            # max kolom; 111 = fail
    revive:
      severity: warning
      rules:
        - name: context-as-argument  # context.Context WAJIB param pertama
        - name: error-strings        # pesan error lowercase, tanpa pungtuasi akhir
        - name: exported             # comment utk identifier publik, dimulai nama identifier
        - name: var-naming           # Go convention (MixedCaps, no snake_case)
        - name: indent-error-flow    # else setelah return = flatten
        - name: unexported-return
        - name: bare-return          # larang `return` tanpa nilai di named-return
        - name: early-return
        - name: unused-parameter     # ganti `_`
    errorlint:
      errorf: true                # fmt.Errorf wajib %w bila membungkus
      errores: true               # larang err == target
      asserts: true
    gocritic:
      enabled-tags:
        - diagnostic
        - performance
        - style
      disabled-checks:
        - paramTypeCombine        # boleh longgar utk keterbacaan signature
    goimports:
      local-prefixes: github.com/teknikalid/agentd
    depguard:
      rules:
        no-orm:
          deny:
            - pkg: gorm.io/gorm
              desc: "DB access = pgx/v5 raw SQL (D.7). GORM ditolak."
            - pkg: github.com/stretchr/testify
              desc: "Test stdlib table-driven + helper sendiri (D.6). testify tidak dipakai."
            - pkg: github.com/go-telegram-bot-api
              desc: "TG client = internal/tgclient (A.3)."
        no-pkg-from-workers:
          files: ["**/internal/tools/**", "**/internal/llm/**", "**/internal/store/**"]
          deny:
            - pkg: github.com/teknikalid/agentd/internal/workers
              desc: "arah dependensi satu arah (B.2)"

  exclusions:
    rules:
      - path: _test\.go
        linters: [goconst, dupl, unparam]   # test dibebaskan duplikasi literal
    paths:
      - migrations/               # SQL, bukan Go

linters-settings: # legacy v1 block di-abaikan; v2 memakai linters.settings di atas
```

Catatan verifikasi: daftar ini men-superset permintaan (semua linter diminta aktif + 4 tambahan: `bodyclose`, `sqlclosecheck`, `copyloopvar`, `sloglint`, `depguard`) — semua linter mainstream golangci-lint v2. `rowserrcheck`+`sqlclosecheck` = "pointer" untuk jalur pgx/database-sql.

### C.3 Project law (warisan aegisgo `make check` — diadopsi)

1. **Nol TODO/FIXME** — kode selesai atau tidak masuk. 2. **Nol `.Skip()`/`testing.Short` escape**. 3. **Setiap package punya ≥1 file test**. Semua dicek `make check` (blocking).

### C.4 Pre-commit hook (`scripts/pre-commit.sh`, di-install `make hooks`)

```bash
#!/bin/bash
set -euo pipefail
staged=$(git diff --cached --name-only --diff-filter=ACM | grep '\.go$' || true)
[ -z "$staged" ] && exit 0
echo "$staged" | xargs gofumpt -l -extra && \
  echo "FAIL: gofumpt" && exit 1
golangci-lint run --new-from-rev=HEAD   # hanya diff staged utk kecepatan
go vet ./...
grep -rnE 'TODO|FIXME' $staged && echo "FAIL: TODO/FIXME" && exit 1 || true
```
Plus `gitleaks protect --staged` (secret-scan — wajib: repo ini pegang MIDTRANS_SERVER_KEY & token TG di env handling).

### C.5 CI gate (blocking, tidak ada skip)

```yaml
# .github/workflows/ci.yml — semua job blocking di PR + main
jobs:
  lint:   golangci-lint-action@v8 (config C.2) + gofumpt -l . (dirty = fail)
  test:   go test -race -count=1 ./... ; go test -covermode=atomic (gate ≥80% total, ≥70% per pkg router/billing/tgclient)
  vet:    go vet ./...
  check:  make check (C.3)
  e2e:    make build && ./scripts/e2e.sh (buildtag e2e; loopback saja)
  redteam: go test -tags redteam ./internal/router/  # 20/20 HARUS lulus (THREAT-MODEL §B) — gate tiap deploy yang menyentuh prompt/guard/postfilter
```
Merge ke main = semua hijau. Tag `v*` memicu build arm64 + artifact.

---

## D. CODE PATTERN yang DIADOPSI (dari 3 repo, dengan sumber)

### D.1 Task cancellation — COPY `aegisgo/internal/task` (69 baris, teruji)
`Group.Go(parent, timeout, fn)`: goroutine background dengan `context.WithTimeout(context.WithoutCancel(parent), timeout)` — **detached dari cancel request tapi bounded timeout**, values (trace_id) tetap terbawa; `GoCancel` mengembalikan cancel idempotent (user "stop" chat = cancel stream tanpa membunuh worker); `Wait(d)` = bounded join (systemd SIGTERM → tunggu max 25s, tidak sleep tebak-tebakan). Dipakai: tglistener, streameditor, alert sweep, fan-out brief.

### D.2 Circuit breaker — COPY `hivepos-api/internal/shared/resilience/circuitbreaker.go` (95 baris + test)
Per-dependency, threshold 5 fail konsekutif, cooldown 30s, half-open 1 probe; `ErrCircuitOpen` sentinel; in-mem single-process (cukup — agentd 1 proses). Dipasang di 3 titik: `llm/client.go`, `tools/client.go` (API teknikal.id), `billing/midtrans.go`. Upgrade dari hivePOS: bungkus `Do(fn)` dengan versi ctx-aware `DoCtx(ctx, fn)` + aturan 4xx-tidak-trip (sudah konvensi hivePOS: 4xx client error ≠ dependency mati).

### D.3 Tool registry generic — COPY `aegisgo/internal/tools/{tool.go,registry.go}` (126+81 baris)
`Tool` interface dual-entry: `Execute(ctx, json.RawMessage)` untuk router deterministic (fast-path <100ms TANPA LLM) + `FuncTool()` untuk jalur LLM function-calling. `New[In,Out any](cfg, handler)` — struct In/Out = single source of truth schema (field comment jadi deskripsi LLM). `Registry` menolak nama duplikat loudly. Implement quote/fundflow/fundamental/news/watchlist di atas ini; TIDAK import agent-framework-go — cukup pola dual-entry + emit JSON-schema sendiri (hemat 1 dep besar; provider Z.ai anthropic-compatible menerima tool definition JSON).

### D.4 Config loading — ADAPT `aegisgo/internal/config` (env-only)
Pola: struct `Config` + `Load()` dari env via helper `envOr(key, def)` / `envTrim(key)` / `parseList`; semua default eksplisit di kode; TIDAK ada yaml (12-factor; systemd `EnvironmentFile`, docker `env_file`). YANG BERBEDA dari aegisgo: (1) prefix `AGENTD_*`; (2) `Load()` mengembalikan error bila wajib kosong (token TG, DSN, LLM key) — fail-fast di boot, bukan runtime; (3) `/dev/stdin`-echo lintasan `.env` lokal dev via `godotenv`-lite sendiri (10 baris, opsal di main — tidak jadi dependency runtime).

### D.5 Error handling policy — WRAPPED, bukan sentinel-SPRAWL
- Wrap `%w` + konteks aksi: `fmt.Errorf("enqueue chat job tg=%d: %w", chatID, err)` (errorlint mengekor).
- `errors.Is/As` untuk inspeksi; **sentinel HANYA untuk keputusan kode** (max ±8, daftar lengkap di `internal/errs/errs.go`): `ErrCircuitOpen`, `ErrQuotaExceeded`, `ErrTickerInvalid`, `ErrInputTooLong`, `ErrTrialUsed`, `ErrReplay`, `ErrGuardBlock`, `ErrContextCanceled` — dipakai router/quota/tools utk branching; semua lainnya wrap-through.
- Boundary policy: error TG-API → log warn + lanjut (edit = polish); error Postgres di hot-path chat → fail job (River retry); error billing → JANGAN retry otomatis (uang) — masuk DLQ + alert admin.
- `logx.QuietCancel(err)` men-demote context.Canceled ke Debug — shutdown sehat tidak boleh jadi noise ERROR (pelajaran 718-baris-log aegisgo).

### D.6 Structured logging — COPY `aegisgo/internal/logx` + trace
`slog.NewJSONHandler` (satu constructor `logx.New(level, w, json)`; binary edge memasang default); `RotatingWriter` stdlib (size 10MiB × keep 5 — tanpa lumberjack); `trace.New(ctx, supplied)` mint 12-byte-hex, `trace.From(ctx)` di tiap log call. Log fields standar (F.4). Anti-pattern (dilarang review): `fmt.Println`, `log.Print`, `err.Error()` di string-interpolasi field — pakai `slog` key-value.
**Testing standard**: stdlib-only table-driven (TANPA testify — konsisten aegisgo; helper `t.Run` case name = dokumen perilaku); fake = struct kecil implement interface (`tgclient.Client`, `llm.Streamer`, `store.Repos`) — bukan mock framework; `httptest.Server` untuk semua HTTP boundary (fake Bot API, fake Z.ai SSE, fake teknikal.id, fake Midtrans); build tag `//go:build e2e` untuk test yang butuh binary nyata (pattern aegisgo 13-gate), `//go:build redteam` untuk suite 20 prompt; `t.Parallel()` default di semua unit test; race detector wajib hijau di CI.

### D.7 DB access — pgx/v5 pool + raw SQL parameterized (GORM DITOLAK)
`pgxpool` max 10 conns (bagi dgn River — A.7), `statement_timeout 5s`, query semua `$1` parameterized (V3-M2), migration = file SQL + runner idempotent. Alasan tolak ORM: GORM = refleksi + callback chain + footprint (lawan budget 140MiB & `sqlclosecheck`-era hygiene), dan seluruh query kita adalah point-lookup/upsert dengan index eksplisit (A.8) — SQL 5 baris lebih jelas dari struct-tag arcanery. `squirrel` BOLEH hanya untuk WHERE dinamis alert-sweep (opsional; default raw SQL). Repo hivePOS membuktikan pola ini produksi-ready (pgx v5.10 + golang-migrate).

---

## E. BUILD & DEPLOY

### E.1 Go version pin
`go.mod`: `go 1.26` + `toolchain go1.26.3` (identik aegisgo — satu versi toolchain lintas repo agent-org; CI `actions/setup-go@v5` dengan `go-version-file: go.mod`). Tidak ada fitur <1.24 yang dibutuhkan; 1.26 dipilih demi kesetaraan pattern & tooling.

### E.2 Makefile final

```makefile
BINARY  := agentd
PKGS    := $(shell go list ./...)
COVER_MIN := 80

.PHONY: build test race cover lint vet check fmt hooks e2e redteam docker cross clean tidy

build:            ## cross-compile bukan default; lokal = native
	go build -trimpath -ldflags "-s -w -X main.version=$$(git describe --tags --always)" -o bin/$(BINARY) ./cmd/agentd
test:
	go test -count=1 ./...
race:
	go test -race -count=1 ./...
cover: check
	go test -covermode=atomic -coverprofile=coverage.out $(PKGS)
	go tool cover -func=coverage.out | tail -n1
	@pct=$$(go tool cover -func=coverage.out | awk '/^total:/{sub(/%/,"",$$3);print $$3}'); \
	awk -v p=$$pct -v m=$(COVER_MIN) 'BEGIN{if(p+0<m){printf "FAIL: cover %.1f%% < %d%%\n",p,m;exit 1}}'
lint:
	golangci-lint run
	gofumpt -l -extra . | tee /dev/stderr | (! read) || (echo "gofumpt dirty"; exit 1)
vet:
	go vet ./...
check:             ## project law C.3: no TODO/FIXME, no Skip, semua pkg punya test
	@files=$$(find . -name '*.go' -not -path './bin/*'); \
	grep -nE 'TODO|FIXME' $$files && exit 1 || true; \
	grep -nE '\.Skip\(|\.Skipf\(' $$files && exit 1 || true; \
	bad=""; for p in $(PKGS); do [ "$$(go list -f '{{if or .TestGoFiles .XTestGoFiles}}y{{end}}' $$p)" = "y" ] || bad="$$bad $$p"; done; \
	[ -z "$$bad" ] || { echo "pkg tanpa test:$$bad"; exit 1; }
fmt:
	gofumpt -w -extra .
hooks:
	cp scripts/pre-commit.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
e2e: build
	./scripts/e2e.sh
redteam:
	go test -tags redteam -count=1 ./internal/router/
docker:
	docker build -t teknikalid/agentd:dev -f deployments/docker/Dockerfile .
cross:            ## VPS teknikal.id (arm64)
	CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath -ldflags "-s -w" -o bin/$(BINARY)-linux-arm64 ./cmd/agentd
tidy:
	go mod tidy
clean:
	rm -rf bin coverage.out
```

### E.3 Cross-compile arm64 (VPS teknikal.id)
`CGO_ENABLED=0 GOOS=linux GOARCH=arm64` (E.2 `make cross`) — binary statis, no glibc versi drama, ±15-20MB. Upload via `scp` + `sha256sum` verify; `.goreleaser` BOF (nice-to-have sprint 2, tidak blocker). Jika VPS ternyata amd64: satu flag `GOARCH=amd64` — tidak ada perubahan kode (verifikasi `uname -m` saat pertama deploy, dicatat di runbook).

### E.4 systemd unit + hardening (deployments/systemd/agentd.service)

```ini
[Unit]
Description=TeknikalAgent engine (agentd)
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=simple
User=agentd
Group=agentd
WorkingDirectory=/opt/teknikal-agent/state
EnvironmentFile=/etc/teknikal-agent/agentd.env   # 0600, user agentd
Environment=GOMEMLIMIT=140MiB                    # soft-cap GC (BLUEPRINT A.7)
Environment=GOGC=40
ExecStart=/opt/teknikal-agent/bin/agentd -role=all
ExecReload=/bin/kill -HUP $MAINPID
Restart=on-failure
RestartSec=3
# Budget resource — OOM hanya membunuh bot, bukan web teknikal.id (E.5 risiko #4)
MemoryHigh=160M
MemoryMax=200M
TimeoutStopSec=30                                # graceful 25s + margin; SIGTERM → drain (A.5)
WatchdogSec=60                                   # /healthz via sd_notify? v1: Type=simple + Restart; v2 naik notify
# Hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
PrivateDevices=true
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
ReadWritePaths=/opt/teknikal-agent/state /var/log/teknikal-agent
# Agentd hanya butuh OUTBOUND (long-poll TG, API teknikal.id, Z.ai, Midtrans) — tidak ada listener publik
IPAddressDeny= any egress-block-list BOF; default: tanpa IPAddressAllow (outbound bebas, inbound via systemd socket tidak dipakai — healthz bind 127.0.0.1 saja)

[Install]
WantedBy=multi-user.target
```

### E.5 Integrasi stack teknikalidnew (tanpa port bentrok)

**Realitas dua lingkungan (diverifikasi):**
- **VPS teknikal.id (PRODUCTION)**: web + Postgres berjalan; agentd = **systemd binary** (bukan container — hemat RAM, sesuai BLUEPRINT A.7). Koneksi Postgres via `localhost:5432` (atau socket) — pool 10. Listener HTTP hanya `127.0.0.1:9101` (healthz/readyz/metrics) → TIDAK BENTROK dengan apa pun (web :3000/443 via cloudflared, pg :5432). Zero inbound baru (long-polling outbound).
- **Mac mini (DEV/STAGING)**: stack teknikalidnew docker-compose `internal` network, Postgres expose `127.0.0.1:5433`. Agentd dev = **container join network external**:

```yaml
# deployments/docker/agentd-compose.yml (dev-only)
services:
  agentd:
    build: { context: ../.. }                 # deployments/docker/Dockerfile multi-stage → distroless/static
    environment:
      - AGENTD_DATABASE_URL=postgres://teknikalid:${POSTGRES_PASSWORD}@db:5432/teknikalid
      - AGENTD_TG_BOT_TOKEN=${AGENTD_TG_BOT_TOKEN}
      # ... penuh lihat E.6
    ports:
      - "127.0.0.1:9101:9101"                 # bind loopback — pola security-audit 28 Okt stack existing
    restart: unless-stopped
    deploy:
      resources:
        limits: { cpus: '1.0', memory: 200M } # cermin systemd MemoryMax
    networks: [teknikalid]
networks:
  teknikalid:
    name: teknikalidnew_internal               # external: join jaringan existing, SHARE Postgres service `db`
    external: true
```
Aturan: (1) agentd TIDAK pernah expose port publik di environment manapun; (2) satu-satunya resource shared = Postgres + tabel `agent_*` (kontrak `api/db-contract.md`); (3) total koneksi pg VPS <30 (web pool + agentd 10); (4) agentd tidak menulis tabel web; read-only untuk watchlist/TelegramWatch via role DB terpisah `agentd_ro` + role `agentd_rw` scoped schema `public` tabel `agent_*` saja.

### E.6 `.env` schema LENGKAP (semua env agentd; prefix `AGENTD_`; default di kode)

**Wajib (fail-fast bila kosong):**
| Var | Contoh | Fungsi |
|---|---|---|
| `AGENTD_DATABASE_URL` | `postgres://agentd:***@127.0.0.1:5432/teknikalid?sslmode=disable` | DSN pgx pool + River |
| `AGENTD_TG_BOT_TOKEN` | `123456:ABC…` | token @TeknikalAgentBot |
| `AGENTD_LLM_API_KEY` | `sk-…` | Z.ai key |
| `AGENTD_MSERVICE_TOKEN` | `***` | service-auth header ke API teknikal.id (bypass rate-limit per-IP) |
| `AGENTD_MIDTRANS_SERVER_KEY` | `SB-Mid-server-…` | billing Snap + verify |
| `AGENTD_ADMIN_CHAT_ID` | `6123456789` | penerima alert admin (DLQ, P95, poll-lag) |

**LLM & tools:**
| Var | Default | Fungsi |
|---|---|---|
| `AGENTD_LLM_BASE_URL` | `https://api.z.ai/api/anthropic` | endpoint anthropic-compatible |
| `AGENTD_LLM_MODEL` | `glm-5.3-flash` | model utama |
| `AGENTD_LLM_TIMEOUT_CHAT` | `30s` | timeout chat-stream |
| `AGENTD_LLM_TIMEOUT_BATCH` | `120s` | timeout job batch |
| `AGENTD_LLM_RETRY_MAX` | `2` | retry + backoff 1s + 50% jitter |
| `AGENTD_API_BASE` | `https://teknikal.id` | base URL API teknikal.id utk tools |
| `AGENTD_API_TIMEOUT` | `10s` | per-call timeout tools |

**Telegram behavior:**
| `AGENTD_TG_API_BASE` | `https://api.telegram.org` | override utk fake test/self-host |
| `AGENTD_TG_POLL_TIMEOUT` | `25s` | server-side long-poll hold |
| `AGENTD_TG_SEND_RATE` | `25` | msg/s global fan-out (+jitter 20%) |
| `AGENTD_TG_EDIT_MIN_INTERVAL` | `900ms` | debounce stream editor |
| `AGENTD_TG_EDIT_DELTA_CHARS` | `180` | threshold flush delta |
| `AGENTD_INPUT_MAX_CHARS` | `2000` | cap pesan masuk (V4-M1) |

**Queue & worker:**
| `AGENTD_WORKERS_CHAT` | `12` | goroutine chatw |
| `AGENTD_WORKERS_BRIEF` | `4` | briefw |
| `AGENTD_WORKERS_RESEARCH` | `4` | researchw |
| `AGENTD_WORKERS_ALERT` | `8` | alertw |
| `AGENTD_WORKERS_PDF` | `2` | pdf |
| `AGENTD_QUEUE_BACKPRESSURE` | `100` | depth chat → tolak non-PRO |
| `AGENTD_PG_POOL_MAX` | `10` | pgx pool (dipakai River juga) |
| `AGENTD_PG_STMT_TIMEOUT` | `5s` | statement timeout |

**HTTP observ & misc:**
| `AGENTD_HTTP_ADDR` | `127.0.0.1:9101` | healthz/readyz/metrics |
| `AGENTD_LOG_LEVEL` | `info` | debug|info|warn|error |
| `AGENTD_LOG_FILE` | `/var/log/teknikal-agent/agentd.log` | kosong = stdout (journald) |
| `AGENTD_MIDTRANS_ENV` | `production` | production|sandbox |
| `AGENTD_WEBHOOK_INTERNAL_TOKEN` | `***` | auth forward Next.js → agentd webhook |
| `AGENTD_TICKER_UNIVERSE` | `940` | ukuran allowlist (loaded dari DB harian) |
| `AGENTD_RSS_ALLOWLIST` | `bisnis.com,kontan.co.id,cnbcindonesia.com,idx.co.id` | domain allowlist ingest |

(GOMEMLIMIT/GOGC di-set systemd unit, bukan .env — E.4.)

---

## F. OBSERVABILITY

### F.1 Endpoint (bind `127.0.0.1:9101` — internal only)
- `GET /healthz` → 200 `{"ok":true,"pg":"up","tg_poll_lag_s":2.1,"river_pending":{"chat":3,"alert":0,"brief":0,"riset":1},"llm_error_rate_1h":0.02}` — probe liveness+internals utk watchdog systemd & operator.
- `GET /readyz` → 200 saat: pg ping <1s, River client start, getMe valid, LLM breaker != open — dipakai gate deploy (systemd `ExecStartPost` curl loop / deploy script menunggu ready).
- `GET /metrics` → prometheus text-format (`prometheus/client_golang` — sudah dipakai hivePOS produksi, terbukti; text-format tanpa extra dep server).

### F.2 Metric daftar final (prefix `ta_`, BLUEPRINT A.9 + THREAT-MODEL deteksi)
`ta_messages_in_total`, `ta_first_token_seconds` (histogram), `ta_llm_calls_total{kind,result}`, `ta_queue_depth{group}`, `ta_brief_sent_total{result}`, `ta_alert_push_total`, `ta_sub_event_total{from,to}`, `ta_guard_block_total{layer}`, `ta_postfilter_block_total{reason}`, `ta_tool_denied_total{reason}`, `ta_input_rejected_total{reason}`, `ta_webhook_total{result}`, `ta_trial_denied_total{reason}`, `ta_memory_rejected_total{reason}`, `ta_prompt_cache_hit_rate`, `ta_dlq_total`, `ta_tg_poll_lag_seconds`.

### F.3 Log fields standar (slog JSON — WAJIB di semua log line jalur pesan)
| Field | Isi | Contoh |
|---|---|---|
| `trace_id` | 12-hex dari tracex — satu ID dari pesan masuk → jawaban terkirim (forensik V9) | `"a7f3c9e1b2d4"` |
| `chat_id` | tg_id chat private | `6123456789` |
| `tier` | FREE/BASIC/PRO/PREMIUM saat event | `"PRO"` |
| `turn_id` | ID 1 pesan-user→1 jawaban (definisi kuota PLAN) | `"t_01HV…"` |
| + konteks | `worker`, `job_id`, `queue`, `tool`, `result`, `error`, `duration_ms` | — |

### F.4 Alert admin via TG (dogfooding)
`observ/adminalert.go` (pakai `tgclient` send yang sama): kirim bila (1) DLQ >5 job/jam; (2) first-token P95 1j >2,5s; (3) tg_poll_lag >60s; (4) webhook sig-fail >0; (5) pembuatan agent_user >20/jam (V5-M4). Rate-limit alert 1/jenis/jam (anti spam admin), semua alert juga ERROR-log + counter.

---

## G. RINGKASAN KEPUTUSAN (untuk reviewer)
1. **Tele lib**: COPY file `aegisgo/internal/telegram` (stdlib, teruji, at-least-once) + adapt module path/429/stream-editor — go-telegram-bot-api/v5 ditolak (maintainer archived, nol nilai tambah). Copy kode sendiri = OK per REUSE LAW §0; dep eksternal tetap go.mod normal.
2. **Repo**: BARU `teknikal-agent/` standalone (deploy systemd, CI Go, tim agent-org), TANPA import lintas repo & tanpa go.mod replace; struktur dokumentasi rapi ala teknikalidnew: `AGENTS.md` (clean-code law blocking, done-when + bukti fisik, GATEGUARD, REUSE LAW), `README.md`, `CHANGELOG.md`, `.env.example`, `docs/agent-org/` (decisions/changelog/handoff) + `docs/specs/`. Kontrak dengan teknikalidnew via `api/` (HTTP + DB schema + webhook forward), bukan shared code.
3. **Top-3 pattern adopsi** (semua copy-file, bukan import): (a) `task.Group` bounded-join cancellation (graceful shutdown 25s), (b) hivePOS circuit breaker di 3 titik outbond, (c) aegisgo dualTool generic registry (router deterministic + LLM function-calling satu implementasi).
4. Standard: gofumpt + golangci-lint v2 (21 linter, cyclo ≤12, lll ≤110, ctx-first, %w-wrap, depguard larang GORM/testify/go-telegram-bot-api) + pre-commit + CI blocking (lint/test/race/cover≥80/e2e/redteam 20-20) — semuanya dinyatakan executable di AGENTS.md, bukan adat tak tertulis.
