#!/usr/bin/env bash
# probe-screenshots.sh — capture desktop + mobile screenshots of a running frontend
# for grading evidence. Uses playwright CLI via npx.
#
# Usage:
#   ./probe-screenshots.sh <team-name> [base-url]
# Example:
#   ./probe-screenshots.sh team-alpha http://localhost:3000
#
# Output:
#   .grading/shots/<team>-desktop-<view>.png   (1280x800)
#   .grading/shots/<team>-mobile.png           (375x812, home page)
#   .grading/shots/<team>-MISSING.log          (failed URLs, if any)

set -euo pipefail

# 前置依赖检查
if ! command -v npx >/dev/null 2>&1; then
  echo "[ERR] need npx (Node.js)"; exit 1
fi
# 第一次会自动装 chromium
npx --yes playwright install chromium >/dev/null 2>&1 || true

TEAM="${1:?usage: probe-screenshots.sh <team> [base-url]}"
BASE="${2:-http://localhost:3000}"
OUT=".grading/shots"
mkdir -p "$OUT"

MISSING_LOG="$OUT/${TEAM}-MISSING.log"
: > "$MISSING_LOG"

shot() {
  # shot <viewport> <url-path> <out-file>
  local viewport="$1"
  local path="$2"
  local out="$3"
  local url="${BASE}${path}"
  if npx --yes playwright screenshot \
      --viewport-size="$viewport" \
      "$url" "$out" >/dev/null 2>&1; then
    echo "  ok: $url -> $out"
    return 0
  else
    echo "  MISS: $url"
    echo "$url" >> "$MISSING_LOG"
    return 1
  fi
}

count=0

# Desktop views
for view in home login dashboard detail empty error; do
  case "$view" in
    home) path="/" ;;
    *)    path="/$view" ;;
  esac
  out="$OUT/${TEAM}-desktop-${view}.png"
  if shot "1280,800" "$path" "$out"; then
    count=$((count + 1))
  fi
done

# Mobile: home page only
out="$OUT/${TEAM}-mobile.png"
if shot "375,812" "/" "$out"; then
  count=$((count + 1))
fi

# Clean up empty missing log
if [ ! -s "$MISSING_LOG" ]; then
  rm -f "$MISSING_LOG"
fi

echo ""
echo "[probe-screenshots] captured $count screenshot(s) for team '$TEAM' -> $OUT/"
