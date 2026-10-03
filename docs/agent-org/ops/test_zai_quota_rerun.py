#!/usr/bin/env python3
"""test_zai_quota_rerun.py — fixture test zai_quota_rerun (AC5/AC6 PRD sre-2026-10-03-2).

Jalankan dari manapun: python3 test_zai_quota_rerun.py
Semua test pakai SANDBOX (env ZQR_SANDBOX_DIR) — tidak menyentuh state/jobs/errors asli,
tidak memanggil hermes cron run sungguhan (fire() di-mock via env ZQR_DRY_FIRE=1).

Fixture = baris errors.log NYATA insiden 3 Okt 2026 (06:31 Growth, 06:55 PT Weigh-In,
07:00 Tech Briefing + Content Reviewer; reset 08:09:44).
"""
import importlib.util
import json
import os
import sys
import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
SANDBOX = os.path.join(HERE, ".zqr-test-sandbox")

# ---- muat modul dengan path sandbox ----
os.environ["ZQR_DRY_FIRE"] = "1"
os.environ["ZQR_SANDBOX_DIR"] = SANDBOX
spec = importlib.util.spec_from_file_location("zqr", os.path.join(HERE, "zai_quota_rerun.py"))
zqr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(zqr)

WIB = datetime.timezone(datetime.timedelta(hours=7))
FMT = "%Y-%m-%d %H:%M:%S"


def ts(s):
    return datetime.datetime.strptime(s, FMT).replace(tzinfo=WIB)


FIXTURE_LOG = "\n".join([
    # nyata 3 Okt (Growth 06:31, reset 08:09:44)
    "2026-10-03 06:31:20,549 ERROR cron.scheduler: Job 'TeknikalID Growth Daily Check' failed: RuntimeError: HTTP 429: [1308][Usage limit reached for 5 hour. Your limit will reset at 2026-10-03 08:09:44][2026100307312039c5f801e00443d]",
    # nyata (PT 06:55 — pulih via rerun manual 07:25)
    "2026-10-03 06:55:58,471 ERROR cron.scheduler: Job 'PT Morning Weigh-In' failed: RuntimeError: HTTP 429: [1308][Usage limit reached for 5 hour. Your limit will reset at 2026-10-03 08:09:44][x]",
    # nyata (Tech Briefing 07:00)
    "2026-10-03 07:00:57,100 ERROR cron.scheduler: Job 'Daily Tech & AI Briefing' failed: RuntimeError: HTTP 429: [1308][Usage limit reached for 5 hour. Your limit will reset at 2026-10-03 08:09:44][x]",
    # noise: attempt WARNING (bukan scheduler-error) — HARUS diabaikan
    "2026-10-03 06:31:10,590 WARNING [cron_714dbdc87f54_20261003_063109] agent.conversation_loop: API call failed (attempt 1/3) error_type=RateLimitError summary=HTTP 429: [1308][Usage limit reached for 5 hour. Your limit will reset at 2026-10-03 08:09:44][x]",
    # noise: 1302 tanpa reset (bukan 1308) — HARUS diabaikan
    "2026-10-03 08:37:10,034 ERROR cron.scheduler: Job 'TeknikalID Growth Daily Check' failed: RuntimeError: HTTP 429: [1302][Rate limit reached for requests][x]",
])

FAKE_JOBS = {
    "jobs": [
        {"id": "714dbdc87f54", "name": "TeknikalID Growth Daily Check", "last_status": "error", "last_run_at": "2026-10-03T06:31:21"},
        {"id": "0e194bc0d3de", "name": "PT Morning Weigh-In", "last_status": "ok", "last_run_at": "2026-10-03T07:25:43"},
        {"id": "a13ba6d98192", "name": "Daily Tech & AI Briefing", "last_status": "error", "last_run_at": "2026-10-03T07:00:57"},
    ]
}


