<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AI Coding Workshop · Exam System Starter

这是企业 AI 培训配套的实操起步项目。你（Coding Agent）会被参与者用来完成一组"补完后台"的任务。这份 AGENTS.md 是你的入职培训文档，**每次会话开始都会自动加载**。

> **注意**：Rules 内容优先级 > AGENTS.md。详见 [`.qoder/rules/`](./.qoder/rules/)。

## 一、项目是干嘛的

一套**面向技术团队结业考试**的轻量考试平台：

- **考生端**（前台）**已完成**：链接 + 姓名进入 → 答题 → 自动保存 → 倒计时 → 提交 → 看 AI 评分
- **管理员端**（后台）**部分完成**：登录 / dashboard 列表 / 清空 / CSV 导出 已就绪；**3 个功能留给学员实现**（见 §四）

## 二、技术栈与目录速览

- **Next.js 16** App Router + **React 19** + **TypeScript** + **Tailwind v4**
- **存储**：内存 `Map`（`lib/kv.ts`，单例 via `globalThis`）—— 不需要 Redis / SQLite
- **AI 评分**：`@anthropic-ai/sdk` + GLM 兼容 baseURL；**没 API key 时走 mock**（`lib/grading.ts` 中 `mockGrade`）
- **鉴权**：管理员路径用 HMAC-SHA256 签名 cookie（`lib/auth.ts` + `proxy.ts`）

```text
app/
  page.tsx                          首页（开考入口）
  exam/[id]/page.tsx                答题页 ✅
  exam/[id]/result/page.tsx         成绩页 ✅
  admin/login/page.tsx              管理员登录 ✅
  admin/dashboard/page.tsx          成绩总览 ✅
  admin/exam/[id]/page.tsx          答卷详情页 ❌ workshop task 1
  admin/stats/page.tsx              题型正确率 ❌ workshop task 3
  api/
    exam/{start,save,load,submit,status}/route.ts  考生端 API ✅
    admin/{auth,clear,export,fill-missing,rescore-all}/route.ts  ✅
    admin/regrade/route.ts          ❌ workshop task 2

lib/
  types.ts        类型定义
  questions.ts    题库（5 种题型，共 31 题）
  answers.ts      标准答案 + 简答题 rubric
  kv.ts           存储层（内存 Map）+ seed 触发
  seed.ts         3 份演示答卷（高分 / 及格 / 挂科）
  grading.ts      评分逻辑：客观题 + 主观题 + 重试 + mock
  auth.ts         HMAC cookie

components/                          UI 组件
.qoder/
  rules/                             团队约束（L0-L3 分层，详见 §六）
  skills/                            5 个起步 Skill（详见 §五工作流）
  agents/                            4 个专家团 sub-agent（详见 §七）
  business-logic/                    业务上下文（按需读，详见 §七）
specs/                               Spec 目录（每个需求一个 dir）
specs/_template/                     新 spec 起步模板
```

## 三、本地运行（环境就绪检查）

```bash
pnpm install        # 或 npm install
pnpm dev            # http://localhost:3000
```

需要 **Node.js ≥ 20**。

环境变量（可选，全部都有默认值）：

```bash
ADMIN_PASSWORD=workshop2026         # 默认密码（已在 lib/auth.ts 有 fallback）
ANTHROPIC_API_KEY=                  # 留空 → 走 mock grader
ANTHROPIC_BASE_URL=                 # 真实 LLM 时填 GLM/Anthropic 的 endpoint
```

打开浏览器：

- `http://localhost:3000/exam` → 输入姓名开考
- `http://localhost:3000/admin/login` → 输 `workshop2026`

启动后 dashboard 应该已经有 3 份演示答卷（张高分 92 / 李及格 68 / 王挂科 42，来自 `lib/seed.ts`）。

## 四、Workshop 任务清单（3 个必做）

每个任务都有清晰的 spec、可独立完成、互不依赖。建议**串行做**，先 Task 1 再 Task 2 再 Task 3。

