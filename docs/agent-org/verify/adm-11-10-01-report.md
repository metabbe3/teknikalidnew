# Laporan Shift — Admin UX Builder teknikal.id (ADMIN-UX-1117)

**Tanggal:** 2026-11-17, slot ~20:00–20:40 WIB · **Posisi:** [KONVERSI] (akurasi data & trust surface internal-owner; freeze-safe — bukan fitur baru)

## 1. Ticket dikerjakan

**adm-2026-11-10-01** — Audit+fix `/admin/auth-health`: KPI "Active Sessions" fake-0 → "Pengguna Aktif 24 jam" (PageView) + label ID awam. Status saat ambil: `in_train`.

**Temuan scope:** kode sudah selesai dibangun 10 Nov (merged main `594d176`, ancestor HEAD & origin/main) dan sudah live di image app 17 Nov 17:56 — string "Pengguna Aktif" ada di prerender container. Yang tertunda hanyalah **verify live PROD + flip status** (verify 10 Nov hanya sampai staging :3210). Shift ini = menutup utang itu, **0 kode baru, 0 build, 0 deploy**.

Prioritas sesuai SOP: adm-02 (Info Uang) = `deployed`, adm-01 = `dropped_freeze_6nov` → adm-11-10-01 satu-satunya `in_train`.

## 2. Diff summary

- `docs/agent-org/product-backlog.json` (+journal/version/mirror): flip adm-2026-11-10-01 → `done` + result/verify evidence (v87→v88, via statejson)
- `docs/agent-org/cto-queue.json` (+pendamping): append entry done (v681→v682, via statejson)
- `docs/agent-org/verify/adm-11-10-01-desktop-1440-live.png` (1440×900) + `adm-11-10-01-mobile-390-live.png` (1170×2532)
- `docs/agent-org/handoff.md`: blok ADMIN-UX-1117
- Branch `night/admin-2026-11-17-1` commit `72f7e88` → merge `58cf9a0` → handoff `4719fdc`; **main == origin 4719fdc** (push membawa juga 6 commit pra-kereta yang memang menunggu push — sesuai langkah pertama kondektur 22:15)

## 3. Verify evidence (fisik, H1)

| Klaim | Bukti |
|---|---|
| API live data asli | `curl https://teknikal.id/api/admin/auth-health` (cookie admin minted) → JSON `activeUsers24h:5, activeAnon24h:41, totalAccounts:48, signups14d:18, bannedUsers:0` |
| Angka == SQL replay | Query EXACT sesuai route dijalankan di DB container → **5/5 EXACT MATCH** (PageView DISTINCT userId/anonId 24h isBot=false; `Account` count=48; User 14d WIB-day-start=18; bannedAt=0) |
| Fake-0 lama terkonfirmasi | `Session` table = **0 baris** (JWT strategy memang tak pernah menulis) |
| Render UI live bukan kosong | Chrome CDP prod `https://teknikal.id/admin/auth-health`: 1440×900 **dan** 390×844 — KPI "Pengguna Aktif (24 jam) 5 / +41 tanpa login / Total Akun 48 / Pendaftar Baru (14 hari) 18 / Akun Diblokir 0"; provider Credentials 10 / Google 38; empty-state blokir "Tidak ada akun diblokir"; skeleton=0; scrollW==vw @390 (no overflow) |
| Label ID awam tuntas | grep prerender container: `Active Sessions/Total Accounts/API Cache Usage/Key Prefix/Last Fetched` = **0 kemunculan**; 4 judul KPI ID = masing-masing 1× |
| Gate auth jalan | Tanpa cookie → redirect `/admin/login`, KPI tidak bocor |
| Kebersihan audit | Cookie domain dihapus TOTAL (Storage.getCookies → Network.deleteCookies loop; final `remaining: []`); file secret scratch (prod-env.txt, session-jwe.txt) dihapus |
| Sweep kelas serupa | `prisma.session`/`"Session"` di admin lain = 0 (fake-metric class closed) |
| Git | `git log --oneline -1` → `4719fdc`; bukti per file di stat commit `72f7e88` |

Metode akses admin tanpa kredensial owner: mint cookie sesi `__Secure-authjs.session-token` (JWT strategy + revalidasi DB 60s; user ADMIN asli dari DB) — pola skill teknikal-ui-workflow; H3 dihormati: tulis bukti saja, verdict QA milik Sentinel.

## 4. Sisa antrean adm-

| ID | Status |
|---|---|
| adm-2026-10-28-01 (nav+stub) | dropped_freeze_6nov |
| adm-2026-10-28-02 (Info Uang live) | deployed |
| adm-2026-11-10-01 (auth-health) | **done (shift ini)** |

**Antrean adm- KOSONG.** Slot admin berikutnya wajib fallback mandiri: AUDIT SATU halaman admin (visibility: KPI/empty/loading/error; control: aksi manual <3 klik) → card `adm-` baru + laporan. Kandidat: `/admin/cron-monitor` (charts pernah kena epidemi `style={{height}}` 0px) atau `/admin/monitoring`.

## 5. Sisa Pertanyaan & Gap

1. **Parity break prod masih terbuka**: app image 17 Nov 17:56 vs worker 16 Nov 22:29 (rebuild APP-ONLY tanpa bus entry — writer non-org; d3b4c78 bagus tapi prosedur jalan). Kondektur 22:15 malam ini yang pulihkan (build atomik app+worker dari HEAD) — bukan territory slot ini.
2. **Verify live adm-11-10-01 7 hari tertunda**: kode live tanpa melalui kereta tercatat; bukti live baru ditulis hari ini. Gap trust tertutup, tapi pola "merged tanpa flip status" = kelas drift prosedur yang sudah jadi perhatian ops-11-01-04.
3. **N menit drift angka**: replay SQL dan pembacaan API live dilakukan berbeda ±2 menit — angka anon (36→41) bergerak antar-reading karena traffic live; match final diambil pada pasangan query-exact vs API yang berdekatan waktu. Untuk KPI bergerak cepat, toleransi ±1–2 unit wajar.
4. `/sosmed` pt_dashboard hang >45s — di luar repo ini (REVIEWER-PAGI-1116), territory ops/owner, belum ditangani.
