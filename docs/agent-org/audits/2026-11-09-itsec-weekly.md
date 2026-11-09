# ITSEC Audit Mingguan — 9 Nov 2026 09:00 WIB

Scope: teknikal.id (teknikalidnew + teknikal-agent). hivePOS SKIP total sesuai FREEZE 1 Nov.
Diff vs run lalu (2 Nov): https://teknikal.id — commit 7e33f3d → e94c75d.

## RED — fitur baru 7 hari (10 fitur kode, semua direview)

| Fitur | Commit | Verdict |
|---|---|---|
| reply-hook weblink (bot) | 0dbb567 | BERSIH — URL dirakit sistem dari ToolInvocation args, regex whitelist `^[A-Z]{4}$` + strip `.JK`; bukan teks LLM (bukan hallucination surface). Label `fmt.Sprintf` aman. Maks 3 ticker, delisted difilter dari tool-result. |
| urgent-blast v2 + v2.1 (bot) | f68c800, 03e1bab, 64f03c7 | BERSIH — `sanitizeLinkText` strip `[]()` + NUL dari judul sebelum masuk `[judul](url)` MarkdownV2 → tidak bisa break-out link ke URL attacker (judul RSS eksternal = untrusted). URL dari DB sumber asli. Cap 3/chat/hari + dedupe lintas run + coalesce. |
| unsubscribe-global (bot) | 6b58b3f | BERSIH — guard dipasang di SEMUA 5 sender proaktif (urgentblast/comeback/alerts/digest/notify); /start = re-subscribe. Compliance plus, bukan celah. |
| auth-error page (web) | 006789f | BERSIH — `console.warn` hanya type enum Auth.js (bukan pesan/kredensial); `error` param hanya dipetakan ke MESSAGES whitelist → tidak ada reflected-XSS (page.tsx = React-escaped) maupun log-injection. |
| auth redirect + OAuth-first (web) | 6872c93 | BERSIH — 308 fixed redirect /auth/login→/auth/signin di next.config (server-side, bukan open-redirect). |
| market fundamental + fundflow API | 03db411 | BERSIH — input = 1 param ticker; lookup via repository (parameterized); output Prisma Decimal/BigInt dikonversi serializer. GET read-only, cache publik s-maxage=300. Tidak ada injection/amplifikasi (1 query per ticker + LIMIT). |
| soft-sell FE (guest-quota/ticker-fab/tap-targets) | dd23c46, a16d480, e35c75a | BERSIH — kuota guest 3 saham memang localStorage by-design (soft gate konversi, BUKAN kontrol keamanan — data stock page publik); deeplink t.me statis; fetch storyUrl read-only. |

**Kuota paid P0 (BUG-SCAN 6 Nov #266) TERVERIFIKASI FIXED** — bukan regresi baru, verifikasi continuity:
gate `isChatQuotaBlocked` (handler.go:3074→3110) kini memakai `paidUsed()` = turn bulan ini − `usage_base_<chat>_<bulan>` baseline yang ditulis SAAT settlement (billing.go:497). Enforcement server-side pre-LLM. `/kuota` display pakai basis sama. Catatan: `GetUsageSince` (store.go:166) kini dead code — tidak ada call-site; kandidat cleanup non-urgen.

**TOCTOU promo (sec-2026-11-05-01, P1 promoted_ops) TERVERIFIKASI TERTUTUP** — checkout route: promo eligibility 1×/chat dicek server-side (agent_promo_redemption count) dan harga dikunci server (`price = usePromo ? 14900/29000 : 29000/79000`); settlement membakar RedeemPromo ON CONFLICT DO NOTHING (idempotent). Dua checkout paralel = kedua dapat harga promo (margin loss kecil, owner-accepted trade-off) tapi tidak bisa dapat harga promo >1× karena burn saat settlement pertama + webhook idempotent.

## BLUE

- **sec-2026-11-02-01 CDP lightpanda: FIXED TERVERIFIKASI** — kini `127.0.0.1:9223->9222/tcp` (loopback). 1-baris fix minggu lalu diterapkan.
- **sec-2026-11-02-02 branch backup: BELUM** — entry backlog didrop cleanup 6 Nov tapi branch fisik masih hidup & memuat ig/tiktok-session.json (origin scan 0 hit, aman selama lokal). → **sec-2026-11-09-01 (P3)**: 1 baris `git branch -D backup/pre-sec-purge-1015`.
- **Offsite backup: ESKALASI sec-2026-11-09-02 (P1)** — rclone gdrive `empty token found` masih mati sejak 3 Nov (hari ke-6). pg_dump lokal jalan (db-backup-err 0 byte) tapi tujuan /tmp pruned-24h + host sama = single point of failure untuk data customer berbayar. Owner action 5 menit: `rclone config reconnect gdrive:`.
- Headers teknikal.id lengkap (CSP/HSTS preload/XFO DENY/nosniff/referrer) ✓. SSL teknikal.id 10 Des (31 hari — agenda Des), hivepos.id 15 Jan 2027 ✓.
- `.env` tak ter-track (hanya .env.example) ✓. Grep secret di diff 7 hari: 0 hit nyata (hanya plan-doc path/teks) ✓.
- Port `*` lain: ARDAgent UDP 3283 + ControlCenter/AirPlay 5000/7000 = macOS system daemons standing issue (sec-2026-10-15-02 rejected by owner — risk-accepted, LAN-only); :8790 publik 401 auth-gated (probe non-loopback = 401) ✓; agentd :9101 & apple_health :8766 kini 127.0.0.1 (fix sec-2026-11-05-05 applied) ✓.
- auth-err 7d teknikal.id: tidak tersedia (tabel ErrorLog tidak ada) = monitoring gap 401/403 anonim yang sama seperti minggu lalu (sec-2026-11-02-03 rejected; sec-2026-10-29-01 approved = instrumentasi app-layer menunggu slot).
- hivePOS ErrorLog "No such container" = artefak query script ke container freeze — bukan insiden.

## Tren

Minggu lalu: hygiene permukaan LAN & git (3 temuan P2/P3). Minggu ini: 1 P1 resilience (backup) + 1 P3 sisa-higienis; permukaan kode 10 fitur baru semua bersih — kualitas shift-left baik (sanitizer, whitelist regex, server-side pricing terpasang di titik yang tepat). Postur naik; satu-satunya yang benar-benar menyakitkan adalah backup offsite.

## Verdict: AMAN (dengan 1 P1 resilience)

0 celah P0. 10/10 fitur baru bersih. Kuota paid + TOCTOU promo (temuan 5 Nov) terverifikasi tertutup.

## Owner 2 menit

1. `rclone config reconnect gdrive:` → verify `rclone lsd gdrive:` (P1, data customer).
2. `git branch -D backup/pre-sec-purge-1015` (P3, 1 baris).
