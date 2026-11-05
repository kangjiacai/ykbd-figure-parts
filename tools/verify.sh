#!/bin/bash
# 语法、模型，以及无头 Chrome 里的 canvas 像素。不联网。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
node "$ROOT/tools/check-es5.js"
node "$ROOT/tools/model-check.js"
CHROME="${CHROME:-google-chrome}"
DIR="/tmp/cr-verify"
rm -rf "$DIR"
mkdir -p "$DIR"
timeout 20 "$CHROME" \
  --headless=new \
  --no-sandbox \
  --disable-gpu \
  --disable-dev-shm-usage \
  --user-data-dir="$DIR" \
  --timeout=8000 \
  --virtual-time-budget=4000 \
  --dump-dom \
  "file://$ROOT/tools/canvas-check.html" >"$DIR/dom.html" 2>"$DIR/err.txt" || true
if ! grep -q '<pre id="out">CANVAS_OK</pre>' "$DIR/dom.html"; then
  echo "canvas check did not report CANVAS_OK" >&2
  grep -o 'CANVAS_[A-Z_]*' "$DIR/dom.html" | head -n 5 >&2 || true
  exit 1
fi
echo CANVAS_OK
