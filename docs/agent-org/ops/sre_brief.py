#!/usr/bin/env python3
"""sre_brief.py — fakta stabilitas harian kedua org utk SRE agent (read-only).

Worker error-counter kontekstual (ops-2026-09-24-01): baris npm-SIGKILL dari
self-heal healthcheck (by design, ops-2026-09-22-01) TIDAK lagi dilaporkan
sebagai error — dipasangkan dgn RestartCount/OOMKilled/Health dari docker inspect.

App error-counter kontekstual (ops-2026-10-04-01, mirror logika worker): 1-3 baris
auth one-off (InvalidCheck/pkce/CSRF) dlm ±60mnt container StartedAt pasca-deploy
= DEPLOY-NOISE, bukan REAL ERROR. Error di luar window/pattern TETAP dihitung.
"""
import subprocess, datetime, re, sys, os

WIB = datetime.timezone(datetime.timedelta(hours=7))
now = datetime.datetime.now(WIB).strftime("%Y-%m-%d %H:%M")

def sh(c, t=30, cap=700):
    try:
        r = subprocess.run(["bash", "-c", c], capture_output=True, text=True, timeout=t)
        return (r.stdout or r.stderr or "").strip()[:cap]
    except Exception as e:
        return "ERR " + str(e)

def classify_worker_errors(errors, sigkill_lines, restart_count, oom_killed, health):
    """Klasifikasi error counter worker (murni, unit-testable).

    Returns dict: {label, real_errors, note}
    - OOM dikalah-argumenkan dulu (real problem, bukan self-heal).
    - SIGKILL lines berpasangan RestartCount>=1 = SELF-HEAL (healthcheck pkill
      -> npm exit -> docker restart; by design ops-2026-09-22-01).
    - Error tanpa pasangan restart = REAL ERROR.
    """
    if oom_killed:
        return {"label": "OOM-KILLED", "real_errors": errors,
                "note": "OOMKilled=true — cek memory limit, BUKAN self-heal"}
    if errors > 0 and sigkill_lines > 0 and restart_count >= 1:
        return {"label": "SELF-HEAL", "real_errors": 0,
                "note": f"npm-SIGKILL {sigkill_lines} baris berpasangan RestartCount={restart_count} "
                        "(healthcheck pkill by design ops-22-01) — bukan error betulan"}
    if errors > 0:
        return {"label": "REAL ERROR", "real_errors": errors,
                "note": "error tanpa pasangan restart/SIGKILL — investigasi"}
    return {"label": "CLEAN", "real_errors": 0, "note": "0 error 24h"}

def worker_error_context(container="teknikalidnew-worker-1"):
    """Hitung error + konteks docker inspect utk klasifikasi."""
    errors = sh(f"docker logs {container} --since 24h 2>&1 | grep -icE 'error|fatal|panic' || true")
    sigkill = sh(f"docker logs {container} --since 24h 2>&1 | grep -ic 'SIGKILL' || true")
    insp = sh(f"docker inspect {container} --format "
              "'{{.RestartCount}} {{.State.OOMKilled}} {{.State.Health.Status}}' 2>/dev/null")
    try:
        parts = insp.split()
        restart_count, oom_killed, health = int(parts[0]), parts[1] == "true", parts[2]
    except Exception:
        restart_count, oom_killed, health = -1, False, "unknown"
    try:
        errors_i = int(errors)
    except ValueError:
        errors_i = -1
    try:
        sigkill_i = int(sigkill)
    except ValueError:
        sigkill_i = 0
    return errors_i, sigkill_i, restart_count, oom_killed, health

def classify_app_errors(errors, deploy_noise, container_age_h, health):
    """Klasifikasi error counter app (ops-2026-10-04-01, murni unit-testable).

    Rule mirror worker ops-2026-09-24-01: sedikit (1-3) baris auth one-off
    (InvalidCheck/pkce/CSRF) yang terjadi dalam ±60mnt container StartedAt
    pasca-deploy = DEPLOY-NOISE (cookie/verifier user basi, hilang sendiri).
    Error di luar window ATAU pattern berbeda TETAP dihitung penuh (0 FN).
    """
    real = errors - deploy_noise
    if errors > 0 and 1 <= errors <= 3 and errors == deploy_noise \
            and container_age_h is not None and container_age_h <= 1.0 and health == "healthy":
        return {"label": "DEPLOY-NOISE", "real_errors": 0,
                "note": f"{deploy_noise} auth one-off (InvalidCheck/pkce/CSRF) dalam ±60mnt "
                        f"StartedAt pasca-deploy (ops-2026-10-04-01) — bukan error betulan"}
    if real > 0:
        return {"label": "REAL ERROR", "real_errors": real,
                "note": f"{real} error betulan ({deploy_noise} deploy-noise diskip) — investigasi"}
    if errors > 0:
        return {"label": "DEPLOY-NOISE", "real_errors": 0,
                "note": f"{errors} baris error semuanya deploy-noise dlm window — bukan error betulan"}
    return {"label": "CLEAN", "real_errors": 0, "note": "0 error 24h"}

