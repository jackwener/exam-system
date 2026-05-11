<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code.
<!-- END:nextjs-agent-rules -->

# Exam System · Agent Context

> 学员实验用的考试平台 starter。考生答题前台已就绪，部分管理后台待学员补完。
> 培训背景与任务清单见 [README.md](./README.md)；本文件只装"**每次会话都用得到**"的内容。

## 技术栈

- Next.js 16 App Router · React 19 · TypeScript strict · Tailwind v4
- 存储：内存 `Map`（`lib/kv.ts` 单例 via `globalThis`，重启清空）
- AI 评分：`@anthropic-ai/sdk` + GLM 兼容 baseURL，**没 API key 时走 mock**（`lib/grading.ts` 的 `mockGrade`）
- 鉴权：HMAC-SHA256 cookie，`proxy.ts` 拦截 `/admin/**` 和 `/api/admin/**`

## 关键目录

```text
app/exam/           考生端 ✅
app/admin/          管理后台（部分功能待学员补，见 README）
app/api/            后端 API
lib/                kv / grading / auth / questions / answers / seed
.qoder/             团队工程化配置（见下）
specs/              Spec Coding 目录（每个需求一个 dir）
```

## 渐进式披露（按需读）

不要一开始就全读，先扫 frontmatter，按场景命中再展开。

| 路径 | 何时读 |
|---|---|
| [`.qoder/rules/`](./.qoder/rules/) | L0 始终生效；L1 按 globs；L2 智能；L3 手动。开工前扫一遍清单 |
| [`.qoder/skills/`](./.qoder/skills/) | `/think` `/hunt` `/check` `/small-diff` `/update-context` 五个工作流 |
| [`.qoder/agents/`](./.qoder/agents/) | designer / fe / be / devops 四角色咨询入口 |
| [`.qoder/business-logic/`](./.qoder/business-logic/) | 涉及题型 / 评分 / 鉴权前必读对应那篇 |
| [`specs/`](./specs/) | 当前任务的 proposal / design / tasks / progress / decisions |

## 命令

```bash
pnpm install
pnpm dev                # http://localhost:3000
npx tsc --noEmit        # 类型检查
pnpm lint               # 格式 / 风格
```

Node ≥ 20。环境变量全部可选（默认值在代码里有 fallback）。

## 最高级禁忌（详见 `.qoder/rules/L0-protect-core.md`）

- ❌ 不要装新依赖（特别是 Prisma / Redis / 图表库 / 鉴权库）
- ❌ 不要改 `proxy.ts` / `lib/auth.ts` / `lib/grading.ts` 的核心函数 / 题库
- ❌ 不要绕开 `lib/kv.ts` 直接读写 `globalThis.__examStore`
- ❌ 不要在 admin route 里重新校验密码（proxy 已做）
- ❌ 拿到任务**不要立即写代码**——先用 `/think` 进 planning mode
