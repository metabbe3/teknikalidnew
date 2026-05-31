#!/bin/bash
# TeknikalID Auto-Deploy Watcher
# Polls GitHub every 30s for new commits on main, triggers deploy.sh when found
# Run in background: ./scripts/watch-deploy.sh
# Stop: kill $(cat .watch-deploy.pid)

set -eo pipefail

DEPLOY_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DEPLOY_DIR"
PID_FILE="$DEPLOY_DIR/.watch-deploy.pid"
POLL_INTERVAL=30

cleanup() {
  rm -f "$PID_FILE"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Watcher stopped."
  exit 0
}
trap cleanup SIGINT SIGTERM

echo $$ > "$PID_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Watcher started (polling every ${POLL_INTERVAL}s). PID: $$"

while true; do
  git fetch origin main --quiet 2>/dev/null || true

  LOCAL=$(git rev-parse HEAD)
  REMOTE=$(git rev-parse "origin/main")

  if [ "$LOCAL" != "$REMOTE" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] New commits detected. Deploying..."
    bash "$DEPLOY_DIR/scripts/deploy.sh" || echo "[$(date '+%Y-%m-%d %H:%M:%S')] Deploy failed. Will retry on next poll."
  fi

  sleep "$POLL_INTERVAL"
done
