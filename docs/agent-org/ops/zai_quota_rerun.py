#!/usr/bin/env python3
"""zai_quota_rerun.py — Auto-rerun cron job pagi yang gagal 429-1308 (kuota 5-jam z.ai).

Insiden nyata 3 Okt 2026: 4 laporan pagi gagal beruntun 06:31-07:00 karena kuota
5-jam z.ai habis (reset 08:09) — retry 3x~15s bawaan tak akan pernah menembus
quota-window; PT Weigh-In sembuh via re-run manual 07:25 = bukti re-run = penyembuh.

Mekanisme (PRD sre-2026-10-03-2):
1. SCAN errors.log baris: ERROR cron.scheduler: Job '<name>' failed: ...
   [1308][Usage limit reached for 5 hour. Your limit will reset at YYYY-MM-DD HH:MM:SS]
   → job LLM cron teridentifikasi + reset-time kuota.
2. STATE ~/.hermes/data/zai-quota-rerun/state.json (atomic .tmp + os.replace):
   per (date, job_id): t1 = max(reset+5m, err+5m), t2 = t1+35m (attempt-2; bukti:
   rerun manual 08:37 kena 1302 rate-limit — butuh slot ~30-45m), giveup = t2+60m.
3. FIRE (idempotent per (date, job_id, attempt)): subprocess.Popen bg
   `hermes cron run <job_id>` (playbook 529), tidak menunggu.
4. WINDOW EKSEKUSI 07:05-21:45 WIB (quiet zone 11:00-18:00 owner 16 Sep; pra-07:05
   monitor belum bangun; >21:45 hard-gate). Deadline attempt DIGESER ke jendela
   (shift_into_allowed) — deferral tidak membatalkan attempt; laporan = janji harian.
5. OUTPUT: sehat = exit 0 SILENT (monitor-gated). Laporan aksi = stdout standar
   monitoring (cron no_agent kirim stdout ke telegram owner).
6. SOURCE OF TRUTH sukses: jobs.json last_status (scheduler), BUKAN script ini.

Pemakaian:
  python3 zai_quota_rerun.py            # cron mode (silent-when-healthy)
  python3 zai_quota_rerun.py --status   # debug manusia: state + rencana
"""
import json
import os
import re
import subprocess
import sys
import datetime

HOME = os.path.expanduser("~")
ERRORS_LOG = os.path.join(HOME, ".hermes/logs/errors.log")
JOBS_JSON = os.path.join(HOME, ".hermes/cron/jobs.json")
STATE_DIR = os.path.join(HOME, ".hermes/data/zai-quota-rerun")
STATE_FILE = os.path.join(STATE_DIR, "state.json")
HERMES_BIN = os.path.join(HOME, ".hermes/hermes-agent/venv/bin/hermes")

WIB = datetime.timezone(datetime.timedelta(hours=7))

LOOKBACK_DAYS = 2  # jendela baca log: insiden pagi harus masih terbaca malam ini
RE_JOB_FAIL_1308 = re.compile(
    r"^(?P<ts>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}),\d+ ERROR cron\.scheduler: "
    r"Job '(?P<name>[^']+)' failed: .*"
    r"\[1308\]\[Usage limit reached for 5 hour\. "
    r"Your limit will reset at (?P<reset>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]"
)
# quiet zone / defer windows (menit-dalam-hari, WIB)
QZ_START, QZ_END = 11 * 60, 18 * 60          # 11:00-18:00
DEFER_QZ = 18 * 60 + 5                        # 18:05
DEFER_MORNING = 7 * 60 + 5                    # 07:05
NIGHT_CUTOFF = 21 * 60 + 45                   # 21:45

FMT = "%Y-%m-%d %H:%M:%S"


def now_wib():
    return datetime.datetime.now(WIB)


def parse_wib(s):
    return datetime.datetime.strptime(s, FMT).replace(tzinfo=WIB)


def load_state():
    try:
        with open(STATE_FILE) as f:
            return json.load(f)
    except Exception:
        return {}


def save_state(state):
    os.makedirs(STATE_DIR, exist_ok=True)
    tmp = STATE_FILE + ".tmp"
    with open(tmp, "w") as f:
        json.dump(state, f, ensure_ascii=False, indent=1)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, STATE_FILE)  # atomic


