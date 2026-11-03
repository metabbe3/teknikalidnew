# PLAN: TeknikalAgent — Personal AI Stock Assistant (teknikal.id)
Tanggal: 2 Nov 2026 · Status: DRAFT v2 untuk approval owner · Bot: @TeknikalAgentBot

## 0. Keputusan sudah masuk
- Engine BARU **Golang** (bukan Hermes) — standalone binary, message queue, scheduler
- **REUSE = COPY ke repo baru `teknikal-agent/` (folder baru, TIDAK tercampur)** — owner rule 2 Nov: copy kode/fitur (midtrans.go, circuitbreaker, telegram layer, tool registry) ke folder milik repo baru; DILARANG import module/package lintas repo (no go.mod replace, no dependency ke aegisgo/hivepos). Semua kode jadi milik teknikal-agent, bersih dari sejarah repo lama. Dependencies eksternal (anthropic-sdk-go, river, gofpdf) tetap dependency go.mod normal
- **Dokumentasi & rules rapi ala teknikalidnew**: AGENTS.md (rules builder: clean code, linter blocking, done-when contract + bukti fisik), README.md, docs/agent-org/ terstruktur, CHANGELOG.md, Makefile, .env.example
- LLM **glm-5.3-flash ALL-TIER** (chat + brief + riset + PDF), batch API -50% untuk job async
- Kanal: **Telegram dulu** (WA hanya VIP concierge Rp399rb+ — biaya Meta Rp350-500/pesan)
- Web teknikal.id: **free data+teknikal/fundamental**, fitur AI web dihapus, jadi lead-gen → 1-klik aktifasi bot

## 1. User journey (kesederhanaan = fitur utama)
**Jawab owner 2 Nov: YA keduanya — web DAN agent, dua arah, sinkron realtime via DB shared + webhook internal:**
1. User (tanpa register) di web isi watchlist → tombol **"Aktifkan di Telegram"** 1 klik
   → deep-link `t.me/TeknikalAgentBot?start=a1b2c3d4e5f6` (anonId 12-hex existing `TelegramWatch.anonPrefix`)
2. `/start` → bot langsung kirim **audit portofolio instan** (<60 dtk, flash) — instant gratification
3. Onboarding chat 3 pertanyaan (5 saham, profil risiko, jam brief) → profil = baris DB, bukan akun
4. FREE teaser 7 hari: brief umum + 3 chat/hari → hari ke-8 otomatis paywall (tetap dapat alert level teknikal)
5. Bayar: tombol inline → **link Midtrans** (QRIS/VA/e-wallet, sudah ada endpoint `/api/payment/*`) → webhook → aktif 30 hari
6. **WEB SIDEDOOR untuk paid user:** user bayar/upgrade/perpanjang dari web (klik → Midtrans → webhook) → otomatis terdaftar/tanpa buka TG: kalau belum pernah /start, sistem simpan subscription di (anonId/web user) dan saat user pertama kali /start deep-link, agent CEK sub Existing → langsung PRO tanpa onboarding ulang; notifikasi ke TG "langganan aktif" begitu bot terikat. Kalau sudah terikat → tier naik instan, bot menyapa "PRO aktif ⚡"
7. **WATCHLIST dua arah:** tambah/ubah/ganti dari web (UI nyaman, tekan "Pantau") ATAU dari agent via chat natural ("/p bbca", "ganti bbca ke bmri", "stop pantau tlkm") → SAMA-SAMA menulis ke tabel watchlist shared (web: Watchlist/TelegramWatch; agent: via tools watchlist_ops) → perubahan dari satu sisi langsung terlihat di sisi lain (baca DB shared, bukan sync API). Cap tier berlaku sama dari kedua sisi (dicek di tools layer agent + di web API)
8. H-3 expired: bot kirim reminder + tombol perpanjang; H-0 turun ke FREE otomatis (bukan hard-stop)
9. **GANTI AKUN TELEGRAM (owner 2 Nov — WAJIB ada):** subscription terikat ke identitas web/anonId, BUKAN chatId (chatId cuma binding). Flow: web → "Pindah akun Telegram" → deep-link start sekali-pakai (token transfer, TTL 15 mnt) → /start di akun baru → binding pindah, akun lama otomatis unbind (1 subscription = 1 chatId AKTIF). Cooldown ganti 1×/7 hari (anti share-teman). Tanpa flow ini = chargeback & support nightmare (user ganti HP/nomor)
10. **MULTIPLE TG sharing quota:** default TIDAK (anti-abuse: 1 bayar dipakai 5 orang). TAPI data model mendukung sejak hari-1: usage ledger & caps dihitung per subscription_id (bukan per chat_id), tabel binding (subscription_id, chat_id, active) — kalau nanti ada demand, izinkan 2 binding aktif = quota tetap 1 pool shared, atau jadi fitur "PREMIUM 2 device". YAGNI sekarang, tanpa refactor nanti
9. Self-learning: job malaman ekstrak pelajaran dari interaksi → inject ke system prompt besok (pola Hermes memory)

