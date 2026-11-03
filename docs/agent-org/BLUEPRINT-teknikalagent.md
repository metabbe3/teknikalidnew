# BLUEPRINT EKSEKUSI — TeknikalAgent
Tanggal: 2 Nov 2026 · Turunan dari: PLAN-saham-agent-1102.md (v2, owner-approved direction) · Status: BLUEPRINT untuk eksekusi
Bot: @TeknikalAgentBot · Engine: Go standalone `agentd` · LLM: glm-5.3-flash ALL-TIER (batch -50% utk async)

> Semua keputusan owner di PLAN v2 (nama, engine Go, tiers, trial Rp1.000, framing regulasi, unit economics) TIDAK DIUBAH. Dokumen ini mematangkan arah menjadi struktur eksekusi: arsitektur detail, design kecepatan, limitasi produk yang sellable, monetisasi, dan risiko.

---

## A. ARSITEKTUR GO ENGINE

### A.1 Layout modul (repo `teknikal-agent/`)

```
teknikal-agent/
├── cmd/agentd/main.go          # binary TUNGGAL: flag -role=all|listener|worker (default all); wiring DI manual tanpa framework
├── internal/
│   ├── tglistener/             # LONG-POLLING getUpdates (bukan webhook — reasoning di A.3)
│   │   ├── poll.go             # loop 25s offset-ack, reconnect exponential backoff 1s→60s (cap)
│   │   ├── update.go           # parse Update → normalisasi ke InMsg{tgID, chatID, text, cbq, deepLink}
│   │   ├── editor.go           # streaming edit-message: debounce 900ms / delta ≥180 char / batas 1 edit/dtk (rate limit TG 1/s per chat)
│   │   └── sender.go           # fan-out brief pagi: 25 msg/s global + jitter 20%, retry 429 dgn Retry-After
│   ├── queue/                  # River Queue (Postgres-backed) — reasoning A.4
│   │   ├── enqueue.go          # insert job + priority: chat=1 alert=2 brief=3 riset=4 housekeeping=5
│   │   ├── streams.go          # 5 worker-group terpisah dgn queue-select WHERE priority
│   │   └── dlq.go              # dead-letter setelah retry^3 (backoff 30s,2m,10m), alert admin via TG
│   ├── router/                 # FAST-PATH non-LLM sebelum enqueue chat (hemat 90% biaya, jaga latency)
│   │   ├── intent.go           # regex+keyword triase: harga-1-saham (/p bbca), watchlist CRUD, status langganan, help, perintah menu → balas <100ms TANPA LLM
│   │   ├── quota.go            # cek usage_ledger per jam/hari (redis-like in-mem LRU 10k kunci + persist ke Postgres tiap 60s / on-boundary)
│   │   └── guard.go            # filter toxic/abuse + topik terlarang (minta "rekom beli" → jawab template framing patuh + edukasi ulang)
│   ├── workers/
│   │   ├── chatw.go            # worker chat: system prompt + tools + memori ringkas; STREAMING → editor.go
│   │   ├── briefw.go           # 08:05 WIB: pre-compute snapshot (C.2) → 1 flash call per user (personal) → kirim; WIB libur IDX otomatis skip via calendar
│   │   ├── researchw.go        # job async malam (antre + notifikasi hasil; batch API utk panggilan berat, -50%)
│   │   ├── alertw.go           # sweep tiap 60s: harga live cache + rule user + berita material → compose flash → push (P95 <2s)
│   │   └── learnerw.go         # 02:00 WIB: ekstrak pelajaran interaksi → agent_memory → inject system prompt besok (pola Hermes memory)
│   ├── tools/                  # FUNCTION-CALLING agent tools — SEMUA angka dari sini, LLM dilarang mengarang
│   │   ├── client.go           # HTTP client ke API teknikal.id, header mService-Token (service-auth, bypass rate-limit per-IP)
│   │   ├── quote.go            # harga live (cache 60s), EOD, historis
│   │   ├── fundflow.go         # foreign flow CDP, bandarmologi
│   │   ├── fundamental.go      # P/E, PBV, ROE, dividen, LK vs median sektor 3 tahun
│   │   ├── news.go             # berita emiten + klasifikasi materialitas
│   │   └── watchlist.go        # CRUD watchlist via prisma schema existing
│   ├── llm/                    # provider-agnostic wrapper
│   │   ├── client.go           # Z.ai anthropic-compatible; http.Client Timeout=30s/chat-stream, 120s/batch-job
│   │   ├── stream.go           # SSE parse → channel chunk; ctx cancel saat user stop
│   │   └── batch.go            # batch API utk riset+learner (malam, -50% biaya)
│   ├── pdf/                    # gofpdf (bukan chromedp — reasoning A.7): brief 1-2 hal + riset 2-4 hal, font reguler+bond
│   ├── billing/                # Midtrans merchant teknikal (akun hivePOS di-rename owner 2 Nov, kredensial live di .env; REUSE midtrans.go hivePOS)
│   │   ├── midtrans.go         # snap link + order_id `TA-<tg_id>-<periode>` + webhook verify signature
│   │   └── sub.go              # state machine: TRIAL → PAID → GRACE(H-3 reminder) → FREE soft (bukan hard-stop)
│   └── learner/                # ekstraksi memori: ringkasan interaksi harian → ≤10 pelajaran persisten/user, dipangkas otomatis
├── migrations/                 # SQL mig: 0001_agent.sql … (tabel baru lihat A.6)
└── deploy/systemd/agentd.service
```

