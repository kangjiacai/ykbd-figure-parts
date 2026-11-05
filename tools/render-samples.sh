#!/bin/bash
# 用本机 Chrome 把 preview.html?shot=1 截成临时 PNG。不联网。
# 无头 Chrome 有时截完不退出，所以用 timeout；退出码 124 只要文件写出来就算成功。
#
# samples/ 只保留用户审过的五张定稿：samples/approved/ 下的
# B3.png、B3b.png、B3c.png、B3d-short.png、B3e-bangs.png。
# 本脚本默认拒绝运行。即使显式打开，临时渲图也只写到仓库外，绝不写回 samples/。
set -euo pipefail
if [ "${SAMPLE_RENDER_APPROVED:-}" != "1" ]; then
  echo "refusing to write sample renders: samples/ only keeps the five approved cards in samples/approved/. Set SAMPLE_RENDER_APPROVED=1 to write temporary previews outside the repo, never into samples/." >&2
  exit 1
fi
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${SAMPLE_RENDER_OUT:-/tmp/ykbd-figure-renders}"
case "$OUT" in
  "$ROOT"|"$ROOT/"*|"samples"|"samples/"*)
    echo "refusing to write inside the repo ($OUT). Approved cards in samples/approved/ must not be replaced by engine renders." >&2
    exit 1
    ;;
esac
mkdir -p "$OUT"
OUT_ABS="$(cd "$OUT" && pwd -P)"
case "$OUT_ABS" in
  "$ROOT"|"$ROOT/"*)
    echo "refusing to write inside the repo ($OUT_ABS). Temporary renders stay outside samples/." >&2
    exit 1
    ;;
esac
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
    --screenshot="$OUT_ABS/$s.png" \
    "file://$ROOT/preview.html?shot=1&fp=$s" >/tmp/cr-sample-$s.log 2>&1 || true
  if [ ! -s "$OUT_ABS/$s.png" ]; then
    echo "missing $s" >&2
    exit 1
  fi
  echo "wrote $OUT_ABS/$s.png"
done
echo "WROTE ${#SEEDS[@]} temporary renders to $OUT_ABS (not samples/)"
