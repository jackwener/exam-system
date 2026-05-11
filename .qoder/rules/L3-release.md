---
name: L3-release
alwaysApply: false
description: "发布 / 回滚检查清单 · 高风险流程，默认不生效。只在用户明确 #mention 或说"发布前检查"、"回滚预案" 时手动触发。"
layer: L3
---

# L3 · 发布 / 回滚 SOP（手动触发）

> 这条 Rule 是高风险 / 高成本 / 误触发会严重干扰的内容，
> **默认不生效**——只在用户明确说"做发布前检查"、"准备回滚"等场景手动触发。
>
> workshop 内部不会用到，**主要作为"L3 手动触发 Rule"的演示样本**给学员看一种 Rule 形态。

## 发布前 Checklist

### 代码层

- [ ] 所有 task 的 spec.tasks.md 都已勾完
- [ ] `pnpm lint` 无 warning
- [ ] `pnpm build` 成功（注意 Next.js 16 + React 19 的 strict 模式可能新增 lint 错）
- [ ] `tsc --noEmit` 无错
- [ ] 至少手测一次：开考 → 答题 → 提交 → 看 mock 评分 → 管理员看 dashboard

### 配置层

- [ ] `.env.local` 已就位（生产环境 `ADMIN_PASSWORD` 必须不是默认值 `workshop2026`）
- [ ] `ANTHROPIC_API_KEY` 已配置（如果要用真实 LLM 评分）
- [ ] `ANTHROPIC_BASE_URL` 已配置（如果用 GLM 等兼容 endpoint）

### 数据层

- [ ] workshop 用内存 Map，**重启 = 清空**，确认这是预期行为
- [ ] 如果之后要持久化，先确认存储方案（不要默默切到 Redis / SQLite）

### 运行层

- [ ] PM2 / systemd 已配置（自启）
- [ ] 反向代理 / Nginx 把 80/443 → 内部 PORT
- [ ] HTTPS 证书已配置（不然 cookie 的 `secure` flag 会让登录失败）

## 回滚预案

### 触发条件（任一即回滚）

- 上线后 5 分钟内出现登录失败率 > 50%
- 任何一个 admin 路由返回 5xx
- 评分 API 连续 3 次失败

### 回滚步骤

1. `pm2 list` 找出当前服务进程
2. `git checkout <previous-commit>`
3. `pnpm install` （如果依赖有变）
4. `pnpm build`
5. `pm2 restart exam-platform`
6. 浏览器实测：登录 → dashboard 能加载 → 开考能进入

### 回滚后

- 在 `.ai/business-logic/gotchas.md` 记录："xxx 时回滚原因 + root cause"
- 修复后再上之前先在 staging 验证

## 触发本 Rule 的方式

- 用户主动说"做发布前检查" / "准备回滚预案"
- 或在输入框 `#mention` 本 Rule 文件名（具体方式看你用的 Coding Agent）

⚠️ workshop 实操**不会涉及发布上线**，这条 Rule 只作为「**L3 手动触发**形态」的演示，让学员看到 Rule 的 4 种生效方式都长什么样。