### A.2 Diagram alur (1 gambar)

```
                         ┌─────────────────────────────── VPS teknikal.id (share) ───────────────────────────────┐
 Telegram ──long-poll──► │ tglistener ──► router(triage/quota/guard) ──enqueue──► River (Postgres)                │
                         │                                                   │ 5 worker-group by priority                    │
 cron 08:05 WIB ────────► │ scheduler ──► brief-jobs ────────────────────────────┤ chatw  (12)  streaming → editor │
 cron riset malam ──────► │ scheduler ──► research-jobs (batch API)               │ briefw (4)                    │
 tick 60s ──────────────► │ alertw sweep: live-cache + rule → compose → push      │ alertw (8+1 sweep)            │
 Midtrans webhook ──────► │ /api/payment/* (existing Next.js) ──► sub state ──────│ researchw(4) learnerw(1) pdf(2)│
                         └──────────────────────────────► Postgres prisma + tabel agent_* ◄───────────────────────┘
```

### A.3 Telegram: long-polling, BUKAN webhook — dan lib: go-telegram-bot-api v5
- **go-telegram-bot-api/telegram-bot-api/v5** (go get) — de-facto standard, stabil 8+ tahun, API permukaan tipis (Update, Message, EditMessageText, AnswerCallbackQuery), zero dependency berat, mudah wrap sendChatty (retry 429 + jitter). Alternatif ditolak: telebot v3 (abstraksi bagus tapi lebih tebal & sesekali breaking), eh ?? (layer framework, terlalu banyak magic utk kebutuhan chat+edit). Bot hanya butuh ~6 endpoint TG — lib tipis menang.
- **Long-polling menang atas webhook**: (1) tidak ekspos VPS ke publik utk endpoint TG; (2) tidak berebut port/trusted-proxy dgn Next.js teknikal.id di VPS yang sama; (3) zero infra tambahan (no TLS cert, no reverse-proxy rule); (4) latency delta webhook-vs-poll ±2-3 dtk hanya pada pesan MASUK — first-token budget 2s diukur DARI pesan diterima listener, jadi tidak memakan budget; (5) kalau traffic naik >5k user, migrasi ke webhook = 1 flag config, arsitektur tidak berubah.
- **Streaming edit**: TG membatasi edit ~1/dtk per chat → editor debounce 900ms/delta≥180 char, kalau >4096 char pecah jadi pesan lanjutan. UX terasa "mengetik sendiri", first-visible-text target <2s.

### A.4 Queue: RIVER — rekomendasi final
| Opsi | Verdict | Alasan singkat |
|---|---|---|
| **River (riverqueue.com)** | ✅ **PAKAI INI** | Postgres-backed (ASSET ONLY — tidak ada Redis/NATS server baru di VPS 2GB), transactional enqueue dgn data app (job brief insert sekaligus dgn row state), retry+dead-letter built-in, periodic jobs (cron 08:05) native, Go-first by ex-Cloudflare, MIT. RAM footprint ~0 (tabel, bukan proses). |
| asynq | ❌ | Butuh Redis proses terpisah (RAM 30-80MB + satu supervision lagi); Redis di VPS share = dua hal bisa mati bersama. Fitur sama-sama lengkap tapi infra +1 moving part. |
| NATS JetStream | ❌ | Overkill: butuh cluster/proses nats-server sendiri (~100MB+), konsep stream/consumer terlalu berat utk 4 tipe job; keunggulan NATS (fan-out pub/sub lintas service, geo) tidak dipakai di sini. Untuk scale 10k+ user nanti bisa migrasi — antarmuka `queue.Enqueue` sudah diabstraksi di internal/queue. |

**Kesimpulan satu kalimat**: River = zero infra baru, reliability same-class, dan seluruh state tetap di satu Postgres yang sudah wajib ada — asynq/NATS menambah server demi fitur yang tidak kita butuhkan di ≤5k user.

### A.5 Worker pool + graceful shutdown + prioritas
- **Pool per worker-group** (basa-basi satu pool besar dgn mixed job menaikkan head-of-line blocking): chatw ×12, briefw ×4, researchw ×4, alertw ×8, learnerw ×1, pdf ×2 → total **31 goroutine worker** (murah; bukan 31 thread OS).
- **Prioritas via queue-select**: River mendukung custom query worker; kita SELECT job `ORDER BY priority` → chat(1) selalu diambil duluan walau brief(3) menumpuk. Batas konkrit: jika antrean chat >40 (burst), alert tetap lolos di priority 2 karena tidak sekelompok dgn chat.
- **Graceful shutdown** (SIGTERM dari systemd → 25s timeout stop):
  1. tglistener berhenti getUpdates (offset acked) → tak ada job baru;
  2. stop enqueue baru;
  3. worker menyelesaikan job in-flight (chat stream <30s; brief fan-out di-cut di batas user, resume dari snapshot saat start — idempotent);
  4. flush quota cache → Postgres;
  5. River client Stop() (built-in drain).
