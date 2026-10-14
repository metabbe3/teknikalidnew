#!/usr/bin/env python3
"""CTO 29 Sep: merge dual-file product-backlog.json (repo canonical) + restore wid-2026-09-27-1."""
import json, os, sys

REPO = os.path.expanduser("~/Documents/teknikalidnew/docs/agent-org/product-backlog.json")
DATA = os.path.expanduser("~/.hermes/data/teknikalid-growth/product-backlog.json")

with open(REPO) as f: repo = json.load(f)
with open(DATA) as f: data = json.load(f)

def key(e): return e.get("id") or e.get("task_id")

rmap = {key(e): e for e in repo.get("items", [])}
dmap = {key(e): e for e in data.get("items", [])}

merged, datadir_only, field_kept = [], [], 0
for e in repo.get("items", []):
    k = key(e)
    if k in dmap:
        base = dict(dmap[k]); base.update(e)  # repo (kanonik, tulisan terakhir 21:04) menang konflik
        only_d = set(dmap[k]) - set(e)
        if only_d: field_kept += len(only_d)
        merged.append(base)
    else:
        merged.append(e)
for e in data.get("items", []):
    if key(e) not in rmap:
        datadir_only.append(e); merged.append(e)

# --- restore wid-2026-09-27-1 (hilang saat insiden dual-file 27-28 Sep) ---
WID = "wid-2026-09-27-1"
if WID not in {key(e) for e in merged}:
    merged.append({
        "id": WID,
        "date": "2026-09-27",
        "source": "weekend-idea Mandor 27 Sep; council RECOMMEND APPROVE 08:05; CEO verdict 27 Sep 08:15 APPROVE -> promoted_prd",
        "title": "Signal Page Discovery — halaman sinyal (moat SEO) kehilangan trafik: 10/12 halaman 0 views, kini GC ikut runtuh",
        "priority": "P2",
        "status": "promoted_prd",
        "north_star": "growth traffic + time spent (signal pages = moat + fondasi brief/IG)",
        "hypothesis": "Signal pages hanya hidup via internal-link dari /stocks (GC: 87% referrer). Widget mingguan (live 24 Sep) memusatkan klik ke GC+DC saja; 10 halaman sinyal lain mati kelaparan link. Perlu spec discovery: entry-point nav / cross-link kontekstual / distribusi merata.",
        "data": "CEO 27 Sep (DB): PageView /saham-% 0 views sejak 24 Sep; 7d hanya GC 19 + pullback 2; 10/12 halaman 0. CTO 29 Sep 07:45 (SQL nobot): signal_pages 34v (18-23 Sep) -> 3v (24-29 Sep) = -91%, SEDANGKAN /stocks root 250v -> 147v (~-34% per-hari ekuivalen) = runtuh ASIMETRIS sejak widget live 24 Sep, bukan sekadar GSC/weekend noise. Baseline utk PRD.",
        "restored_note": "Entry hilang saat insiden dual-file backlog 27-28 Sep (atomic-replace putus symlink); direstorasi CTO 29 Sep slot pagi dari ceo-decisions.md (verdict 27 Sep 08:15) + data baru. Menunggu Product Agent -> spec_ready (urutan mandat: idea-25-1 > wid-27-1 > prod-24-01)."
    })
    print("wid-2026-09-27-1: RESTORED")
else:
    print("wid-2026-09-27-1: sudah ada, skip")

repo["items"] = merged
tmp = REPO + ".tmp"
with open(tmp, "w") as f: json.dump(repo, f, indent=1, ensure_ascii=False); f.write("\n")
os.replace(tmp, REPO)
print(f"repo items: {len(merged)}; datadir-only entries appended: {len(datadir_only)} ({[key(e) for e in datadir_only]}); datadir-only fields kept: {field_kept}")
print("json valid:", bool(json.load(open(REPO))))