### Task 1 · 答卷详情页

**Why**：dashboard 上每个学员姓名是链接，但点击会 404。

**What**：

- 新建 `app/admin/exam/[id]/page.tsx`（server component）
- 用 `getExam(id)` 拉数据
- 展示：学员姓名 / 提交时间 / 总分 / 各题型得分；逐题展示：题干 / 学员答案 / 标准答案 / 单题得分 / AI 评语
- 客观题用 `lib/answers.ts` 的 `correctAnswer` 对比；简答题用 `grading.scores[id].feedback`

**Done when**：

- 点击 dashboard 上的姓名能进入详情页
- 不会因为某些字段缺失（如未作答的简答题）而崩溃
- 不能跳过 admin 鉴权访问（`proxy.ts` 已经处理）

**建议先读**：[`.qoder/business-logic/question-types.md`](./.qoder/business-logic/question-types.md)

### Task 2 · 重评失败题

**Why**：dashboard 上有个 disabled 的"重评失败题"按钮（评分流程偶尔会失败 → feedback 含"评分失败" → 需要重跑）。学员要把它接通。

**What**：

- 新建 `app/api/admin/regrade/route.ts`（POST，接收 `{ examId: string }`）
- 调用 `lib/grading.ts` 已有的 `regradeFailedQuestions(exam)` —— 这个**辅助函数已经实现**，你只需要写薄薄一层 route handler
- 在 dashboard 上把 disabled 按钮替换成一个能 POST 这个 endpoint 的客户端组件（参考 `components/ClearDataButton.tsx`）

**Done when**：

- 选中一个有"评分失败"题的答卷 → 点击按钮 → 调用 API → 返回 `{ attempted, recovered, scoreDelta }` → toast 提示结果
- 失败题恢复后，dashboard 上该学员的分数应实时更新

**建议先读**：[`.qoder/business-logic/grading-pipeline.md`](./.qoder/business-logic/grading-pipeline.md)

### Task 3 · 题型正确率统计

**Why**：教务想看"哪道题大家普遍答错了"和"哪类题平均得分多少"。

**What**：

- 新建 `app/admin/stats/page.tsx`
- 统计所有已完成答卷，按题型 / 按题目 聚合：
  - **每个题型的平均得分百分比**（如：选择题平均 78%）
  - **每道客观题的正确率**（如：c5 正确率 45%）
- UI 用表格或简单 CSS 柱状图（`<div style={{width:'78%'}}>` 即可，**不要引图表库**）
- 侧边栏已经有"📈 题型正确率"导航链接，指向 `/admin/stats`

**Done when**：

- 路由可访问，数据准确
- 在 dashboard 数据为空时不崩
- 不要重新实现 grading 逻辑——直接读 `exam.grading.scores` 和 `exam.grading.breakdown`

## 五、推荐工作流（5 个 Skill 跑一遍）

5 个 Skill 在 [`.qoder/skills/`](./.qoder/skills/) 下，每个独立目录 + `SKILL.md`：

| Skill | 何时用 |
|---|---|
| [`/think`](./.qoder/skills/think/SKILL.md) | 开工前澄清需求、列 Non-Goals、给候选方案 |
| [`/hunt`](./.qoder/skills/hunt/SKILL.md) | 遇到 bug 系统化排查根因 |
| [`/check`](./.qoder/skills/check/SKILL.md) | 任务完成前审查 diff |
| [`/small-diff`](./.qoder/skills/small-diff/SKILL.md) | 实施时控制改动范围，拒绝顺手优化 |
| [`/update-context`](./.qoder/skills/update-context/SKILL.md) | 任务后把发现写回 business-logic |

**推荐流程**：

