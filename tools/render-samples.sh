#!/bin/bash
# 用本机 Chrome 把 preview.html?shot=1 截成 samples/*.png。不联网。
# 无头 Chrome 有时截完不退出，所以用 timeout；退出码 124 只要文件写出来就算成功。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/samples"
mkdir -p "$OUT"
CHROME="${CHROME:-google-chrome}"
SEEDS=(
  "B665-6G14-RPME"
  "0000-0000-0000"
  "0708-0253-0243"
  "0509-0736-0305"
  "0401-0174-0474"
)
W=1080
H=1440
for s in "${SEEDS[@]}"; do
  DIR="/tmp/cr-sample-$s"
  rm -rf "$DIR"
  timeout 15 "$CHROME" \
    --headless=new \
    --no-sandbox \
    --disable-gpu \
    --disable-dev-shm-usage \
    --hide-scrollbars \
    --user-data-dir="$DIR" \
    --timeout=8000 \
    --force-device-scale-factor=1 \
    --default-background-color=FFE6E8EC \
    --window-size="${W},${H}" \
    --screenshot="$OUT/$s.png" \
    "file://$ROOT/preview.html?shot=1&fp=$s" >/tmp/cr-sample-$s.log 2>&1 || true
  if [ ! -s "$OUT/$s.png" ]; then
    echo "missing $s" >&2
    exit 1
  fi
  echo "wrote $OUT/$s.png"
done
echo "WROTE ${#SEEDS[@]} samples"