- **Backpressure**: jika queue chat depth >100 (LLM degradasi), listener balas pesan "sistem sibuk, coba lagi" utk non-PRO (PRO tetap diproses) — melindungi latency semua orang.

### A.6 Target latency (diukur end-to-end, bukan harga diri)
| Jalur | Target | Budget rinci |
|---|---|---|
| Chat first-visible-token | **<2,0s P95** | poll-pickup 100ms + router triase/quota 15ms + enqueue 10ms + worker pickup 50ms + tools (cache hit) 80ms + LLM first-token ≤1.200ms + edit 60ms ≈ **worst 1.515ms** — hemat 485ms utk jitter. |
| Perintah cepat (harga/watchlist, non-LLM) | <100ms | router fast-path langsung balas tanpa queue LLM. |
| Brief harian 08:05 | **semua terkirim <3 mnt** | pre-compute snapshot ≤4 mnt (mulai 08:05 paralel kirim): compose pribadi per user = 1 flash call ~1,2s ×500 user ÷10 paralel ≈ 60s; fan-out kirim 500 msg ÷25/s dgn jitter ≈ 25s → total ~85-90s ✅. Skala: 2.000 user ≈ 4-5 mnt (naikkan briefw→8, tetap satu VPS). |
| Riset (async) | malam, jadwal bebas | job antre → user dapat notifikasi hasil; SLA <12 jam, rata-rata <2 jam (batch API malam). |
| Alert harga/berita | **P95 <2s dari data tersedia** | sweep 60s + compose flash 1,5s + send 300ms ≈ 1,9s. |
| Learner | 02:00-04:00 | non-interaktif, tak dianggap latency. |

### A.7 Resource budget — single VPS share dgn teknikal.id
- **RAM agentd: <150MB utk 500 user** — budget eksplisit: runtime Go+GC ~45 + listener 3 + workers/stream-buffers 12×2MB=24 + pool DB 6 + PDF burst 10 + headroom ~40 = **~128MB peak** ✅. GC tuning: `GOGC=40` + `GOMEMLIMIT=140MiB` (soft cap, GC agresif sebelum OOM).
- **gofpdf untuk PDF, BUKAN chromedp**: chromedp butuh headless Chrome ~150-300MB RAM — meledakkan budget sendirian. gofpdf murni Go ~0 baseline, cukup utk layout brief 1-2 hal & riset 2-4 hal (teks+tabel+garis; tidak butuh render HTML). Keputusan: PDF = dokumen data, bukan marketing kit.
- **Postgres connection pool**: `pgx/v5` pool max 10 utk agentd (web Next.js punya pool sendiri, disepakati total VPS <30 koneksi), health-check query 30s, statement timeout 5s. River memakai pool yang sama.
- **CPU**: chat I/O-bound (LLM eksternal) — 1 core cukup utk 500 user; brief burst pakai 2 core sebentar (±5 mnt/hari).
- **Disk**: log JSON-lines + rotasi 7 hari <1GB/bulan; PDF hasil disimpan S3-compatible/R2 (URL bertahan, hemat disk VPS).

### A.8 Pola DB — tabel baru (prisma schema extend) + index
| Tabel baru | Kolom kunci | Index |
|---|---|---|
| `agent_user` | tg_id (uniq), anon_prefix (uniq, FK-like ke TelegramWatch), tier, trial_ends_at, timezone | `uniq(tg_id)`; `idx(tier, trial_ends_at)` utk downgrade cron |
| `agent_profile` | tg_id, saham_utama[], profil_risiko, jam_brief | `uniq(tg_id)` |
| `agent_session` | tg_id, last_msg_id, ringkasan_konteks (dipangkas), updated_at | `uniq(tg_id)`; partial `WHERE updated_at > now()-'7 days'` |
| `agent_memory` | tg_id, jenis(pelajaran/preferensi/faq), isi, skor_relevansi, created_at | `idx(tg_id, skor_relevansi DESC)` |
| `agent_alert_rule` | tg_id, simbol, tipe(harga/news/flow), kondisi jsonb, aktif | `idx(aktif, simbol)` utk sweep 60s |
| `agent_usage_ledger` | tg_id, jendela_jam timestamptz, chat_turn, riset_dipakai, alert_terkirim | `uniq(tg_id, jendela_jam)` — 1 row/jam/user, upsert atomic `ON CONFLICT DO UPDATE` |
| `agent_research_job` | tg_id, simbol, status(queued/done/failed), hasil_url, created_at | `idx(status, created_at)` |
| `agent_subscription` | tg_id, tier, mulai, akhir, midtrans_order_id, status | `uniq(midtrans_order_id)`; `idx(status, akhir)` |
- **Pola akses**: (1) ledger upsert 1-row-per-jam (bukan append per event) → cek kuota = 1 index scan; (2) session di-update dgn ringkasan, bukan transkrip penuh → baris tetap <4KB; (3) semua query path utama ditutup index di atas — zero seq-scan pada hot path; (4) tabel dipisah dari tabel web existing → tidak ada migrasi berisiko pada core teknikal.id.

