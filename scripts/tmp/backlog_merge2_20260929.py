#!/usr/bin/env python3
"""Fix v2: merge pada key 'entries' (benar), repo menang, field datadir-only dipertahankan."""
import json, os

REPO = os.path.expanduser("~/Documents/teknikalidnew/docs/agent-org/product-backlog.json")
DATA = os.path.expanduser("~/.hermes/data/teknikalid-growth/product-backlog.json.bak-premerge-20260929")

with open(REPO) as f: repo = json.load(f)
with open(DATA) as f: data = json.load(f)

def key(e): return e.get("id") or e.get("task_id")

# entries asli dari file REPO hasil merge salah tadi masih utuh (19)
rlist = repo.get("entries", [])
dmap = {key(e): e for e in data.get("entries", [])}
rmap = {key(e): e for e in rlist}

merged, field_kept = [], 0
for e in rlist:
    k = key(e)
    if k in dmap:
        base = dict(dmap[k]); base.update(e)  # repo (terakhir 21:04) menang
        field_kept += len(set(dmap[k]) - set(e))
        merged.append(base)
    else:
        merged.append(e)
for e in data.get("entries", []):
    if key(e) not in rmap:
        merged.append(e)

# wid sudah ada di... cek
if "wid-2026-09-27-1" not in {key(e) for e in merged}:
    wid = repo["items"][0]  # ambil dari hasil script salah tadi
    merged.append(wid)

repo.pop("items", None)
repo["entries"] = merged
tmp = REPO + ".tmp"
with open(tmp, "w") as f: json.dump(repo, f, indent=1, ensure_ascii=False); f.write("\n")
os.replace(tmp, REPO)
ids = [key(e) for e in json.load(open(REPO))["entries"]]
print(f"entries: {len(ids)}; datadir-only fields kept: {field_kept}; wid: {'wid-2026-09-27-1' in ids}")
