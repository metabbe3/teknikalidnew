# ITSEC Audit Mingguan (shift Kamis) — 12 Nov 2026 21:30 WIB

Scope: teknikal.id (teknikalidnew, commit e94c75d → 73dbf7c). hivePOS SKIP total sesuai FREEZE 1 Nov (catatan domain di bawah).

## RED — fitur baru sejak audit 9 Nov (review kode, 25+ file di 13 commit kode)

| Fitur | Commit | Verdict |
|---|---|---|
| Free Trial 7 hari `/api/agent/trial-start` + `/api/agent/membership` | (11-10) | BERSIH — auth-required; guard sekali-seumur-akun ATOMIK via PK insert `ON CONFLICT DO NOTHING RETURNING` (race-proof, bukan check-then-insert); guard ganda email+chat_id; sub upsert `WHERE status <> 'paid'` tak bisa menimpa paid; semua query parameterized. Logic flaw bypass trial multi-akun = terbatas via 1 email OAuth/account (sudah flag 5 Nov, diterima owner). |
| Monitoring hub `/api/admin/monitoring` + auth-health | 11-09/12 | BERSIH — role check ADMIN/OWNER inline (404 anti-fingerprint); pg_stat_statements read-only; tanpa param user. Funnel-v2 ADMIN-only + blocklist actor via `guardActorSql()` = bound params + invariant throw bila entri bukan UUID kanonik (anti-injection by construction — exemplary). |
| telegram-digest + alias daily-digest | (FASE T5) | BERSIH — `requireCronSecret` fail-closed (CRON_SECRET kosong → 500) + timingSafeEqual; dedupe TelegramSent per hari; dryRun utk pengujian. |
| llms.txt v2 seksi mover | 35bbaa3 | BERSIH — SATU PINTU getStockList + KURASI_KEEP; fail-soft; read-only. |
| Radar API + SSR stocks/radar | b0eb8cb | BERSIH — GET read-less tanpa input; single source scan JSON. |
| ai-sanitize linkifyBoldTickers guard lapis-3 | 6d4ff51 | BERSIH — allowlist ticker dari data server (bukan teks LLM); regex `^[A-Z]{4}$`; ada unit test. |
| verbalisasi arah IHSG server-side | 4c61eeb | BERSIH — data-driven server-side, justru MENGHILANGKAN hallucination surface. |
| swing backtest perf + = ANY array | 83e136e, 3816baa | BERSIH — parameterized; cache 1j. |
| tap-target/UX batch (44px, bell bottom-sheet, logo manifest) | 1c3ac23, d0bb416, eb2e0c9, fe39bd9, 590ea0e | BERSIH — CSS/markup murni, tanpa logika trust. |
| Rate-limit AI (verifikasi) | — | v2 dua lapis jam+hari, anti-spoof (tier dari session server), GC anti-leak + cap 5000; IP key pakai cf-connecting-ip (XFF[0] dihindari — komentar audit 28 Okt dihormati). |

**0 celah P0/P1 kode.** Semua SQL baru parameterized; 0 secret di diff e94c75d..HEAD.

## BLUE

- **Offsite backup MATI hari ke-10 → sec-2026-11-12-01 (P1, eskalasi ke-3).** rclone gdrive masih `empty token found`; cron exit-1 tiap malam. Dump lokal sehat (db-20261112.sql.gz 60MB, harian 01:16) tapi host sama = SPOF data customer berbayar. BARU: rclone warna shared client_id retired 2026 — reconnect sebaiknya sekalian pakai own client_id. Owner 5 menit.
- **npm prod audit → sec-2026-11-12-02 (P3):** follow-redirects HIGH transitive (1.16.0-1.16.1) + 8 moderate build-chain. Fix non-breaking; praktis rendah (tidak fetch redirect attacker-controlled). Bukan darurat.
- **hivepos.id domain parkir → sec-2026-11-12-03 (P3):** DNS live, header MINIMAL, 0 container (freeze utuh), cert s.d. 15 Jan 2027. Rekomendasi redirect 301 atau biarkan expire — keputusan owner.
- Headers teknikal.id lengkap (CSP/HSTS preload/XFO DENY/nosniff/referrer) ✓. SSL teknikal.id RENEWED: 9 Nov → 7 Feb 2027 (87 hari, agenda ~awal Feb) ✓.
- `.env` untracked (hanya .env.example) ✓. Branch `backup/pre-sec-purge-1015` SUDAH DIPURGE (owner action 9 Nov done) ✓. :8790 non-loopback = 401 ✓. kiri :443/:80 = loopback-only app desktop (Kiri.app userland, bind 127.0.0.1:47391 lokal) — bukan service exposed ✓. Docker: hanya 3 container teknikalidnew, semua bind 127.0.0.1 ✓.
- Monitoring gap 401/403 anonim: unchanged (sec-2026-10-29-01 approved, menunggu slot instrumentasi).

## Tren vs 9 Nov

Kualitas kode naik lagi (guard atomik trial = pola race-safe yang tepat; guardActorSql invariant UUID = anti-injection by construction). Sisa risiko konsolidasi ke RESILIENCE bukan celah: satu-satunya P1 (backup offsite) sudah 3 minggu menunggu 5 menit owner action. Permukaan hivePOS makin bersih (branch purged), tapi domain parkirnya belum diputuskan.

## Verdict: AMAN (0 P0; 1 P1 resilience eskalasi-3, 2 P3 hygiene)

## Owner 2 menit

1. `rclone config reconnect gdrive:` → `rclone lsd gdrive:backups-macmini/teknikalid-db` (P1, data customer, hari ke-10).
2. Putuskan hivepos.id: redirect 301 → teknikal.id ATAU biarkan cert expire Jan 2027 (P3).

## Sisa Pertanyaan & Gap

- ZAP baseline scan TIDAK dijalankan shift ini (image pull docker bisa besar; scan minggu lalu juga tidak dijalankan — kalau owner mau baseline rutin, sediakan jendela khusus agar tidak mengganggu quota deploy 6-8/hari). Passive probe + kode review meng-cover permukaan baru.
- gitleaks full-history: grep pola secret pada diff e94c75d..HEAD = 0 hit; full-scan git history belum diulang sejak run 5 Nov (belum ada indikasi perubahan; entry berikut bila perlu).
- 401/403 anonim tetap tak terukur sampai instrumen app-layer (sec-2026-10-29-01) masuk queue.
- trial-start: jika owner ingin trial 1×/manusia (bukan 1×/email), perlu device fingerprint/phone verify — keputusan produk fraud-tolerance, bukan temuan celah.