## 2. Arsitektur Go engine ("teknikal-agent")
```
telegram-poll/webhook ─┐
cron-scheduler ────────┼─→ [NATS JetStream / asynq queue] → worker pool:
web-midtrans-hook ─────┘      • chat-agent worker (flash, tools, per-user state)
                              • brief-worker (08:05 WIB, batch flash)
                              • research-worker (async, batch flash, hasil → PDF)
                              • alert-worker (price/news trigger → flash compose → push)
                              • learner-worker (malam: ekstrak memori → prompt)
Store: Postgres teknikal.id现有 + tabel baru (agent_session, agent_memory, subscription, usage_ledger)
Tools agent = internal service-auth (mService-Token) ke API teknikal.id — FIX rate-limit per-IP
LLM: Z.ai anthropic-compatible, glm-5.3-flash; batch utk riset/brief/pdf; prompt-cache friendly
PDF: chromedp/gofpdf — 1-2 halaman brief + riset
```
Modul Go: `cmd/agentd` (binary tunggal), internal/{queue, llm, tools, telegram, billing, learner, pdf}. Deploy: systemd di VPS teknikal.id (±50-100MB RAM).

## 3. Tiers, trial Rp1.000, promo & caps (anti power-user membakar margin)
| Tier | Harga | Isi (advertorial) | HARD CAP BULANAN | AI cost pesimis* | Margin pesimis |
|---|---|---|---|---|---|
| FREE teaser | 0 | brief umum (one-to-many) + **3 chat/HARI** + alert teknikal template-only | 90 turn/bln | Rp7-16rb | (CAC, bukan revenue) |
| BASIC | Rp79rb | brief personal + "10 chat/hr" | **300 turn/bln** | Rp52rb | +30% |
| PRO | Rp149rb | + 6 riset/bln + PDF + foreign-flow + Sector Compass | **700 turn/bln + soft 20/jam** | Rp106rb | +26% |
| PREMIUM | Rp299rb | + "60 chat/hr" (advertorial) + 30 riset/bln | **1.500 turn/bln** | Rp220rb | +24% |
*asumsi pesimis red-team: cache-hit 30%, retry 10%, output +50%, user pakai penuh hard cap, Midtrans efektif 2,7-4,5%. Kuota per-jam = advertorial; YANG DINAIKAN hard cap bulanan di usage_ledger. Tanpa hard cap bulanan: PRO -111%, PREMIUM -180% — insolven.

