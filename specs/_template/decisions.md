# Decisions · {{需求名}}

> 这个文件是**已经定下来、不再讨论**的决策清单。
> 作用：防止 Agent / 新成员**反复推翻**已有决策（"我觉得用 X 更好"——但 X 已经被讨论否定过）。

## 决策模板

每条决策按下面格式记：

```markdown
## D1 · 标题

**Decision**：
（一句话说定了什么）

**Why**：
（为什么这么定。列 1-3 条核心理由）

**Alternatives considered**：
（讨论过的其他方案 + 为什么没选）

**Status**：
（active / superseded by D## / deprecated）

**Decided at**：
2026-05-11 by @owner
```

---

## 实际例子（参考）

## D1 · 不在 regrade route 里加并发锁

**Decision**：

`/api/admin/regrade` 不做并发去重——同一 exam 同时被 N 次调用就跑 N 次。

**Why**：

- workshop 场景单机单进程，并发概率极低
- 加 in-memory lock 会引入新的复杂度
- 真生产场景应该用 DB / Redis 级别的锁，不是 in-memory

**Alternatives considered**：

- Map<examId, Promise> 做 in-flight 去重 → 否决：生产环境会失效
- DB unique constraint → workshop 没 DB
- 完全不解决 → ✓ 当前选择

**Status**：active

**Decided at**：2026-05-11 by @backend-architect

---

## D2 · 重评后 status 保持 completed，不回退到 grading

**Decision**：

重评过程中 status 不变（依然 `completed`），不像首次评分一样切到 `grading`。

**Why**：

- 前端不需要重新轮询 status（重评是同步返回结果）
- 避免 dashboard 上"被重评中的 exam 突然消失"（filter 条件是 `status === completed`）
- 重评失败时也保持 completed，避免数据状态混乱

**Alternatives considered**：

- 临时设 `status: regrading` 再恢复 → 否决，前端要适配新状态，太重
- 异步触发 + 状态机变化 → 否决，重评本身很快，没必要异步

**Status**：active

**Decided at**：2026-05-11 by @backend-architect

---

> **不允许**在不写"supersedes D##" 的情况下推翻旧决策。
> 如果方案要变，先看这个文件，再决定是"推翻 D# 并标记 superseded"还是"找到 D# 没考虑到的新约束"。
