#!/bin/bash
# TeknikalID — Stop all LaunchAgents
# Usage: bash scripts/stop-all.sh

LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"

echo "=== Stopping TeknikalID LaunchAgents ==="

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
  DST="$LAUNCH_AGENTS_DIR/${plist}.plist"
  if launchctl list | grep -q "$plist" 2>/dev/null; then
    launchctl unload "$DST" 2>/dev/null && echo "  Stopped $plist" || echo "  Failed to stop $plist"
  else
    echo "  Not loaded: $plist"
  fi
done

echo ""
echo "Done. All agents stopped."
echo "Run 'bash scripts/setup-launchagents.sh' to restart."