**Trial Rp1.000 / 14 hari PRO** (bukan free-trial — saring freeloader, QRIS 1 ketuk):
- Sidedoor web juga aktif: 1 klik di teknikal.id → langsung bisa bayar trial tanpa buka TG
- Hari 1-3 (bukti nilai, dikerjakan SISTEM otomatis — bukan minta user kerja):
  - H+0: **Laporan Diagnostik Portofolio** instan — skor valuasi + abnormalitas tiap saham (P/E vs sektor historis, foreign flow 30 hari, jarak ke support/resistance) + agenda emiten terdekat (LK, dividen, RUPS)
  - H+1 pagi: brief PRO penuh versi user
  - H+1 malam: **hasil "demonstrasi kecerdasan"**: 1 temuan spesifik dari watchlist ("BBCA net foreign buy 4 hari, akumulasi terbesar sejak Juni") — sekuens berita berdampak historis
  - H+3: laporan bandarmologi ringkas 1 halaman
  - H+6: demo deep research 1 saham pilihan user (PDF PRO)
  - H+13 (malam terakhir): **rapor trial** — daftar semua yang bot kerjakan ("14 brief, 3 alert tepat waktu, 1 riset PDF") + harga normal + tombol lanjut
- D13-14: chat bot prompt kayuh halus; downgrade otomatis ke FREE di D15 (bukan hard-stop)
- Referral: kedua pihak dapat +1 bulan gratis (program gelap awal, r=1 mencukupi)

**Promo ladder (kompensasi kecil, akuisisi besar) — DIPERBAIKI red-team:**
- Early-bird 3 bulan pertama: BASIC Rp59rb / PRO Rp119rb (**floor baru** — net harus > cost pesimis Rp52rb/Rp106rb; harga lama 49rb/99rb = margin negatif dikunci 12 bln) — grandfather harga 12 bln, TAPI caps baru berlaku ke semua
- **LARANG STACKING** early-bird × bundle × kode promo (1 diskon per transaksi)
- Kode promosi (kartu IG/artikel teknikal.id, expired 7 hari): trial Rp1rb → Rp0 + bonus riset
- Kupon winback H+30 pasca-churn: 1 bulan 50%
- Bundle tahunan: bayar 10 bulan dapat 12 (tidak stackable dengan early-bird)
- **Trial Rp1.000 = CAC, bukan revenue**: fee Midtrans Rp2.020 > harga → net -Rp1.020 + LLM diagnostik Rp3-6rb = biaya akuisisi Rp5-8rb/trial. Budgetkan sebagai marketing
- FREE tier: brief umum one-to-many (generate sekali, broadcast) + alert teknikal template-only TANPA LLM call per user + 3 chat/HARI (bukan per jam — burn Rp60-180rb/user/bln kalau per jam)

**Caps (kebijakan produk, dijaga usage_ledger per jam/hari/bulan):**
- Chat: 20 turn/jam & per-tier per hari (anti loop/abuse — bukan soal biaya)
- Riset: kuota per tier; 1 riset = 1 job async (queue) — user antre & dapat notifikasi hasil
- Alert maks 15/hari per user (anti-spam = anti-churn), nyala hanya bila: (1) menyentuh saham watchlist, (2) material (LK/dividen/RUPS/regulator/akuisisi), (3) disertai konteks historis
- Konteks chat dipangkas (ringkasan memori, bukan transkrip penuh) — biaya per turn tetap Rp100-200


**Unit economics 200 user** (mix 10/50/35/5): rev Rp21,3jt − AI Rp7,7jt − infra ~Rp100rb − Midtrans ~2% ≈ **Rp13,6jt/bln (64%)**. 500 user ≈ Rp34jt/bln.

## 3b. Sector Compass — rekomendasi per sektor (fitur differentiator, aman regulasi)
- **Weekly Sector Rotation Radar** (Senin 07:30, PRO+): tabel 9 sektor IDX (bank, tambang, infra, konstruksi, consumer, telko, properti, healthcare, industri) × foreign flow 20 hari, momentum, valuasi vs median 3 tahun → rekomendasi bobot relatif NEUTRAL/OVERWEIGHT/UNDERWEIGHT — **framing alokasi, bukan saran beli saham spesifik**
- Skor per saham dalam sektor: technical score + foreign flow + valuasi (komposit sudah ada di pipeline)
- Brief harian menautkan: "saham Anda X di sektor Y yang sedang UNDERWEIGHT — catatan: akumulasi asing justru naik" — konteks, bukan perintah
- "Kenapa sektor konstruksi turun?" → jawaban agentic grounded berita + data
- Kepatuhan: label bobot relatif = bahasa manajer investasi institusional; disclaimer tetap tiap output

