#!/usr/bin/env bash
# probe-robustness.sh — 后端健壮性取证脚本
#
# 用法:
#   ./probe-robustness.sh <team-name> <base-url> <resource-path>
#
# 示例:
#   ./probe-robustness.sh team-2 http://localhost:8080 /api/items
#
# 输出:
#   .grading/probes/<team>-<probe>.log          每个 probe 的详细日志
#   .grading/probes/<team>-robustness-summary.md 汇总表 + rubric 建议分数
#
# 注意: 这是培训场景的基本健壮性探测，不是真实攻击或安全测试。

set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "用法: $0 <team-name> <base-url> <resource-path>" >&2
  echo "示例: $0 team-2 http://localhost:8080 /api/items" >&2
  exit 1
fi

TEAM="$1"
BASE_URL="${2%/}"
RES_PATH="$3"
URL="${BASE_URL}${RES_PATH}"

OUT_DIR=".grading/probes"
mkdir -p "$OUT_DIR"

SUMMARY="${OUT_DIR}/${TEAM}-robustness-summary.md"
declare -a PROBE_NAMES=()
declare -a PROBE_CODES=()
declare -a PROBE_NOTES=()

# 通用执行器：跑一个 probe，记录 http 状态码 + 耗时到日志与数组。
# 参数: <probe-name> <note-builder-fn> <curl-args...>
run_probe() {
  local name="$1"; shift
  local log="${OUT_DIR}/${TEAM}-${name}.log"
  local start_ms end_ms elapsed code

  start_ms=$(python3 -c 'import time;print(int(time.time()*1000))')
  {
    echo "=== probe: ${name} ==="
    echo "=== url:   ${URL} ==="
    echo "=== time:  $(date -u +%FT%TZ) ==="
    echo "--- request args: $* ---"
  } > "$log"

  # 抓取 http_code；body 和 header 也写入日志
  code=$(curl -sS -o >(cat >> "$log") -w "%{http_code}" \
    --max-time 15 "$@" 2>> "$log" || echo "000")
  end_ms=$(python3 -c 'import time;print(int(time.time()*1000))')
  elapsed=$((end_ms - start_ms))

  {
    echo ""
    echo "--- http_code: ${code} ---"
    echo "--- elapsed_ms: ${elapsed} ---"
  } >> "$log"

  echo "[probe] ${name}: http=${code} elapsed=${elapsed}ms"
  PROBE_NAMES+=("$name")
  PROBE_CODES+=("$code")
}

# 根据 http_code 判断是否"合理拒绝"(4xx)；给出备注文本。
note_for() {
  local name="$1" code="$2"
  case "$name" in
    empty-body|malformed-json|oversize-field|wrong-content-type|sql-injection-smell|auth-missing)
      if [[ "$code" =~ ^4[0-9][0-9]$ ]]; then
        echo "合理拒绝"
      elif [[ "$code" =~ ^5[0-9][0-9]$ ]]; then
        echo "建议返回 4xx 而非 5xx"
      elif [[ "$code" == "200" || "$code" == "201" ]]; then
        echo "未校验，返回 2xx"
      else
        echo "异常响应/无响应"
      fi
      ;;
    idempotency)
      echo "见日志对比"
      ;;
    concurrent)
      echo "见日志状态码分布"
      ;;
    *)
      echo "-"
      ;;
  esac
}

echo "==> 后端健壮性探测 team=${TEAM} url=${URL}"

# 1. empty-body —— 空 JSON
run_probe "empty-body" \
  -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{}'

# 2. malformed-json —— 非 JSON
run_probe "malformed-json" \
  -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d 'not json'

# 3. oversize-field —— 超长字段 (10000 A)
BIG_NAME=$(printf 'A%.0s' {1..10000})
run_probe "oversize-field" \
  -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"${BIG_NAME}\"}"

# 4. wrong-content-type —— 声明 text/plain 但 body 是乱来
run_probe "wrong-content-type" \
  -X POST "$URL" \
  -H "Content-Type: text/plain" \
  -d 'abc'

# 5. idempotency —— 同 X-Request-Id 打 2 次，对比响应
IDEM_ID="probe-idem-$(date +%s)-$$"
IDEM_LOG="${OUT_DIR}/${TEAM}-idempotency.log"
{
  echo "=== probe: idempotency ==="
  echo "=== url:   ${URL} ==="
  echo "=== X-Request-Id: ${IDEM_ID} ==="
} > "$IDEM_LOG"

idem_start=$(python3 -c 'import time;print(int(time.time()*1000))')
IDEM_BODY_1=$(mktemp)
IDEM_BODY_2=$(mktemp)
IDEM_CODE_1=$(curl -sS -o "$IDEM_BODY_1" -w "%{http_code}" --max-time 15 \
  -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "X-Request-Id: ${IDEM_ID}" \
  -d '{"name":"idem-probe","qty":1}' 2>>"$IDEM_LOG" || echo "000")
IDEM_CODE_2=$(curl -sS -o "$IDEM_BODY_2" -w "%{http_code}" --max-time 15 \
  -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "X-Request-Id: ${IDEM_ID}" \
  -d '{"name":"idem-probe","qty":1}' 2>>"$IDEM_LOG" || echo "000")
idem_end=$(python3 -c 'import time;print(int(time.time()*1000))')
idem_elapsed=$((idem_end - idem_start))

