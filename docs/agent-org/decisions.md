# TeknikalID CEO Agent — Decision Log

Autonomy mandate dari owner (2026-09-13): "Run 24 jam tanpa ijin, kasih full autonomous. Target: growth naik, user time spent naik, user kembali. Semua perubahan pakai claude code."

North star: (1) traffic & register growth, (2) time spent, (3) returning users.

Format entry: `YYYY-MM-DD HH:MM | keputusan | alasan-data | verify hasil`
Deploy limit: 2/hari. DB read-only. auth/payment/security/monetisasi = owner-only.

---

## 2026-09-13 (setup)

- 13:2x | CEO agent system dibangun | owner minta agent berpikir CEO 24 jam | ceo_brief.py tested OK (data 7d: 668 views, 2 register, retensi IP 12.5%)
- 13:2x | Upgrade prompt CEO 576de83aa77d → FULL AUTONOMY + claude-code pipeline wajib + guardrails | owner directive verbatim | job updated, next run Senin 08:15
- 13:2x | CEO Evening Review f3a3525f5cf3 dibuat (21:00) | siklus 24 jam pagi+sore | job created, debut TONIGHT 21:00

## 2026-09-13 (organisasi update)

- 14:0x | CTO Builder agent dibuat 2 slot: 0f2dc95e24af (09:30) + 6cc47b7ca833 (14:30) | owner: "CEO suruh CTO, CTO pikirkan spec + ubah" | queue: ~/.hermes/data/teknikalid-growth/cto-queue.json; CEO menulis intent+acceptance criteria, CTO translate ke spec teknis + eksekusi claude code pipeline; max 1 deploy/slot, 2/hari

- 15:0x | [TEST] Task test-001 P1: CTA register di 3 signal pages | brief 7d: 668 views tapi register_views=2; signal pages+screener preset=142v tanpa CTA | verify: cto-queue.json status pending→done, register_views naik di brief berikutnya

## 2026-09-13 (evening review) [TEST]

- 21:0x [TEST] VERDICT: (1) Site UP — https://teknikal.id/ HTTP 200 (0.19s, 153KB), title OK, sitemap-news.xml 200. (2) Infra sehat — docker teknikalidnew app+worker+db semua Up, app & db (healthy). (3) Rantai CEO→CTO dry-run OK — test-001 pending→tested-dryrun dengan spec teknis lengkap; traffic 7d turun 668 vs 1136, register_views=2 → fokus konversi signal pages tetap relevan menunggu reindex GSC + IG carousel 14 Sep.

## 2026-09-13 [COUNCIL] — Sunday Strategy Council (run pendebut, pekan 7-13 Sep)

**RETRO 4 KOLOM:**
- ✅ WORKS: Signal pages & screener = moat — /stocks 170v + oversold 21v + pullback-sma20 15v + golden-cross 10v + volume-spike 7v (0→7, baru muncul); engine konten jalan (5 NEWS + 3 STOCK_ANALYSIS + 2 EDU terbit, snapshot harian 40x); news sitemap live 12 Sep.
- ❌ DOESN'T WORK: Views 566 vs 1221 WoW (-54%) — tapi GSC baru disubmit 12 Sep (reindex pending) → jangan salahkan konten dulu; register_views=2 vs baseline ~9/minggu; 16/20 artikel = 0 views (discovery mati); golden-cross 59→10v, screener 472→170v.
- ❓ CONFUSING: returning_ip_pct 10% (n=40 IP, sampel kecil); IG carousel baru debut besok 14 Sep 17:30 — kasih 1 pekan; dampak reindex GSC + news sitemap belum terlihat — evaluasi di council 20 Sep.
- 🛑 STOP: Tidak ada yang mati 7+ hari. Larangan: JANGAN panic-refactor konten selama reindex pending.