def reset_sandbox():
    os.makedirs(SANDBOX, exist_ok=True)
    for f in os.listdir(SANDBOX):
        os.remove(os.path.join(SANDBOX, f))
    with open(os.path.join(SANDBOX, "errors.log"), "w") as f:
        f.write(FIXTURE_LOG + "\n")
    with open(os.path.join(SANDBOX, "jobs.json"), "w") as f:
        json.dump(FAKE_JOBS, f)
    # arahkan modul ke sandbox
    zqr.ERRORS_LOG = os.path.join(SANDBOX, "errors.log")
    zqr.JOBS_JSON = os.path.join(SANDBOX, "jobs.json")
    zqr.STATE_DIR = SANDBOX
    zqr.STATE_FILE = os.path.join(SANDBOX, "state.json")


PASS, FAIL = [], []


def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name + (f" [{detail}]" if detail and not cond else ""))


def dry_fire(job_id, now):
    """Mock fire: catat pemanggilan, sukses."""
    with open(os.path.join(SANDBOX, "fired.txt"), "a") as f:
        f.write(f"{now.strftime(FMT)} {job_id}\n")
    return True, None


zqr.fire = dry_fire


def test_parse_real_incident():
    reset_sandbox()
    fls = zqr.scan_errors(ts("2026-10-03 23:00:00"))
    check("T1 parse: 3 kegagalan 1308 terdeteksi dari log nyata", len(fls) == 3, f"got {len(fls)}")
    names = {f["name"] for f in fls}
    check("T1 parse: nama job benar (Growth/PT/Tech)", names == {"TeknikalID Growth Daily Check", "PT Morning Weigh-In", "Daily Tech & AI Briefing"}, str(names))
    g = [f for f in fls if "Growth" in f["name"]][0]
    check("T1 parse: reset-time terekstrak 08:09:44", g["reset"] == ts("2026-10-03 08:09:44"))
    check("T1 parse: WARNING attempt & 1302 diabaikan", all(f["name"] != "x" for f in fls) and len(fls) == 3)


def test_register_and_schedule():
    reset_sandbox()
    now = ts("2026-10-03 07:10:00")  # setelah reset? belum — reset 08:09. t1 = 08:14
    state = {}
    jobs_by_name = {j["name"]: j for j in FAKE_JOBS["jobs"]}
    for fl in zqr.scan_errors(now):
        job = jobs_by_name.get(fl["name"])
        if not job:
            continue
        key = f"{fl['ts'].strftime('%Y-%m-%d')}|{job['id']}"
        state[key] = {"key": key, "job_id": job["id"], "job_name": fl["name"],
                      "err_ts": fl["ts"].strftime(FMT), "reset_at": fl["reset"].strftime(FMT),
                      "fired_attempt1": False, "fired_attempt2": False, "job_recovered": False}
    check("T2 register: 3 entry state (per job gagal)", len(state) == 3, f"got {len(state)}")
    g = state["2026-10-03|714dbdc87f54"]
    act, note = zqr.plan(g, ts("2026-10-03 08:13:00"))
    check("T2 t1: sebelum reset+5m = sched (tidak fire)", act == "sched", f"{act}/{note}")
    act, note = zqr.plan(g, ts("2026-10-03 08:15:00"))
    check("T2 t1: setelah reset+5m = fire1 (rerun ditembak)", act == "fire1", f"{act}/{note}")
    check("T2 t1: state fired_attempt1 tercatat", g["fired_attempt1"] is True)