```
任务开始
  ↓
/think  ← 出 Goal / Non-Goals / 候选方案 / 验证标准
  ↓
开 spec 目录：cp -r specs/_template specs/2026-05-task-N-xxx/
  ↓
填 proposal.md / design.md / tasks.md
  ↓
实施一个 task（带 /small-diff 心态）
  ↓
/check  ← 看 diff / 跑 lint / 跑 typecheck / 手测
  ↓
更新 progress.md
  ↓
/update-context  ← 5 秒确认有没有值得沉淀的发现
  ↓
下一个 task
```

## 六、Rules 体系（L0-L3 四层）

[`.qoder/rules/`](./.qoder/rules/) 按培训分享的 **Rules 2.0** 体系组织：

| 层 | 文件 | 生效方式 |
|---|---|---|
| L0 | [`L0-output-style.md`](./.qoder/rules/L0-output-style.md) | 始终生效：输出语言 / 命名 / TS 严格度 |
| L0 | [`L0-protect-core.md`](./.qoder/rules/L0-protect-core.md) | 始终生效：不要碰的核心文件 + 不要装的依赖 |
| L1 | [`L1-frontend.md`](./.qoder/rules/L1-frontend.md) | 改 `**/*.tsx` 时加载 |
| L1 | [`L1-backend.md`](./.qoder/rules/L1-backend.md) | 改 `app/api/**` / `lib/**` 时加载 |
| L2 | [`L2-grading-domain.md`](./.qoder/rules/L2-grading-domain.md) | 涉及评分 / 重评场景智能触发 |
| L3 | [`L3-release.md`](./.qoder/rules/L3-release.md) | 用户 #mention 才生效（演示样本） |

## 七、专家团 + 业务上下文

### 4 个角色（`.qoder/agents/`）

| 角色 | 何时咨询 |
|---|---|
| [Designer](./.qoder/agents/designer.md) | 新增页面 / 改交互前 |
| [FE Architect](./.qoder/agents/fe-architect.md) | 改 .tsx / 组件设计前 |
| [BE Architect](./.qoder/agents/be-architect.md) | 新增 API / 改数据形态前 |
| [DevOps Architect](./.qoder/agents/devops-architect.md) | 任何变更上线前的最后一道门 |

详见 [`.qoder/agents/README.md`](./.qoder/agents/README.md)。

### 3 份业务文档（`.qoder/business-logic/`）

| 文档 | 何时读 |
|---|---|
| [`question-types.md`](./.qoder/business-logic/question-types.md) | 涉及题型判分 / 展示 / `exam.grading.scores[id]` |
| [`grading-pipeline.md`](./.qoder/business-logic/grading-pipeline.md) | 涉及评分流程 / 重试 / mock vs 真实 LLM |
| [`admin-auth.md`](./.qoder/business-logic/admin-auth.md) | 涉及 admin 路由 / 鉴权 / cookie |

**读法**：先扫 frontmatter 的 `description` 判断是否相关，相关再读全文。

## 八、禁忌（高频踩坑）

- ❌ **不要**装 Prisma / SQLite / Postgres / Redis。workshop 就是要内存 Map
- ❌ **不要**绕开 `proxy.ts` 自己写鉴权
- ❌ **不要**重写 `lib/grading.ts` 的核心评分逻辑（你只需要写 API route handler）
- ❌ **不要**引入图表库做 Task 3——纯 CSS `<div>` 进度条够了
- ❌ **不要**改 `lib/questions.ts` / `lib/answers.ts`（题库）
- ❌ **不要**在不读 spec 的情况下直接动代码——先 `/think`
- 完整禁区清单见 [`L0-protect-core.md`](./.qoder/rules/L0-protect-core.md)

## 九、任务结束沉淀

如果在做任务过程中发现：

- 一个不显眼的边界 case
- 一个让 Agent 反复踩坑的隐性约束
- 一个有效的实现技巧

→ 用 [`/update-context`](./.qoder/skills/update-context/SKILL.md) 写回 [`.qoder/business-logic/`](./.qoder/business-logic/)（或新建 `gotchas.md`）。这就是 wiki 复利的最小实践。
