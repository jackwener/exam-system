#!/usr/bin/env bash
# probe-performance.sh — run Lighthouse performance category against a URL
# and map the score to the grading rubric.
#
# Usage:
#   ./probe-performance.sh <team-name> <url>
# Example:
#   ./probe-performance.sh team-alpha http://localhost:3000
#
# Output:
#   .grading/probes/<team>-lighthouse.json           (raw Lighthouse JSON)
#   .grading/probes/<team>-lighthouse-mapping.txt    (rubric mapping suggestion)

set -euo pipefail

TEAM="${1:?usage: probe-performance.sh <team> <url>}"
URL="${2:?usage: probe-performance.sh <team> <url>}"
OUT=".grading/probes"
mkdir -p "$OUT"

REPORT="$OUT/${TEAM}-lighthouse.json"
MAPPING="$OUT/${TEAM}-lighthouse-mapping.txt"

echo "[probe-performance] running Lighthouse against $URL ..."
npx --yes lighthouse "$URL" \
  --only-categories=performance \
  --quiet \
  --chrome-flags="--headless=new --no-sandbox" \
  --output=json \
  --output-path="$REPORT"

# Extract perf score (0..1) via node; fall back to jq if present.
SCORE=$(node -e "
  const r = require('$PWD/$REPORT');
  const s = r.categories && r.categories.performance && r.categories.performance.score;
  process.stdout.write(String(s == null ? 'null' : s));
" 2>/dev/null || true)

if [ -z "$SCORE" ] || [ "$SCORE" = "null" ]; then
  if command -v jq >/dev/null 2>&1; then
    SCORE=$(jq -r '.categories.performance.score' "$REPORT")
  fi
fi

if [ -z "$SCORE" ] || [ "$SCORE" = "null" ]; then
  echo "[probe-performance] could not extract performance score from $REPORT" >&2
  exit 1
fi

# Map score -> rubric points (0..10)
POINTS=$(node -e "
  const s = Number('$SCORE');
  let p;
  if (s >= 0.9) p = 10;
  else if (s >= 0.7) p = 7;
  else if (s >= 0.5) p = 5;
  else p = 3;
  process.stdout.write(String(p));
")

{
  echo "team:           $TEAM"
  echo "url:            $URL"
  echo "perf_score:     $SCORE"
  echo "rubric_points:  $POINTS / 10"
  echo "mapping_rule:   >=0.9=>10  >=0.7=>7  >=0.5=>5  else=>3"
  echo "raw_report:     $REPORT"
} > "$MAPPING"

echo "[probe-performance] performance score: $SCORE  ->  rubric points: $POINTS/10"
echo "[probe-performance] mapping written to $MAPPING"
