#!/usr/bin/env bash
set -euo pipefail

# TeknikalID — ComfyUI Setup Script
# Configures the app to use a remote (or local) ComfyUI instance for AI cover image generation.

echo "=== TeknikalID ComfyUI Setup ==="
echo ""

ENV_FILE=".env"

# --- ComfyUI URL ---
echo "ComfyUI server URL (default: http://127.0.0.1:8188)"
read -rp "Enter URL [press Enter for default]: " COMFYUI_URL
COMFYUI_URL="${COMFYUI_URL:-http://127.0.0.1:8188}"

# --- Output dir ---
echo ""
echo "Local cache directory for generated images (default: ./comfyui-cache)"
read -rp "Enter path [press Enter for default]: " COMFYUI_OUTPUT_DIR
COMFYUI_OUTPUT_DIR="${COMFYUI_OUTPUT_DIR:-./comfyui-cache}"

# --- Write to .env ---
echo ""
if grep -q "COMFYUI_URL" "$ENV_FILE" 2>/dev/null; then
  sed -i.bak "s|^COMFYUI_URL=.*|COMFYUI_URL=${COMFYUI_URL}|" "$ENV_FILE" && rm -f "$ENV_FILE.bak"
  sed -i.bak "s|^COMFYUI_OUTPUT_DIR=.*|COMFYUI_OUTPUT_DIR=${COMFYUI_OUTPUT_DIR}|" "$ENV_FILE" && rm -f "$ENV_FILE.bak"
  echo "Updated existing ComfyUI vars in $ENV_FILE"
else
  {
    echo ""
    echo "# ComfyUI (image generation)"
    echo "COMFYUI_URL=${COMFYUI_URL}"
    echo "COMFYUI_OUTPUT_DIR=${COMFYUI_OUTPUT_DIR}"
  } >> "$ENV_FILE"
  echo "Appended ComfyUI vars to $ENV_FILE"
fi

# --- Create cache dir ---
mkdir -p "$COMFYUI_OUTPUT_DIR"
echo "Created cache directory: ${COMFYUI_OUTPUT_DIR}"

# --- Test connection ---
echo ""
echo "Testing connection to ComfyUI at ${COMFYUI_URL} ..."
if curl -sf --max-time 5 "${COMFYUI_URL}/system_stats" > /dev/null 2>&1; then
  echo "Connection OK — ComfyUI is reachable."
else
  echo "WARNING: Could not reach ComfyUI at ${COMFYUI_URL}"
  echo "  - Make sure ComfyUI is running"
  echo "  - If remote, start with: python main.py --listen 0.0.0.0"
  echo "  - Check firewall settings"
fi

echo ""
echo "Setup complete. Run 'npm run dev' to start the app."