**KEPUTUSAN PEKAN DEPAN (max 3):**
1. Konversi signal pages → register: eksekusi CTA (task council-01) — target register_views 2 → ≥9/pekan dalam 2 pekan.
2. Discovery artikel: blok "Sinyal Terkait" (task council-02) — target signal page views 38 → ≥60/pekan + pages/session naik.
3. Observasi reindex GSC + IG carousel tanpa perubahan besar — keputusan di council 20 Sep.

**DISPATCH:** council-2026-09-13-01 (P1) + council-2026-09-13-02 (P2) → cto-queue.json, status pending, CTO eksekusi Senin slot 07:30/16:45 (quiet zone 09:00-16:15).

**INSTRUKSI MANDOR (mix konten pekan 14-20 Sep):** pertahankan 1 brief pasar harian + snapshot; STOK_ANALYSIS hanya utk ticker yang lagi ramai di signal pages (cross-check /saham-oversold & golden-cross list — jangan analisa ticker acak yang 0 views); prioritaskan EDUCATIONAL evergreen utk keyword "belajar saham" (EDU masih 0 views, kasih 2 pekan); tiap brief wajib link 1 signal page. Mandor baca bagian ini tiap 06:30.

**HEALTH AGENT ORG (audit 13 Sep):** 13 job teknikal.id di jobs.json — semua enabled. Model terpin: Mandor daily glm-5.3, Weekly Retro glm-5.3, Watchdog no_agent (script), SEO Monitor no_agent, IG Carousel glm-5.3-flash, CEO Daily glm-5.3, CEO Evening glm-5.3-flash, CTO pagi+sore glm-5.3, Content Reviewer glm-5.3-flash, Sunday Council glm-5.3, Monthly Recap glm-5.3. last_status: tidak ada fail/skip — Watchdog ok (1711x), Mandor ok 13 Sep 06:34, Weekly Retro ok 7 Sep. CATATAN: 5 job baru (CEO/CTO/Reviewer/IG/Council, dibuat 13 Sep) belum pernah jalan — completed=0, debut Senin-Minggu ini; IG Carousel schedule 17:30 Mon-Sat, next 14 Sep; CEO Evening debut malam ini 21:00.

**VERDICT PEKAN:** pekan observasi + 2 perbaikan konversi berbiaya rendah. Tidak ada kanal yang mati — traffic turun besar kemungkinan reindex GSC, bukan konten. Keputusan besar ditunda ke council 20 Sep setelah data IG carousel + reindex masuk.

- 15:0x | Schedule queue: council-01 → Senin 07:30 CTO pagi, council-02 → Senin 16:45 CTO sore; test-001 superseded | owner lihat dashboard: 'CTO ada pending, kapan dikerjakan?' | queue terupdate, dashboard akan tampil slot

## 2026-09-14 — Agent baru: SEO Keyword Researcher (b469b2365817)
- **Trigger:** owner minta agent khusus riset query GSC + visited pages ("gsc data is best").
- **Keputusan:** agent BARU (bukan diembed ke CEO/Council) — analisis keyword butuh fokus + history diff mingguan, beda ritme dari CEO harian. Read-only murni.
- **Jadwal:** Selasa 08:00 WIB (hari retro+listicle pipeline), glm-5.3-flash (pinned manual — bug cronjob_manage model=None), attach_to_session=true.
- **Input:** ~/.hermes/data/teknikalid-growth/gsc-keyword-history.jsonl (BARU: gsc_snapshot.py append queries harian, dedupe per tanggal) + page_views DB read-only + web_search varian ID.
- **Klasifikasi:** striking-distance (pos 5-15) / content-gap (pos>=30, impr>=10) / intent-gagal.
- **Output:** max 3 brief [KEYWORD-RESEARCH] ke ceo-decisions.md → pipeline Mandor; laporan 10-15 baris ke owner.
- **Guardrail:** no deploy, no repo edit, no credential, no self-edit cron.

## 2026-09-14 (CEO Morning)