### A.9 Observability minimal (bukan APM mahal)
- **Health**: `GET /healthz` (bind 127.0.0.1:9101) → `{ok, pg, tg_poll_lag_s, river_pending:{chat,alert,brief,riset}, llm_error_rate_1h}`; systemd `WatchdogSec=60` restart jika hang.
- **Metric counter (prometheus text, `/metrics`)**: `ta_messages_in_total`, `ta_first_token_seconds` (histogram), `ta_llm_calls_total{kind,result}`, `ta_queue_depth{group}`, `ta_brief_sent_total{result}`, `ta_alert_push_total`, `ta_sub_event_total{from,to}` — cukup utk melihat: latency naik? queue numpuk? churn di tier mana? (grafana later, sekarang cukup `curl | awk`).
- **Log**: JSON-lines ke file (level info; debug hanya dengan flag `-debug`), trace_id per pesan (tg_id+msg_id) → bisa dilacak end-to-end saat keluhan user.
- **Alert admin**: DLQ >5 job/jam ATAU first-token P95 1j >2,5s ATAU tg_poll_lag >60s → TG message ke admin (dogfooding bot sendiri).

---

## B. DESIGN KECEPATAN-RESPONSIF (UX = fitur #1)

### B.1 Streaming answer di Telegram (pola edit-message)
```
user kirim pesan
  → router triase (<15ms)
  → [butuh LLM] kirim placeholder "•••" SEKARANG (user lihat respons <300ms)
  → worker stream LLM; tiap chunk masuk buffer editor
  → editor flush: debounce 900ms ATAU delta ≥180 char ATAU batas 1 edit/dtk
  → selesai: edit final + tombol inline (👍/👎 → flywheel eval 3-judge reuse)
```
- Aturan aman rate-limit TG: 1 edit/dtk per chat sudah di-bangun di debounce; kalau teks >4.096 char → pecah ke pesan baru dgn "(lanjutan)".
- Kalau LLM first-token >1,5s (belum ada yang bisa ditampilkan) → ganti placeholder jadi "Sedang menarik data & menulis…" (set expectation, perceived latency turun).

### B.2 Pre-compute cache brief (stok data SEBELUM LLM call)
1. **07:30 WIB**: snapshot batch — fetch EOD kemarin + live pagi + foreign flow + fundamental utk SEMUA simbol watchlist union semua user (940 saham pipeline existing, mService-Token) → tabel `brief_snapshot` (jsonb per simbol, 1 row/hari).
2. **08:05**: briefw per user TIDAK panggil tools per-saham lagi — cukup baca snapshot (1 query `WHERE simbol = ANY(...)`) + profil user → susun prompt → 1 flash call. Latency per user = murni LLM (~1,2s), bukan data-fetch.
3. Prompt-cache friendly: system prompt + blok data pasar identik lintas user ditaruh Paling-Depan prompt → prefix-cache hit antar user (harga prompt-cache murah) → biaya per brief turun.
4. Bonus: chatw juga baca snapshot utk pertanyaan pagi ("bagaimana BBCA hari ini") → skip tools call, respons makin cepat.

### B.3 Fallback kalau LLM timeout / error
| Kondisi | Fallback |
|---|---|
| First-token >8s (stream mati) | matikan stream, kirim **data-first card** dari snapshot: "BBCA 9.750 (-0,8%) · support 9.800 waspadai · net foreign sell 2 hari · P/ 2,1x vs sektor 2,4x" + "narasi sedang gangguan, data di atas langsung dari bursa". |
| LLM error mid-stream | pesan sudah ter-edit sebagian → edit terakhir ditutup "(terputus, lanjutkan dengan /ulang)" — session simpan konteks, /ulang resume tanpa bayar token baru dari nol. |
| LLM down total (>5 mnt) | router fast-path: SEMUA chat dijawab data-card dari tools/snapshot + banner status; alert tetap jalan (rule engine tidak butuh LLM utk trigger, hanya compose). |
| Batch API riset gagal/lebih dari SLA 12 jam | auto-retry sebagai non-batch real-time (biaya naik, kepuasan dijaga) + notifikasi "hasil lebih awal". |

### B.4 Queue prioritization
`chat(1) > alert(2) > brief(3) > riset(4) > housekeeping(5)` — alasan: chat adalah satu-satunya jalur interaktif (user menunggu, diam-diam diam menilai); alert menunggu tapi berbasis peristiwa pasar (nilai = kecepatan relatif terhadap pergerakan); brief punya slack 3 menit; riset SLA 12 jam. Konkurensi dijamin via worker-group terpisah (A.5) — riset malam TIDAK AKAN pernah memakan goroutine chatw.

---

## C. LIMITASI PRODUK — JUJUR & SELLABLE

> Prinsip: batasan yang DISEBUT DI DEPAN = positioning jujur; batasan yang DITABARI = churn. Setiap limit di bawah punya (1) alasan teknis/regulasi, (2) bahasa jujur untuk user, (3) pintu upgrade.

