# Qoder Sub-Agents · 专家团

这里是 4 个角色化 sub-agent，每个对应一个专业视角。配合 Qoder 的「专家团模式 / 自定义 sub-agent」使用。

参考培训分享的 [`content/qoder-experts.md`](../../content/qoder-experts.md)（或线上 slides 第 21 页 "Qoder 专家团"）。

## 4 个角色

| 角色 | 视角 | 触发场景 |
|---|---|---|
| [designer](./designer.md) | 交互流程 / 信息架构 / 可用性 / 一致性 | 新增页面 / 改交互 |
| [fe-architect](./fe-architect.md) | 组件拆分 / 状态边界 / 性能 / a11y | 改 .tsx / 组件设计 |
| [be-architect](./be-architect.md) | API 契约 / 数据流 / 并发 / 可观测 | 新增 API / 改数据形态 |
| [devops-architect](./devops-architect.md) | CI / 配置 / 容量 / 灰度 / 回滚 / 告警 | 任何变更上线前 |

## 协作流程

```
需求
  ↓
Designer 出交互草案
  ↓
FE / BE Architect 平行展开（API 契约 + 组件方案）
  ↓
DevOps Architect 最后审视（回滚 / 容量 / 配置）
  ↓
跨角色 review（每个角色看其他角色的输出，挑刺）
  ↓
开发实施
```

## Frontmatter 格式（Qoder sub-agent 标准）

每个 sub-agent 的文件头：

```yaml
---
name: <unique-id>             # 必填，kebab-case
description: "..."            # 必填，描述何时调用此 agent
tools: Read, Grep, Glob, Bash # 可选，逗号分隔
skills:                       # 可选，agent 可调用哪些 Skill
  - think
  - check
mcpServers:                   # 可选
  - <server-name>
---

[此处是 system prompt 内容]
```

## 为什么用角色化而不是一个万能 Agent

- **视角稀疏性**：单次推理同时考虑 UX / 性能 / 数据 / 灰度几乎不可能——拆开让每个维度被深度照顾
- **Skill / Rules 作用范围**：一份长长的 AGENTS.md 注意力被稀释；角色专属 prompt 反而稳定
- **审视的独立性**：自己 review 自己的方案拿不到价值反馈；跨角色 review 才有独立性

## 防止过度设计的约束

- ❌ 不要再加角色（4 个已经够，再加沟通成本 > 收益）
- ❌ 不要让角色们走形式（每个 review 必须输出至少 3 条具体质疑）
- ❌ 不要把角色当 RPG 扮演（起名 / 配头像 / 装"性格"对工程产出无帮助）

详见培训文档 [`content/qoder-experts.md`](../../content/qoder-experts.md)。
