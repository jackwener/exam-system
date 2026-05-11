---
name: grading-pipeline
description: "评分状态机（pending → grading → completed）、客观/主观题流程、重试逻辑、mock 与真实 LLM 切换、failed 状态识别。涉及评分流程、重评、状态判断时读取。"
---

# 评分流水线

## 状态机

`ExamRecord.grading.status` 有 3 种状态：

```
pending  ──(创建考试)──>  grading  ──(评分完成)──>  completed
                            ↑                          │
                            └──── regrade ─────────────┘
```

- **pending**：考试刚创建，学员还没提交
- **grading**：学员已提交，评分进行中（async）
- **completed**：评分完成，可以看分数 / 重评 / 导出

提交（`POST /api/exam/submit`）会：

1. 把 `submittedAt` 设成 `Date.now()`
2. 把 `status` 改成 `"grading"`
3. **异步触发 `gradeExam(exam)`**（不 await，立即返回 client）
4. client 端开始轮询 `GET /api/exam/status` 直到 `completed`

## 客观题流程

`gradeObjective(answers)`：

- 同步、不调外部，瞬时返回
- 遍历 `lib/answers.ts` 中所有有 `correctAnswer` 的项
- 按题型分别走 `gradeMultiChoice` 或直接比对

## 主观题流程

`gradeSubjectiveQuestion(qid, questionText, rubric, maxScore, studentAnswer)`：

```
未作答 (trim 为空)?
  ├── 是 → 直接 { score: 0, feedback: "未作答" }
  └── 否 → 调 callGradingApi (最多 4 次)
            ├── 没 ANTHROPIC_API_KEY → 走 mockGrade，瞬时返回
            ├── 有 key → 调真实 LLM
            ├── 失败 → 指数退避（0.8s / 1.6s / 3.2s）+ 重试
            └── 4 次都失败 → { score: 0, feedback: "评分失败，请联系管理员" }
```

⚠️ **`callGradingApi` 不会抛错**——它要么返回成功，要么返回失败 feedback。所以上层 `gradeSubjectiveQuestion` 不需要 try/catch。

## Mock vs 真实 LLM

不设置 `ANTHROPIC_API_KEY` 时，`callGradingApi` 走 `mockGrade`：

```ts
function mockGrade(maxScore, studentAnswer) {
  // 按字符长度阶梯：
  //   < 5 → 0%（视为未作答）
  //   < 30 → 50%
  //   < 100 → 70%
  //   >= 100 → 85%
}
```

mock 也算"成功"——`feedback` 里会有 `[mock]` 前缀，不会被识别为"评分失败"。**这意味着 Task 2 重评失败题在 mock 模式下不会有可重评的目标**（除非你手动构造一份 feedback 含"评分失败"的 record）。

主持人当天会设置真实 API key 跑一遍 demo 让"评分失败"自然出现。学员开发时可以：

- 用 seed 的 `张高分 / 李及格 / 王挂科` 答卷验证 dashboard / 详情页（Task 1 + 3）
- 验证 Task 2 时手动改 `seed.ts` 加一份带 `"评分失败"` feedback 的记录

## 重评辅助函数

`lib/grading.ts` 暴露了 3 个面向 admin 的辅助函数（**Task 2 用第 3 个**）：

| 函数 | 干什么 | 已有 API route |
|---|---|---|
| `rescoreExam(exam)` | 按当前题目分值重算（不调 LLM） | `/api/admin/rescore-all` |
| `fillMissingObjectives(exam)` | 给所有未作答的客观题补满分 | `/api/admin/fill-missing` |
| **`regradeFailedQuestions(exam)`** | **重跑所有 feedback 含"评分失败"的题** | **❌ workshop task 2** |

`regradeFailedQuestions` 已经实现完整：扫描 scores 找出失败题、并发调用 LLM、写回新分数。**你只需要写一个 6-10 行的 route handler 来 wire 它。**

返回结构：

```ts
{
  attempted: number;       // 共扫到几道失败题
  recovered: number;       // 这次重评恢复了几道
  stillFailing: string[];  // 重评后仍失败的题 id 列表
  scoreDelta: number;      // 总分变化（通常为正）
}
```

## 失败题识别口径

`feedback?.includes("评分失败")` —— 就这一条。

⚠️ **不要**用 `score === 0` 判定失败——客观题答错也是 0，简答题未作答也是 0，都不是"评分失败"。
