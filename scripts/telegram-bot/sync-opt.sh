#!/bin/zsh
# prd-2026-11-06-01 AC2 — anti-drift: 1 baris sync repo -> ~/.hermes/opt/tgbot
# Pelajaran drift poll.mjs 29 Okt: salinan runtime (opt) adalah yang DIPAKAI launchd,
# repo hanya sumber kebenaran. JALANKAN SETIAP KALI scripts/telegram-bot/*.mjs berubah.
# Opsi: --dry-run (tampilkan rencana copy tanpa menulis) · --check (exit 1 bila drift)
set -e
SRC="$(cd "$(dirname "$0")" && pwd)/.."   # scripts/telegram-bot/..
SRC="$SRC/telegram-bot"
DST="$HOME/.hermes/opt/tgbot"
DRY=0; CHECK=0
case "$1" in
  --dry-run) DRY=1 ;;
  --check)   CHECK=1 ;;
esac
typeset -a FILES
FILES=(digest.mjs utm.mjs notify.mjs poll.mjs)
mkdir -p "$DST"
DRIFT=0
for f in "${FILES[@]}"; do
  [ -f "$SRC/$f" ] || continue
  if ! cmp -s "$SRC/$f" "$DST/$f"; then
    if [ $CHECK -eq 1 ]; then
      echo "DRIFT: $f (repo != opt)"
      DRIFT=1
    elif [ $DRY -eq 1 ]; then
      echo "will copy: $f"
    else
      cp "$SRC/$f" "$DST/$f"
      echo "synced: $f"
    fi
  fi
done
if [ $CHECK -eq 1 ]; then
  if [ $DRIFT -eq 0 ]; then echo "OK: repo == opt"; else exit 1; fi
elif [ $DRY -eq 0 ]; then
  echo "md5 parity:"
  md5 -q "$DST/digest.mjs" "$SRC/digest.mjs" 2>/dev/null | paste -sd' ' -
fi
