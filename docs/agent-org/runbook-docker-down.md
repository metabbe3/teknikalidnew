# Runbook — Docker Desktop Down / Situs 502 (teknikal.id & hivepos.id)

**Konteks**: Insiden 19 Okt 2026 — Docker Desktop mati saat market-open, kedua org
production 502, RTO >7 menit, detection = 0 (tidak ada yang tahu sampai owner lihat).
Watchdog `sre-2026-10-21-01` menutup gap detection; runbook ini = jalur pemulihan.

**Watchdog**: `~/.hermes/scripts/site-502-watchdog.sh` — launchd tiap 5 mnt
(label `com.teknikalid.site-502-watchdog`). Alert Telegram (bot Hermes) saat site
≠200, dedup 30 mnt; docker daemon unreachable ≥1 jam → alert CRITICAL.

## Gejala → Diagnosis (urut)

| Gejala | Arti | Aksi |
|---|---|---|
| Alert "SITE DOWN ... docker=UNREACHABLE" | Docker daemon/socket mati (SPOF) | Langkah A |
| Alert "SITE DOWN ... docker=reachable" | Daemon hidup, tapi edge/app down | Langkah B |
| Alert "CRITICAL: docker daemon UNREACHABLE ≥1 jam" | Docker Desktop tidak di-up owner | Langkah A, prioritas |

## Langkah A — Docker daemon down (paling umum)

1. `docker info` — kalau error `Cannot connect to the Docker daemon`, Docker Desktop mati.
2. **Aksi OWNER** (agent dilarang auto-start, kebijakan blocked_for_owner):
   `open -a Docker` → tunggu ~60-90 dtk daemon siap.
3. Container restart-policy `unless-stopped` → auto-naik sendiri. Verifikasi:
   `docker ps --format '{{.Names}}\t{{.Status}}'` (teknikalid: app/worker/db/plausible; hivepos: api/web/caddy/postgres/whatsapp-gateway).
4. Verifikasi edge: `curl -A Mozilla -L -o /dev/null -w '%{http_code}\n' https://teknikal.id/` → 200.
5. Kalau ada container tidak auto-naik: `docker start <name>` (jangan recreate).
6. Watchdog akan sendiri mencatat OK berikutnya (state `.ok` ter-refresh) — tidak perlu intervensi.

## Langkah B — Daemon hidup tapi site 502

1. `docker ps -a | grep -v 'Up '` — cari `Exited`:
   - teknikalid: app → `docker compose up -d app` di `~/Documents/teknikalidnew`
   - hivepos: caddy/api/web → `docker compose up -d <svc>` di repo hivepos
2. Kalau SEMUA container Up tapi tetap 502: kemungkinan caddy/tunnel — cek
   `docker logs --tail 50 hivepos-caddy-1` (hivepos) dan untuk teknikal.id cek
   bagaimana edge di-expose (plausible/caddy/cloudflared) — JANGAN blind-restart.
3. App hidup tapi tidak jalan (crash loop): `docker logs --tail 100 teknikalidnew-app-1` —
   kalau error config/env, HENTI dan buat task P0 di cto-queue (jangan edit .env sendiri).
4. Selesai → verifikasi `curl` 200 + catat insiden di `docs/agent-org/lessons-learned.md`.

## Batas agent (jangan langgar)

- JANGAN `open -a Docker` otomatis (owner-only; interaksi GUI/TCC).
- JANGAN edit `.env` / auth / payments.
- Watchdog host script → tidak menghabiskan budget deploy aplikasi.
- Kalau RTO >30 mnt atau penyebab tidak jelas → laporkan owner, jangan eksperimen.

## File terkait
- Script: `~/.hermes/scripts/site-502-watchdog.sh`
- State/log: `~/.local/state/site-502-watchdog/` (watchdog.log, *.state.ok/.alert/.crit)
- Plist: `~/Library/LaunchAgents/com.teknikalid.site-502-watchdog.plist`
- Insiden asal: `docs/agent-org/lessons-learned.md` (19 Okt 2026)