### C.1 Caps per tier (final + alasan)
| Batas | FREE | BASIC | PRO | PREMIUM | Alasan angka |
|---|---|---|---|---|---|
| Watchlist aktif | **3** | **5** | **15** | **30** | FREE 3 = cukup buat "coba rasa" tapi brief pribadi terasa beda saat punya ≥5 (psikologis: keinginan daftar lebih). BASIC 5 = rata-rata ritel Indonesia memegang 3-5 saham (survei KSEI: domisili porto sempit) — 5 pas. PRO 15 = pelaku serius yang menambah posisi lapis kedua; sektor compass menuntut lintas-sektor. PREMIUM 30 = batas kewarasan monitoring manual; lebih dari itu user butuh screener, bukan assistant. Opsional implementasi: cap UNIK SIMBOL total per user lintas fitur (watchlist+riset+alert) — 1 angka, mudah dijelaskan. |
| **Watchlist itu SLOT, bukan kontrak** | — | swap/unlist kapan saja | — | swap/unlist kapan saja | Cap = jumlah SAHAM AKTIF DIPANTAU bersamaan, bukan kuota bulanan. Ganti BBCA→BMRI gratis & unlimited, 1 perintah (`/ganti BBCA BMRI` atau chat natural "ganti bbca ke bmri"). Riwayat unlist DISIMPAN (bukan dihapus) → riset saham lama tetap bisa dibuka; user tidak pernah "kehilangan" data. Cap hanya membatasi yang AKTIF dipantau hari ini. |
| Chat/jam (anti-loop, kebijakan) | 3/hari | 10/jam | 20/jam | 20/jam (kuota tier 80/jam hampir tak pernah tersentuh — anti-loop 20/jam lebih ketat demi kualitas percakapan) | 20 turn/jam = 1 pesan/3 mnt — manusia membaca respons TIDAK lebih cepat; ini cap abuse, bukan biaya |
| Riset/bln | 0 | 0 | 6 | 30 | Riset = job async paling mahal (multi-step tools + batch + PDF); 6/bln PRO ≈ 1-2/minggu = kebiasaan riset sehat, bukan spam |
| Alert rule aktif | 3 | 5 | 10 | 15 | Anti-spam = anti-churn (cap 15 push/hari); jumlah rule ≤ watchlist agar alert tetap "kehendak user" (regulasi: alert = rule yang USER set) |
| PDF | — | — | ✅ | ✅ | PRO+ saja — artefak nilai yang kelihatan (bisa disimpan/dishare) |
| Sector Compass | — | — | ✅ | ✅ | fitur differentiator PRO |

### C.2 Riset depth & turn caps (detail teknis-produk)
- **1 riset = 1 saham, 1 template kanonis** (4 bagian: Diagnostik → Bandarmologi → Fundamental vs sektor → Risiko & sinyal waspada) — kedalaman KONSISTEN lebih menjual daripada "kadang dalam".
- Budget per riset: ≤8 tool-calls + ≤6.000 token output + 1 PDF 2-4 halaman; runtime batch malam. Hard cap = jaminan margin & SLA.
- Riset lanjutan/"menggali" = tanya ulang di CHAT (burn kuota chat, bukan riset baru) — mendorong kebiasaan interaktif yang lebih murah dan lebih lengket.
- Chat turn dipangkas konteks: >12 turn → ringkasan otomatis (session summary), transkrip penuh tidak pernah dikirim ulang → biaya per turn stabil Rp100-200.

### C.3 Yang TIDAK diberikan — dan kenapa justru membangun kepercayaan
| Tidak ada | Bahasa jujur ke user | Kenapa justru sellable |
|---|---|---|
| Auto-trading / eksekusi order | "TeknikalAgent tidak bisa dan tidak akan memindahkan uang atau mengeksekusi transaksi apa pun." | Uang tidak tersentuh = tidak ada risiko dana hilang "karena bot". Pemisahan tugas: KEPUTUSAN tetap di tangan user — sejalan UU 8/1995 P27+P103 (rekomendasi imperatif tanpa izin PI = pidana) dan POJK 6/2026. Limitasi ini = tameng hukum BERSAMA user, bukan cuma perusahaan. |
| Guaranteed return / janji untung | "Akurasi bukan janji. Semua output = riset & penyaringan berita, keputusan dan risiko tetap milik Anda." | Produk pesaing yang berani "jamin" adalah yang kena tindakan OJK. Jujur = bisa beroperasi lama. User ritel yang tinggal jangka panjang justru yang menghargai tidak ada janji. |
| Integrasi broker | "Tidak ada koneksi ke broker Anda — tidak perlu API key, tidak ada akses akun." | Zero onboarding friction ke bagian sensitif + zero liability. User paranoid (yang benar) langsung nyaman. |
| Sinyal "beli/jual sekarang" / target harga imperatif | "Bot memakai bahasa waspada: 'waspadai support 9.800', 'berita ini berdampak historis', 'sektor X UNDERWEIGHT'." | Bahasa manajer institusional — user merasa diperlakukan serius, bukan digurui. |
| Data non-publik / "(mbuh)" | "Semua angka dari data resmi IDX/CDP dan sitasi berita. Bot tidak menerima info privat." | Setiap angka bisa dilacak ke sumber = zero-tolerance halusinasi terasa nyata. |
| Prediksi makro/krypto/forex (di luar saham IDX) | "Fokus kami 940 saham IDX — bukan krypto, bukan forex." | Fokus = kualitas. Positioning "asisten saham IDX paling dalam" > "asisten semua hal". |