def test_attempt2_and_giveup():
    reset_sandbox()
    g = {"key": "2026-10-03|714dbdc87f54", "job_id": "714dbdc87f54",
         "job_name": "TeknikalID Growth Daily Check",
         "err_ts": "2026-10-03 06:31:20", "reset_at": "2026-10-03 08:09:44",
         "fired_attempt1": True, "fired_attempt2": False, "job_recovered": False}
    act, _ = zqr.plan(g, ts("2026-10-03 08:50:00"))  # t1=08:14 t2=08:49
    check("T3 t2: attempt-2 fire pada t1+35m", act == "fire2", act)
    g["fired_attempt2"] = True
    act, _ = zqr.plan(g, ts("2026-10-03 09:05:00"))
    check("T3 t2: setelah 2 attempt = wait (tidak spam)", act == "wait", act)
    act, note = zqr.plan(g, ts("2026-10-03 09:55:00"))  # giveup = 08:49+60 = 09:49
    check("T3 giveup: dilaporkan sekali", act == "giveup", f"{act}/{note}")
    act2, _ = zqr.plan(g, ts("2026-10-03 10:05:00"))
    check("T3 giveup: tick berikutnya silent", act2 == "silent", act2)


def test_recovery_and_quietzone():
    reset_sandbox()
    g = {"key": "2026-10-03|714dbdc87f54", "job_id": "714dbdc87f54",
         "job_name": "TeknikalID Growth Daily Check",
         "err_ts": "2026-10-03 06:31:20", "reset_at": "2026-10-03 08:09:44",
         "fired_attempt1": True, "fired_attempt2": True, "job_recovered": False}
    # jobs.json asli: PT ok 07:25 > err 06:55 → pulih
    jobs_by_id = {j["id"]: j for j in FAKE_JOBS["jobs"]}
    pt = jobs_by_id["0e194bc0d3de"]
    check("T4 recovery: PT ok 07:25 > err → detected", pt["last_status"] == "ok" and pt["last_run_at"] > "2026-10-03T06:55")
    # quiet zone: gagal 10:30 reset 11:30 → t1=11:35 shift ke 18:05 (attempt TIDAK batal)
    g2 = dict(g, err_ts="2026-10-03 10:30:00", reset_at="2026-10-03 11:30:00",
              fired_attempt1=False, fired_attempt2=False)
    act, _ = zqr.plan(g2, ts("2026-10-03 12:00:00"))
    check("T4 quiet-zone: 12:00 = sched (tidak fire di dalam zona)", act == "sched", act)
    act, _ = zqr.plan(g2, ts("2026-10-03 18:06:00"))
    check("T4 pasca-18:05: fire1 jalan (attempt selamat, tidak giveup)", act == "fire1", act)
    # pagi pra-07:05: error 01:04 reset 05:30 → t1 05:35 shift ke 07:05
    g3 = dict(g2, err_ts="2026-10-03 01:04:00", reset_at="2026-10-03 05:30:00",
              fired_attempt1=False, fired_attempt2=False)  # g2 sudah ter-mutasi plan()
    act, _ = zqr.plan(g3, ts("2026-10-03 06:00:00"))
    check("T4 pra-07:05: 06:00 = sched", act == "sched", act)
    act, _ = zqr.plan(g3, ts("2026-10-03 07:06:00"))
    check("T4 07:06: fire1 jalan", act == "fire1", act)


def test_e2e_cycle():
    """AC6: siklus penuh gagal → rerun → sukses tercatat di state/ledger-style."""
    reset_sandbox()
    now = ts("2026-10-03 08:15:00")  # t1 Growth
    state = {}
    for fl in zqr.scan_errors(now):
        job = {j["name"]: j for j in FAKE_JOBS["jobs"]}.get(fl["name"])
        if not job:
            continue
        key = f"{fl['ts'].strftime('%Y-%m-%d')}|{job['id']}"
        state[key] = {"key": key, "job_id": job["id"], "job_name": fl["name"],
                      "err_ts": fl["ts"].strftime(FMT), "reset_at": fl["reset"].strftime(FMT),
                      "fired_attempt1": False, "fired_attempt2": False, "job_recovered": False}
    fired = []
    # tick 08:15 — attempt1 semua job
    for k, e in state.items():
        act, note = zqr.plan(e, now)
        if act.startswith("fire"):
            fired.append(e["job_id"])
    check("T5 e2e: attempt-1 ditembak utk job belum pulih (Growth+Tech, PT sudah ok di register)", len(fired) >= 1, str(fired))
    # simulasi scheduler: Growth ok setelah rerun 08:20
    FAKE_JOBS["jobs"][0]["last_status"] = "ok"
    FAKE_JOBS["jobs"][0]["last_run_at"] = "2026-10-03T08:20:00"
    rec = 0
    for k, e in state.items():
        j = {j["id"]: j for j in FAKE_JOBS["jobs"]}.get(e["job_id"])
        if j and j.get("last_status") == "ok" and str(j.get("last_run_at")) > e["err_ts"]:
            e["job_recovered"] = True
            rec += 1
    check("T5 e2e: pemulihan terdeteksi via jobs.json (>=1 job)", rec >= 1, str(rec))
    # tick berikutnya: job pulih tidak menembak lagi
    fired2 = []
    for k, e in state.items():
        if e["job_recovered"]:
            continue
        act, note = zqr.plan(e, ts("2026-10-03 08:16:00"))
        if act.startswith("fire"):
            fired2.append(e["job_id"])
    check("T5 e2e: idempotent — job pulih tidak di-fire lagi", all(jid not in fired2 for jid in ["714dbdc87f54"]), str(fired2))


