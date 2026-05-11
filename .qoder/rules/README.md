# Rules 体系（Rules 2.0）

按培训分享的 **L0-L3 四层分层 + 四种生效方式** 组织。

## 四层

| 层 | 解决什么 | 推荐生效方式 |
|---|---|---|
| **L0** 协作 / 输出规范 | 所有任务都要一致：输出语言、命名、代码风格 | 始终生效（alwaysApply: true）|
| **L1** 技术栈 / 工程规范 | 某个子项目内要一致：前端 / 后端约束 | 指定文件生效（globs）|
| **L2** 业务 / 领域规则 | 某个业务域里不能踩坑：评分逻辑、状态机 | 智能生效（description 触发）|
| **L3** 工作流 / SOP | 偶发但高价值：发布 / 回滚清单 | 手动触发（#mention）|

## 当前 Rule 清单

| 文件 | 层 | 生效方式 | 范围 |
|---|---|---|---|
| `L0-output-style.md` | L0 | always | 全局 |
| `L0-protect-core.md` | L0 | always | 全局 |
| `L1-frontend.md` | L1 | globs | `app/**/*.tsx`, `components/**/*.tsx` |
| `L1-backend.md` | L1 | globs | `app/api/**/*.ts`, `lib/**/*.ts` |
| `L2-grading-domain.md` | L2 | description | 评分 / 重评 / 答卷场景 |
| `L3-release.md` | L3 | 手动 | 用户明确 #mention 才生效 |

## Frontmatter 约定

每个 Rule 文件头部都有 YAML frontmatter：

```yaml
---
name: <unique-id>              # 用 kebab-case
alwaysApply: true | false      # L0 用 true，其他用 false
globs: <glob1>,<glob2>         # L1 用，逗号分隔
description: "..."             # L2 智能触发的关键词；其他层也建议写
layer: L0 | L1 | L2 | L3       # 标记层级，方便人读
---
```

不同 Coding Agent 工具读取这些字段的方式可能略有差异（Cursor / Qoder / Claude Code 等），但**核心三个语义统一**：

- **alwaysApply: true** → 每次会话都加载
- **globs: ...** → 只在改这些文件时加载
- **description + alwaysApply: false + 无 globs** → 让 Agent 根据描述决定何时加载

## 治理原则

1. **能圈范围就不要写成全局**——能用 L1 别放 L0
2. **能作为流程就不要混进工程规范**——L3 SOP 不要塞进 L0 always
3. **个人偏好不要塞进项目规则**——放 User Rule（你的 Coding Agent 设置里）
4. **持续把任务带偏的 Rule = 噪音源**——优先降级到 L2 智能或 L3 手动

详见培训文档 `content/rules.md`（培训 slides 配套）。
