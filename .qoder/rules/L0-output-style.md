---
name: L0-output-style
alwaysApply: true
description: "始终生效 · 全局输出风格 / 命名 / TypeScript 严格度。任何任务都不应违背。"
layer: L0
---

# L0 · 输出与协作风格（始终生效）

> Rules 体系按 **L0 通用 → L1 技术栈 → L2 业务域 → L3 工作流** 分层，本条是 L0。
> 详见 [.ai/rules/README.md](./README.md)。

## 沟通

- 用**中文**回答用户。但代码标识符、文件路径、API 名称保持英文原文。
- 解释方式：**先结论，再步骤**——不要先讲一大段背景。
- 不确定的需求**先问，不要直接动手**——参考 `/think` Skill 的"待确认问题"段。

## 命名

- 组件文件 `PascalCase.tsx`：`ClearDataButton.tsx`
- 工具 / 路由文件 `kebab-case.ts` 或框架约定的 `page.tsx` / `route.ts`
- 变量 / 函数 `camelCase`；常量 / 类型 `PascalCase`
- API 路由用动词在末尾：`/api/admin/regrade`、`/api/admin/clear`

## TypeScript

- 严格模式（`tsconfig.json` 已 `strict: true`）
- 不引入 `any`——拿不准类型用 `unknown` 再 type narrow
- 路径别名 `@/`：`import { x } from "@/lib/kv"`，不要相对路径 `../../../`
- 异步函数返回 `Promise<T>` 显式写出

## 输出代码

- 优先给"**最小 diff + 验证步骤**"，避免大段背景说明
- 改完明确告诉用户：改了哪些文件、怎么验证、还有哪些风险
- **不要在 PR 里顺手优化无关代码**——workshop 任务范围有限，scope creep 必拒
