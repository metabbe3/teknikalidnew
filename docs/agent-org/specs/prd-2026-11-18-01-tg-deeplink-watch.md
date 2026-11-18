# PRD prd-2026-11-18-01 — Deep-link Telegram one-tap watch: perbaiki jalur T3->T5 yang putus

- Origin: idea-2026-11-16-1 (CEO PROMOTE 17 Nov — mandat PRD Product Agent 19 Nov; dirampung lebih awal oleh buffer-keeper nightly 18 Nov)
- Trees riset: teknikalidnew main@8b10723 (18 Nov) + teknikal-agent main@bdd89f3 (17 Nov); bot live diverifikasi getMe: poll.mjs = TeknikalidBot (BUKAN penerima deeplink web sejak pivot 6 Nov), deeplink web = TeknikalidAgentBot (agentd).
- DB: teknikalidnew-db-1 read-only 18 Nov ~22:xx WIB.

## Problem (data asli)
1. tg_pantau_klik 21d = 17 event / 15 aktor (label query EngagementEvent; entry backlog 6-14 Nov: 15/13) -> TelegramWatch MAX createdAt = 30 Okt (0 watch baru 19 hari), BotInbox 21d hanya 2 tes owner + 'Vktr' 29 Okt.
2. Funnel 21d bl4 (bo-2026-11-16-01): T1 384 / T2 208 / T3 10 / T4 4 / T5 0 — dua minggu beruntun.
3. Klik web -> bot JALAN sebagian (agent_watchlist_cache berisi bare-code BANK/DOOH/MPIX = hasil parse deeplink) TAPI:
   - (a) CTA halaman saham membangun href inline `t.me/TeknikalidAgentBot?start=BBCA_JK` (page.tsx L1357) TANPA suffix `__a_<12hex>` — helper satu-pintu tgDeepLink() (src/lib/tg-deeplink.ts, tracking-audit G3) tidak dipakai di sana.
   - (b) agentd handleStart -> parseWebDeeplink (handler.go L1199-1221) memecah payload per '_' dan MENGHABISAN suffix `__a_<hex>` (hex tidak lolos isIdxTickerCode len==4) -> anonID selalu deriveOpaqueAnonID(chatID) -> agent_user.anon_id (21/21 rows derived) TIDAK PERNYA match LEFT(REPLACE(web actor,'-',''),12) -> join T5 funnel-v2 = 0 permanen. poll.mjs (bot lama) punya parse `__a_` — agentd TIDAK memilikinya.
   - (c) Seed deeplink hanya menulis agent.agent_watchlist_cache (DELETE+INSERT, postgres.go L270) — bukan agent_watchlist kanonik; kepastian masuk digest harian 16:50 WIB belum terverifikasi end-to-end.

## User story
Sebagai pengunjung guest yang menekan "Pantau via Telegram" di halaman saham, saya sampai di bot dengan saham itu SUDAH terpantau + identitas web saya terbawa — satu ketukan, tanpa mengetik ticker, tanpa login; dan tim bisa mengukur klik->watch->habit (T5) dari data.

