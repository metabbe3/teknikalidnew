#!/bin/bash
# TeknikalID — Retry wrapper for cron curl jobs
# Usage: cron-curl.sh <url> [method]
# Retries up to 3 times with 10s delay to handle Docker startup race condition

URL="$1"
METHOD="${2:-GET}"
CRON_SECRET="FZlv5mT6Sgz7mRPJI4nKMG2ITm3UCTN"
MAX_RETRIES=3
RETRY_DELAY=10

for i in $(seq 1 $MAX_RETRIES); do
  if curl -sf -X "$METHOD" -H "Authorization: Bearer $CRON_SECRET" "$URL" 2>/dev/null; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] OK: $URL"
    exit 0
  fi
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Attempt $i/$MAX_RETRIES failed for $METHOD $URL"
  [ "$i" -lt "$MAX_RETRIES" ] && sleep "$RETRY_DELAY"
done

echo "[$(date '+%Y-%m-%d %H:%M:%S')] FAILED: All $MAX_RETRIES attempts failed for $METHOD $URL"
exit 1