{
  echo ""
  echo "--- first  http_code: ${IDEM_CODE_1} body ---"
  cat "$IDEM_BODY_1" || true
  echo ""
  echo "--- second http_code: ${IDEM_CODE_2} body ---"
  cat "$IDEM_BODY_2" || true
  echo ""
  echo "--- diff ---"
  diff -u "$IDEM_BODY_1" "$IDEM_BODY_2" || true
  echo "--- elapsed_ms(total): ${idem_elapsed} ---"
} >> "$IDEM_LOG"

if diff -q "$IDEM_BODY_1" "$IDEM_BODY_2" >/dev/null 2>&1; then
  IDEM_NOTE="两次响应一致，疑似幂等"
  IDEM_STATUS="OK"
else
  IDEM_NOTE="两次响应不同，可能非幂等(看日志 diff)"
  IDEM_STATUS="${IDEM_CODE_1}/${IDEM_CODE_2}"
fi
rm -f "$IDEM_BODY_1" "$IDEM_BODY_2"
echo "[probe] idempotency: http=${IDEM_CODE_1}/${IDEM_CODE_2} elapsed=${idem_elapsed}ms"
PROBE_NAMES+=("idempotency")
PROBE_CODES+=("$IDEM_STATUS")

# 6. concurrent —— 并发 10 次
CONC_LOG="${OUT_DIR}/${TEAM}-concurrent.log"
{
  echo "=== probe: concurrent ==="
  echo "=== url:   ${URL} ==="
} > "$CONC_LOG"

conc_start=$(python3 -c 'import time;print(int(time.time()*1000))')
# shellcheck disable=SC2016
CONC_CODES=$(seq 10 | xargs -P 10 -I{} curl -sS -o /dev/null \
  -w "%{http_code}\n" --max-time 15 "$URL" 2>>"$CONC_LOG" || true)
conc_end=$(python3 -c 'import time;print(int(time.time()*1000))')
conc_elapsed=$((conc_end - conc_start))

{
  echo "--- status codes ---"
  echo "$CONC_CODES"
  echo "--- distribution ---"
  echo "$CONC_CODES" | sort | uniq -c
  echo "--- elapsed_ms(total): ${conc_elapsed} ---"
} >> "$CONC_LOG"

CONC_DIST=$(echo "$CONC_CODES" | sort | uniq -c | tr '\n' ';' | sed 's/;$//')
echo "[probe] concurrent: http=[${CONC_DIST}] elapsed=${conc_elapsed}ms"
PROBE_NAMES+=("concurrent")
PROBE_CODES+=("$CONC_DIST")

# 7. auth-missing —— 不带 token 访问（若路径本身要求 auth 才有意义）
run_probe "auth-missing" \
  -X GET "$URL"

# 8. sql-injection-smell —— 非真实攻击，看是否有基本过滤
INJECT_PATH="${RES_PATH}?id=1%27%20OR%20%271%27%3D%271"
run_probe "sql-injection-smell" \
  -X GET "${BASE_URL}${INJECT_PATH}"

# ---- 汇总 ----
echo ""
echo "==> 生成汇总: ${SUMMARY}"

{
  echo "# 健壮性探测汇总 — ${TEAM}"
  echo ""
  echo "- URL: \`${URL}\`"
  echo "- 生成时间: $(date -u +%FT%TZ)"
  echo ""
  echo "| Probe | Status | 备注 |"
  echo "|---|---|---|"
} > "$SUMMARY"

# 统计 4xx 合理拒绝的 probe 数(仅对可判定的 6 个 probe 计入：
# empty-body/malformed-json/oversize-field/wrong-content-type/auth-missing/sql-injection-smell)
REASONABLE=0
JUDGEABLE_NAMES=(empty-body malformed-json oversize-field wrong-content-type auth-missing sql-injection-smell)

for i in "${!PROBE_NAMES[@]}"; do
  name="${PROBE_NAMES[$i]}"
  code="${PROBE_CODES[$i]}"
  if [[ "$name" == "idempotency" ]]; then
    note="$IDEM_NOTE"
  elif [[ "$name" == "concurrent" ]]; then
    note="状态码分布: ${CONC_DIST}"
  else
    note=$(note_for "$name" "$code")
  fi
  echo "| ${name} | ${code} | ${note} |" >> "$SUMMARY"

  # 计数：是否在可判定集合里 + code 是否 4xx
  for jn in "${JUDGEABLE_NAMES[@]}"; do
    if [[ "$name" == "$jn" && "$code" =~ ^4[0-9][0-9]$ ]]; then
      REASONABLE=$((REASONABLE + 1))
    fi
  done
done

# rubric 建议分数（按被判定数 REASONABLE，满分基于 8 个 probe 阈值）
if   (( REASONABLE >= 7 )); then SCORE=10
elif (( REASONABLE >= 5 )); then SCORE=7
elif (( REASONABLE >= 3 )); then SCORE=5
else                             SCORE=3
fi

{
  echo ""
  echo "## Rubric 建议"
  echo ""
  echo "- 4xx 合理拒绝计数 (judgeable probes): **${REASONABLE}**"
  echo "- 建议"健壮性"分: **${SCORE}/10**"
  echo ""
  echo "> 档位: >=7 => 10; >=5 => 7; >=3 => 5; <3 => 3"
} >> "$SUMMARY"

echo ""
echo "完成: reasonable=${REASONABLE} suggested_score=${SCORE}"
echo "汇总: ${SUMMARY}"
