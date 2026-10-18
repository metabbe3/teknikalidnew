---
name: teknikal-deploy
description: Use when deploying teknikal.id to production (night train or owner-directed) — pre-flight branch check, docker build+up, per-feature verification, consistency-test for market pages, and bookkeeping.
---

# Deploy teknikal.id

1. **Pre-flight**: `git branch --show-current` — PASTIKAN `main` (builder worktree bisa terkunci; bukan main = STOP).
2. `git pull --ff-only`; commit sempit bila ada perubahan.
3. `docker compose build --no-cache app` — worker image baked; worker berubah = rebuild WAJIB.
4. `docker compose up -d` (TRAP: deploy.sh "Already up to date" exit 0 padahal image lama — selalu build+up manual).
5. Verify per-fitur: curl tiap route yang tersentuh + regression home/BBCA 200.
6. Market-related: consistency-test cross-page (Top Gainer identik home vs /stocks vs /api/market).
7. Bookkeeping: docs/agent-org/handoff.md (commit hash, fitur, bukti verify).

Deploy budget: 2/hari routine; owner-directed hotfix tidak dihitung.
