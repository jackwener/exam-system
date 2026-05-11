---
name: always-applied
alwaysApply: true
description: "始终生效的全局约束：输出语言、命名风格、不要绕开 proxy 鉴权、不要装新依赖。"
---

# 全局约束（始终生效）

## 沟通

- 用**中文**回答用户，但保持代码标识符、文件路径、API 名称为英文原文
- 解释方式：**先结论，再步骤** —— 不要先讲一大段背景
- 遇到不确定的需求：**先提问，不要直接动手**

## 代码风格

- TypeScript 严格模式（项目 `tsconfig.json` 已经 `strict: true`）
- 不引入 `any`——拿不准类型就用 `unknown` 然后 type narrow
- 路径别名用 `@/` —— `import { x } from "@/lib/kv"`，不要相对路径 `../../../`
- 文件命名：
  - 组件文件 `PascalCase.tsx`（如 `ClearDataButton.tsx`）
  - 工具 / 路由文件 `kebab-case.ts` 或路由约定的 `page.tsx` / `route.ts`

## 服务端 / 客户端组件

- **默认 server component**——只在需要 `useState` / `onClick` / 浏览器 API 时加 `"use client"`
- server component 里**不要**用 `useEffect` / `useState`（会报错）
- 跨边界传 props 时**只传可序列化数据**（不要传函数 / class 实例）

## 数据访问

- 所有存储访问走 `lib/kv.ts`——**不要**直接读写 `globalThis.__examStore`
- 读 exam record 用 `getExam(id)`、列表用 `listExams()`、保存用 `updateGrading()`
- 不要新建 `lib/store.ts` / `lib/db.ts` —— workshop 不要引入新的存储抽象层

## 依赖

- **不要**装新依赖（除非用户明确同意）。workshop 范围内现有依赖足够。
- 特别**不要**装：
  - Prisma / Drizzle / TypeORM（workshop 用内存 Map）
  - 任何图表库（recharts / echarts / chart.js）—— Task 3 用纯 CSS 即可
  - 任何鉴权库（NextAuth / Clerk / Auth.js）—— `proxy.ts` 已经够了
  - swr / react-query —— 用原生 `fetch` 即可

## 鉴权

- **不要**在 admin 路由里重新校验密码——`proxy.ts` 已经做了
- **不要**修改 `proxy.ts` 的 matcher 配置——会影响所有 admin 路径

## 输出代码

- 优先给"**最小 diff + 验证步骤**"，避免大段背景说明
- 改完明确告诉用户：改了哪些文件、怎么验证
- 不要在 PR 里顺手优化无关代码——workshop 任务范围有限，scope creep 必拒
