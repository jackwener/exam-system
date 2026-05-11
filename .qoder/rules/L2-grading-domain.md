---
name: L2-grading-domain
alwaysApply: false
description: "评分领域智能触发 · 关键词：评分、判分、重评、scoring、grading、breakdown、totalScore、feedback、评语、答卷。这些场景出现时自动加载。"
layer: L2
---

# L2 · 评分领域规则（智能触发）

> 这条 Rule 不绑定到具体文件类型，而是基于 description 智能触发——
> 当对话或代码涉及"评分 / 判分 / 重评 / 答卷"时自动加载。

## 强约束

### 1. 不要重新实现评分逻辑

- 客观题判分：用 `lib/grading.ts` 里的 `gradeObjective` / `gradeMultiChoice`
- 主观题判分：用 `gradeSubjectiveQuestion`
- 重评失败题：用 `regradeFailedQuestions`
- 补齐未作答客观题：用 `fillMissingObjectives`
- 按当前分值重算：用 `rescoreExam`

**学员的任务是 wire 这些函数到 API route 或 UI，不是重写。**

### 2. 失败题识别口径只有一条

```ts
score.feedback?.includes("评分失败")
```

❌ **不要**用 `score === 0` 判定失败——客观答错 / 主观未答都是 0，都不是"评分失败"。

### 3. 评分状态机

`ExamRecord.grading.status` 有 3 个值，**不要**自己造新状态：

```
pending  ──(创建考试)──>  grading  ──(评分完成)──>  completed
                            ↑                          │
                            └──── regrade ─────────────┘
```

只有 `completed` 状态的 record 才在 dashboard 上展示，过滤条件：
`e.submittedAt && e.grading.status === "completed"`

### 4. 答案格式

不同题型的答案存储格式**严格**，详见 [.ai/business-logic/question-types.md](../business-logic/question-types.md)：

- `choice` → 单大写字母 `"B"`
- `multiChoice` → 字母序列 `"A,C,D"`（按字母序）
- `trueFalse` → 字符串 `"true"` / `"false"`
- `shortAnswer` → 自由文本
- `scenario` → JSON 字符串（子题答案 map）

### 5. 总分口径

- 显示分母统一是 `/100`
- 但实际计入总分的 = `choice + multiChoice + trueFalse + shortAnswer`（不含 scenario）
- breakdown 的 max 字段有历史不一致——seed 用 39，gradeExam 旧 hardcode 26。展示时**直接显示 breakdown 字段**，不要自行重算 max

## 弱约束（建议）

- 展示评语时保留 LLM 的 `[mock]` 前缀——这是给用户的"当前是模拟评分"信号
- 多选题展示时把 `"A,C,D"` join 成 `"A + C + D"` 更可读
- 判断题展示时把 `"true"` / `"false"` 翻成 `"对"` / `"错"`
- 未作答题（answers 里键不存在）显示 `"未作答"`，不要崩
