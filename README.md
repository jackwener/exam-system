# AI Coding Workshop · Exam System Starter

> 这是企业 AI 培训配套的 **1 小时实操项目**。
> 培训分享见 [vivo AI Coding 课件](http://120.79.157.186/)，本仓库是配套实操起步项目。
>
> 培训背景 / Slides → 课件
> Agent 上下文 → [AGENTS.md](./AGENTS.md)
> 本文件 → **给人看：怎么参加 workshop**

---

## 是什么

一套"半成品"的在线考试平台：

- ✅ **考生端**（前台）完整：开考 → 答题 → 自动保存 → 倒计时 → 提交 → 看 AI 评分
- ❌ **管理端**（后台）部分缺失：3 个功能留给你（学员）在 1 小时内**用 AI 协作**做完

**目标不是"做完功能"**，而是**亲身体验**前面讲的方法论（Spec / Rules / Skill / 专家团 / business-logic）。完成后你应该能说出："原来 spec 是这样救命的"、"原来 Rule 真的能压过模型直觉"。

## 谁来用

- 听完培训正文的参与者
- 已经用过 Coding Agent（Qoder / Cursor / Claude Code 都可以）
- 自带一台能跑 Node 20+ 的笔记本

---

## 快速开始（环境就绪 5 分钟）

```bash
git clone git@github.com:jackwener/exam-system.git
cd exam-system
pnpm install        # 或 npm install
pnpm dev            # http://localhost:3000
```

打开浏览器，两个入口：

- `http://localhost:3000/exam` → 考生端：输姓名即开考
- `http://localhost:3000/admin/login` → 管理后台，密码 `workshop2026`

启动后 dashboard 一打开就有 3 份演示答卷（张高分 92 / 李及格 68 / 王挂科 42，来自 `lib/seed.ts`），不用先去考一遍才看得到东西。

### 不需要 API Key

默认走 **mock grader**——简答题按答案长度阶梯给分（< 30 字 50% / < 100 字 70% / 否则 85%）。不配 `ANTHROPIC_API_KEY` 也能完整跑通考试 → 提交 → 评分 → 看成绩。

主持人当天会用一台配了真实 GLM key 的机器做 demo。

---

## 你的任务（3 个必做）

每个 task 都自带"被点击但 404"的入口提示——按线索走即可。建议串行做，先 T1 → T2 → T3。

### Task 1 · 答卷详情页

dashboard 上每个学员姓名是链接，但点击 **404**。

- 新建 `app/admin/exam/[id]/page.tsx`（server component，直接 `await getExam(id)`）
- 展示：姓名 / 总分 / 各题型得分；逐题展示题干 / 学员答案 / 标答 / 单题得分 / AI 评语
- 不需要新建 API（server component 直接读 kv）
- **建议先读**：[`.qoder/business-logic/question-types.md`](./.qoder/business-logic/question-types.md)

### Task 2 · 重评失败题

dashboard 上有个 disabled 的"重评失败题"按钮，把它接通。

- 新建 `app/api/admin/regrade/route.ts`（POST，body `{ examId }`）
- 直接调 `lib/grading.ts` 已有的 `regradeFailedQuestions(exam)`——**你只需写薄薄一层 route handler**
- 把 disabled 按钮替换成 client 组件，参考 `components/ClearDataButton.tsx`
- **建议先读**：[`.qoder/business-logic/grading-pipeline.md`](./.qoder/business-logic/grading-pipeline.md)

### Task 3 · 题型正确率统计

侧边栏的"📈 题型正确率"链接指向 `/admin/stats`，**目前 404**。

- 新建 `app/admin/stats/page.tsx`
- 聚合所有完成的答卷，输出：
  - 每个题型的平均得分百分比（选择题 78% / 判断题 65%…）
  - 每道客观题的正确率（c5 = 45% → 一半人答错）
- **纯 CSS** 表格 + `<div style={{width:'78%'}}>` 进度条——**不要引图表库**

---

## 1 小时实验节奏（推荐）

每个阶段都有对应的 Skill 引导。**所有 Skill 都在 [`.qoder/skills/`](./.qoder/skills/)**，每个一个目录加一个 `SKILL.md`。

```
00-05  环境就绪 · pnpm install + pnpm dev + 登录后台确认 seed 数据
05-15  Task 1 一次性走完整套方法论
        ├─ /think        ← 列 Goal / Non-Goals / 影响范围 / 候选方案
        ├─ 开 spec       ← cp -r specs/_template specs/2026-05-task-1-detail/
        ├─ 填 proposal / tasks
        ├─ 实施（/small-diff 心态）
        ├─ /check        ← 看 diff / 跑 tsc / 手测
        └─ /update-context ← 沉淀 gotcha 到 business-logic
15-30  Task 2 同上节奏（应该更快，因为流程熟了）
30-50  Task 3 比前两个稍复杂，可咨询 [fe-architect](./.qoder/agents/fe-architect.md) + [be-architect](./.qoder/agents/be-architect.md) 跨角色 review
50-55  最终 /check 对照三任务的产出
55-60  组内分享：每人一句"最意外的发现"
```

### 怎么"触发" Skill / Agent / Rule

跟你用的 Coding Agent 工具有关，**约定俗成的方式**有几种：

- **在 chat 里直接说**："用 `/think` Skill 帮我分析 Task 1"——大多数 Agent 会自动加载对应 `SKILL.md`
- **`@mention` 文件**：`@.qoder/skills/think/SKILL.md 按这个流程走`
- **告诉它读 README**："先读 README + AGENTS.md，按推荐流程做 Task 1"
- **Rules**：L0 始终生效不用管；L1 按 globs 自动；L2 智能命中（不用手动）；L3 必须显式 `#mention`

如果你用 **Qoder**：可以直接在专家团模式调用 [`.qoder/agents/*`](./.qoder/agents/)，配合 Skill 用。

---

## 项目里都有什么

```text
exam-system/
├── AGENTS.md                  Agent 上下文（精简，~60 行）
├── README.md                  ← 你正在看
├── app/                       Next.js 16 App Router
│   ├── exam/                  考生端 ✅
│   ├── admin/                 管理后台（部分功能待补）
│   └── api/                   后端 API
├── components/                React 组件
├── lib/
│   ├── kv.ts                  内存 Map 存储（单例）
│   ├── seed.ts                启动时注入 3 份演示答卷
│   ├── grading.ts             评分（含 mock + 重试）
│   ├── auth.ts                HMAC cookie
│   ├── questions.ts           题库
│   └── answers.ts             标答 + rubric
├── proxy.ts                   admin 路径鉴权
└── .qoder/                    团队工程化配置
    ├── rules/                 L0-L3 共 6 条规则
    ├── skills/                5 个起步 Skill（think/hunt/check/small-diff/update-context）
    ├── agents/                4 个专家团角色（designer/fe/be/devops）
    └── business-logic/        3 份业务文档（question-types / grading-pipeline / admin-auth）
specs/                         Spec 目录
└── _template/                 起步模板（proposal/design/tasks/progress/decisions）
```

详细的 Agent 视角 / 渐进式披露映射表见 [AGENTS.md](./AGENTS.md)。

---

## 实验完成标准

完成 1 小时实验后，每个学员应该能产出：

- [ ] 一份**至少 2 任务**的 spec 目录（含 5 文件）
- [ ] Task 1 / 2 / 3 的代码改动（至少跑通 Task 1）
- [ ] 一条 gotcha 沉淀到 `.qoder/business-logic/`（或新建 `gotchas.md`）
- [ ] 一句话感受："最意外的发现是 ___"

不追求"3 个全做完且完美"——追求**真的走完了一次方法论闭环**。

---

## 资源

- 培训正文 slides：http://120.79.157.186/
- 配套培训文档：本仓库的 [`content/`](https://github.com/jackwener/vivo/tree/main/content)（在 `jackwener/vivo` 仓库下）
- 出问题：先看 [`.qoder/rules/L0-protect-core.md`](./.qoder/rules/L0-protect-core.md) 的禁忌清单；还有问题问主持人

---

## License

MIT —— 欢迎 fork 作为你们团队的 AI 培训 starter。
