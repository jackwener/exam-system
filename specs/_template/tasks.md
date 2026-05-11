# Tasks · {{需求名}}

> 把整个需求**拆成可勾选的小 task**，每条目标 30 分钟内完成。
> Agent 一次只做一个 task——避免上下文爆炸。

## Checklist

- [ ] **T1**：创建 route handler `app/api/admin/regrade/route.ts`
  - 验证 examId
  - 调 `getExam(examId)` 拿 record
  - 调 `regradeFailedQuestions(exam)` 拿结果
  - 返回 `{ ok: true, ...result }`
  - 错误处理：missing / not-found / 500

- [ ] **T2**：写 client component `components/RegradeButton.tsx`
  - props: `examId: string` 或 `hasFailedScores: boolean`
  - onClick fetch POST `/api/admin/regrade`
  - loading 状态 + 完成后 toast
  - 参考 `components/ClearDataButton.tsx` 的写法

- [ ] **T3**：把按钮接进 dashboard
  - 替换 dashboard 上的 disabled 占位按钮
  - 只在有"评分失败"题的 exam 上 enable（可选优化）

- [ ] **T4**：手测全流程
  - 用真实 LLM 跑一次 exam，故意制造失败（如断网后重连）
  - 或者：暂时改 seed.ts 加一份带"评分失败" feedback 的 record
  - 点按钮，确认重评成功 / 分数更新

- [ ] **T5**：写 gotcha 到 `.qoder/business-logic/gotchas.md`
  - 本次踩坑：mock 模式下 feedback 永远不含"评分失败"
  - 防回归：未来 Loop 验证类需求要意识到 mock vs real 的语义差异

## 进度记录

- 当前在做：T1
- 已完成：（无）
- 阻塞：（无）

更详细的当前状态见 [progress.md](./progress.md)。
