# /deploy — deploy teknikal.id (kerata malam / owner-directed)
Prosedur deploy teknikal.id. Baca lengkap sebelum eksekusi; jangan potong langkah.

1. **Pre-flight**: `git -C ~/Documents/teknikalidnew branch --show-current` — PASTIKAN `main` (worktree builder bisa terkunci; kalau bukan main, STOP).
2. `git pull --ff-only` lalu commit sempit jika ada perubahan.
3. Build: `docker compose build --no-cache app` (worker image baked — rebuild WAJIB kalau worker ikut berubah).
4. `docker compose up -d` (TRAP: deploy.sh "Already up to date" exit 0 padahal image lama — selalu build+up manual).
5. Verify per-fitur (bukan cuma homepage): curl tiap route yang tersentuh + regression home/BBCA 200.
6. Kalau market-related: consistency-test cross-page (Top Gainer identik di home vs /stocks vs /api/market).
7. Catat di docs/agent-org/handoff.md: commit hash, fitur, bukti verify.

Deploy budget: 2/hari routine; owner-directed hotfix tidak dihitung (deploy budget exception).