# Regex timestamp ISO-8601 di log docker: 2026-10-05T00:31:03.123Z
TS_RE = re.compile(r"(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})")
AUTH_NOISE_RE = re.compile(r"InvalidCheck|pkce|CSRF", re.IGNORECASE)

def app_error_context(container="teknikalidnew-app-1"):
    """Hitung error + noise-in-window app utk klasifikasi (read-only)."""
    errors = sh(f"docker logs {container} --since 24h 2>&1 | grep -icE 'error|fatal|panic' || true")
    started = sh(f"docker inspect {container} --format '{{{{.State.StartedAt}}}}' 2>/dev/null", cap=40)
    insp = sh(f"docker inspect {container} --format "
              f"'{{{{.RestartCount}}}} {{{{.State.OOMKilled}}}} {{{{.State.Health.Status}}}}' 2>/dev/null", cap=60)
    try:
        parts = insp.split()
        health = parts[2]
    except Exception:
        health = "unknown"
    try:
        errors_i = int(errors)
    except ValueError:
        errors_i = -1
    started_dt = None
    for fmt in ("%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%fZ"):
        try:
            started_dt = datetime.datetime.strptime(started, fmt).replace(tzinfo=datetime.timezone.utc)
            break
        except ValueError:
            continue
    if started_dt is None:
        m = TS_RE.match(started or "")
        if m:
            y, mo, d, h, mi, s = map(int, m.groups())
            started_dt = datetime.datetime(y, mo, d, h, mi, s, tzinfo=datetime.timezone.utc)
    container_age_h = None
    if started_dt:
        container_age_h = round((datetime.datetime.now(datetime.timezone.utc) - started_dt).total_seconds() / 3600, 2)
    # Baris error mentah utk deteksi noise-in-window
    raw = sh(f"docker logs {container} --since 24h 2>&1 | grep -iE 'error|fatal|panic' | head -20 || true", cap=4000)
    noise = 0
    if started_dt and container_age_h is not None and container_age_h <= 60.0:
        for line in raw.splitlines():
            if not AUTH_NOISE_RE.search(line):
                continue
            m = TS_RE.search(line)
            if not m:
                continue
            y, mo, d, h, mi, s = map(int, m.groups())
            try:
                ts = datetime.datetime(y, mo, d, h, mi, s, tzinfo=datetime.timezone.utc)
            except ValueError:
                continue
            if started_dt - datetime.timedelta(minutes=60) <= ts <= started_dt + datetime.timedelta(minutes=60):
                noise += 1
    return errors_i, noise, container_age_h, health

def backup_freshness(pattern_dir, max_age_h, min_size_bytes, label, glob_pat="*.sql.gz"):
    """Cek backup .sql.gz terbaru di dir (ops-2026-10-08-01, murni unit-testable).

    Returns dict: {file, age_h, size_mb, verdict, note}.
    - Tidak ada file/dir hilang      -> verdict STALE (note jelas).
    - mtime > max_age_h              -> verdict STALE (mati senyap).
    - size < min_size_bytes          -> verdict SUSPICIOUS (file muncul tapi kosong).
    - Sehat                          -> verdict OK.
    Alert-only: pemanggil mencetak note, exit code TIDAK diubah.
    """
    import glob, os
    files = sorted(glob.glob(os.path.join(pattern_dir, glob_pat)))
    if not files:
        return {"file": f"{pattern_dir}/{glob_pat} (TIDAK ADA)", "age_h": None,
                "size_mb": None, "verdict": "STALE",
                "note": f"{label}: TIDAK ADA file backup {glob_pat} di {pattern_dir} — backup mati?"}
    # termuda by mtime (bukan sort nama — 'manual_premigration' menang alphabetis)
    latest = max(files, key=os.path.getmtime)
    st = os.stat(latest)
    age_h = round(max((datetime.datetime.now() - datetime.datetime.fromtimestamp(st.st_mtime)).total_seconds(), 0) / 3600, 1)
    size_mb = round(st.st_size / 1e6, 1)
    if age_h > max_age_h:
        return {"file": latest, "age_h": age_h, "size_mb": size_mb,
                "verdict": "STALE",
                "note": f"{label}: backup TERAKHIR {age_h}h lalu (> {max_age_h}h) — {os.path.basename(latest)} — cek cron backup!"}
    if st.st_size < min_size_bytes:
        return {"file": latest, "age_h": age_h, "size_mb": size_mb,
                "verdict": "SUSPICIOUS",
                "note": f"{label}: backup terbaru cuma {size_mb}MB (< {min_size_bytes//1000}KB) — cek integritas dump!"}
    return {"file": latest, "age_h": age_h, "size_mb": size_mb,
            "verdict": "OK", "note": f"{label}: fresh {age_h}h lalu, {size_mb}MB"}