### C.4 Honesty card di onboarding (teks final siap pakai)
Dikirim sebagai pesan #2 setelah audit portofolio instan (sebelum user sempat ekspektasi salah):
```
⚖️ Cara kerja TeknikalAgent — 3 hal jujur di depan:
1️⃣ AKURASI BUKAN JANJI. Bot adalah asisten riset & penyaring berita.
   Ia menarik data, menandai pola, memberi konteks — KEPUTUSAN tetap Anda.
2️⃣ SEMUA ANGKA DARI SUMBER RESMI. Harga & flow: bursa/IDX & CDP.
   Fundamental: laporan emiten. Berita: sitasi yang bisa Anda buka.
   Bot tidak punya informasi privat & tidak pernah mengarang angka.
3️⃣ TIDAK ADA AUTO-TRADING. Bot tidak pegang uang, tidak eksekusi order,
   tidak terhubung broker Anda. Aman secara hukum & aman untuk dana Anda.

Setiap output diakhiri disclaimer. Ini alat bantu riset — bukan penasihat
investasi berizin. 📉📈 pasar selalu punya risiko.
   [Lihat contoh output →]  [Mulai trial Rp1.000 →]
```
- Honesty card juga jadi komponen tetap: (1) footer trial H+13 rapor, (2) halaman harga di web, (3) respons guard.go saat user minta "rekom beli" (loop edukasi, bukan hard reject).

### C.5 Disclaimer footer (tiap output, 1 baris, tidak nego)
`— Riset & informasi, bukan ajakan membeli/menjual efek. Data: IDX/CDP & laporan emiten. Keputusan & risiko Anda.`

---

## D. MONETISASI & WILLINGNESS-TO-PAY

### D.1 Benchmark pasar Indonesia (riset 2 Nov)
- **Invezgo** (kompetitor PALING langsung — AI chat saham via WA+TG, rilis Sep 2026): freemium, berbayar bulanan; + Live Alert Telegram.
- **Stockbit** (acro): gratis/onboarding penuh, monetisasi lewat broker (agen efek) — disclaimer eksplisit "bukan investment advice, bukan ajakan beli/jual" (stockbit.com/terms) = preseden framing yang sudah diterima pasar.
- **SinyalTrader** dkk.: sinyal berbayar — justru posisi HUKUM paling rapuh (rekomendasi imperatif).
- Realita harga ritel Indonesia: makan di resto sederhana Rp50-80rb; langganan digital premium (Spotify) Rp55rb; sekelas "tools kerja" ritel (modem, screener pihak ketiga) Rp100-300rb.

### D.2 Argumentasi harga per tier
| Tier | Harga | Argumen inti |
|---|---|---|
| FREE | Rp0 | Bukan produk — ALAT AKUISISI. 3 chat/hr cukup untuk hook, tidak cukup untuk kebiasaan. Biaya/bln Rp6rb = CAC organik. |
| BASIC | **Rp79rb** | "Lebih murah dari 1x makan keluarga — ganti makan 1x sebulan dengan riset yang bekerja tiap pagi." Anchor: 1 jam konsultasi manusia ≥Rp500rb; 30 brief personal = Rp2.633/pagi. |
| PRO | **Rp149rb** | "Kopi + gorengan sehari" (Rp5rb × 30). Tambahkan: 6 riset PDF/bln — harga 1 riset manusia bebas mulai Rp150-500rb → SATU riset sudah balik modal. Sector Compass = fitur yang tidak ada di kompetitor manapun sekelas ritel. |
| PREMIUM | **Rp299rb** | "Asisten pribadi di bawah Rp10rb/hari." Utk aktif berat (30 riset, 80 chat/jam) — paket KEBUTUHAN, bukan diskon PRO; margin tetap 47%. |

### D.3 Psikologi harga
- **Anchoring**: urutan tampil harga SELALU PREMIUM → PRO → BASIC (harga tinggi dulu membuat PRO terlihat "tengah yang waras" — decoy pricing klasik).
- ** framing harian**: Rp79rb = "Rp2.633/hari" (≈ biaya 1x makan)… Rp149rb = "Rp4.967/hari" (≈ kopi+gorengan) — angka harian selalu <Rp10rb, di bawah ambang "pikir dulu".
- **Rp1.000 trial** = komitmen mikro (saring freeloader, QRIS 1 ketuk) — orang yang sudah membayar SEKALI (walau seribu) punya sunk-cost psikologis & payment method sudah terpasang → konversi lanjut naik drastis vs free-trial.
- **Bundle tahunan 10+2** & early-bird lock 12 bln (BASIC 49rb/PRO 99rb) = reduce churn + cash flow awal; kupon winback 50% H+30 pasca-churn.

