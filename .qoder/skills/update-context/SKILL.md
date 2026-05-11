---
name: update-context
description: 任务结束后沉淀团队记忆。把本次发现的边界 case、踩坑、隐性约束、有效技巧写入 .qoder/business-logic/gotchas.md（或更新对应业务文档），让下次会话不再踩同一个坑。
---

# /update-context · 沉淀本次发现到团队记忆

## 使用场景

任务完成后（`/check` 通过之后）必须执行。即便任务很简单，也要快速 review 一下"这次有没有学到值得沉淀的东西"——5 秒确认无 → 跳过。

## 目标

把"本次 session 里发现的事"从**临时聊天历史**转化成**仓库里的长期资产**。这是 [Compounding Engineering](../think/SKILL.md) 的最小实践——同一个坑不应该被踩两次。

> 不沉淀的发现 = 浪费的注意力。下一次会话不会知道这次踩了什么坑。

## 必须步骤

### 1. 自问：本次有什么值得沉淀？

走一遍下面的 checklist：

- **隐性约束**：发现某个字段 / 函数 / 配置必须以特定方式使用，但代码读不出？
- **踩坑**：自己（Agent / 用户）踩了一个坑，未来其他人 / 其他 Agent 会同样踩？
- **业务规则**：发现一条文档里没写的业务规则（"X 状态下不能调 Y"）？
- **有效模式**：找到一种解决某类问题的好方法（"遇到 X 类问题用 Y 工具"）？
- **API / 命令的非显然用法**：某个命令 / API 必须特定顺序调用 / 特定参数组合？

任一答 yes → 进入下一步。全 no → 跳过本 Skill。

### 2. 决定写到哪

| 类型 | 目标文件 |
|---|---|
| 通用踩坑（不属于某个业务域） | `.qoder/business-logic/gotchas.md`（不存在就建） |
| 评分 / 题型相关 | 更新 `.qoder/business-logic/grading-pipeline.md` 或 `question-types.md` |
| 鉴权相关 | 更新 `.qoder/business-logic/admin-auth.md` |
| Rule 级别的发现（要约束 Agent 行为） | 提议加新 Rule 到 `.qoder/rules/` |
| 工作流 / 流程级（不只是知识） | 更新对应 Skill 的 SKILL.md |

### 3. 写入条目

每条沉淀至少包含：

- **现象**：你观察到了什么
- **根因 / 规则**：为什么是这样
- **正确做法**：以后遇到类似问题应该怎么做
- **代码位置引用**（如果适用）：`lib/xxx.ts:42`

例：

```markdown
## payment_succeeded 事件可能重复发送

**现象**：同一个支付订单可能收到多次 payment_succeeded webhook。

**根因**：第三方支付平台的 retry 机制——如果我们处理慢或返回非 2xx，对方会重试。

**正确做法**：所有 webhook 处理必须基于 `event.id` 幂等。见 `lib/webhook/idempotency.ts:42`。

**反例**：用 order 当前状态作为幂等依据是错的——状态可能因为并发更新已经变化。
```

### 4. 更新 Spec 的 progress.md

如果当前任务有对应的 `specs/2026-xx-task-N/progress.md`，把本次完成 + 沉淀的内容记进去。下次 session 恢复时这就是入口。

### 5. （可选）建议升级到 Rule

如果发现"这种坑应该用 Rule 约束 Agent 行为"——比如"以后看到 X 就必须做 Y"——**提议给用户加一条 Rule**，不要默默加。

## 禁止事项

- ❌ 不允许把"本次具体调试过程"写进 business-logic——那是日志，不是知识
- ❌ 不允许写"未来可能有用"的猜测——只写**实际验证过**的发现
- ❌ 不允许在 gotchas 里堆 100 条琐碎条目——优先 dedup、合并、删过期
- ❌ 不允许把个人偏好（"我喜欢这样写"）写成团队规则

## 输出格式

```markdown
## 本次沉淀

写入 `.qoder/business-logic/grading-pipeline.md`（追加段落）：

> ### 重评失败题的失败识别口径
> 必须用 `feedback?.includes("评分失败")` 而非 `score === 0`，
> 因为客观题答错 / 主观未作答都是 0 分但不是"评分失败"...

## 已更新文件
- `.qoder/business-logic/grading-pipeline.md`（+12 行）
- `specs/2026-05-task-2-regrade/progress.md`（更新到 "Task 2 完成"）

## 未沉淀（已判断不必）
- "Tailwind v4 的 token 用法" → 这是公开知识，不是项目特有
```

## 与其他 Skill 的关系

- 通常在 [`/check`](../check/SKILL.md) 通过后跑
- 沉淀出来的内容下次会被 [`/think`](../think/SKILL.md) 读到（影响范围分析时）
- [`/hunt`](../hunt/SKILL.md) 找到根因 → 用 `/update-context` 记下防止再踩
