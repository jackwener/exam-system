---
name: admin-auth
description: "管理员鉴权机制：HMAC-SHA256 签名 cookie + proxy.ts 路由拦截。涉及创建 admin 路由 / page、或要从 admin 路由读 cookie 时读取。"
---

# 管理员鉴权机制

## 整体思路

不用 NextAuth / Clerk 这类完整方案——workshop 场景下密码 + 签名 cookie 就够了。

```
浏览器                Next.js
   │
   │  POST /api/admin/auth  {password}
   │ ─────────────────────────────────>
   │                                 校验 process.env.ADMIN_PASSWORD
   │                                 通过则签发 HMAC-SHA256 cookie
   │  Set-Cookie: admin_session=...   ←───── 24h 有效
   │
   │  GET /admin/dashboard
   │ ─────────────────────────────────>
   │                                 proxy.ts 拦截 → 验证 cookie 签名
   │                                 通过则放行 / 失败 302 /admin/login
   │  HTML response
   │ <─────────────────────────────────
```

## 关键文件

- `lib/auth.ts` —— `signSession()` / `verifySession()` 实现
- `proxy.ts` —— Next.js 中间件（注意：Next.js 16 把 middleware 改名为 proxy），拦截 `/admin/**` 和 `/api/admin/**`
- `app/api/admin/auth/route.ts` —— 登录 POST endpoint
- `app/admin/login/page.tsx` —— 登录页

## Cookie 结构

```
admin_session = <expireAt>:<base64url-hmac>
```

- `expireAt` —— 毫秒时间戳，签名时 `Date.now() + 24*60*60*1000`
- HMAC key 来自 `process.env.ADMIN_PASSWORD`（密码即密钥，简单粗暴）

## 默认密码

```bash
ADMIN_PASSWORD=workshop2026  # 不设也是这个值
```

修改密码会让所有现存 cookie 立即失效。

## 你（Coding Agent）应该 / 不应该做什么

### ✅ 应该

- 新增 admin 路由时**不需要**自己写鉴权——`proxy.ts` 已经拦截了所有 `/admin/**` 和 `/api/admin/**`
- 想知道当前用户是否已登录？在 server component / route handler 里：

  ```ts
  import { cookies } from "next/headers";
  import { verifySession } from "@/lib/auth";

  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session")?.value;
  const valid = session ? verifySession(session) : false;
  ```

  但通常**根本不需要**——能跑到这段代码说明已经被 proxy 放行了，必定登录。

### ❌ 不应该

- **不要**在你新写的 admin route 里重新校验密码——proxy 已经做过了，重复校验是冗余
- **不要**把 `ADMIN_PASSWORD` 暴露在 client component（不要 `process.env.ADMIN_PASSWORD` 出现在 `"use client"` 文件）
- **不要**改 cookie 名 `admin_session`——前后端都依赖它，改了会断
- **不要**改 HMAC 算法或 cookie 格式——会让所有现存 cookie 失效（虽然 workshop 重启会清空，但还是不要随便改）

## 登出

没有显式登出按钮——cookie 24h 过期是唯一退出机制。如果学员想加登出，简单地：

```ts
// app/api/admin/logout/route.ts
import { cookies } from "next/headers";

export async function POST() {
  (await cookies()).delete("admin_session");
  return Response.json({ ok: true });
}
```

但这**不是 workshop 任务之一**，是否要做看学员自己 scope creep 偏好（建议不做，集中在 3 个核心任务）。
