---
name: L1-frontend
alwaysApply: false
globs: app/**/*.tsx,components/**/*.tsx
description: "前端约束 · 改 .tsx 文件时生效。Server vs Client component 边界、Tailwind token、表格 / 卡片样式一致性。"
layer: L1
---

# L1 · 前端约束（改 .tsx 时生效）

## Server 组件优先

- **默认 server component**——只在需要 `useState` / `onClick` / 浏览器 API 时加 `"use client"`
- server component **不要**用 `useEffect` / `useState`（构建会报错）
- 跨边界传 props **只传可序列化数据**（不要传函数 / class 实例）
- 数据获取在 server component 里直接 `await getExam(id)`，不要写 client-side fetch

## 样式系统（Tailwind v4 token）

`app/globals.css` 已经定义了一套 token，**用 token 不要写裸 hex**：

| 用途 | token |
|---|---|
| 背景层 | `bg-surface` / `bg-surface-2` |
| 边框 | `border-border` / `border-border-subtle` |
| 文本主 / 次 / 弱 | `text-text` / `text-text-secondary` / `text-text-muted` / `text-text-faint` |
| 强调色 | `text-accent` / `bg-accent-soft` |
| 状态色 | `text-[var(--success)]` / `text-[var(--warning)]` / `text-[var(--error)]` |
| 状态背景 | `bg-[var(--success-soft)]` / 类似 |

## 一致性

- **卡片**：`bg-surface border border-border rounded-lg p-4 shadow-sm`
- **表格**：参考 `app/admin/dashboard/page.tsx` 的写法
  - `border-collapse w-full`
  - thead：`bg-surface-2 border-b border-border` + 列名 `uppercase tracking-wider text-text-faint text-[11px]`
  - tbody 行：`border-b border-border-subtle last:border-b-0 hover:bg-surface-2`
  - 单元格 `px-3.5 py-2.5 text-[13px]`
- **数字 / id / 时间**统一用 `font-mono`
- **分数颜色**复用 `dashboard/page.tsx` 里的 `ScoreBadge` 组件（≥80 success / ≥60 warning / <60 error）

## Admin 页面

- `app/admin/**` 所有 page 通过 `app/admin/layout.tsx` 自动加载 `AdminSidebar`，**不要重写 layout**
- 新页面也**不要**自己包 `AdminSidebar`——layout 会处理
- sidebar 导航项加在 `components/AdminSidebar.tsx` 的 `navItems` 数组里

## Client 组件

- 只有真正需要交互的部分声明 `"use client"`，并放在 `components/` 目录
- 参考 `components/ClearDataButton.tsx` 是一个干净的 client component 例子
- Client 组件 **不要**直接 import server-side lib（`lib/kv.ts` 之类）——通过 fetch 调 API