## 3c. Midtrans — FINAL (owner 2 Nov: akun hivePOS sudah di-rename jadi teknikal)
- Kredensial production SUDAH TERPASANG di `teknikalidnew/.env` (merchant G6455646…) dan **terverifikasi live** (probe auth 400 = kunci valid, tanpa transaksi)
- Endpoint `/api/payment/*` teknikal.id sudah jalan → web payment siap
- **REUSE KODE GO hivePOS utk engine TeknikalAgent** (`hivepos-api/internal/midtrans/midtrans.go`, 155 baris, battle-tested):
  - `CreateTransaction` Snap API tanpa SDK (Basic auth serverKey), circuit breaker 5-fail/30s, 4xx tidak men-trip breaker
  - `VerifySignature` sha512(orderID+statusCode+grossAmount+serverKey) utk webhook
  - Pola billing module pos-saas (port/adapter, handle-webhook.service, validate-promo, billing-status) = template langganan TeknikalAgent
- Mapping order_id: `TA-<tgChatId>-<tier>-<periode>` + custom_field utk metadata (tier, bulan, promo code)
- TO-DO sprint 1: webhook route baru di Go engine (atau pakai `/api/payment/notification` Next.js yang ada → forward ke agentd via internal queue)

**MANIFEST REUSE hivePOS → TeknikalAgent (copy/migrasi, hemat ±1-2 minggu build):**
| Sumber hivePOS | Bahasa | Fungsi | Pakai untuk | Cara |
|---|---|---|---|---|
| `hivepos-api/internal/midtrans/midtrans.go` (155 baris) | Go | Snap create + circuit breaker + verify signature | Payment gateway agentd LANGSUNG | **COPY** (ganti module path + custom_field jadi tier/bulan/promo) |
| `hivepos-api/internal/shared/resilience/circuitbreaker.go` (95 baris + test) | Go | Circuit breaker generik | LLM client + API teknikal.id + Midtrans | **COPY** (pakai di 3 tempat) |
| `hivepos-api/internal/planlimits/planlimits.go` | Go | Plan limits + TTL cache + Invalidate | usage_ledger tier caps (watchlist/turn/riset quota) | **ADAPT** (Kind: Outlets/Users/Orders → Turns/Riset/Watchlist) |
| `pos-saas/modules/billing/` (domain port+types, application services, prisma repo, 1.399 baris + test) | TS | create-checkout, handle-webhook (status map), validate-promo, billing-status | Arsitektur langganan/expired/renewal agentd | **PORT pola** ke Go (repository.port → Go interface; promo code + non-stackable rule sudah ada) |
| `teknikalidnew/src/lib/midtrans.ts` + `/api/payment/*` | TS | Snap web + webhook Next.js | Sidedoor bayar dari web 1-klik | **PAKAI APA ADANYA** (tinggal plan assistant + order_id TA-*) |
Lisensi aman: semua repo milik sendiri. hivePOS frozen — code mine konsolidasi, bukan fork kompetitor.

**MANIFEST REUSE AegisGo → TeknikalAgent (owner temukan 2 Nov — reuse TERBESAR, hemat ±2-3 minggu):**
| Sumber AegisGo (module `aegisgo`, Go 1.26, 185 file .go) | Reuse untuk | Cara |
|---|---|---|
| `internal/telegram` — client.go (280 baris: SendMessage/EditMessageText/SendMarkdown/SendMessageWithButtons), poll.go (long-polling), edit.go (streaming edit), scheduler.go (cron per-chat + persist), notify, inbox, dispatcher + ~20 file test | Layer Telegram agentd LENGKAP — polling, streaming edit, inline button, scheduler ternyata sudah dibuat & teruji | **COPY + adapt** (ganti tipe pesan ke kebutuhan brief/alert) |
| `internal/provider` — anthropic-sdk-go + microsoft agent-framework anthropicprovider | LLM client Z.ai (endpoint anthropic-compatible = glm-5.3-flash) | **COPY** (set base_url Z.ai + env key) |
| `internal/tools` — Tool interface + dualTool[In,Out] generic + registry.go (81 baris) | Registry tools agent (quote/fundflow/fundamental/news/watchlist) | **COPY pola** (implement tool baru di atasnya) |
| `internal/engine` — confidence.go (band router/classifier/LLM) + engine.go; pola deterministic-Go-first + LLM fallback | Router fast-path <100ms + fallback 3 tingkat | **ADAPT** (rule = harga/watchlist/help; fallback = data-card) |
| `internal/task` (cancellation), `internal/logx`, `internal/trace` | graceful shutdown, structured log JSON + trace_id | **COPY** |
| `Makefile` (build/test/vet/lint), `deploy/` | CI + linter baseline | **ADAPT** (tambah golangci-lint ketat) |

