---
name: admin-only
alwaysApply: false
globs: app/admin/**,app/api/admin/**
description: "改 admin 路径下的代码时额外加载：UI 一致性、API 返回结构、鉴权边界。"
---

# Admin 模块专属约束

## UI 一致性

`app/admin/**` 下的页面已经有一套现成的风格：

- **layout**：所有 admin page 都通过 `app/admin/layout.tsx` 加载 `AdminSidebar` —— 新页面**不要重写 layout**
- **卡片**：用 `bg-surface border border-border rounded-lg shadow-sm` 这套 class
- **表格**：参考 `app/admin/dashboard/page.tsx` 的 `<table>` 写法（border-collapse + uppercase header）
- **分数颜色**：≥ 80 用 `--success`，60-80 用 `--warning`，< 60 用 `--error`（已有 `ScoreBadge` 组件，复用）
- **字体**：数字 / id / 时间统一用 `font-mono`

设计 token 在 `app/globals.css` 里：`--surface` / `--surface-2` / `--border` / `--accent` / `--accent-soft` / `--text-faint` 等。**直接用 token，不要写裸 hex 颜色**。

## API 返回结构

所有 admin API 用统一的 JSON 形态：

```ts
// 成功
return Response.json({ ok: true, ...payload });

// 失败
return Response.json({ ok: false, error: "..." }, { status: 4xx });
```

调用方约定：先看 `ok`，再读 payload。**不要**直接用 HTTP status code 判定（403 / 404 等保留给框架层）。

## 鉴权（重复一次以确保不漏）

- **不要**在 admin route handler 里校验密码——`proxy.ts` 已经拦截了
- 但 server component 想拿到登录态的元信息（如登录时间）时，可以读 `cookies().get("admin_session")` 解析，**只读不改**

## 不要碰的部分

- ❌ `proxy.ts` —— 鉴权中间件，工作流依赖它
- ❌ `lib/auth.ts` —— HMAC 签名实现
- ❌ `lib/grading.ts` 的核心函数（`gradeExam` / `gradeSubjectiveQuestion`）—— 只新增 route handler 调用即可
- ❌ `lib/kv.ts` 的导出 API 签名——新增的 admin 功能用现有 API 组合而非加新方法

## 命名

- API route 用动词 + 复数名词：`/api/admin/exams/[id]/regrade`（如果做 RESTful）或动词在末尾：`/api/admin/regrade`（POST body 带 id）
- workshop 任务 2 用后一种（更简单）

## 错误处理

- route handler 必须 try/catch 外层调用——`regradeFailedQuestions` 本身不抛错，但 `getExam` 可能返回 null
- null exam → return `{ ok: false, error: "考试不存在" }` with status 404
- 不要 console.error 后默默 return 200——会让 dashboard 上看不出问题
