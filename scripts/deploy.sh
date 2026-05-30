#!/bin/bash
# TeknikalID Deploy Script
# Pulls latest code, rebuilds Docker, runs migrations
# Usage: ./scripts/deploy.sh [--build-only]

set -e

DEPLOY_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DEPLOY_DIR"

BRANCH="main"
LOG_FILE="$DEPLOY_DIR/deploy.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Deploy started ==="

# 1. Pull latest code
log "Pulling latest from origin/$BRANCH..."
BEFORE=$(git rev-parse HEAD)
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"
AFTER=$(git rev-parse HEAD)

if [ "$BEFORE" = "$AFTER" ]; then
  log "No new commits. Already up to date."
  exit 0
fi

log "Updated: $(git log --oneline -1)"

# 2. Check if Docker-related files changed
CHANGED=$(git diff --name-only "$BEFORE" "$AFTER")
NEEDS_REBUILD=false
NEEDS_MIGRATION=false

echo "$CHANGED" | grep -qE "^(package\.json|package-lock\.json|Dockerfile|\.dockerignore|next\.config|src/|prisma/schema\.prisma)" && NEEDS_REBUILD=true
echo "$CHANGED" | grep -qE "^prisma/" && NEEDS_MIGRATION=true

# 3. Rebuild and restart Docker
if [ "$NEEDS_REBUILD" = true ]; then
  log "Rebuilding Docker containers..."
  docker compose build --no-cache app 2>&1 | tee -a "$LOG_FILE"
fi

log "Restarting containers..."
docker compose up -d 2>&1 | tee -a "$LOG_FILE"

# 4. Wait for app to be healthy
log "Waiting for app to start..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    log "App is healthy."
    break
  fi
  if [ "$i" = "30" ]; then
    log "ERROR: App did not become healthy within 30 seconds."
    docker compose logs --tail=50 app >> "$LOG_FILE"
    exit 1
  fi
  sleep 2
done

# Prisma migrate runs inside the container on startup (command in docker-compose.yml)
# But we also check here in case the container was already running
if [ "$NEEDS_MIGRATION" = true ]; then
  log "Running Prisma migrations..."
  docker compose exec app npx prisma migrate deploy 2>&1 | tee -a "$LOG_FILE"
fi

log "=== Deploy complete ==="
echo ""
