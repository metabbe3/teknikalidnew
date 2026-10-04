#!/usr/bin/env python3
"""owner_morning_digest.py — Owner Daily Decision Digest.

Kompilasi SEMUA item yang menunggu keputusan owner dari sumber resmi:
  1. Queue teknikal (cto-queue.json): status blocked_for_owner / blocked + needs
  2. Queue hivePOS (cto-queue.json): status blocked* / blocked_external + needs
  3. Evolution proposals: PROPOSAL #N ... status: proposed (belum EXECUTED/CLOSED)
  4. Backlog teknikal product-backlog.json: verdict pending_owner / blocked_owner
  5. Council decisions menunggu konfirmasi owner (opsional, dari decisions tail)

Output: single markdown ke Telegram owner tiap pagi 07:30 WIB.
Prinsip: SATU pesan, item yang bisa dijawab 1 kata (gas/skip/angka), no noise.
Kalau KOSONG semua sumber = diam total (monitor-gated, anti spam).
"""
import json, os, re, datetime

HOME = os.path.expanduser("~")
TECH_Q = os.path.join(HOME, ".hermes/data/teknikalid-growth/cto-queue.json")
HP_Q = os.path.join(HOME, ".hermes/data/hivepos-growth/cto-queue.json")
EVO = os.path.join(HOME, ".hermes/data/agent-evolution/evolution-log.md")
BACKLOG = os.path.join(HOME, ".hermes/data/teknikalid-growth/product-backlog.json")
ZQR_STATE = os.path.join(HOME, ".hermes/data/zai-quota-rerun/state.json")
JOBS_JSON = os.path.join(HOME, ".hermes/cron/jobs.json")


def failed_jobs_lines(now_iso):
    """AC3 (apa pun penyebab): job cron last_status=error dalam 24 jam terakhir.
    Dedupe vs quota_rerun_lines by job_name. Sumber: jobs.json (scheduler truth)."""
    try:
        data = json.load(open(JOBS_JSON))
    except Exception:
        return []
    items = data if isinstance(data, list) else data.get("jobs", [])
    out = []
    for j in items:
        if not isinstance(j, dict) or j.get("last_status") != "error":
            continue
        lra = str(j.get("last_run_at") or "")
        try:
            t = datetime.datetime.fromisoformat(lra)
            if (datetime.datetime.now(t.tzinfo) - t) > datetime.timedelta(hours=24):
                continue
        except Exception:
            continue
        out.append(f"{j.get('name','?')} gagal ({lra[:16]}) — bukan kuota; cek alert run-ledger")
    return out


def quota_rerun_lines(today):
    """AC3 sre-2026-10-03-2: laporan pagi yang gagal (429 kuota z.ai) WAJIB kelihatan --
    silent-gap = owner buta. Sumber: state zai_quota_rerun (tanggal hari ini).
    Baris: job gagal + status auto-rerun (scheduled/attempt terkirim/pulih/giveup)."""
    try:
        st = json.load(open(ZQR_STATE))
    except Exception:
        return []
    out = []
    for key in sorted(st.keys()):
        e = st[key]
        if key.split("|")[0] != today:
            continue
        if e.get("job_recovered"):
            label = "pulih"
        elif e.get("fired_attempt2"):
            label = "rerun ke-2 terkirim" + (f" {e['attempt2_at'][11:16]}" if e.get("attempt2_at") else "")
        elif e.get("fired_attempt1"):
            label = "rerun terkirim" + (f" {e['attempt1_at'][11:16]}" if e.get("attempt1_at") else "")
        elif e.get("giveup_reported"):
            label = "GIVEUP — perlu re-run manual"
        else:
            label = f"rerun terjadwal {e['reset_at'][11:16]}+5m"
        out.append(f"{e.get('job_name','?')} gagal 429-kuota → {label}")
    return out


def load(path):
    try:
        return json.load(open(path))
    except Exception:
        return {}


