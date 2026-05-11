---
name: question-types
description: "5 种题型（choice / multiChoice / trueFalse / shortAnswer / scenario）的数据结构、判分规则、答案存储格式。涉及题目展示、判分、统计、详情页时读取。"
---

# 题型与判分规则

考试系统支持 5 种题型，类型枚举见 `lib/types.ts` 的 `QuestionType`。

## 题型一览

| 题型 | enum | 题数 | 单题分 | 小计 |
|---|---|---|---|---|
| 单选题 | `choice` | 13 | 3 | 39 |
| 多选题 | `multiChoice` | 5 | 4 | 20 |
| 判断题 | `trueFalse` | 10 | 2 | 20 |
| 简答题 | `shortAnswer` | 2 | 不定 | 21 |
| 场景分析 | `scenario` | 1 (含 3 子题) | 4/5/5 | 14 |

**总分 100，但 scenario 不计入总分**（历史原因：sc1 一题在去年考试因网络问题大面积丢失答案，已从计分中移除——`GradingBreakdown.scenario` 字段标记为 optional）。所以 dashboard 上展示的总分上限是 **100 - 14 = 86** 的有效部分，但保持显示为 "/100"。

## 答案存储格式（关键）

`ExamRecord.answers` 是 `Record<string, string>` —— **全部是字符串**，不同题型用不同的字符串约定：

| 题型 | 字符串格式 | 例 |
|---|---|---|
| `choice` | 单个大写字母 | `"B"` |
| `multiChoice` | 用 `,` 分隔的字母序列，**按字母序** | `"A,C,D"` |
| `trueFalse` | 字符串 `"true"` 或 `"false"` | `"true"` |
| `shortAnswer` | 自由文本 | `"用户输入的回答..."` |
| `scenario` | **JSON 字符串**，里面是子题答案的 map | `'{"sc1a":"...","sc1b":"...","sc1c":"..."}'` |

⚠️ **scenario 题的答案是 JSON 字符串**——展示场景题时必须先 `JSON.parse`，按 `subQuestions[].id` 拆开。

⚠️ **multiChoice 的字母序列必须按字母升序**——`"C,A,D"` 和 `"A,C,D"` 不会被判为同一答案。`lib/grading.ts` 的 `gradeMultiChoice` 内部用 `Set` 比对所以顺序无所谓，但**前端提交时应该保证有序**（已有组件 `MultiChoiceQuestion.tsx` 处理）。

## 判分规则细节

### 单选题 `choice`

- 学员答案 === 标准答案 → 满分 3 分
- 否则 → 0 分
- `correct: true | false` 标记

### 多选题 `multiChoice`

3 段规则（在 `gradeMultiChoice` 实现）：

| 情况 | 得分 |
|---|---|
| 完全正确（无错选、无漏选） | 满分 4 分 |
| 部分正确（无错选、有漏选） | 半分 2 分 |
| 任何错选 / 未作答 | 0 分 |

⚠️ "漏选"判半分这条规则是有意的——鼓励学员对没把握的选项**少选不错选**。

### 判断题 `trueFalse`

- 学员答案 === `"true"` / `"false"` → 与标准比对
- 完全二选一，没有半分

### 简答题 `shortAnswer`

主观题，调 LLM 评分（或 mock）：

- 客观条件：未作答（trim 后空字符串）→ 直接 0 分，不调 LLM
- 否则：把题干 + rubric + 满分 + 学员答案传给 LLM，要求返回 `{ score: int, feedback: string }`
- mock 模式（无 API key）：按答案长度 5/30/100 字阶梯给 0% / 50% / 70% / 85%

LLM 评分有 4 次重试（指数退避），失败后 feedback 会被设成 `"评分失败，请联系管理员"`——这就是 Task 2 "重评失败题"需要识别的状态。

### 场景题 `scenario`

每个 subQuestion 单独按主观题判分（同 `shortAnswer`），但**不计入 totalScore**。

## 在前端展示答案的注意事项

实现 **Task 1 答卷详情页**时需要：

1. 客观题：直接对比 `exam.answers[id]` 与 `answers.find(a => a.questionId === id).correctAnswer`
2. 多选题：把字母序列 split 后 join `" + "` 展示更友好
3. 判断题：把 `"true"` / `"false"` 翻译成 `"对"` / `"错"`
4. 简答题：显示 `exam.grading.scores[id].feedback`（AI 评语）
5. 场景题：`JSON.parse(exam.answers[parentId])` 拿到子题答案 map

未作答的题：在 `exam.answers` 里**键就不存在**，访问会得到 `undefined`——展示时应该显示 `"未作答"`，不要崩。
