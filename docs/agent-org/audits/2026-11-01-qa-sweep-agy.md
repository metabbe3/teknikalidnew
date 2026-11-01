# QA Verdict Batch: 11 Task teknikal.id (26 Okt – 1 Nov 2026)

**Auditor:** QA Auditor Independen Antigravity  
**Tanggal Verifikasi:** 1 November 2026, 14:25 WIB  
**Lingkungan Target:** Production teknikal.id  
**Repositori Lokal:** `/Users/nicholasandriansurjadi/Documents/teknikalidnew` (Branch: main, Commit: 377abe8)  
**Database:** PostgreSQL 16.14 Docker Container (`teknikalidnew-db-1`, DB: `teknikalid`, User: `teknikalid`, Read-Only)  
**Container App:** Docker Container `teknikalidnew-app-1` (Image: `teknikalidnew-app:latest` / `sha256:6c643d2a0794`)  
**Metodologi:** Verifikasi bukti fisik segar (Database SELECT replay, live URL curl inspection, docker container chunks grep, git commit history & AST inspection, launchctl daemon status, scheduler ledger inspection).  
**Budget Curl:** 9 / 20 request terpakai.

---

## 1. Ringkasan Eksekutif

| Metrik | Nilai | Catatan |
|---|---|---|
| **Total Task Di-audit** | 11 | Daftar backlog dari `qa_backlog_7d.json` |
| **Pass (`qa_verified=true`)** | **10** | Bukti fisik live DB, repo, container, dan live endpoint terverifikasi 100% |
| **Fail (`qa_verified=false`)** | **0** | Tidak ada task yang gagal total / klaim palsu menyeluruh |
| **Partial (`qa_verified=partial`)** | **1** | `qa-2026-11-01-01` (patch sinyal utama lolos, tapi residual klaim lama tertinggal di Outlook) |
| **Unverifiable (`qa_unverifiable`)** | **0** | Seluruh 11 task dapat diverifikasi secara fisik tanpa asumsi |

---

## 2. Tabel Rekapitulasi Verdict 11 Task