def load_jobs():
    try:
        with open(JOBS_JSON) as f:
            data = json.load(f)
        items = data if isinstance(data, list) else data.get("jobs", [])
        return {j.get("name"): j for j in items if isinstance(j, dict) and j.get("id")}
    except Exception:
        return {}


def scan_errors(now):
    """→ list dict {ts, name, reset} utk baris gagal-1308 dalam LOOKBACK_DAYS."""
    out = []
    if not os.path.exists(ERRORS_LOG):
        return out
    cutoff = now - datetime.timedelta(days=LOOKBACK_DAYS)
    try:
        with open(ERRORS_LOG, errors="ignore") as f:
            for line in f:
                m = RE_JOB_FAIL_1308.match(line)
                if not m:
                    continue
                try:
                    ts = parse_wib(m.group("ts"))
                    reset = parse_wib(m.group("reset"))
                except ValueError:
                    continue
                if ts >= cutoff:
                    out.append({"ts": ts, "name": m.group("name"), "reset": reset})
    except Exception:
        pass
    return out


def shift_into_allowed(dt):
    """Geser deadline ke jendela eksekusi yang diizinkan (07:05-21:45 WIB, di luar
    quiet zone 11-18). Deferral = deadline bergeser, BUKAN attempt batal — laporan
    harian = janji (kegagalan bukan salah job kalau window-nya kena quiet zone)."""
    for _ in range(3):  # bounded: 1 shift per aturan, max 3
        mins = dt.hour * 60 + dt.minute
        if QZ_START <= mins < QZ_END:
            dt = dt.replace(hour=DEFER_QZ // 60, minute=DEFER_QZ % 60, second=0, microsecond=0)
            continue
        if mins < DEFER_MORNING:
            dt = dt.replace(hour=DEFER_MORNING // 60, minute=DEFER_MORNING % 60, second=0, microsecond=0)
            continue
        if mins >= NIGHT_CUTOFF:
            dt = (dt + datetime.timedelta(days=1)).replace(hour=DEFER_MORNING // 60, minute=DEFER_MORNING % 60, second=0, microsecond=0)
            continue
        return dt
    return dt


def fire(job_id, now):
    """Popen bg `hermes cron run <job_id>`; return (ok, pesan)."""
    try:
        with open(os.devnull, "wb") as devnull:
            subprocess.Popen(
                [HERMES_BIN, "cron", "run", job_id],
                stdout=devnull, stderr=devnull,
                start_new_session=True,
            )
        return True, None
    except Exception as e:
        return False, str(e)


def plan(entry, now):
    """Hitung jadwal utk 1 entry state. → (action, keterangan)."""
    t_err = parse_wib(entry["err_ts"])
    t_reset = parse_wib(entry["reset_at"])
    t1 = shift_into_allowed(max(t_reset, t_err) + datetime.timedelta(minutes=5))  # attempt-1: reset+5m
    t2 = shift_into_allowed(t1 + datetime.timedelta(minutes=35))                  # attempt-2 (bukti: rerun manual 08:37 kena 1302)
    giveup = t2 + datetime.timedelta(minutes=60)
    fired1, fired2 = entry.get("fired_attempt1", False), entry.get("fired_attempt2", False)
    job_ok = entry.get("job_recovered", False)
    key = entry["key"]

    if job_ok:
        return "done", "job sudah ok (jobs.json) — selesai"
    if now >= giveup:
        if entry.get("giveup_reported"):
            return "silent", "giveup sudah dilaporkan"
        entry["giveup_reported"] = True
        return "giveup", "lewati giveup t2+60m tanpa pemulihan — dilaporkan sekali, hands off"
    if now >= t2:
        if fired2:
            return "wait", "attempt-2 sudah ditembak — tunggu hasil"
        ok, err = fire(entry["job_id"], now)
        if ok:
            entry["fired_attempt2"] = True
            entry["attempt2_at"] = now.strftime(FMT)
            return "fire2", f"rerun attempt-2 {key}"
        return "error", f"Popen gagal: {err}"
    if now >= t1:
        if fired1:
            return "wait", "attempt-1 sudah ditembak — tunggu t2 utk attempt-2"
        ok, err = fire(entry["job_id"], now)
        if ok:
            entry["fired_attempt1"] = True
            entry["attempt1_at"] = now.strftime(FMT)
            return "fire1", f"rerun attempt-1 {key}"
        return "error", f"Popen gagal: {err}"
    return "sched", f"attempt-1 terjadwal {t1.strftime(FMT)} (reset {entry['reset_at']})"  # defer/sched = diam


def main():
    debug = "--status" in sys.argv
    now = now_wib()
    today = now.strftime("%Y-%m-%d")
    jobs = load_jobs()
    state = load_state()
    failures = scan_errors(now)

    # 1) registrasi kegagalan baru (idempotent per key date|job_id)
    for fl in failures:
        job = jobs.get(fl["name"])
        if not job:
            continue  # job sudah dihapus/di-rename — tak ada yang bisa di-rerun
        jid = str(job.get("id"))
        key = f"{fl['ts'].strftime('%Y-%m-%d')}|{jid}"
        if key in state:
            continue
        state[key] = {
            "key": key,
            "job_id": jid,
            "job_name": fl["name"],
            "err_ts": fl["ts"].strftime(FMT),
            "reset_at": fl["reset"].strftime(FMT),
            "fired_attempt1": False,
            "fired_attempt2": False,
            "job_recovered": False,
            "registered_at": now.strftime(FMT),
        }

    # 2) cek pemulihan via jobs.json (source of truth scheduler)
    for key, entry in state.items():
        if entry.get("job_recovered"):
            continue
        jid = entry["job_id"]
        job = None
        for j in jobs.values():
            if str(j.get("id")) == jid:
                job = j
                break
        if not job:
            continue
        lra = str(job.get("last_run_at") or "")
        last_ok = job.get("last_status") == "ok" and lra >= entry["err_ts"]
        if last_ok:
            entry["job_recovered"] = True
            entry["recovered_at"] = lra

    # 3) eksekusi rencana (--status = debug murni: hitung ulang tanpa fire/mutasi)
    actions, lines = [], []
    horizon = (now - datetime.timedelta(days=7)).strftime("%Y-%m-%d")
    for key in sorted(state.keys()):
        entry = state[key]
        if entry.get("job_recovered"):
            continue
        if key.split("|")[0] < horizon or key.split("|")[0] < (now - datetime.timedelta(days=LOOKBACK_DAYS)).strftime("%Y-%m-%d"):
            continue  # entry tua — biarkan, tak diproses
        if debug:
            # salinan bersih per tick agar flag fire/giveup tidak bocor ke state asli
            probe = dict(entry)
            act, note = plan(probe, now)
            lines.append(f"• {entry['job_name']}: {act} — {note}")
            continue
        act, note = plan(entry, now)
        if act.startswith("fire") or act == "error":
            actions.append((act, note))
        if act.startswith("fire") or act in ("error", "giveup"):  # silent/wait/sched/done = diam
            lines.append(f"• {entry['job_name']}: {act} — {note}")

    # pruning: entry >7d dibuang (log errors.log berotasi; jejak cukup di changelog)
    state = {k: v for k, v in state.items() if k.split("|")[0] >= horizon}

    if not debug:
        save_state(state)

    if debug:
        print(f"== ZAI QUOTA RERUN {now.strftime(FMT)} WIB ==")
        print(f"errors.log failures(1308) terlihat {LOOKBACK_DAYS}d: {len(failures)}")
        for fl in failures:
            print(f"  err {fl['ts'].strftime(FMT)} reset {fl['reset'].strftime(FMT)} {fl['name']}")
        print(f"state entries: {len(state)}")
        for l in lines:
            print(l)
        return

    if lines:
        print("🔄 ZAI-QUOTA-RERUN " + now.strftime("%Y-%m-%d %H:%M WIB"))
        for l in lines:
            print(l)
        print("(auto-rerun 429-1308; sukses diverifikasi run-ledger/jobs.json)")
    # sehat/defer/sched = diam (exit 0)


if __name__ == "__main__":
    main()