## 4. Kepatuhan OJK — FINAL (riset sumber primer, 2 Nov 2026)
**Status hukum:** Rekomendasi beli/jual efek berbayar = aktivitas Penasihat Investasi (POJK 3/2021 Angka 24, Pasal 49-51) — tanpa izin: UU 8/1995 Pasal 27 jo. Pasal 103 (**pidana max 10 tahun + denda Rp15 M**). POJK 6/2026 (berlaku Jun 2026) mengatur penyampai informasi digital: OJK bisa BLOKIR akun. **Preseden nyata:** denda Belvin Tannadi Rp5,35 M (Feb 2026); kasus TRON — PI tanpa izin ditindak (Okt 2026).

**Aturan bahasa bot (LABEL HARUS/LARANG):**
- ✅ AMAN: brief faktual + angka dari DB; alert rule yang USER set sendiri; analisis berimbang (positif+negatif) + disclaimer; level teknikal ("waspadai support 9.800"); label bobot sektor OVERWEIGHT/NEUTRAL/UNDERWEIGHT; sitasi sumber
- ❌ LARANG: "beli/jual sekarang", "cut loss X", target harga imperatif, janji/implied return, "sinyal pasti cuan"
- 3 pilar POJK 6/2026: transparansi afiliasi/konflik, analisis berimbang + disclaimer tiap output, no guaranteed return

**Lanskap kompetitor ID (sudah ramai!):** Invezgo (AI chat WA+TG, Sep 2026), SinyalTrader (sinyal TP/SL — gray area), INDOSTOCK.AI, DataSahamBot, QuantSaham, GuardianStock, Tuntun AI (broker berizin). → Diferensiasi teknikal.id: kualitas riset grounded + kepatuhan tegas + pipeline data sendiri 940 saham + foreign flow.
**Pasar:** 32,17 juta SID (Sep 2026, 99,8% ritel); Telegram ±61 juta user ID. Overlap investor×TG tidak ada data publik (estimasi longgar 6-9 juta).

