---
name: L0-protect-core
alwaysApply: true
description: "始终生效 · 项目核心文件 / 不应被学员触碰的代码 / 不应新引入的依赖。"
layer: L0
---

# L0 · 保护核心（始终生效）

workshop 是「在已有架构上加功能」，不是重写。下面这些**绝对不要碰**。

## 不要碰的文件

| 文件 | 为什么 |
|---|---|
| `proxy.ts` | Next.js 16 路由拦截，鉴权依赖它。改了所有 admin 路由都会失效 |
| `lib/auth.ts` | HMAC 签名实现，工作正常无需改 |
| `lib/grading.ts` 中的 `gradeExam` / `gradeSubjectiveQuestion` / `mockGrade` | 评分核心，学员的任务只需 **wire 已有辅助函数**，不需重写 |
| `lib/kv.ts` 中的导出函数签名 | 改了所有调用方都会断 |
| `lib/questions.ts` / `lib/answers.ts` | 题库 / 标答，是给学员考试用的"考试内容"——不要改 |
| `lib/seed.ts` | 演示数据，改了 dashboard 就空了 |

## 不要装的依赖

- ❌ `prisma` / `drizzle` / `typeorm` —— workshop 用内存 Map 就够
- ❌ `ioredis` / `redis` —— 已经移除，不要加回去
- ❌ `recharts` / `echarts` / `chart.js` —— Task 3 用纯 CSS（div + width%）即可
- ❌ `next-auth` / `clerk` / `@auth/core` —— proxy.ts 已经够了
- ❌ `swr` / `@tanstack/react-query` —— 原生 `fetch` 即可
- ❌ `axios` —— 原生 `fetch` 即可

## 不要做的事

- ❌ 修改 `tsconfig.json` 关闭 strict（任何"为了让它编译过去"的关闭都拒绝）
- ❌ 在 admin route 里再写一次密码校验（proxy.ts 已经做了）
- ❌ 直接读写 `globalThis.__examStore`（必须经过 `lib/kv.ts` 导出的 API）
- ❌ 改 cookie 名 `admin_token` / HMAC 算法（前后端都依赖固定形态）
