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
rm -rf "$DIR"
mkdir -p "$DIR"
timeout 30 "$CHROME" \
  --headless=new \
  --no-sandbox \
  --disable-gpu \
  --disable-dev-shm-usage \
  --user-data-dir="$DIR" \
  --timeout=15000 \
  --virtual-time-budget=8000 \
  --dump-dom \
  "file://$ROOT/tools/hard-rules-check.html" >"$DIR/dom.html" 2>"$DIR/err.txt" || true
if ! grep -q 'HARD_OK' "$DIR/dom.html"; then
  echo "hard-rules check failed" >&2
  grep -o 'HARD_[A-Z_]*[^<]*' "$DIR/dom.html" | head -n 8 >&2 || true
  exit 1
fi
grep -o 'HARD_OK [0-9]*' "$DIR/dom.html" | head -n 1