## 4c. Insight harga dari teardown Invezgo (2 Nov, browsing live — lihat COMPETITOR-teardown-1102.md)
- **PRICE COLLISION:** promo Invezgo Rp39,9rb/79,9rb/149,9rb/299,9rb ≈ identik tier kita (79/149/299). Mental price point sudah dikunci pasar → TIDAK menang via harga; menang via fitur+distribusi
- **Celah produk (tidak dimiliki siapa pun):** TG AI Chat Invezgo hanya di Ultra Rp299rb + kuota per-pesan + aktivasi manual copy UserID; PDF riset, sector radar, brief pagi PERSONAL = ruang kosong pasar → chat agentic di 79rb + brief personal + PDF = positioning kita
- **WTP terbukti:** Stockbit Pro Rp150-250rb (adopsi #1 dari 95 sekuritas), RTI Rp120-150rb, komunitas Rp333-475rb, Trendra Rp19-49rb → tier kita 149-299rb aman di band terbukti
- **Distribusi:** grup TG resmi Invezgo cuma 245 member, blog lahir Sep 2026 — kita punya 170 artikel SEO + kanal TG + IG + 1-klik deep-link = CAC organik ~0
- **Trial compare:** mereka gratis 3 hari (no commitment, freeloader-friendly); kita Rp1.000/14 hari (komitmen + bukti lebih lama)

## 4b. Gap kritis dari audit internal (WAJIB dikerjakan di sprint)
1. **Pipeline berita real-time TIDAK ADA** (Article = konten sendiri, bukan news feed) — alert berita & deep research butuh sumber: RSS Bisnis/Kontan/CNBC + monitor disclosure IDX. Bangun di sprint 1
2. **PDF generator tidak ada** — bangun (chart+logo sudah ada)
3. **Account-linking penuh** chatId ↔ web User (anonPrefix cuma anonim) — tanpa ini billing tidak nyambung
4. **Kuota per-subscriber** (rate-limit sekarang per-IP)
5. ⚠️ Saat hapus fitur AI dari web: **JANGAN hapus src/lib/ai-*.ts + domains/ai** — pindahkan ke service bot (prompt rules mahal belajar). AiChatLog/AiEvalRun tetap dipakai flywheel bot
6. Onboarding profil risiko (model DB belum ada)

## 5. Roadmap (asumsi builder penuh waktu)
- Sprint 1 (1-1,5 bln): Go skeleton + queue + TG bot + tools + brief + onboarding 1-klik + FREE/teaser + Midtrans link + ledger caps. **= MVP berbayar**
- Sprint 2 (+2-3 bln): self-learning learner, PDF riset, alert berita, web dashboard langganan
- Sprint 3: WA VIP tier, referral, eval flywheel reuse (3-judge)

## 6. Risiko utama
1. Distribusi (user web baru 31, waitlist 0) → bot hidup dulu, promosi via 170 artikel + IG 3x/hari + Swing Pack
2. Regulasi framing (tunggu riset OJK)
3. Halusinasi data = zero tolerance → SEMUA angka dari tools/DB, LLM cuma menulis; eval flywheel jaga kualitas
4. Jangan bangun sembari hivePOS freeze — fokus satu produk

## 7. Yang butuh keputusan owner
1. Approve arah Go engine + tiers di atas?
2. Sprint 1 dikerjakan siapa: owner + agy (flash worker) + aku verifikasi, atau aku yang bangun full?
3. Nama produk bot (SahamAgent placeholder)

## 8. GATE-0 — FINAL REVIEW sebelum build (owner minta 2 Nov: "re-check + re-riset ulang, verdict layak dibangun / tidak")
Dijalankan HANYA setelah semua agen selesai (blueprint ✓, red-team ✓, threat-model, teardown Invezgo). Checklist re-review:
1. **Fresh re-read semua dokumen** (PLAN ini, BLUEPRINT, THREAT-MODEL, COMPETITOR-teardown, riset OJK) — cari kontradiksi antar-dokumen (preseden: kontradiksi FREE tier 3/hr vs 3/hari yang lolos di v1)
2. **Re-verifikasi fakta eksternal masih current**: harga Z.ai flash ($0.30/$1.00 — cek docs.z.ai), tidak ada POJK/OJK baru setelah 6/2026, pergerakan Invezgo/kompetitor, fee Midtrans
3. **Re-run aritmetika semua angka klaim**: margin per tier (base & pesimis), latency budget, RAM, breakeven — bukan percaya angka dokumen lama
4. **Verifikasi aset reuse masih ada**: file hivePOS (frozen ≠ terhapus), go.mod version, endpoint teknikal.id live (curl), kredensial Midtrans
5. **Gap-check**: semua syarat red-team (hard caps, floor promo, anti retry-storm, cache freeze) & mitigasi threat-model sudah masuk blueprint checklist?
6. **Kill criteria eksplisit**: tulis kondisi NO-GO (mis. margin pesimis < 15%, threat model temukan hole tanpa mitigasi feasible, regulasi berubah tegas) — selain itu GO dengan confidence level
Output: verdict GO / GO-REVISI / NO-GO + daftar temuan re-review, dikirim ke owner untuk keputusan final build.