## Acceptance criteria (tertestable)
- AC1 (web, satu pintu): tombol Pantau di /stocks/[ticker] memakai tgDeepLink() (atau inline href diganti) sehingga href = `...?start=BBCA_JK__a_<12hex>` bila localStorage eng_anon ada; bukti: view-source/HTML live memuat `__a_`; TelegramSubscribeCta (variant berita) juga menempelkan suffix yang sama dari satu helper.
- AC2 (agentd, identitas): handleStart mengekstrak `__a_([a-f0-9]{12})` SEBELUM parseWebDeeplink (mirror poll.mjs ret-qw4/G3); hex valid -> dipakai sebagai anonID EnsureUser (konflik UNIQUE anon_id ditangani aman: fallback derive + log, BUKAN error 500); bukti: /start payload ber-hex dari chat uji -> agent_user.anon_id == hex tsb.
- AC3 (agentd, watch kanonik): ticker seed deeplink di-upsert ke agent_watchlist kanonik (bukan hanya cache) + konfirmasi di chat menyebut ticker & jadwal digest 16:50 WIB; idempoten (start ulang payload sama tidak menduplikasi); cap 10 ticker/payload; payload invalid -> welcome generik TANPA echo payload.
- AC4 (instrument): funnel 3-stage terukur: (i) klik web label tg_pantau_klik (sudah ada), (ii) slog 'funnel: web deeplink start' + baris agent_user ber-anon web, (iii) watch kanonik baru; GET /api/admin/funnel-v2 (logika T5 existing, TANPA perubahan query) — bukti: replay 14d pasca-deploy T5 > 0, atau bila tetap 0 → verdict jujur di entry (bukan deploy tambahan).
- AC5 (no-regresi): /start tanpa payload (cold-open Telegram Desktop dapat kirim /start polos) tetap jalur onboarding lama + quick-start buttons; 0 migrasi DB; tsc EXIT-0 (web) + go build/test EXIT-0 (agentd); digest harian tetap terkirim ke 3 chatId lama tanpa perubahan jadwal.

## Data evidence
SQL read-only 18 Nov: tg_pantau_klik 21d 17/15 aktor (max 16 Nov 13:58 UTC) · pantau_tambah 7/5 · TelegramWatch 9 rows/3 chatId, MAX 30 Okt · BotInbox 3 rows total (2 tes cerberus 14 Nov + Vktr 29 Okt) · agent.agent_user 21 rows (created 6-15 Nov, 100% anon derived) · agent_watchlist_cache 6 rows/4 chat (BANK/DOOH/MPIX bare = deeplink; AMRT/BBCA/DSSA .JK = sync owner) · Stock EQUITY 964, kode 4-huruf 963 + ^JKSE satu-satunya 5-char (isIdxTickerCode len==4 aman utk ~100% equity) · funnel 21d bl4: 384/208/10/4/0. Statik: page.tsx L1357 inline href; tg-deeplink.ts (dipakai sebagian surface); handler.go L911-997 (handleStart), L1199-1234 (parseWebDeeplink/isIdxTickerCode/isBindToken); postgres.go L270-283 (SyncWatchlistCache DELETE+INSERT); funnel-v2 route L79-84 (join T5 + komentar 'belum ada web visitor yang start bot').

## Metadata deterministik v2
target_files: [
  "teknikal-agent/cmd/agentd/handler.go (handleStart: ekstrak __a_, cap seed, upsert kanonik)",
  "teknikal-agent/internal/store/postgres.go (+EnsureUser konflik anon / seed watchlist kanonik)",
  "teknikal-agent/internal/store/memory.go (paritas impl utk test)",
  "teknikalidnew/src/app/(public)/stocks/[ticker]/page.tsx L1357 (ganti inline href -> tgDeepLink)",
  "teknikalidnew/src/components/telegram/subscribe-cta.tsx (suffix __a_ via helper)",
  "teknikalidnew/src/lib/tg-deeplink.ts (satu pintu — verifikasi semua surface memakai)"
]
db_migrations: false
dependencies: ["unknown — tanpa paket baru (Go stdlib regexp; tgclient/prisma existing)", "agentd harus jalan saat verify (agentd_pulse host)"]
risk: med — input publik ?start= (injection/IDOR dicek validasi ketat 12hex + whitelist ticker 4-huruf + cap 10; UNIQUE anon_id race antar device; blast digest ke chat baru = jaga status-quo opt-in)
estimate_tool_calls: 16

## Catatan CTO
- 2 repo (teknikal-agent Go + teknikalidnew TSX) — satu kereta deploy gabungan (agentd binary + web image).
- SEC-review wajib (sec_review_note idea-2026-11-16-1): payload = input publik; jangan pernah jadikan payload kredensial.
- Jangan hitung konversi dari klik (click != start — Telegram deep-link docs); AC4 tahap (ii)/(iii) adalah sumber kebenaran.
