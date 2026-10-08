#!/usr/bin/env python3
"""test_sre_brief_backup.py — fixture test backup_freshness (ops-2026-10-08-01 DONE WHEN a).

Jalankan dari manapun: python3 test_sre_brief_backup.py
Memuat fungsi backup_freshness dari sre_brief.py via importlib TANPA mengeksekusi
main script (modul di-parse lalu fungsi diekstrak — sre_brief.py top-level jalan
docker/curl, jadi kita ambil source-nya via exec hanya utk definisi fungsi murni).

Kasus (minimal 2 per DONE WHEN):
 1. STALE   : mtime file 40h lalu (> 26h) -> verdict STALE ter-detect.
 2. SUSPICIOUS: file fresh tapi 50KB (< 100KB) -> verdict SUSPICIOUS ter-detect.
 Bonus:
 3. OK      : file fresh 2h lalu 52MB -> verdict OK.
 4. MISSING : dir kosong -> verdict STALE.
"""
import datetime
import importlib.util
import os
import sys
import tempfile
import time

HERE = os.path.dirname(os.path.abspath(__file__))

# Muat modul TANPA jalankan top-level: parse file, exec hanya blok fungsi murni.
src = open(os.path.join(HERE, "sre_brief.py")).read()
# Ambil bagian dari "def backup_freshness" sampai akhir fungsi (sebelum "\nprint(")
start = src.index("def backup_freshness")
end = src.index("\nprint(", start)
ns: dict = {"datetime": datetime}
exec(src[start:end], ns)
backup_freshness = ns["backup_freshness"]  # type: ignore[index]

PASS, FAIL = 0, 0

def check(name, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"PASS  {name} {detail}")
    else:
        FAIL += 1
        print(f"FAIL  {name} {detail}")

with tempfile.TemporaryDirectory() as td:
    now = time.time()

    # Kasus 1: STALE — mtime 40h lalu (batas teknikal 26h)
    f1 = os.path.join(td, "db-20261006.sql.gz")
    with open(f1, "wb") as f:
        f.write(b"x" * 52_000_000)  # 52MB — size sehat, mtime basi
    os.utime(f1, (now - 40 * 3600, now - 40 * 3600))
    r1 = backup_freshness(td, 26, 100_000, "teknikal (harian, <=26h, >100KB)")
    check("K1 stale-mtime", r1["verdict"] == "STALE" and r1["age_h"] >= 40,
          f"-> {r1['verdict']} age={r1['age_h']}h")

    # Kasus 2: SUSPICIOUS — fresh tapi 50KB (< 100KB)
    f2 = os.path.join(td, "db-20261008.sql.gz")
    with open(f2, "wb") as f:
        f.write(b"x" * 50_000)
    os.utime(f2, (now - 2 * 3600, now - 2 * 3600))
    r2 = backup_freshness(td, 26, 100_000, "teknikal (harian, <=26h, >100KB)")
    check("K2 small-size", r2["verdict"] == "SUSPICIOUS" and r2["file"] == f2,
          f"-> {r2['verdict']} size={r2['size_mb']}MB (file terbaru, bukan f1)")

    # Kasus 3: OK — fresh 2h, 52MB (setelah f2 dihapus agar terbaru = sehat)
    os.remove(f2)
    f3 = os.path.join(td, "db-20261008.sql.gz")
    with open(f3, "wb") as f:
        f.write(b"x" * 52_000_000)
    os.utime(f3, (now - 2 * 3600, now - 2 * 3600))
    r3 = backup_freshness(td, 26, 100_000, "teknikal (harian, <=26h, >100KB)")
    check("K3 ok-fresh", r3["verdict"] == "OK" and r3["age_h"] <= 2.1 and r3["size_mb"] >= 50,
          f"-> {r3['verdict']} age={r3['age_h']}h size={r3['size_mb']}MB")

    # Kasus 4: MISSING — dir kosong
    empty = os.path.join(td, "empty")
    os.mkdir(empty)
    r4 = backup_freshness(empty, 26, 100_000, "teknikal")
    check("K4 missing-dir", r4["verdict"] == "STALE" and "TIDAK ADA" in r4["note"],
          f"-> {r4['verdict']}")

print(f"\nRESULT: {PASS} PASS / {FAIL} FAIL")
sys.exit(1 if FAIL else 0)
