# Design · {{需求名}}

> 这个文件回答：**准备怎么实现？**
> 比 proposal 更技术，但比代码更高层。重点在**关键决策**和**边界 case**。

## Architecture

整体架构 / 数据流。用 ASCII 图或简单描述。

```
dashboard 按钮 (client component)
   ↓ POST /api/admin/regrade { examId }
proxy.ts 鉴权
   ↓
route handler
   ↓ getExam(examId)  (lib/kv.ts)
   ↓ regradeFailedQuestions(exam)  (lib/grading.ts)
   ↓
返回 { ok, attempted, recovered, stillFailing, scoreDelta }
   ↓
dashboard 弹 toast + 刷新分数
```

## API Changes

新增 / 修改 / 删除哪些接口？请求 / 响应 schema 写清楚。

### POST /api/admin/regrade

**Request body**:

```json
{ "examId": "string (required)" }
```

**Response 200**:

```json
{
  "ok": true,
  "attempted": 3,
  "recovered": 2,
  "stillFailing": ["sa2"],
  "scoreDelta": 8
}
```

**Errors**:

- 400 `examId` 缺失
- 404 exam 不存在
- 500 内部异常（含 `error: string`）

## Data Changes

涉及哪些字段 / 表 / 状态变化？

- 修改：`ExamRecord.grading.scores[qid]` 的失败题 score / feedback
- 修改：`ExamRecord.grading.totalScore` 和 `breakdown`（重算）
- 不涉及：新增字段 / 删除字段 / schema 变更

## State Changes

如有状态机，画出来。

- exam 必须在 `status: "completed"` 才能重评（pending / grading 状态不允许）
- 重评后 status 保持 `"completed"`，不回退到 `"grading"`

## Edge Cases

至少列 3 条**容易遗漏**的边界。

- 没有任何"评分失败"题的 exam → `attempted: 0, recovered: 0, scoreDelta: 0`（不报错）
- exam 不存在（手 URL 调参） → 404 + 明确错误
- 并发重评：同一 exam 同时 N 次调用 → 当前用 in-memory 不防护，记 TODO 留生产场景再处理
- mock 模式：mock 不会产生"评分失败" feedback，所以重评通常找不到目标——这是预期行为

## Rollback Plan

如果上线后发现问题，怎么回退？

- 改动只在前端按钮 + 后端 route + 不动核心 grading 逻辑
- 回滚 = `git revert <commit>` + 重启 dev server
- 不需要数据迁移（评分数据可以被新调用覆盖）

## 不在 design 阶段决定的事

下面的留给 implementation 阶段决定：

- 按钮的具体颜色 / 像素
- toast 用什么库（直接 alert 也行）
- error message 的精确文案
