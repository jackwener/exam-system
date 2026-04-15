#!/usr/bin/env bash
# probe-a11y.sh — run axe-core accessibility scan against a URL, summarize
# violations by impact, and map to grading rubric.
#
# Usage:
#   ./probe-a11y.sh <team-name> <url>
# Example:
#   ./probe-a11y.sh team-alpha http://localhost:3000
#
# Output:
#   .grading/probes/<team>-axe.json         (raw axe JSON, if produced)
#   .grading/probes/<team>-axe-summary.txt  (violation counts + rubric)

set -euo pipefail

TEAM="${1:?usage: probe-a11y.sh <team> <url>}"
URL="${2:?usage: probe-a11y.sh <team> <url>}"
OUT=".grading/probes"
mkdir -p "$OUT"

REPORT="$OUT/${TEAM}-axe.json"
SUMMARY="$OUT/${TEAM}-axe-summary.txt"

echo "[probe-a11y] running @axe-core/cli against $URL ..."
# axe exits non-zero when violations are found; don't let that kill the script.
npx --yes @axe-core/cli "$URL" --save "$REPORT" || true

if [ ! -s "$REPORT" ]; then
  echo "[probe-a11y] WARN: no report produced at $REPORT" >&2
  {
    echo "team:         $TEAM"
    echo "url:          $URL"
    echo "status:       NO_REPORT"
  } > "$SUMMARY"
  exit 0
fi

# Summarize violations by impact level. axe --save emits an array of page
# results; sum violations across all entries.
read -r CRIT SERIOUS MODERATE MINOR <<EOF
$(node -e "
  const data = require('$PWD/$REPORT');
  const pages = Array.isArray(data) ? data : [data];
  const count = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  for (const p of pages) {
    const v = (p && p.violations) || [];
    for (const x of v) {
      if (count[x.impact] != null) count[x.impact] += 1;
    }
  }
  process.stdout.write([count.critical, count.serious, count.moderate, count.minor].join(' '));
")
EOF

HIGH=$((CRIT + SERIOUS))

# Map high-severity count -> rubric
if   [ "$HIGH" -eq 0 ]; then POINTS=10
elif [ "$HIGH" -le 2 ]; then POINTS=7
elif [ "$HIGH" -le 5 ]; then POINTS=5
else                         POINTS=3
fi

{
  echo "team:                 $TEAM"
  echo "url:                  $URL"
  echo "violations_critical:  $CRIT"
  echo "violations_serious:   $SERIOUS"
  echo "violations_moderate:  $MODERATE"
  echo "violations_minor:     $MINOR"
  echo "critical_plus_serious: $HIGH"
  echo "rubric_points:        $POINTS / 10"
  echo "mapping_rule:         0=>10  1-2=>7  3-5=>5  >=6=>3  (on critical+serious)"
  echo "raw_report:           $REPORT"
} > "$SUMMARY"

echo "[probe-a11y] critical=$CRIT serious=$SERIOUS moderate=$MODERATE minor=$MINOR"
echo "[probe-a11y] rubric points: $POINTS/10  (summary: $SUMMARY)"