| ID Task | Verdict | Bukti Fisik Singkat | Catatan & Status |
|---|---|---|---|
| `dep-2026-10-30-02` | `qa_verified=true` | DB `AiChatLog`: 37 ask + 45 screener `glm-flash`; DB migration `add_stock_is_syariah` finished; live curl `/` render SSR AskAiFab (`data-engagement="fab_ask_ai"`); `/pasar` render `ScreenerAiButton`. | AI expansion, FAB, dan migration prod terbukti live. |
| `dep-2026-10-30-01` | `qa_verified=true` | Git commit `cd15630f1c` in main; DB `PageView`: 41 row `utmSource ILIKE '%threads%'` (33 row s.d 31 Okt 05:00 WIB, cocok klaim ~30 PV 26h); live `/stocks` & `/pasar` HTTP 200. | Fix UTM threads menang atas referrer terbukti di DB & runtime. |
| `bo-2026-10-26-02` | `qa_verified=true` | Git commit `7dbe48126d` in main; `src/app/admin/_components/tab-config.ts` `HIDDEN_TABS=["community","predictions"]`; `dashboard-shell.tsx` render `VISIBLE_TABS` (7/9 tab); shim `/admin/community` & `/admin/predictions` intact. | Demote tab dashboard tanpa hapus rute sukses. |
| `fix-2026-10-26-05` | `qa_verified=true` | `src/proxy.ts:46-52, 229-239`: `AUTH_RATE_LIMIT=10` (window 60s), `REGISTER_RATE_LIMIT=5` (window 1h) per-IP mengembalikan HTTP 429 pada `/api/auth/*` & `/api/auth/register`. | Diagnosa builder benar: proteksi rate limit auth sudah aktif, zero code changes needed. |
| `fix-2026-10-26-06` | `qa_verified=true` | Git commit `31b69e1fa9` in main; `src/domains/auth/auth.service.ts` 0 hit `prisma.follow`; `socialGraphRepository.getFollowingIdsAmong` dibuat di `social-graph.repository.ts:20` & dipanggil di `auth.service.ts:120`. | DDD boundary violation teratasi bersih. |
| `fix-2026-10-26-07` | `qa_verified=true` | `~/Library/LaunchAgents/com.teknikalid.eod-sync.plist` memuat interval 15:55 + 16:30; `launchctl print gui/501/com.teknikalid.eod-sync` active; commit `5c2ffad62a` sinkronkan `scripts/com.teknikalid.eod-sync.plist`. | Penjadwalan EOD 15:55 aktif live & tersinkron di repo. |
| `fix-2026-10-26-11` | `qa_verified=true` | Git merge `b6f854dca2` in main; `src/domains/article/article-guards.ts` exists (+142 baris); `movement-analysis.service.ts:10,203` wired; selftest `article-guard-doctrine.selftest.ts` PASS 7/7. | Guard pipeline satu pintu live dan teruji. |
| `ops-2026-10-29-02` | `qa_verified=true` | `~/.hermes/cron/jobs.json`: job `9cc945374222` mencatat failure `TargetClosedError` 29 Okt 05:34:05; status terkini `last_status: ok`, `failure_streak: 0`, `last_run_at: 2026-11-01T06:01:07+07:00`. | Crash browser one-off terverifikasi recovered; cron berjalan stabil. |
| `bug-2026-10-30-02` | `qa_verified=true` | Git commit `377abe8de8`; Container `teknikalidnew-app-1` static chunks (`global-error`, `error`, `stocks/[ticker]/error`) memuat "Ada yang salah", "Coba Lagi", "Gagal memuat saham ini", `lang="id"`; teks EN 0 hit. | Error boundary Bahasa Indonesia terdeploy di prod. |
| `qa-2026-11-01-01` | `qa_verified=partial` | DB & Live curl `rekap-pasar-2026-10-oktober`: Patch Sinyal Oktober lolos (DC 45→51, H1 10→14, H2 35→37, Sep 74→79 GC & 11→14 DC, kohort 43 median -12,3%, oversold 54). **Tetapi** di section "Outlook November" poin 3 masih tertulis `(18 vs 35)` bukan `(18 vs 37)`. | Klaim builder "residual lama=0" terbantahkan secara fisik di DB & live HTML. |
| `qa-2026-11-01-02` | `qa_verified=true` | DB SQL replay `PageView` `isBot=false`: Oktober BBCA=156 (#1) & BBRI=9; Pekan 26-30 Okt BBCA=86 & BBRI=7. Live curl rekap bulanan memuat 156 kunjungan BBCA; rekap mingguan memuat 86 kunjungan (BBRI 7). Residual klaim lama = 0. | Replay exact single-digit; klaim salah BBRI telah dihapus. |

---

## 3. Analisis Item Fail / Partial & Action Item

### `qa-2026-11-01-01` (Verdict: `qa_verified=partial`)
- **Akar Masalah:** Saat melakukan SQL patch data artikel `rekap-pasar-2026-10-oktober`, builder hanya mengganti angka di heading dan paragraf utama `## Sinyal Oktober: 61 golden cross baru vs 51 death cross`, tetapi luput melakukan pergantian di penutup artikel pada subbab `## Outlook November` poin 3:
  > *Eksisting di DB & Live (Line 80):* `3. **Rasio sinyal** — paruh kedua Oktober didominasi death cross (18 vs 35); bila rasio kembali seimbang, itu indikasi awal pembentukan dasar pasar.`
  Padahal di baris 52 artikel yang sama, builder telah mengganti menjadi `18 golden cross vs 37 death cross`. Ini menyebabkan kontradiksi internal dalam 1 artikel yang sama (37 vs 35). Klaim builder `"residual lama=0"` tidak akurat.
- **Tingkat Kepentingan & Rekomendasi:** **P2**. Perlu koreksi cepat 1 baris di DB (`35` → `37`) pada artikel `rekap-pasar-2026-10-oktober` agar konsisten sebelum disorot pembaca/owner.

---

## 4. Bukti Fisik Detail per Task

### 1. `dep-2026-10-30-02`
- **Klaim Builder:** Hot-swap sukses, /api/ai/stock provider=glm-flash 200, FAB container SSR di homepage, 'Bingung sama pasar' x2 di /pasar, Migration idempotent applied.
- **Bukti Fisik:**
  1. *Database `AiChatLog`:*
     ```text
     route    |   mode    | provider  | count
     ---------+-----------+-----------+-------
     screener |           | glm-flash |    45
     stock    | ask       | glm-flash |    37
     stock    | summarize | glm-flash |    19
     ```
  2. *Database `_prisma_migrations`:*
     Migrasi `20261030140000_add_stock_is_syariah` tercatat `finished_at = 2026-10-30 11:34:58.202391+00` (18:34:58 WIB).
  3. *Live Homepage SSR (`https://teknikal.id/`):*
     Mengandung elemen SSR:
     `<button data-authed="0" aria-label="Tanya AI apa saja" data-engagement="fab_ask_ai"...`
  4. *Live `/pasar` SSR (`https://teknikal.id/pasar`):*
     Mengandung tombol AI pasar:
     `Tanya kondisi pasar? <button aria-label="Tanya AI" class="inline-flex items-center gap-1.5...`
     *(Catatan: Copy "Bingung sama pasar?" terletak pada branch hari kerja di `src/app/(public)/pasar/page.tsx:157`, sedangkan pada weekend/hari libur Minggu 1 Nov merender branch `Tanya kondisi pasar?` di baris 90).*
- **Verdict:** `qa_verified=true`.

---

### 2. `dep-2026-10-30-01`
- **Klaim Builder:** Live image BO build 31 Okt bawa commit `cd15630`, DB read-only 26h = 30 PageView utmSource=threads, marker utmSource/SOCIAL_PLATFORMS di chunks, /stocks /pasar 200.
- **Bukti Fisik:**
  1. *Git Ancestry:*
     `git merge-base --is-ancestor cd15630 HEAD` mengembalikan status 0 (ancestor sah).
  2. *Git Diff Commit `cd15630f1c`:*
     Menambahkan `threads.` ke `SOCIAL_PLATFORMS`, `UTM_SOURCE_PLATFORMS`, dan fungsi `categorizeTraffic(referrer, utmSource)`.
  3. *Database `PageView`:*
     Query `SELECT count(*) FROM "PageView" WHERE "utmSource" ILIKE '%threads%' AND "createdAt" <= '2026-10-31 05:00:00';` mengembalikan **33** (cocok dengan observasi builder ~30 PV dalam 26 jam pasca-deploy). Total saat ini adalah 41 PV.
  4. *Live HTTP Status:*
     `curl -s -o /dev/null -w "%{http_code}\n" https://teknikal.id/stocks` → **200**.
     `curl -s -o /dev/null -w "%{http_code}\n" https://teknikal.id/pasar` → **200**.
- **Verdict:** `qa_verified=true`.

---

### 3. `bo-2026-10-26-02`
- **Klaim Builder:** Deploy commit `7dbe481`, `HIDDEN_TABS=['community','predictions']` di `tab-config.ts`, `dashboard-shell` pakai `VISIBLE_TABS`, shim URL tetap jalan, VISIBLE=7/9 tab.
- **Bukti Fisik:**
  1. *Git Commit `7dbe48126d`:*
     Commit berjudul *"chore(admin): eksekusi verdict owner 30 Okt — ... demote tab Community/Predictions Dashboard"*. Merupakan ancestor sah dari HEAD.
  2. *Kode `src/app/admin/_components/tab-config.ts`:*
     ```typescript
     export const HIDDEN_TABS: readonly TabId[] = ["community", "predictions"];
     export const VISIBLE_TABS = TABS.filter((t) => !HIDDEN_TABS.includes(t.id));
     ```
     Total tab = 9, `VISIBLE_TABS` = 7.
  3. *Kode `src/app/admin/_components/dashboard-shell.tsx`:*
     Mapping tombol tab dan navigasi keyboard panah kanan/kiri telah diubah dari `TABS` ke `VISIBLE_TABS`.
  4. *File Shim URL Eksis:*
     - `src/app/admin/community/page.tsx`
     - `src/app/admin/predictions/page.tsx`
- **Verdict:** `qa_verified=true`.

---

### 4. `fix-2026-10-26-05`
- **Klaim Builder:** proxy.ts sudah rate-limit `/api/auth/*` 10 req/menit/IP + register 5/jam. 10 POST login salah → 302, #11-12 → 429. Tidak perlu kode baru.
- **Bukti Fisik:**
  1. *Konfigurasi Limit `src/proxy.ts:46-52`:*
     ```typescript
     const authRateLimitMap = new Map<string, { count: number; resetAt: number }>();
     const AUTH_RATE_LIMIT = 10;
     const AUTH_RATE_WINDOW = 60_000;

     const registerRateLimitMap = new Map<string, { count: number; resetAt: number }>();
     const REGISTER_RATE_LIMIT = 5; // 5 registrations per hour per IP
     const REGISTER_RATE_WINDOW = 60 * 60_000;
     ```
  2. *Enforcement Gate `src/proxy.ts:229-239`:*
     ```typescript
     if (isAuthRoute(request.nextUrl.pathname)) {
       if (rateLimited(authRateLimitMap, ip, AUTH_RATE_LIMIT, AUTH_RATE_WINDOW)) {
         return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
       }
     }

     if (request.nextUrl.pathname === "/api/auth/register") {
       if (rateLimited(registerRateLimitMap, ip, REGISTER_RATE_LIMIT, REGISTER_RATE_WINDOW)) {
         return NextResponse.json({ error: "Too many registration attempts" }, { status: 429 });
       }
     }
     ```
  3. *Definisi `isAuthRoute` (`src/proxy.ts:115`):*
     `pathname.startsWith("/api/auth/") && !pathname.includes("session")`
- **Verdict:** `qa_verified=true`.

---

### 5. `fix-2026-10-26-06`
- **Klaim Builder:** auth.service → socialGraphRepository.getFollowingIdsAmong; prisma import dihapus; grep prisma.follow src/domains/auth = 0; tsc 0; commit `31b69e1`.
- **Bukti Fisik:**
  1. *Git Commit `31b69e1fa9`:*
     Ancestor sah dari HEAD.
  2. *Pencarian `prisma.follow` & `prisma` di `src/domains/auth/`:*
     `grep -rn "prisma\.follow" src/domains/auth/` → **0 hits**.
     `grep -rn "prisma" src/domains/auth/auth.service.ts` → **0 hits**.
  3. *Implementasi Repository:*
     `src/domains/social/social-graph.repository.ts:20-27` mendefinisikan:
     `async getFollowingIdsAmong(followerId: string, candidateIds: string[]): Promise<string[]>`
     dan diimpor serta dipanggil di `src/domains/auth/auth.service.ts:120`.
- **Verdict:** `qa_verified=true`.

---

### 6. `fix-2026-10-26-07`
- **Klaim Builder:** Jadwal 15:55 sudah terpasang live (launchctl print interval 15:55 + 16:30); repo copy disinkronkan.
- **Bukti Fisik:**
  1. *File Plist Host OS (`~/Library/LaunchAgents/com.teknikalid.eod-sync.plist`):*
     ```xml
     <key>StartCalendarInterval</key>
     <array>
         <dict>
             <key>Hour</key><integer>15</integer>
             <key>Minute</key><integer>55</integer>
         </dict>
         <dict>
             <key>Hour</key><integer>16</integer>
             <key>Minute</key><integer>30</integer>
         </dict>
     </array>
     ```
  2. *Status Launchd Live:*
     `launchctl print gui/501/com.teknikalid.eod-sync` mengonfirmasi service berstatus registered dan merujuk path plist di atas.
  3. *Sinkronisasi Repo:*
     Commit `5c2ffad62a` mensinkronkan `scripts/com.teknikalid.eod-sync.plist` dengan interval yang sama.
- **Verdict:** `qa_verified=true`.

---

### 7. `fix-2026-10-26-11`
- **Klaim Builder:** Naik via build BO 31 Okt image 4fc480e31eb8; article-guards pipeline live.
- **Bukti Fisik:**
  1. *Git Merge Commit `b6f854dca2`:*
     Merge branch `night/fix-2026-10-26-11` ke main.
  2. *File `src/domains/article/article-guards.ts`:*
     Eksis (142 baris), mengekspor `runGenerationGuards`.
  3. *Integrasi di `movement-analysis.service.ts`:*
     Baris 10: `import { runGenerationGuards } from "./article-guards";`
     Baris 203: `const guards = await runGenerationGuards({ ... });`
  4. *Hasil Selftest Deterministik:*
     `npx tsx scripts/selftest/article-guard-doctrine.selftest.ts`
     Output: `article-guard-doctrine selftest: 7 pass, 0 fail`.
- **Verdict:** `qa_verified=true`.

---

### 8. `ops-2026-10-29-02`
- **Klaim Builder:** Crash 29 Okt 05:34 one-off (TargetClosedError); clamp value-too-long live; run 30 Okt 04:07 status ok (ledger runs.jsonl) — monitor via cron harian.
- **Bukti Fisik:**
  1. *Catatan Crash di Scheduler (`~/.hermes/cron/jobs.json`):*
     Job ID `9cc945374222` (*TeknikalID Profile-Sync (dividen/pengurus LRU-150)*) mencatat:
     `last_failure.at = "2026-10-29T05:34:05.431369+07:00"`
     Detail error:
     `playwright._impl._errors.TargetClosedError: Page.wait_for_timeout: Target page, context or browser has been closed`
     `stdout: target 150 emiten ... batch 0: ok=24 fail=0 ... batch 1: ok=19 fail=0`
  2. *Status Cron Terkini:*
     `last_run_at: "2026-11-01T06:01:07.010556+07:00"`
     `last_status: "ok"`
     `last_error: null`
     `failure_streak: 0`
- **Verdict:** `qa_verified=true`.

---

### 9. `bug-2026-10-30-02`
- **Klaim Builder:** Commit `377abe8`: error boundary 3 file EN->ID ("Ada yang salah", "Coba Lagi", "Daftar Saham", digest code) + PaymentButton fallback ID + global-error lang=id. Deployed via image `6c643d2a0794`.
- **Bukti Fisik:**
  1. *Git Commit `377abe8de8`:*
     Modifikasi pada 4 file: `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/(public)/stocks/[ticker]/error.tsx`, dan `src/components/PaymentButton.tsx`.
  2. *Live Docker Container `teknikalidnew-app-1`:*
     Image running: `sha256:6c643d2a07942f237956ac042dcfaeb6008f862d01197e3f23071f45e1e469be`.
  3. *Inspeksi Chunks JavaScript di Container:*
     - `/app/.next/static/chunks/app/global-error-011f992c23d18863.js`:
       Memuat `lang:"id"`, `"Ada yang salah"`, `"Coba Lagi"`.
     - `/app/.next/static/chunks/app/error-639303f035d5b11b.js`:
       Memuat `"Ada yang salah saat memuat halaman"`, `"Coba Lagi"`, `"Kode laporan: "`.
     - `/app/.next/static/chunks/app/(public)/stocks/[ticker]/error-1852665bc3dc7806.js`:
       Memuat `"Gagal memuat saham ini"`, `"Coba Lagi"`, `"Daftar Saham"`, `"Kode laporan: "`.
- **Verdict:** `qa_verified=true`.

---

### 10. `qa-2026-11-01-01`
- **Klaim Builder:** SQL patch 7/7: DC 45→51, H1 10→14, H2 35→37, Sep 74 GC→79 & 11→14, kohort 36→43 emiten median -8,7%→-12,3%, universe -12,3%→-15,5%, 4/36→4/43, oversold 65→54. LIVE verified: RSC payload + TOC + meta/og/JSON-LD semua angka baru, residual lama=0.
- **Bukti Fisik:**
  1. *Pemeriksaan DB & Live HTML (`https://teknikal.id/berita/rekap-pasar-2026-10-oktober`):*
     - Judul H2: `## Sinyal Oktober: 61 golden cross baru vs 51 death cross` (**Ter-patch: 51**)
     - Paruh 1: `43 golden cross vs 14 death cross` (**Ter-patch: 14**)
     - Paruh 2: `18 golden cross vs 37 death cross` (**Ter-patch: 37**)
     - September: `79 golden cross ... 14 death cross` (**Ter-patch: 79 & 14**)
     - Kohort H1: `Dari 43 emiten ... median -12,3% ... vs -15,5% ... hanya 4 dari 43` (**Ter-patch: 43 emiten, -12,3%, -15,5%, 4/43**)
     - Rebound 23 Okt: `menyusut ke 54 saat rebound 23 Oktober` (**Ter-patch: 54**)
  2. *Temuan Residual Lama (GAGAL / Tidak Bersih):*
     Pada baris 80 content DB dan HTML live di subbab Outlook November:
     ```markdown
     3. **Rasio sinyal** — paruh kedua Oktober didominasi death cross (18 vs 35); bila rasio kembali seimbang, itu indikasi awal pembentukan dasar pasar.
     ```
     Angka `(18 vs 35)` masih tertinggal (seharusnya `18 vs 37` sesuai baris 52).
- **Verdict:** `qa_verified=partial`.

---

### 11. `qa-2026-11-01-02`
- **Klaim Builder:** SQL patch 2/2: klaim BBRI+BBCA → BBCA-only + angka asli (bulanan: halaman BBCA 156 kunjungan; mingguan: 86 vs BBRI 7). Replay PageView isBot=false: BBCA 156/86 = #1 saham, BBRI 9/7 di luar top-30. LIVE verified RSC payload p-1 + kalimat watch mingguan; klaim lama 0 residual.
- **Bukti Fisik:**
  1. *Replay Query SQL PageView (`isBot = false`):*
     - **Oktober Penuh (2026-10-01 s.d 2026-10-31):**
       `/stocks/BBCA.JK`: **156 kunjungan** (Peringkat #1 saham, #3 keseluruhan URL).
       `/stocks/BBRI.JK`: **9 kunjungan**.
     - **Pekan 26–30 Oktober (2026-10-26 s.d 2026-10-30):**
       `/stocks/BBCA.JK`: **86 kunjungan**.
       `/stocks/BBRI.JK`: **7 kunjungan**.
  2. *Live HTML & DB `rekap-pasar-2026-10-oktober`:*
     `halaman BBCA justru jadi halaman saham yang paling banyak dibaca pengunjung teknikal.id sepanjang bulan (156 kunjungan)`
  3. *Live HTML & DB `rekap-pasar-mingguan-2026-10-31`:*
     `halaman BBCA paling banyak dibaca pengunjung teknikal.id minggu ini (86 kunjungan; BBRI 7)`
  4. *Residual Klaim Lama:*
     Pencarian frasa klaim palsu `BBRI dan BBCA paling banyak dibaca` di kedua artikel menghasilkan **0 hits**.
- **Verdict:** `qa_verified=true`.

---

## 5. Ringkasan Kepatuhan Audit & Batasan Sistem

- **Akses Database:** 100% menggunakan pernyataan `SELECT` (Read-Only) via `docker exec teknikalidnew-db-1 psql -U teknikalid -d teknikalid`. Tidak ada perintah `INSERT`, `UPDATE`, `DELETE`, atau `ALTER` yang dieksekusi selama audit ini.
- **Akses Repositori Git:** 100% operasi read-only (`git log`, `git show`, `git diff`, `git merge-base`). Tidak ada commit baru, reset, push, atau perubahan file kode.
- **Budget Request Live Web:** Total 9 request `curl` dilakukan ke `https://teknikal.id` (dari batas anggaran maksimal 20 request).
- **Integritas Penilaian:** Mengikuti aturan anti-halusinasi ketat; task `qa-2026-11-01-01` diturunkan statusnya menjadi `qa_verified=partial` karena bukti fisik menemukan sisa residual angka lama yang kontradiktif di teks artikel publik.
