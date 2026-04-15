#!/usr/bin/env bash
# probe-performance.sh — 后端性能取证脚本（autocannon 压测）
#
# 用法:
#   ./probe-performance.sh <team-name> <base-url> <path>
#
# 示例:
#   ./probe-performance.sh team-2 http://localhost:8080 /api/items
#
# 输出:
#   .grading/probes/<team>-autocannon.log      原始 autocannon 输出
#   .grading/probes/<team>-perf-summary.txt    解析后的 p50/p95/rps/errors + rubric 建议
#
# 依赖: npx (autocannon 自动 --yes 安装)

set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "用法: $0 <team-name> <base-url> <path>" >&2
  echo "示例: $0 team-2 http://localhost:8080 /api/items" >&2
  exit 1
fi

TEAM="$1"
BASE_URL="${2%/}"
AC_PATH="$3"
TARGET="${BASE_URL}${AC_PATH}"

OUT_DIR=".grading/probes"
mkdir -p "$OUT_DIR"

LOG="${OUT_DIR}/${TEAM}-autocannon.log"
SUMMARY="${OUT_DIR}/${TEAM}-perf-summary.txt"

echo "==> autocannon 压测: team=${TEAM} target=${TARGET}"
echo "    duration=5s concurrency=10"

# 跑 autocannon；失败也继续，以便写 summary
set +e
npx --yes autocannon -d 5 -c 10 "$TARGET" > "$LOG" 2>&1
AC_EXIT=$?
set -e

# ---- 解析 ----
# autocannon 输出里：
#   Latency 表格中一行形如:  │ 50%     │ 12 ms   │ ...
#   Req/Sec 表格中一行形如:  │ Req/Sec │ ... │ 1234  │
#   最后一行类似: "123k requests in 5.02s, 12.3 MB read"
#   错误行类似:    "0 errors, 0 timeouts"

# 注意：autocannon 使用 unicode box drawing (│)。先把非 ascii 替换成 '|' 便于解析。
NORM_LOG=$(mktemp)
# shellcheck disable=SC2002
LC_ALL=C sed 's/[^[:print:][:space:]]/|/g' "$LOG" > "$NORM_LOG"

extract_latency() {
  # $1: 百分位字符串，如 "50%" or "97.5%"
  local pct="$1"
  grep -E "^\|[[:space:]]*${pct}[[:space:]]*\|" "$NORM_LOG" \
    | head -n1 \
    | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/,"",$3); print $3}'
}

P50=$(extract_latency "50%" || echo "")
P95=$(extract_latency "97.5%" || echo "")
[[ -z "$P95" ]] && P95=$(extract_latency "99%" || echo "")
[[ -z "$P50" ]] && P50="n/a"
[[ -z "$P95" ]] && P95="n/a"

# Req/Sec 平均值所在行(第一个 "Req/Sec")
RPS=$(grep -E "^\|[[:space:]]*Req/Sec[[:space:]]*\|" "$NORM_LOG" \
  | head -n1 \
  | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/,"",$5); print $5}')
[[ -z "$RPS" ]] && RPS="n/a"

# errors / timeouts / non2xx
ERR_LINE=$(grep -Ei "errors|timeouts|non-2xx|non 2xx" "$LOG" | head -n5 || true)
ERRORS=$(grep -oE "[0-9]+ errors" "$LOG" | head -n1 | awk '{print $1}')
TIMEOUTS=$(grep -oE "[0-9]+ timeouts" "$LOG" | head -n1 | awk '{print $1}')
NON2XX=$(grep -oE "[0-9]+ non-?2xx" "$LOG" | head -n1 | awk '{print $1}')
[[ -z "$ERRORS" ]] && ERRORS="n/a"
[[ -z "$TIMEOUTS" ]] && TIMEOUTS="n/a"
[[ -z "$NON2XX" ]] && NON2XX="n/a"

rm -f "$NORM_LOG"

# ---- p95 数字化(ms) ----
# P95 可能是 "123 ms" / "1.2 s" / "n/a"
p95_ms() {
  local s="$1"
  s=$(echo "$s" | tr -d ' ')
  if [[ "$s" =~ ^([0-9]+(\.[0-9]+)?)ms$ ]]; then
    echo "${BASH_REMATCH[1]}"
  elif [[ "$s" =~ ^([0-9]+(\.[0-9]+)?)s$ ]]; then
    python3 -c "print(float('${BASH_REMATCH[1]}')*1000)"
  else
    echo ""
  fi
}

P95_MS=$(p95_ms "$P95")

# rubric 映射：p95 < 100 => 10 / < 300 => 7 / < 800 => 5 / >= 800 => 3
if [[ -z "$P95_MS" ]]; then
  SCORE="n/a"
  RUBRIC_NOTE="无法解析 p95，需人工看 ${LOG}"
else
  # 用 python 做浮点比较，避免 bash 整数限制
  SCORE=$(python3 -c "
v=float('${P95_MS}')
print(10 if v<100 else 7 if v<300 else 5 if v<800 else 3)
")
  RUBRIC_NOTE="按 p95=${P95_MS}ms 映射"
fi

# ---- stdout ----
echo ""
echo "---- perf summary (${TEAM}) ----"
echo "target    : ${TARGET}"
echo "autocannon exit: ${AC_EXIT}"
echo "p50       : ${P50}"
echo "p95(97.5%): ${P95}  (ms=${P95_MS:-n/a})"
echo "rps(avg)  : ${RPS}"
echo "errors    : ${ERRORS}  timeouts: ${TIMEOUTS}  non2xx: ${NON2XX}"
echo "rubric    : ${SCORE}/10  (${RUBRIC_NOTE})"
echo "log       : ${LOG}"

# ---- summary 文件 ----
{
  echo "# 性能探测汇总 — ${TEAM}"
  echo ""
  echo "target         : ${TARGET}"
  echo "generated_at   : $(date -u +%FT%TZ)"
  echo "autocannon_exit: ${AC_EXIT}"
  echo "duration_sec   : 5"
  echo "connections    : 10"
  echo ""
  echo "## 指标"
  echo "p50             = ${P50}"
  echo "p95 (97.5%)     = ${P95}   (ms=${P95_MS:-n/a})"
  echo "rps (avg)       = ${RPS}"
  echo "errors          = ${ERRORS}"
  echo "timeouts        = ${TIMEOUTS}"
  echo "non2xx          = ${NON2XX}"
  echo ""
  echo "## Rubric 建议"
  echo "- 建议"性能"分: ${SCORE}/10"
  echo "- 依据: ${RUBRIC_NOTE}"
  echo "- 档位: p95 <100ms=>10; <300ms=>7; <800ms=>5; >=800ms=>3"
  echo ""
  echo "## 原始日志"
  echo "- ${LOG}"
  if [[ -n "$ERR_LINE" ]]; then
    echo ""
    echo "## 错误摘要"
    echo "$ERR_LINE"
  fi
} > "$SUMMARY"

echo "summary   : ${SUMMARY}"