def blocked_items(qpath, org):
    q = load(qpath)
    out = []
    for e in (q.get("entries") or []):
        st = (e.get("status") or "")
        if st.startswith("blocked"):
            out.append({
                "org": org,
                "id": e.get("id", "?"),
                "title": (e.get("title") or e.get("spec", ""))[:110],
                "status": st,
                "needs": (e.get("needs") or e.get("result") or "")[:160],
            })
    return out


def pending_verdicts():
    bl = load(BACKLOG)
    out = []
    items = bl if isinstance(bl, list) else bl.get("items") or bl.get("entries") or []
    for b in items:
        st = (b.get("status") or b.get("verdict") or "").lower()
        if st in ("pending", "awaiting", "candidate") or ("owner" in st and "approved" not in st and "done" not in st):
            # hanya yang eksplisit owner-flavored ATAU stale pending >3 hari
            created = b.get("created_at") or b.get("date") or ""
            out.append({
                "org": "teknikal",
                "id": b.get("id", "?"),
                "title": (b.get("title") or b.get("idea") or b.get("spec") or "")[:110],
                "status": st or "pending",
                "needs": (b.get("question") or b.get("needs") or "verdict backlog")[:160],
            })
    return out


def evolution_proposals():
    """Ambil proposal #N yang status proposed DAN belum ada baris EXECUTED/CLOSED utk #N itu."""
    if not os.path.exists(EVO):
        return []
    txt = open(EVO, errors="ignore").read()
    props = re.findall(r"PROPOSAL #(\d+)[^\n]{0,400}?status:\s*proposed", txt)
    resolved = set(re.findall(r"#(\d+)[^\n]{0,80}?(EXECUTED|CLOSED|ter-eksekusi|dieksekusi|owner batch)", txt, re.I))
    resolved = {n for n, _ in resolved}
    seen, out = set(), []
    # balik: ambil deskripsi terakhir per #N
    for m in re.finditer(r"PROPOSAL #(\d+)[^\n]{0,300}", txt):
        n = m.group(1)
        if n in props and n not in resolved and n not in seen:
            desc = re.sub(r"\*\*?", "", m.group(0)[:200]).strip()
            out.append({"org": "evolution", "id": f"#{n}", "title": desc, "status": "proposed", "needs": "approve/reject usulan"})
            seen.add(n)
    return out


def main():
    items = []
    items += blocked_items(TECH_Q, "teknikal")
    items += blocked_items(HP_Q, "hivePOS")
    items += pending_verdicts()
    items += evolution_proposals()

    # dedupe by id
    seen = set()
    uniq = []
    for i in items:
        key = (i["org"], i["id"])
        if key not in seen:
            seen.add(key)
            uniq.append(i)

    today = datetime.date.today().strftime("%Y-%m-%d")
    zqr = quota_rerun_lines(today)
    zqr_names = {l.split(" gagal ")[0] for l in zqr}
    fj = [l for l in failed_jobs_lines(None) if l.split(" gagal ")[0] not in zqr_names]

    if not uniq and not zqr and not fj:
        print("(kosong — tidak ada item menunggu owner; diam)")
        return  # silent = sehat

    today = datetime.date.today().strftime("%a, %d %b %Y")
    lines = [f"📋 **Owner Decision Digest — {today}**", ""]
    lines.append(f"{len(uniq)} item nunggu keputusan kamu. Jawab 1 kata per item (gas/skip/angka/nanti):")
    lines.append("")
    for i, it in enumerate(uniq, 1):
        lines.append(f"**{i}. [{it['org']}] {it['id']}** — {it['title']}")
        if it.get("needs"):
            lines.append(f"   ↳ butuh: {it['needs']}")
        lines.append(f"   ↳ status: {it['status']}")
    if zqr or fj:
        lines.append("")
        lines.append("**Laporan pagi gagal hari ini:**")
        for z in zqr:
            lines.append(f"• {z} (auto-rerun aktif)")
        for f in fj:
            lines.append(f"• {f}")
    lines.append("")
    lines.append("(Digest otomatis 07:30 — sumber: queue kedua org + evolution + backlog)")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
