# ITSEC Weekly RED+BLUE — 16 Nov 2026 (Senin 09:00 WIB)

Scope: teknikal.id (hivePOS SKIP — FREEZE owner 1 Nov). Repo: `~/Documents/teknikalidnew` @ main (0 ahead pre-audit). 178 commit / 7 hari, ~12 fitur kode (exclude docs).

## 🔴 RED TEAM — fitur baru 7 hari (9–16 Nov)

**Verdict: 12/12 BERSIH. 0 celah baru.**

| Fitur | Commit | Pemeriksaan | Hasil |
|---|---|---|---|
| Uhu webchat proxy `/api/uhu` (+history) | 63d7d94 wiring compose | Auth? Key leak? SSRF? Body cap? | ✅ `requireAuth` 401; **origin-check CSRF 403 terverifikasi LIVE** (probe curl tanpa origin → `{"error":"Cross-site request blocked"}`); `X-Webchat-Key` server-side only (key tak pernah dikirim ke client); upstream URL dari env bukan input; agentd handler: `io.LimitReader 32KB` + `utf8.RuneCountInString` ≤ MaxTextChars + email dinormalisasi lowercase-trim |
| One-tap watchlist T3 | c628163, 6d7df47 | IDOR? | ✅ Route watchlist ×3 (`/`, `/[ticker]`, `/batch`) = `requireAuth` + service scoped `user.id`; param ticker tidak dipakai lookup milik user lain. Guest path = localStorage murni (`guest-storage.ts`, cap 32KB serialized, ticker regex) — soft-gate by-design |
| Landing sektor SSR 11 halaman | 14c986c | Injection via slug? | ✅ `[slug]` dari daftar statis `src/lib/sectors.ts`, bukan free-input → render data server |
| Funnel-v2 admin + actor-blocklist | d0fc402, 40668a4, e1e3443 | Authz? SQLi blocklist? | ✅ Route = `session.user.role === "ADMIN"` re-verify; blocklist UUID di-render via `Prisma.sql` bound params (bukan string concat); guard `qa-` NULL-safe (`COALESCE(...) NOT LIKE 'qa-%'`) |
| cron-monitoring errors/timeout | e021bff | Info leak? | ✅ `CronTimeoutError extends DomainError` mapping 504; satu definisi tipe repo↔service; tak ada internal detail ke response |
| RelatedSignals mid-article | e7848c8 | XSS via konten? | ✅ Komponen React (auto-escape), data dari server curated |
| linkifyBoldTickers guard | 6d4ff51 | XSS/link-injection? | ✅ Lapis-3 konsistensi format ticker + allowlist data server (penerusan pola `sanitizeLinkText`) |
| a11y/destructive-guards 62 route | 8008191 | Logic flaw? | ✅ Destructive-action guards DITAMBAHKAN (perbaikan, bukan regresi) |
| Lainnya (f222f14 nav, 74ee8f2 label, eb2e0c9, dll) | — | — | ✅ UI/UX murni, tak menyentuh auth/input/db/money |

## 🔵 BLUE TEAM

- **Deploy verify (gap minggu lalu TERTUTUP)**: fix auth-error `006789f` + redirect `6872c93` (commit 8 Nov) kini **live di prod** — image `teknikalidnew-app` build 15 Nov 22:21:08 WIB (setiap commit ≤15 Nov terbungkus), container start 15 Nov 22:23 WIB, BUILD_ID container == working tree. Bukti behavioral: origin-check 403 aktif di prod.
- **Backup offsite: MASIH MATI — hari ke-13** (ESKALASI-4, chain sec-11-05-04 → 11-09-02 → 11-12-01). `rclone about gdrive:` masih `CRITICAL empty token found`; job `43c3452b406d` [paused]. Dump lokal harian sehat (60MB) tapi **satu-satunya copy = host yang sama**. Baru: NOTICE rclone — shared Google client_id retired selama 2026 → saat reconnect sekaligus buat own client_id. **Owner 5 menit**: `rclone config reconnect gdrive:` → verify `rclone lsd gdrive:backups-macmini/teknikalid-db` → `hermes cron resume 43c3452b406d`.
- **Branch backup/pre-sec-purge-1015: TERHAPUS ✓** (sec-2026-11-09-01 CLOSED — `git branch -a` kosong dari branch tsb, sisa gap run lalu selesai).
- Headers teknikal.id: CSP lengkap + HSTS preload + XFO DENY + nosniff + referrer-policy ✓ (unchanged, baik).
- SSL teknikal.id: exp **7 Feb 2027** (83 hari) ✓. Cert kedua (hivepos.id) 15 Jan 2027 — parked post-FREEZE, P3 known.
- `.env` untracked ✓ (hanya `.env.example` di git); `.env` disk permission `600` ✓. `AGENTD_WEBCHAT_KEY` masuk via compose env dari `.env` — tidak hardcoded ✓.
- Ports: agentd :9101 & apple_health :8766 kini **loopback** ✓ (perbaikan sec-11-05-05 verified via lsof). ARD `*`:3283 + AirPlay `*` = standing risk-accepted owner. :8790 dashboard 401-gated dari LAN ✓.
- Monitoring gap 401/403 anonim: unchanged (sec-10-29-01 approved, nunggu slot implementasi — bukan item baru).

## Backlog update (commit `f79a07f`, pushed)

- `sec-2026-11-16-01` P2 candidate — RED bersih ×12 fitur (bukti per fitur di atas).
- `sec-2026-11-16-02` P3 candidate — deploy-verify gap closed (bukti image/behavioral).
- `sec-2026-11-16-03` P3 candidate — `GetUsageSince` dead-code (0 call-site; konfirmasi sisa pertanyaan run 9 Nov, housekeeping).
- `sec-2026-11-09-01` → **done** (branch verified gone).
- `sec-2026-11-12-01` → catatan ESKALASI-4 hari-13 + rekomendasi reconnect + own client_id.

## Tren vs minggu lalu

Minggu lalu: hygiene (branch, LAN ports) + verifikasi fix masa lalu. Minggu ini: **kualitas shift-left tetap naik** — origin-check CSRF dan body-cap muncul sebagai pola default di endpoint publik baru; destructive-action guards massal; input guard berlapis (zod di beacon + service-scoped query). Risiko tersisa tetap **resilience (backup offsite), bukan exploit**.

## Sisa Pertanyaan & Gap

1. **rclone reconnect butuh login Google owner** — sampai jalan, DB customer berbayar tetap single-host. Ini satu-satunya P1 aktif.
2. rclone shared client_id retired 2026 — reconnect saja belum cukup jangka panjang; perlu own client_id (sudah masuk rekomendasi entry).
3. npm audit follow-redirects HIGH (transitive) — masih P3 rejected/unchanged, belum ada rilis upstream yang bersih.
4. Monitoring 401/403 anonim (sec-10-29-01) masih menunggu slot — deteksi password-spray tetap butuh.
5. `agentd` dieksplorasi via grep handler webchat saja; deep-audit penuh agentd (Go) di luar scope minggu ini — belum pernah ada temuan di sana, tapi belum pernah full-pass.