- 08:25 | DISPATCH P0 ceo-2026-09-14-01: sesi fantasi di StockPrice/StockIndicator | 865 rows utk 13 Sep (MINGGU, bursa tutup) + 14 Sep pre-market; close identik Jumat 11/9 di 3 tanggal (BBCA 6325, BBRI 3270, AMMN 4860); golden_cross termutasi 75→77→82 oleh sesi yang tidak ada | query psql langsung 08:15; CTO sore 16:45 diagnose writer + trading-day guard
- 08:25 | DEFER council-2026-09-13-02 ke 15 Sep 07:30 | max 1 deploy/slot; P0 data-integrity menang slot sore hari ini | cto-queue.json scheduled_slot updated
- 08:25 | Register CTA (council-01) TERVERIFIKASI live — pantau saja, tidak ada pekerjaan konversi baru | curl 3/3 signal pages HTTP 200 + utm_campaign ter-render (deploy CTO pagi 07:4x); register_views 2/7d masih pra-CTA — jendela ukur 2 pekan | curl -A Mozilla pagi ini
- 08:25 | Fix metrik ceo_brief.py: login_views selalu 0 karena LIKE '%auth/login%' padahal route asli /auth/signin (9 views/7d tak terhitung) | grep script + top_pages | patch 1 baris di script tooling (bukan deploy)

## 2026-09-14 — Guardrail update: destructive SQL + backup harian (owner approval)
- **Owner decision:** "SQL boleh di run, asal lakukan backup harian" → policy `blocked_for_owner` utk DELETE/UPDATE DILOONGGAR (conditional).
- **Backup harian LIVE:** `teknikalid_db_backup.sh` (cron bc592e49f339, 01:15, no_agent watchdog: sukses=diam, gagal=ALERT ke owner). pg_dump → gzip ~/backups/teknikalid/db-YYYYMMDD.sql.gz, verify gzip+CREATE TABLE+size, prune 14 hari. First run 14 Sep 08:30: 50.3MB, 52 CREATE TABLE, verified. Marker `last-success` = age check utk agent guard.
- **Syarat CTO run destructive SQL (semua wajib):**
  1. Backup valid <24 jam (baca `~/backups/teknikalid/last-success`; kalau stale → run backup script dulu).
  2. Preview SQL exact di report sebelum eksekusi.
  3. COUNT baris target dulu (SELECT COUNT dengan WHERE yang sama).
  4. WHERE clause sempit & spesifik (no blanket DELETE).
  5. Log eksekusi + rowcount ke decisions.md.
- Tetap `blocked_for_owner`: auth/payments/security/env vars/drop database/drop schema.

## 2026-09-14 17:30 WIB — CTO sore: cleanup baris fantasi 13 Sep (ceo-2026-09-14-01)

- Konteks: root cause + fix write-guard isWibWriteWindow() (commit d29f24d, deploy 17:17 WIB) — lihat lessons-learned.md 14 Sep.
- Backup: ~/backups/teknikalid/last-success = 2026-09-14T08:30 (valid <24 jam).
- SQL dieksekusi (docker exec psql, transaksi tunggal BEGIN/COMMIT):
  DELETE FROM "StockPrice" WHERE date::date = '2026-09-13';  → 865 rows
  DELETE FROM "StockIndicator" WHERE date::date = '2026-09-13';  → 865 rows
- Preview COUNT sebelum: 865 / 865 (WHERE sama). Verifikasi pasca: 0 / 0 baris. Kontaminasi baru berhenti (guard live, run 17:17/17:26 WIB perilaku benar).
- Sisa utang data (bukan scope hari ini): ~60k baris weekend historis 2025-03→2026-07 + kalender libur IDX.

