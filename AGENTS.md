<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AI Coding Workshop · Exam System Starter

这是企业 AI 培训配套的实操起步项目。你（Coding Agent）会被参与者用来完成一组"补完后台"的任务。这份 AGENTS.md 是你的入职培训文档，**每次会话开始都会自动加载**。

## 一、项目是干嘛的

一套**面向技术团队结业考试**的轻量考试平台：

- **考生端**（前台）**已完成**：链接 + 姓名进入 → 答题（单选 / 多选 / 判断 / 简答 / 场景） → 自动保存 → 倒计时 → 提交 → 看 AI 评分
- **管理员端**（后台）**部分完成**：登录 / dashboard 列表 / 清空 / CSV 导出 已就绪；**3 个功能留给学员实现**（见 §四）

## 二、技术栈与目录速览

- **Next.js 16** App Router + **React 19** + **TypeScript** + **Tailwind v4**
- **存储**：内存 `Map`（`lib/kv.ts`，单例 via `globalThis`）—— 不需要 Redis / SQLite
- **AI 评分**：`@anthropic-ai/sdk` + GLM 兼容 baseURL，没 API key 时走 mock（`lib/grading.ts` 中 `mockGrade`）
- **鉴权**：管理员路径用 HMAC-SHA256 签名 cookie（`lib/auth.ts` + `proxy.ts`）

```
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

components/       UI 组件
.ai/business-logic/   业务文档（按需读）← 实现新功能前先 grep
.ai/rules/            团队约束
```

## 三、本地运行（环境就绪检查）

```bash
pnpm install        # 或 npm install
pnpm dev            # http://localhost:3000
```

需要 **Node.js ≥ 20**。

环境变量（可选，全部都有默认值）：

```bash
ADMIN_PASSWORD=workshop2026         # 默认密码
ANTHROPIC_API_KEY=                  # 留空 → 走 mock grader
ANTHROPIC_BASE_URL=                 # 真实 LLM 时填 GLM/Anthropic 的 endpoint
```

打开浏览器：
- `http://localhost:3000/exam` → 输入姓名开考
- `http://localhost:3000/admin/login` → 输 `workshop2026`

启动后 dashboard 应该已经有 3 份演示答卷（来自 `lib/seed.ts`）。

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

### Task 2 · 重评失败题

**Why**：dashboard 上有个 disabled 的"重评失败题"按钮（评分流程偶尔会失败 → feedback 含"评分失败" → 需要重跑）。学员要把它接通。

**What**：

- 新建 `app/api/admin/regrade/route.ts`（POST，接收 `{ examId: string }`）
- 调用 `lib/grading.ts` 已有的 `regradeFailedQuestions(exam)` —— 这个**辅助函数已经实现**，你只需要写薄薄一层 route handler
- 在 dashboard 上把 disabled 按钮替换成一个能 POST 这个 endpoint 的客户端组件（参考 `components/ClearDataButton.tsx` 的写法）

**Done when**：

- 选中一个有"评分失败"题的答卷 → 点击按钮 → 调用 API → 返回 `{ attempted, recovered, scoreDelta }` → toast 提示结果
- 失败题恢复后，dashboard 上该学员的分数应实时更新

### Task 3 · 题型正确率统计

**Why**：教务想看"哪道题大家普遍答错了"和"哪类题平均得分多少"。

**What**：

- 新建 `app/admin/stats/page.tsx`
- 统计所有已完成答卷，按题型 / 按题目 聚合：
  - **每个题型的平均得分百分比**（如：选择题平均 78% / 判断题平均 65%）
  - **每道客观题的正确率**（如：c5 正确率 45% — 表示一半人答错）
- UI 用表格或简单柱状图（用 `<div style={{ width: '78%' }}>` 这种纯 CSS 即可，不要引图表库）
- 侧边栏已经有"📈 题型正确率"导航链接，指向 `/admin/stats`

**Done when**：

- 路由可访问，数据准确
- 在 dashboard 数据为空时不崩
- 不要重新实现 grading 逻辑——直接读 `exam.grading.scores` 和 `exam.grading.breakdown`

## 五、推荐工作流（用一次跑通所有方法论）

不要拿到 task 立刻动手。按下面流程走：

1. **`/think`** —— 读完任务后先问自己：
   - 目标具体是什么？Non-Goals 至少 2 条？
   - 涉及哪些已有文件？读 `.ai/business-logic/` 哪几篇？
   - 选 1-2 个候选实现方案，说出优劣
   - 验证标准（怎么算完成）

2. **写 spec**（`specs/2026-xx-task-N/` 目录下）：
   - `proposal.md`（Goal / Non-Goals）
   - `tasks.md`（拆 3-5 个 checkpoint）
   - `progress.md`（每步完成后更新）

3. **实施单个 task**（用 `/small-diff` 心态，不要顺手优化）

4. **`/check`**：
   - 看 `git diff`，确认没超 scope
   - 跑 `pnpm dev` 手测一遍
   - 跑 `pnpm lint` 看有没有警告

5. **更新 progress.md + 记 gotchas** → 进入下一个 task

## 六、业务上下文：怎么用 `.ai/business-logic/`

`.ai/business-logic/` 里有 3 份文档，是项目里**代码读不出的隐性约束**。每篇 frontmatter 有 `description`，告诉你**什么时候该读它**。

| 文档 | 何时读 |
|---|---|
| `question-types.md` | 涉及任何题型的判分 / 展示，或要解读 `exam.grading.scores[id]` 时 |
| `grading-pipeline.md` | 涉及评分流程、重试、mock / 真实 LLM 切换时 |
| `admin-auth.md` | 涉及 admin 路由 / 鉴权 / cookie 时 |

读法：先扫 `description` 判断是否相关 → 相关再读全文。

## 七、Rules（约束）

`.ai/rules/`：

- `always.md` —— 始终生效。输出语言、命名、不要绕开 proxy 鉴权
- `admin-only.md` —— 改 `app/admin/**` 或 `app/api/admin/**` 时额外加载

## 八、禁忌（高频踩坑）

- ❌ **不要**装 Prisma / SQLite / Postgres。workshop 就是要内存 Map。
- ❌ **不要**绕开 `proxy.ts` 自己写鉴权——它已经把 admin 路径都拦住了。
- ❌ **不要**重写 `lib/grading.ts` 的核心评分逻辑——你只需要写 API route handler 调用现有函数。
- ❌ **不要**引入图表库（recharts / echarts）做 Task 3——纯 CSS 表格 / div 进度条就够了。
- ❌ **不要**改 `lib/questions.ts` / `lib/answers.ts`——它们是题库，对所有学员公开。
- ❌ **不要**在不读 spec 的情况下直接动代码。即便任务看起来简单，先 `/think`。

## 九、完成后写回这里

如果你（或学员）在做任务过程中发现了：

- 一个不显眼的边界 case
- 一个让 Agent 反复踩坑的隐性约束
- 一个有效的实现技巧

请追加到 `.ai/business-logic/gotchas.md`（不存在就新建）。这就是 wiki 复利的最小实践。