### D.4 Upsell path (invisible ladder)
```
FREE (3 chat/hr, brief umum)
  → cap chat tersentuh 3x dalam 7 hari → soft-nudge: "Anda bertanya banyak hari ini 📊 PRO bisa jawab 20x/jam" + tombol
BASIC → trigger upgrade: (1) minta riset PDF → "riset itu fitur PRO", (2) watchlist >5 saat user add saham ke-6 → dialog "PRO memantau 15", (3) tanya soal sektor → "Sector Compass PRO"

**Rebalance Radar (PRO+, Senin 19:30 WIB — ANALISIS, BUKAN ADVICE):**
- Weekly per user: komposisi watchlist+portofolio user vs label bobot sektor (Sector Compass) → deteksi **KONSENTRASI & DRIFT** secara faktual: "3 dari 5 saham Anda di sektor bank (60% konsentrasi, terkonsentrasi di 1 sektor — median ritel 2 sektor)"; "saham X kini 45% dari estimasi nilai porto Anda, 6 bulan lalu 20% — drift karena naik 130%"
- Output = **OBSERVASI + PERTANYAAN**, bukan instruksi: "Ingin diversifikasi? 3 kandidat sektor UNDERWEIGHT yang sedang dapat akumulasi asing: [ticker]. Pelajari dulu sebelum memutuskan — keputusan sepenuhnya Anda." TIDAK PERNAH: "kurangi X", "jual Y", persentase alokasi target personal
- Komponen radar: konsentrasi sektor (HHI sederhana), drift bobot vs 6 bln lalu, korelasi pasangan saham (semua bank berkorelasi — fakta historis), overlap dividen/catalyst calendar
- Frame kepatuhan: "pemindaian struktur portofolio" = deskripsi data; kalimat imperatif realokasi = territory Penasihat Investasi → DILARANG (guard.go memblokir + reframing otomatis)
- Regulator POV: sistem yang menyodorkan "jual X beli Y" otomatis berbayar = mesin rekomendasi (riskan); sistem yang bilang "portfolio Anda 60% bank, ini implikasinya secara historis, pertanyaan yang layak Anda pikirkan" = analisis berimbang (3 pilar POJK 6/2026: seimbang, disclaimer, no return promise)
PRO → PREMIUM: saat kuota riset 6 habis lebih cepat dari akhir bulan → "30 riset di PREMIUM"
Trial PRO (Rp1.000/14 hari) → H+13 rapor trial (daftar semua yang bot kerjakan) → tombol lanjut PRO 149rb / turun BASIC 79rb (pilihan ganda = bukan yes/no)
```
- Setiap nudge maksimal 1x/hari, tidak pernah di tengah alur kerja user (anti-jengkel = anti-churn).

### D.5 Churn defense
1. **Value akumulatif, bukan momen**: memori & pelajaran learner membuat bot makin "kenal" user tiap bulan — biaya pindah = kehilangan konteks pribadi (switching cost yang nyaman).
2. **Rutin yang mengakar**: brief 08:05 tiap pagi = habit loop (cue-pagi, routine-baca, reward-temuan). Kebiasaan harian churn paling lambat.
3. **Soft downgrade, bukan hard stop**: expired → FREE teaser (tetap dapat alert teknikal + brief umum) → pintu masuk kembali selalu terbuka; winback H+30 diskon 50%.
4. **Bukti kerja bulanan**: rapor bulanan ringkas ("bulan ini: 22 brief, 41 alert tepat waktu, 4 riset PDF") = receipts yang menagih nilai, dikirim H-3 sebelum renewal.
5. **Trial proof-machine** (H+0 diagnostik → H+1 → H+3 → H+6 → H+13) — keputusan bayar berbasis BUKTI sistem, bukan janji sales.

---

## E. RISIKO TEKNIK TOP-5 + MITIGASI

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| 1 | **LLM upstream down / degradasi** (Z.ai outage, latency naik) | Chat & brief mati — produk terasa "mati total" | (a) fallback bertingkat B.3 (data-card dari snapshot — nilai tetap tersalur); (b) wrapper `llm/client.go` provider-agnostic — spare endpoint anthropic-compatible bisa dipasang via config tanpa rebuild; (c) circuit breaker: error-rate 1j >30% → semua jalur non-LLM + banner status; (d) brief hari itu tetap terkirim versi data-only. |
| 2 | **TG API rate-limit / flood saat fan-out brief & alert** | Brief terlambat massal, akun bot kena 429 panjang | (a) sender.go rate 25 msg/s + jitter 20% + hormati Retry-After; (b) fan-out idempotent — resume dari snapshot, bukan kirim ulang; (c) alert coalesce: banyak rule terpicu 1 saham → 1 pesan gabungan (menghormati cap 15/hari); (d) pisah pathname chat-edit vs broadcast di budget rate berbeda. |
| 3 | **Halusinasi angka / data salah** (LLM mengarang angka pasar) | Zero-tolerance — 1 insiden viral = reputasi mati + masalah regulasi | (a) arsitektur: SEMUA angka dari tools/DB — prompt mengikat "menulis hanya dari data yang diberikan"; (b) post-guard: regex angka+simbol di output → verifikasi ke tools sebelum kirim (fail = strip + flag); (c) eval flywheel 3-judge reuse Tanya AI — sampel output harian dinilai, regresi = alert; (d) sitasi sumber di tiap klaim material. |
| 4 | **VPS resource contention dengan teknikal.id** (RAM/CPU penuh saat burst brief + web traffic pagi) | Web & bot sama-sama lambat — dua produk terganggu | (a) budget eksplisit A.7 (GOMEMLIMIT 140MiB, pool DB 10); (b) brief pre-compute 07:30 & fan-out bertahap — bukan 1 burst; (c) systemd MemoryHigh=160M MemoryMax=200M utk agentd (OOM-kill hanya bot, bukan web); (d) PDF heavy → gofpdf bukan Chrome; (e) threshold: bila 500 user stabil & CPU pagi >70% → pisah VPS agentd (binary tunggal = migrasi 1 hari). |
| 5 | **Kepatuhan regulasi tergelincir** (output terdengar "rekomendasi", atau dianggap PI tanpa izin — UU8/1995 P27+P103, POJK 6/2026) | Risiko hukum serius (pidana) | (a) layer guard.go: block + reframe minta "beli/jual/TP" → template patuh; (b) disclaimer footer otomatis di SEMUA output (C.5); (c) eval 3-judge menilai dimensi kepatuhan (judge tambahan "regulator lens"); (d) log audit penuh output → bisa dibuktikan pola bahasa; (e) alert = hanya rule yang user set sendiri; (f) dokumentasi internal: daftar frasa terlarang vs aman (sudah di plan §4). |

