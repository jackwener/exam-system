---
name: check
description: 任务完成后的 diff 审查。完成代码改动后必须执行：看 git diff、对照原始目标、跑验证命令、输出审查报告。不允许"看起来 OK"就宣称完成。
---

# /check · 任务完成后的 Diff 审查

## 使用场景

每次代码改动完成后，**在宣称"任务完成"之前**必须执行。

## 目标

确认本次修改：

1. 真的满足了用户需求（没漏点）
2. 没超出 scope（没顺手加无关改动）
3. 通过了项目的验证流程（lint / typecheck / test）

Agent 最常见的失败是**自信地宣称"完成了"但实际只测了 happy path**。`/check` 是对抗这种失败的标准动作。

## 必须步骤

### 1. 读 git 状态

```bash
git status
git diff
git diff --stat
```

把当前改动的**所有文件**列出来，逐个评估。

### 2. 对照原始任务

- 任务的 Goal（来自 `/think` 输出 / spec 的 `proposal.md`）是否完成？
- Non-Goals 有没有被违反？（顺手优化无关代码 = 违反）
- tasks.md 上勾掉了哪些 checkbox？

### 3. 检查 diff 性质

| 检查项 | 必须答 |
|---|---|
| 是否修改了不该修改的文件？ | 列出每个改动文件，说明必要性 |
| 是否引入新依赖？ | 是 → 必须解释为什么不能用现有依赖 |
| 是否有硬编码 / 临时 workaround？ | 是 → 必须明确 `// TODO` 标注 |
| 是否更新测试？ | 业务逻辑改动必须配测试，UI 改动至少手测 |
| 是否动了 [`L0-protect-core`](../../rules/L0-protect-core.md) 列出的禁区文件？ | 是 → 立即停下，向用户解释 |

### 4. 执行项目验证

读取 `package.json` 的 `scripts` 段，找出推荐的：

- `lint` → 跑 `pnpm lint`
- `typecheck` → 跑 `npx tsc --noEmit`
- `test` → 跑 `pnpm test`（如果存在）

每条命令的**完整输出**贴给用户。失败的不允许吞掉。

如果项目没有上述脚本：明确说"项目暂无 X 命令"。

### 5. 手测验证

涉及 UI / API 的改动必须手测：

- 改了 page → 浏览器访问看是否渲染正确
- 改了 API → `curl` 或 dev tools 网络面板验证响应
- 改了数据流 → 关键路径走一遍

### 6. 输出审查报告

按下面格式输出。

## 禁止事项

- ❌ 不允许只说"看起来没问题"
- ❌ 不允许在**没看 git diff 的情况下**总结
- ❌ 不允许忽略失败的测试 / 类型错 / lint warning
- ❌ 不允许把**未验证**的结果描述成"已完成"
- ❌ 不允许跳过手测就 say done

## 输出格式

```markdown
## Summary
（一两句话说做了什么）

## Files Changed
| 文件 | 改了什么 | 必要性 |
|---|---|---|
| ... | ... | ... |

## Verification
- `pnpm lint` → ✓ 无 warning
- `npx tsc --noEmit` → ✓ 无错
- `pnpm test` → ✓ N 个用例全过
- 手测：访问 `/admin/exam/seed_zhang_gaofen` → 详情页正确显示

## Risks
- 风险 1：...
- 风险 2：...

## Next Step
建议接下来：...
```

## 与其他 Skill 的关系

- 实施时建议先用 [`/small-diff`](../small-diff/SKILL.md) 控制改动
- 发现需要修的 bug 用 [`/hunt`](../hunt/SKILL.md)
- 任务结束后用 [`/update-context`](../update-context/SKILL.md) 沉淀本次发现
