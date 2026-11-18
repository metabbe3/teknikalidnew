#!/bin/bash
# TeknikalID Deploy Script v2 (TEK-155, 3 Nov 2026)
# Pulls latest code, rebuilds Docker, runs migrations
# Usage: ./scripts/deploy.sh
#
# Changelog v2 (fix 2 bug terkonfirmasi):
#   Bug#1: `git reset --hard origin/main` MENGHAPUS commit lokal yang belum di-push
#          (konten harian hilang saat deploy malam). Fix: safety check unpushed
#          commits + uncommitted files → deploy menolak jalan sampai aman.
#   Bug#2: skip rebuild saat "no new commits" walau image tidak mencerminkan HEAD
#          (breadcrumb 09:48 proof: verified palsu-hijau). Fix: jalur "no new
#          commits" kini menjalankan up -d + health check, tidak lagi exit 0 senyap.

set -e

DEPLOY_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DEPLOY_DIR"

BRANCH="main"
LOG_FILE="$DEPLOY_DIR/deploy.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Deploy started (v2) ==="

# ── 0. SAFETY CHECKS (bug#1) ────────────────────────────────────────
git fetch origin "$BRANCH"

UNPUSHED=$(git log --oneline "origin/$BRANCH..HEAD" 2>/dev/null | wc -l | tr -d ' ')
if [ "$UNPUSHED" -gt 0 ]; then
  log "ERROR: $UNPUSHED commit lokal belum di-push ke origin/$BRANCH:"
  git log --oneline "origin/$BRANCH..HEAD" | tee -a "$LOG_FILE"
  log "Deploy DIBATALKAN agar commit tidak tertelan reset --hard."
  log "Push dulu (git push origin $BRANCH), atau FORCE_UNPUSHED=1 untuk tetap deploy (commit lokal TERTIMPA)."
  if [ "${FORCE_UNPUSHED:-0}" != "1" ]; then
    exit 1
  fi
  log "FORCE_UNPUSHED=1 — melanjutkan dengan sadar (commit lokal akan tertimpa)."
fi

# ── 0b. ORG-STATE-LIVE: docs/agent-org non-blocker (ops-2026-11-18-02) ──
# docs/agent-org/ = mirror org-state live (queue/backlog/bus, ditulis statejson
# oleh agent lain kapan pun — termasuk menit-menit window deploy: tabrakan
# jilid-3 KONDEKTUR-1115/1116/1117, guard abort 22:20:36 17 Nov). Dirty di
# area itu BUKAN hazard deploy (tidak ikut build) → TIDAK membatalkan deploy;
# TAPI tidak boleh tertimpa reset --hard (akar drift-#12/#13/#14) → backup
# sekarang, restore pasca reset (live menang — pola org-union CTO-PAGI-1118).
ORG_DIRTY=$(git status --porcelain -uno -- docs/agent-org | cut -c4-)
ORG_BACKUP=""
if [ -n "$ORG_DIRTY" ]; then
  ORG_BACKUP=$(mktemp -d "${TMPDIR:-/tmp}/org-state-backup.XXXXXX")
  while IFS= read -r f; do
    mkdir -p "$ORG_BACKUP/$(dirname "$f")"
    cp "$f" "$ORG_BACKUP/$f"
  done <<< "$ORG_DIRTY"
  log "ORG-STATE-LIVE: $(echo "$ORG_DIRTY" | grep -c .) file docs/agent-org dirty → backup non-blocker."
fi

UNCOMMITTED=$(git status --porcelain -uno | grep -vE '^.. docs/agent-org/' | wc -l | tr -d ' ')  # -uno: untracked tidak dimakan reset --hard; docs/agent-org = org-state-live non-blocker (ops-2026-11-18-02)
if [ "$UNCOMMITTED" -gt 0 ]; then
  log "WARNING: $UNCOMMITTED file uncommitted di working tree — reset --hard akan menghapus perubahan itu."
  if [ "${FORCE_DIRTY:-0}" != "1" ]; then
    log "Deploy DIBATALKAN. Commit/stash dulu, atau FORCE_DIRTY=1."
    exit 1
  fi
  log "FORCE_DIRTY=1 — melanjutkan (perubahan working tree akan hilang)."
fi

# ops-2026-11-18-02: DRY_RUN_GUARD=1 = uji guard dua-arah dengan script ASLI
# tanpa menjalankan deploy (exit 0 di sini = guard PASS, deploy akan lanjut;
# guard ABORT tetap exit 1 dari blok UNCOMMITTED di atas). Default 0 = tidak
# mengubah perilaku deploy sama sekali.
if [ "${DRY_RUN_GUARD:-0}" = "1" ]; then
  log "DRY_RUN_GUARD=1: guard PASS — deploy akan lanjut (dry-run, berhenti di sini)."
  [ -n "$ORG_BACKUP" ] && rm -rf "$ORG_BACKUP"
  exit 0
fi

# ── 1. Sync ke origin/main ──────────────────────────────────────────
BEFORE=$(git rev-parse HEAD)
git reset --hard "origin/$BRANCH"
AFTER=$(git rev-parse HEAD)

