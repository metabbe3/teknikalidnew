#!/bin/bash
# TeknikalID — Install and activate all LaunchAgents
# Run after reboot: bash scripts/setup-launchagents.sh

set -eo pipefail
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"

echo "=== TeknikalID LaunchAgent Setup ==="
echo ""

# 1. Ensure Docker is running
echo "[1/5] Checking Docker..."
if ! docker info > /dev/null 2>&1; then
  echo "  Starting Docker Desktop..."
  open -a Docker
  echo "  Waiting for Docker to be ready..."
  until docker info > /dev/null 2>&1; do sleep 2; done
fi
echo "  Docker is running."

# 2. Start Docker services
echo ""
echo "[2/5] Starting Docker services..."
cd "$PROJECT_DIR"
docker compose up -d 2>/dev/null || true
echo "  Docker services started."

# 3. Wait for Next.js to be responsive
echo ""
echo "[3/5] Waiting for localhost:3000..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "  Server is ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "  WARNING: Server not responding after 60s. Agents may fail until server is up."
  fi
  sleep 2
done

# 4. Install and load all LaunchAgents
echo ""
echo "[4/5] Installing LaunchAgents..."
PLISTS=(
  com.teknikalid.agent-worker
  com.teknikalid.agent-scheduler
  com.teknikalid.intraday-sync
  com.teknikalid.idx-sync
  com.teknikalid.eod-sync
  com.teknikalid.articles-morning
  com.teknikalid.articles-lunch
  com.teknikalid.articles-afternoon
  com.teknikalid.community-agent
  com.teknikalidnew.watcher
)

for plist in "${PLISTS[@]}"; do
  SRC="$PROJECT_DIR/scripts/${plist}.plist"
  DST="$LAUNCH_AGENTS_DIR/${plist}.plist"
  if [ -f "$SRC" ]; then
    # Unload if already loaded
    launchctl unload "$DST" 2>/dev/null || true
    # Copy and load
    cp "$SRC" "$DST"
    launchctl load "$DST"
    echo "  + $plist"
  else
    echo "  ! $plist not found in scripts/"
  fi
done

# 5. Status report
echo ""
echo "[5/5] Status:"
echo ""
launchctl list | grep teknikalid
echo ""
echo "Done. All agents installed and loaded."
echo "Run 'bash scripts/health-check.sh' to verify."