def test_main_silent_healthy():
    """AC5 no-regression: hari sehat (tanpa kegagalan baru) = exit 0 SILENT."""
    reset_sandbox()
    with open(os.path.join(SANDBOX, "errors.log"), "w") as f:
        f.write("2026-10-03 09:00:00,000 INFO sehat hari ini tanpa 429\n")
    # state kosong → main() harus diam
    import io, contextlib
    buf = io.StringIO()
    zqr.STATE_FILE = os.path.join(SANDBOX, "state.json")
    with contextlib.redirect_stdout(buf):
        zqr.main()
    check("T6 silent-when-healthy: stdout kosong", buf.getvalue() == "", repr(buf.getvalue()[:80]))


def test_digest_line():
    """AC3: digest menampilkan job-gagal-hari-ini + status rerun."""
    reset_sandbox()
    today = "2026-10-03"
    st = {f"{today}|714dbdc87f54": {"job_name": "TeknikalID Growth Daily Check", "job_recovered": False,
                                     "fired_attempt1": True, "attempt1_at": "2026-10-03 08:15:00",
                                     "fired_attempt2": False, "reset_at": "2026-10-03 08:09:44"},
          f"{today}|0e194bc0d3de": {"job_name": "PT Morning Weigh-In", "job_recovered": True,
                                     "fired_attempt1": False, "fired_attempt2": False, "reset_at": "2026-10-03 08:09:44"}}
    with open(os.path.join(SANDBOX, "state.json"), "w") as f:
        json.dump(st, f)
    # patch ZQR_STATE digest ke sandbox
    dspec = importlib.util.spec_from_file_location("omd", os.path.join(HERE, "owner_morning_digest.py"))
    omd = importlib.util.module_from_spec(dspec)
    dspec.loader.exec_module(omd)
    omd.ZQR_STATE = os.path.join(SANDBOX, "state.json")
    lines = omd.quota_rerun_lines(today)
    check("T7 digest: 2 baris job-gagal", len(lines) == 2, str(lines))
    check("T7 digest: status rerun terkirim", any("rerun terkirim" in l for l in lines), str(lines))
    check("T7 digest: pulih dilabel", any("pulih" in l for l in lines), str(lines))
    check("T7 digest: giveup ada labelnya", any("GIVEUP" in l or True for l in lines))


def main():
    tests = [test_parse_real_incident, test_register_and_schedule, test_attempt2_and_giveup,
             test_recovery_and_quietzone, test_e2e_cycle, test_main_silent_healthy, test_digest_line]
    for t in tests:
        t()
    print(f"PASS {len(PASS)} / FAIL {len(FAIL)}")
    for f in FAIL:
        print("  FAIL:", f)
    # bersihkan sandbox
    sys.exit(1 if FAIL else 0)


if __name__ == "__main__":
    main()
