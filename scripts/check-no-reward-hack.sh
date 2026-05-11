#!/usr/bin/env bash
# ============================================================
# Reward Hacking 检测脚本（workshop pre-commit hook 的一部分）
#
# 检测 Agent 在评分压力下最常见的 4 类"作弊"行为，每种命中都
# 拒绝 commit，并输出可被 Agent 读懂的修复指导。
#
# 检测项：
#   ① 删测试 case（test/spec 文件里减少了 it/test/describe 行）
#   ② 添加 .skip / .only / xit / xdescribe 跳过测试
#   ③ 添加 @ts-ignore / @ts-expect-error / eslint-disable 没有 reason 解释
#   ④ 删除非空的 expect / assert 行（让测试变空壳）
#
# 设计原则（培训 §6 "工程约束驯服 Agent"）：
#   - 错误信息本身就是给下一次 Agent 调用的 prompt
#   - 不允许 "看起来跑过了"，必须解释为什么这样改
# ============================================================

set -e

# 拿 staged 改动的文件列表
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null || true)

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

# 全量 diff（含所有文件，用于"删测试 / 删 expect"这类检查 —— 看 test file 内的修改）
DIFF=$(git diff --cached --diff-filter=ACMR -U0 2>/dev/null || true)

# 代码文件 diff（只看 *.ts/*.tsx/*.js/*.jsx/*.mjs/*.cjs，
# 用于"skip / only / @ts-ignore / eslint-disable"这类检查 ——
# 避免把 markdown 文档里展示用的示例字符串误判为代码改动）
CODE_FILES=$(echo "$STAGED_FILES" | grep -E "\.(ts|tsx|js|jsx|mjs|cjs)$" || true)
if [ -n "$CODE_FILES" ]; then
  # shellcheck disable=SC2086
  CODE_DIFF=$(git diff --cached --diff-filter=ACMR -U0 -- $CODE_FILES 2>/dev/null || true)
else
  CODE_DIFF=""
fi

FAIL=0

# ------------------------------------------------------------
# ① 删测试 case：test/spec 文件里 -it/-test/-describe
# ------------------------------------------------------------
TEST_LINE_DELS=$(echo "$DIFF" \
  | grep -E "^-" \
  | grep -vE "^--- " \
  | grep -E "(it|test|describe)\s*\(" \
  | wc -l \
  | tr -d ' ')

# 只在 staged 文件路径里有 test/spec 或 __tests__ 时算
STAGED_TEST_FILES=$(echo "$STAGED_FILES" \
  | grep -E "\.test\.|\.spec\.|__tests__/" \
  | wc -l \
  | tr -d ' ')

if [ "$TEST_LINE_DELS" -gt 0 ] && [ "$STAGED_TEST_FILES" -gt 0 ]; then
  cat <<'EOF'
❌ 检测到测试用例被删除。

🤖 GUIDANCE FOR THE AI AGENT:
  删除测试 case 是 reward hacking 的典型信号——绕开失败而非修 root cause。

  如果测试**真的过期 / 真的错了**，请在 commit message 里明确解释：
    - 测试为什么过期（需求变了 / 接口改了 / ...）
    - 为什么删除而非更新

  否则，请保留测试并修代码让它过。

  Pre-commit hook 不允许"无解释删测试"通过。

EOF
  FAIL=1
fi

# ------------------------------------------------------------
# ② skip / only 标记（只在代码文件里查）
# ------------------------------------------------------------
SKIP_ADDS=$(echo "$CODE_DIFF" \
  | grep -E "^\+" \
  | grep -vE "^\+\+\+ " \
  | grep -E "(\.skip\s*\(|\.only\s*\(|^\+\s*xit\s*\(|^\+\s*xdescribe\s*\()" \
  | wc -l \
  | tr -d ' ')

if [ "$SKIP_ADDS" -gt 0 ]; then
  cat <<'EOF'
❌ 检测到 .skip() / .only() / xit() / xdescribe() 被添加。

🤖 GUIDANCE FOR THE AI AGENT:
  跳过测试 = 暂时让 CI 闭眼，不是修问题。
  如果 case 真的应该 skip（外部依赖 down / 平台限制），
  请把它**完整删除**，并在 commit message 解释删除理由。

  .only() 会让 CI 只跑这一个 case，**绝对不允许**入主分支。

EOF
  FAIL=1
fi

# ------------------------------------------------------------
# ③ @ts-ignore / @ts-expect-error / eslint-disable 没解释（只在代码文件里查）
# ------------------------------------------------------------
SUPPRESSIONS=$(echo "$CODE_DIFF" \
  | grep -E "^\+" \
  | grep -vE "^\+\+\+ " \
  | grep -E "@ts-ignore|@ts-expect-error|eslint-disable" \
  || true)

# 在这些抑制语句的同一行需要有 "reason:" 注释
# 注意：当 SUPPRESSIONS 为空时，echo "" 仍会输出空行，所以先判空再算
if [ -z "$SUPPRESSIONS" ]; then
  SUPPRESSIONS_BAD=0
else
  SUPPRESSIONS_BAD=$(echo "$SUPPRESSIONS" \
    | grep -vE "reason\s*:" \
    | wc -l \
    | tr -d ' ')
fi

if [ "$SUPPRESSIONS_BAD" -gt 0 ]; then
  cat <<'EOF'
❌ 检测到 @ts-ignore / @ts-expect-error / eslint-disable 没有 reason 注释。

🤖 GUIDANCE FOR THE AI AGENT:
  抑制类型 / lint 错误不是修问题。如果一定要抑制，请加同行注释：
    // @ts-ignore reason: 第三方库类型不准，对应 issue #123
    // eslint-disable-next-line no-console reason: workshop 调试需要

  没有 reason 的抑制会让代码里堆积"看不见的债"，未来 review 无从评估。

EOF
  FAIL=1
fi

# ------------------------------------------------------------
# ④ 删 expect / assert 让测试变空壳
# ------------------------------------------------------------
ASSERT_DELS=$(echo "$DIFF" \
  | grep -E "^-" \
  | grep -vE "^--- " \
  | grep -E "(expect\s*\(|assert\.|chai\.|should\.)" \
  | wc -l \
  | tr -d ' ')

if [ "$ASSERT_DELS" -gt 0 ] && [ "$STAGED_TEST_FILES" -gt 0 ]; then
  cat <<'EOF'
❌ 检测到 expect/assert 断言被删除。

🤖 GUIDANCE FOR THE AI AGENT:
  把测试体内的断言删掉等于让测试"看起来通过但什么都没验"。
  如果你想"暂时放过这个 case"，请整体删除该 it/test 块（连函数声明一起删，
  并在 commit message 解释为什么）。不要保留壳子。

EOF
  FAIL=1
fi

exit $FAIL