## 2026-09-15 — GUARDRAIL AUDIT (owner request)
Audit semua agent org. Patches applied ke 11 agent (teknikal 5 + hivepos 6):
- CTO (4 slot): ANTI-LOOP (2x gagal = stop+eskalasi), NO-PANIC-REFACTOR, ROLLBACK ANCHOR (catat image+commit sebelum deploy), VERIFY EXTERNAL (curl konten kunci bukan cuma tsc), [SILENT] dilarang (slot kosong = health report).
- CEO (3): anti-loop dispatch (topik failed 2x = eskalasi bukan re-dispatch), max 2 dispatch + 1 eksperimen/deploy, duplikat-queue check.
- Mandor: gap data wajib eksplisit, silent dilarang.
- Blog Writer hivePOS: SQL hanya INSERT BlogPost; tabel lain haram; pre-publish idempotent check + post-publish verify; anti-loop.
- IG autopost: double-post guard via post-log; 2x gagal = fallback manual; angka wajib _caption_numbers_ok.
- GSC snapshot: tab safety (jangan sentuh tab IG).
Verifikasi: jobs.json valid 33 job, 25 LLM pinned, semua enabled, next_run utuh.

## 2026-09-15 — KLARIFIKASI: MOVEMENT_ANALYSIS memang dimatikan (owner confirm)
- Mandor 15 Sep lapor "pipeline MOVEMENT mati 3 hari" → FALSE ALARM: gen_movement_analysis sengaja dihapus dari AgentConfig 10 Sep saat pivot NEWS (owner: "Movement analysis bukanya memang di matikan?").
- Bukti DB: AgentJob terakhir 10 Sep 06:35 done, setelahnya 0 job dibuat (bukan failed).
- Fix: prompt Mandor + blok KONTEKS SEJARAH (pivot 10 Sep + gen_trending_news/gen_evergreen juga mati by design).
- Sisa: anomali minor `log --json` error → queue CTO.

## 2026-09-15 — Backup: false alarm semalam dijelaskan + celah idempotent DITUTUP
- Alert 01:15 "tanpa CREATE TABLE" = false alarm versi lama (grep -q SIGPIPE race, sudah di-fixed dini hari tadi).
- File backup 15 Sep valid 47MB/52 tabel; marker 01:17 (regen pas fix).
- CELAH BARU DITUTUP (usulan Evolution Coordinator malam #1): cabang idempotent dulu verify cuma gzip -t →
  dump korup bisa lolos jadi last-success (gate destructive SQL!). Sekarang: idempotent branch verify
  CREATE TABLE >=40 tabel juga; kalau gagal → ALERT + regenerate, BUKAN tulis last-success.
- Verified end-to-end: regen 06:43 exit 0 (47MB/52 tabel) + run#2 idempotent 2.4s exit 0.
- hivePOS backup sidecar sehat: pos_saas_20260914_223537 37 tabel, umur 1.1 jam.

## 2026-09-15 07:41 — CTO pagi: reviewer-2026-09-15-01 (volume label lot→saham, P1)
- Rollback anchor: image app f705987548db / worker 4b3414f9b5e7, commit 4228de481c.
- Commit 90225ca (2 files +8/-8: fmtVol + formatVolumeHuman unit word only; hunk authorId pre-existing TIDAK ikut).
- DB patch plan (owner-approved SQL protocol, backup 06:44 valid <24jm): UPDATE "Article" SET content=replace(content,' lot',' saham') WHERE status='PUBLISHED' AND content LIKE '%juta lot%'; — preview COUNT=41, WHERE sempit (hanya string ' lot' → ' saham' di baris yang mengandung 'juta lot'; pola label formatter selalu '<num> lot'). Eksekusi + rowcount dicatat di bawah.
- SQL EXECUTED 07:44: UPDATE "Article" SET content=replace(content,' lot',' saham') WHERE status='PUBLISHED' AND content LIKE '%juta lot%' → **41 rows** (transaksi tunggal). Residual 'juta lot'=0; 'juta saham'=42 (41 patched + 1 pre-existing benar). Pre-checks: max per-article ' lot' count == 'juta lot' count (3=3); 5 artikel edukasi luar scope ('1 lot = 100 lembar') terverifikasi TIDAK tersentuh WHERE.
