---
name: L1-backend
alwaysApply: false
globs: app/api/**/*.ts,lib/**/*.ts
description: "后端约束 · 改 API route / lib 时生效。API 返回结构、错误处理、不重做鉴权、不绕开 kv 抽象。"
layer: L1
---

# L1 · 后端约束（改 API / lib 时生效）

## API 返回结构

所有 admin API 用统一形态：

```ts
// 成功
return Response.json({ ok: true, ...payload });

// 失败
return Response.json({ ok: false, error: "可读的错误描述" }, { status: 4xx });
```

调用方约定：**先看 `ok`，再读 payload**。HTTP status code 保留给框架层语义（404 = 路由不存在；401 = proxy 鉴权失败；500 = 未捕获异常）。

## 错误处理

- Route handler **必须**外层 try/catch
- `getExam(id)` 可能返回 `null`：null → `{ ok: false, error: "考试不存在" }` with `status: 404`
- 不要 `console.error` 后默默 return 200——dashboard 上看不出失败

```ts
export async function POST(request: Request) {
  try {
    const { examId } = await request.json();
    if (!examId) {
      return Response.json({ ok: false, error: "examId is required" }, { status: 400 });
    }
    const exam = await getExam(examId);
    if (!exam) {
      return Response.json({ ok: false, error: "exam not found" }, { status: 404 });
    }
    // ... 实际逻辑
    return Response.json({ ok: true, ...result });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown error" },
      { status: 500 }
    );
  }
}
```

## 鉴权（再强调一次）

- `/admin/**` 和 `/api/admin/**` 已经被 `proxy.ts` 拦截
- 你**不要**在 admin route 里再做密码 / cookie 校验——proxy 已经做过了
- 不要 import `lib/auth.ts` 在 admin route 里——除非你有特殊需求（例如读 cookie 元信息）

## 存储访问

- 所有读写都通过 `lib/kv.ts` 导出函数：`getExam` / `listExams` / `updateGrading` / `clearAllExams` / `createExam` / `saveAnswer` / `submitExam`
- **不要**直接读写 `globalThis.__examStore`
- **不要**新增 `lib/store.ts` / `lib/db.ts`——用现有 API 组合，不要叠加层

## 评分相关

- `lib/grading.ts` 已经提供 3 个面向 admin 的辅助函数（详见 [.ai/business-logic/grading-pipeline.md](../business-logic/grading-pipeline.md)）：
  - `rescoreExam(exam)`
  - `fillMissingObjectives(exam)`
  - `regradeFailedQuestions(exam)` ← Task 2 用这个
- 这些函数已经实现完整，**你只需要写薄薄一层 route handler 调用它们**

## 命名

- POST 用动词：`/api/admin/regrade`、`/api/admin/clear`
- GET 用名词：`/api/admin/export`、`/api/admin/stats`（若 Task 3 选 API + page 模式）
- 不要为了 RESTful 而过度设计：`/api/admin/exams/[id]/regrade` 反而比 `/api/admin/regrade` (body 带 id) 复杂
