# Specs · Agent 长期任务状态机

按培训分享 `content/spec.md` 的方法落地。每个需求 / 任务**单独建一个目录**，里面 5 个文件：

```
specs/
  _template/              # 复制这个开新 spec
    proposal.md           # 目标 / Non-Goals / 范围 / 风险
    design.md             # 技术方案 / Edge Cases / Rollback
    tasks.md              # 拆成可勾选的 checkpoint
    progress.md           # 当前 session 的真实状态
    decisions.md          # 已锁定的决策（不再讨论）

  # 学员实际工作时会创建：
  2026-05-task-1-exam-detail/
  2026-05-task-2-regrade/
  2026-05-task-3-stats/
```

## 怎么开新 spec

```bash
cp -r specs/_template specs/2026-05-task-N-{slug}/
```

然后：

1. **先填 proposal.md** —— Goal 一句话写清楚，Non-Goals 至少列 2 条
2. **再填 design.md** —— 包含 Rollback Plan
3. **拆 tasks.md** —— 每条 30 分钟内能完成的小任务
4. **开始干** —— 每完成一个 task：勾掉 tasks.md + 更新 progress.md
5. **任何决策** —— 写进 decisions.md，避免反复推翻

## 关键原则

| 原则 | 为什么 |
|---|---|
| Spec **不只是文档**，是 Agent 的 runtime state | 每次 session 启动先读 spec 恢复上下文 |
| Non-Goals 是**最关键的** 字段 | 阻止 Agent scope creep（顺手优化无关代码） |
| **每次 session 结束必须更新 `progress.md`** | 否则下次 session 完全失忆 |
| Review 必须**对照 spec** | 不是只看代码，还要看是否超 scope、漏 edge case |

## Workflow

```
需求
  ↓
proposal.md      （定义目标 / Non-Goals / 风险）
  ↓
design.md        （技术方案 + Rollback）
  ↓
tasks.md         （拆 checkpoint）
  ↓
Agent 实现单个 task
  ↓
/check 验证
  ↓
更新 progress.md
  ↓
下一个 task
```

## 与 Qoder 工具的关系

Qoder 自带 Quest 模式，运行时生成 Spec（流式输出可下载）。本目录是**手工 commit 进 git** 的 Spec，让 Spec 成为团队共享状态而不是个人下载档案。

两者可以并存：

- Quest 用于探索性工作（"帮我研究下 xxx 应该怎么做"）
- 本目录用于团队共识 + 长周期协作（"我们要做 xxx，跟进 2 周"）

## 反例（不要这样写 spec）

❌ 一个 README.md 里塞下所有内容 —— 没法独立 review，没法增量更新

❌ 不写 Non-Goals —— Agent 一定 scope creep

❌ progress.md 只在最后写 —— 中途中断必失忆

❌ 把 decisions.md 当 changelog —— 它的目的是**锁定**决策，不是记录历史

详见 [`content/spec.md`](../content/spec.md)（培训正文）。