*Risiko non-teknik terbesar tetap distribusi (PLAN §6.1) — bukan bagian blueprint ini, tapi semua keputusan teknis di atas dirancang agar onboarding 1-klik dari web langsung mulai value (audit portofolio <60 dtk).*

---

## F. CHECKLIST SIAP EKSEKUSI (Sprint 1 mapping)
- [ ] Repo `teknikal-agent/` skeleton modul A.1 + go.mod (deps: telegram-bot-api/v5, river, pgx/v5, gofpdf)
- [ ] migrations 0001: 8 tabel A.8 + index
- [ ] tglistener long-poll + editor streaming (B.1) → chat echo end-to-end
- [ ] router fast-path (harga/watchlist/help <100ms)
- [ ] tools: quote/fundflow/fundamental/news via mService-Token
- [ ] chatw + llm stream + guard + disclaimer footer
- [ ] briefw: snapshot 07:30 → brief 08:05 (ukur: semua terkirim <3 mnt @500 user)
- [ ] billing: Midtrans merchant teknikal (rename dari hivePOS, live) + state TRIAL/PAID/GRACE/FREE + usage_ledger caps + copy midtrans.go+circuitbreaker.go+planlimits.go dari hivePOS
- [ ] caps UX: notifikasi transparan di 80% cap bulanan ("kuota chat 80% terpakai" + tombol upgrade) — cap = upsell trigger, bukan paywall mendendak; definisi 1 turn = 1 pesan user → 1 jawaban lengkap (tools internal tidak dihitung terpisah); riset/brief/alert/PDF/fast-path NON-LLM = kuota terpisah, tidak memakan turn
- [ ] cap PREMIUM bukan dinding: lewat 1.500 → ECO MODE (chat tetap jalan, prioritas queue turun + delay 2-5s, bukan mati) + opsional TOP-UP PACK (Rp50rb = +500 turn). Benchmark nyata: owner sendiri 2.643-5.536 turn/bln di Hermes = level ekstrem; user saham realistis 150-900/bln. Chatterbox jangan dihilangkan — mereka user paling loyal, monetize via top-up
- [ ] healthz + /metrics + log trace_id
- [ ] SECURITY GATE (dari THREAT-MODEL, WAJIB sebelum jawaban LLM pertama ke user): (1) post-filter output server-side internal/router/postfilter.go — regex imperatif beli/jual/target harga/jamin-untung + soft-rewrite, di tiap editor flush; (2) disclaimer footer server-side (bukan LLM); (3) audit log semua filter-hit ke agent_output_audit (retensi 90 hr); (4) sanitizer ingest RSS (delimiting BLOK-DATA-EKSTERNAL + neutralizer imperatif); (5) memory write policy learner (preferensi netral saja, larangan bias arah — lihat THREAT-MODEL V7); (6) tools scoped per-chatId + ticker allowlist 940 simbol; (7) cap input 4.000 char/pesan; (8) GO-LIVE GATE: red-team suite 20 prompt 20/20 PASS (THREAT-MODEL seksi B)
- [ ] AGENT-IQ GATE (owner 2 Nov: "agent harus pintar seperti Hermes, mengerti arti chat user"): (1) fast-path HANYA untuk perintah eksplisit (/p, /help, harga <ticker>) — SEMUA teks bebas = agent loop LLM penuh, bukan keyword-matching kaku; (2) konteks percakapan: rolling summary 10 turn + last-mentioned-ticker resolution ("kalau yang itu gimana?" → tahu maksudnya BBCA dari turn sebelumnya); (3) typo & slang: port prompt-rule Tanya AI yang SUDAH TERBUKTI (typo-ticker correction, premiseCheck, label waktu jujur) + glosarium slang trader ID (gas/gap/TL/averaging/cuti/nyalak = naik dsb.); (4) multi-intent 1 pesan ("bbca vs bmri mana lebih aman buat dividen?" → compare 2 tool + konteks dividen); (5) bahasa campur ID/EN natural; (6) pertanyaan berpremis salah → koreksi premis dulu baru jawab (premiseCheck pattern); (7) ACCEPTANCE TEST: 30 test case bahasa natural Indonesia (typo "bca"→BBCA, slang "gap apa nggak", indirect "aku takut kejebol dong"→analisis risk level entry, follow-up tanpa sebut ticker, multi-intent, premis salah "bbca pe-nya 3 kan?"→koreksi angka nyata) — WAJIB 30/30 PASS sebelum go-live, masuk make test (fixtures JSON)
- [ ] onboarding: /start deep-link anonId → audit portofolio instan → honesty card
- [ ] systemd unit + GOMEMLIMIT + graceful shutdown drill (kill -TERM saat brief fan-out: resume tanpa duplikat)
