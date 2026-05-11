---
name: summary
description: session 结束时总结本次做了什么 / 没做完什么 / 关键决策 / 下一步从哪继续。用于写 commit body、更新 spec progress.md、交接给下一个 session。每个有产出的 session 结束前都该跑一次。
---

# /summary · session 结束的标准化总结

## 使用场景

- 任务做完 / 卡住 / 时间到——session 即将结束
- 准备 commit 但想要一份**结构化的 commit body**
- 准备更新 `specs/2026-xx-xxx/progress.md`
- 准备交接给同事 / 下一次会话的自己

**每个有实质产出的 session 结束前都应该跑一次**——5 分钟成本，让团队记忆不丢失。

## 目标

把"刚刚 30 分钟里发生的事"凝结成**可粘贴到 4 个地方**的结构化总结：

1. Commit message body（解释 why & how）
2. Spec 的 `progress.md`（下次会话恢复入口）
3. PR / MR 描述
4. 给同事的口头/文字交接

避免"我做完了 Task 1"这种**对接手者无用**的总结。

## 必须步骤

### 1. 读 git status / git diff / commit log

```bash
git status
git diff --stat
git log --oneline @{1.hour.ago}..HEAD  # 或本 session 开始 commit 以来
```

确认本次的实际产出物，不要凭印象写。

### 2. 区分"完成"与"未完成"

完成 ≠ "我觉得差不多了"——必须满足任务的 Done 标准。如果不满足，写到"未完成"段。

### 3. 提炼关键决策

本次过程中做了哪些"以后可能被推翻 / 被反复讨论"的决策？例如：

- 选了方案 A 而不是 B
- 决定不引入某个依赖
- 用某种数据结构表达某个概念

这些应该同步进 `specs/xxx/decisions.md`——summary 里只列条目，详细决策放 decisions.md。

### 4. 列出"下次该做什么"

接手者最需要的信息：**下一秒该敲什么命令 / 改什么文件**。具体到操作粒度，不要"继续后续 task"。

### 5. 列出"待确认的开放问题"

本次没能定下来、等用户 / 同事拍板的问题。

### 6. 输出多版本（按目标用途裁剪）

为下面 3 个场景各裁出一份：

- **commit body 版**（< 10 行，列要点）
- **progress.md 版**（结构化，含 Last Session / Next Step / Blockers / Open Questions）
- **口头交接版**（3 句话讲清楚）

## 禁止事项

- ❌ 不允许只说"完成了 Task X"——必须列**具体 commits / 改了哪些文件 / 关键变更点**
- ❌ 不允许凭印象写——必须先读 git diff / log
- ❌ 不允许把过程性日志（debug 折腾了一小时）当成 summary 内容
- ❌ 不允许遗漏"已发现但本次没处理"的问题——它们应该在"Open Questions"段

## 输出格式

```markdown
## ✅ 做完了什么
- T1 答卷详情页：新增 `app/admin/exam/[id]/page.tsx`（38 行）
  - 用 `getExam(id)` 拉数据
  - 客观题/简答题分组展示，未作答题显示"未作答"
  - commits: `abc1234`, `def5678`

## ⏳ 没做完
- T1 的 score breakdown 颜色：当前都是默认色，没接 ScoreBadge

## 💡 关键决策
- 用 server component 直接读 kv，不引入新 API endpoint
  → 详见 `specs/2026-05-task-1/decisions.md` D1

## ▶ 下次从哪继续
1. `cd app/admin/exam/[id]/`
2. 把第 42 行的 `<span>{score}</span>` 换成 `<ScoreBadge score={score} />`
3. import 一下 ScoreBadge（参考 dashboard/page.tsx:6）

## ❓ 待确认的开放问题
- 未作答的客观题：要显示"未作答"还是"-"？（用户没明确）

---

## Commit body 版

```text
T1: 实现答卷详情页

- server component 直读 kv，无新 API
- 客观/简答分组展示
- 未作答兜底为"未作答"

未完：ScoreBadge 接入（明天做）
```

## 交接 3 句话

"T1 完成了主结构和数据展示。剩下 ScoreBadge 接入还没做（位置：app/admin/exam/[id]/page.tsx:42）。
有个待确认问题：未作答客观题的占位文案。"
```

## 与其他 Skill 的关系

- 完成实施 → [`/check`](../check/SKILL.md) → [`/summary`](#) → 提交
- summary 里发现的"踩坑"用 [`/record-gotcha`](../record-gotcha/SKILL.md) 沉淀
- summary 输出的 progress.md 段直接覆盖 `specs/xxx/progress.md`
