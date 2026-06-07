#!/bin/bash
# TeknikalID — Quick health check for all services
# Usage: bash scripts/health-check.sh

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo "=== TeknikalID Health Check ==="
echo ""

# Docker
echo "--- Docker Services ---"
docker compose ps 2>/dev/null || echo "  Docker not running"
echo ""

# Server
echo "--- Server ---"
if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
  echo "  localhost:3000 — OK"
else
  echo "  localhost:3000 — NOT RESPONDING"
fi
echo ""

# LaunchAgents
echo "--- LaunchAgents ---"
launchctl list | grep teknikalid | while IFS=' ' read -r pid status label; do
  if [ "$pid" = "-" ]; then
    echo "  [scheduled] $label (exit $status)"
  elif [ "$pid" -gt 0 ] 2>/dev/null; then
    echo "  [running]   $label (PID $pid)"
  else
    echo "  [exited]    $label (exit $status)"
  fi
done
echo ""

# Logs (last entry)
echo "--- Recent Logs ---"
for logpath in logs/*.log; do
  if [ -f "$logpath" ]; then
    last=$(tail -1 "$logpath" 2>/dev/null | cut -c1-100)
    if [ -n "$last" ]; then
      echo "  $(basename "$logpath"): $last"
    else
      echo "  $(basename "$logpath"): (empty)"
    fi
  fi
done