# ops-2026-11-18-02: restore org-state live yang tertimpa reset — live menang
# (pola org-union CTO-PAGI-1118). Mencegah drift-#12/#13/#14 jilid-4: state
# queue/backlog hasil tulisan agent jangan pernah mundur oleh deploy.
if [ -n "$ORG_BACKUP" ]; then
  while IFS= read -r f; do
    if ! cmp -s "$ORG_BACKUP/$f" "$f"; then
      cp "$ORG_BACKUP/$f" "$f"
      log "ORG-STATE-RESTORE: $f dipulihkan (live menang atas reset)."
    fi
  done <<< "$ORG_DIRTY"
  rm -rf "$ORG_BACKUP"
fi

CHANGED=$(git diff --name-only "$BEFORE" "$AFTER")
NEEDS_REBUILD=false
NEEDS_MIGRATION=false

if [ "$BEFORE" = "$AFTER" ]; then
  log "No new commits."
  # Bug#2 fix: dulu langsung exit 0 (senyap) — padahal image yang jalan bisa
  # jadi lebih tua dari HEAD (bukti: breadcrumb 09:48). Kini: cek apakah kode
  # rebuild-relevant berubah sejak image dibangun; ragu = rebuild ringan.
  IMAGE_CREATED=$(docker inspect teknikalidnew-app-1 --format '{{.Created}}' 2>/dev/null || echo "1970-01-01T00:00:00Z")
  SRC_NEWER=$(find src package.json package-lock.json next.config.ts Dockerfile -type f -newermt "$(echo "$IMAGE_CREATED" | cut -d. -f1)" 2>/dev/null | head -1)
  if [ -n "$SRC_NEWER" ]; then
    log "Bug#2 guard: ada file rebuild-relevant lebih baru dari image ($SRC_NEWER) — REBUILD dijalankan."
    NEEDS_REBUILD=true
  fi
else
  log "Updated: $(git log --oneline -1)"
  echo "$CHANGED" | grep -qE "^(package\.json|package-lock\.json|Dockerfile|\.dockerignore|next\.config|src/|prisma/schema\.prisma)" && NEEDS_REBUILD=true
fi
echo "$CHANGED" | grep -qE "^prisma/" && NEEDS_MIGRATION=true

# ── 2. Rebuild and restart ──────────────────────────────────────────
# ops-2026-11-06-04: build ATOMIK app+worker satu perintah — mencegah drift
# image (app baru / worker lama) yang terjadi 5-6 Nov oleh deploy app-only.
if [ "$NEEDS_REBUILD" = true ]; then
  log "Rebuilding Docker containers (app+worker, atomik)..."
  docker compose build app worker 2>&1 | tee -a "$LOG_FILE"
fi

log "Restarting containers..."
docker compose up -d 2>&1 | tee -a "$LOG_FILE"

# ── 3. GATE: pasangan image app==worker (ops-2026-11-06-04) ────────
# Drift image (app baru/worker lama) terjadi 5-6 Nov via deploy app-only.
# Gate: CreatedAt KEDUA image harus identik (build atomik satu perintah).
# Toleransi 5 menit utk build non-paralel yang miring beberapa detik.
APP_IMG=$(docker inspect teknikalidnew-app-1 --format '{{.Image}}' 2>/dev/null)
WRK_IMG=$(docker inspect teknikalidnew-worker-1 --format '{{.Image}}' 2>/dev/null)
if [ -n "$APP_IMG" ] && [ -n "$WRK_IMG" ]; then
  # Strip SELURUH fraksi detik (bukan hanya .NNNZ) — OrbStack mengembalikan
  # nanodetik + offset +07:00; fromisoformat menolak 9-digit fraksi (ops-11-08-01).
  APP_CREATED=$(docker inspect "$APP_IMG" --format '{{.Created}}' 2>/dev/null | sed -E 's/\.[0-9]+//')
  WRK_CREATED=$(docker inspect "$WRK_IMG" --format '{{.Created}}' 2>/dev/null | sed -E 's/\.[0-9]+//')
  if [ -n "$APP_CREATED" ] && [ -n "$WRK_CREATED" ]; then
    DRIFT_S=$(python3 -c "from datetime import datetime;print(int(abs((datetime.fromisoformat('$APP_CREATED'.replace('Z','+00:00'))-datetime.fromisoformat('$WRK_CREATED'.replace('Z','+00:00'))).total_seconds())))" 2>/dev/null || echo -1)
    if [ "$DRIFT_S" -lt 0 ] || [ "$DRIFT_S" -gt 300 ]; then
      log "ERROR: image drift app/worker ${DRIFT_S}s > toleransi 300s (app=$APP_CREATED worker=$WRK_CREATED)."
      log "Deploy DIBATALKAN — jalankan 'docker compose build app worker' atomik dulu."
      exit 1
    fi
    log "Gate atomik OK: app/worker CreatedAt selisih ${DRIFT_S}s."
  fi
fi

# ── 4. Wait for app to be healthy ───────────────────────────────────
log "Waiting for app to start..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    log "App is healthy."
    break
  fi
  if [ "$i" = "30" ]; then
    log "ERROR: App did not become healthy within 60 seconds."
    docker compose logs --tail=50 app >> "$LOG_FILE"
    exit 1
  fi
  sleep 2
done

if [ "$NEEDS_MIGRATION" = true ]; then
  log "Running Prisma migrations..."
  docker compose exec app npx prisma migrate deploy 2>&1 | tee -a "$LOG_FILE"
fi

log "=== Deploy complete (v2) ==="
echo ""