print(f"=== SRE BRIEF {now} (fakta, read-only) ===")
print("\n[DOCKER HEALTH]")
print(sh("docker ps --format '{{.Names}}\t{{.Status}}'"))
print("\n[DISK]")
print(sh("df -h / | tail -1"))
print("\n[DOCKER RECLAIMABLE]  # visibility sre-2026-09-23-1 / -24-02 — trend headroom server")
print(sh("docker system df --format '{{.Type}}: total={{.Size}} reclaimable={{.Reclaimable}}' | grep -E 'Images|Build Cache'"))
print("\n[UPTIME]")
print(sh("uptime"))
print("\n[SITE LATENCY]")
for site in ["https://teknikal.id", "https://hivepos.id"]:
    print(site, sh(f"curl -s -o /dev/null -w '%{{http_code}} %{{time_total}}s' -A Mozilla {site}"))
print("\n[RESTART LOOPS?]")
print(sh("docker ps -a --format '{{.Names}} {{.Status}}' | grep -iE 'restarted|unhealthy' | head -5 || true"))
print("\n[APP ERRORS 24h teknikal — kontekstual (ops-2026-10-04-01)]")
a_errors, a_noise, a_age_h, a_health = app_error_context()
a_verdict = classify_app_errors(a_errors, a_noise, a_age_h, a_health)
print(f"raw_grep={a_errors} deploy_noise={a_noise} container_age={a_age_h}h Health={a_health}")
print(f"VERDICT: {a_verdict['label']} | real_errors={a_verdict['real_errors']} | {a_verdict['note']}")
print("\n[WORKER ERRORS 24h — kontekstual]")
w_errors, w_sigkill, w_restart, w_oom, w_health = worker_error_context()
w_verdict = classify_worker_errors(w_errors, w_sigkill, w_restart, w_oom, w_health)
print(f"raw_grep={w_errors} sigkill_lines={w_sigkill} RestartCount={w_restart} OOMKilled={w_oom} Health={w_health}")
print(f"VERDICT: {w_verdict['label']} | real_errors={w_verdict['real_errors']} | {w_verdict['note']}")
print("\n[HERMES RUN LEDGER HARI INI]")
print(sh("python3 ~/.hermes/scripts/run_ledger.py --status 2>/dev/null | tail -8 || true"))

print("\n[BACKUP FRESHNESS]  # ops-2026-10-08-01 — 'Up 3 weeks' != backup sukses; alert-only, exit tetap 0")
# Premis awal spec (host copy 2x/hari) KELIRU — hasil verifikasi 8 Okt:
#   - host copy ~/backups/hivepos = HARIAN 01:25 (paritas teknikal, owner 4 Okt)
#   - yang 2x/hari = sidecar container -> ~/Documents/hivepos/backups (pos_saas_*.sql.gz)
# Keduanya dimonitor sesuai kenyataan masing-masing (CTO koreksi spec ke repo).
for cfg in [
    ("~/backups/teknikalid", 26, 100_000, "teknikal host (harian 01:1x, <=26h, >100KB)", "*.sql.gz"),
    ("~/backups/hivepos", 26, 500_000, "hivePOS host (harian 01:25, <=26h, >500KB)", "*.sql.gz"),
    ("~/Documents/hivepos/backups", 14, 500_000, "hivePOS sidecar (2x/hari, <=14h, >500KB)", "pos_saas_*.sql.gz"),
]:
    d = os.path.expanduser(cfg[0])
    r = backup_freshness(d, cfg[1], cfg[2], cfg[3], cfg[4])
    flag = "" if r["verdict"] == "OK" else "  <<< ALERT"
    print(f"{r['note']} [{r['verdict']}]{flag}")
print("\n=== SELESAI — SRE agent: analisis SLO dari fakta (latency/error/restart), usulan → product-backlog.json idea, BUKAN deploy ===")
