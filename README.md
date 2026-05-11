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
pnpm dev            # http://localhost:3001
```

打开浏览器，两个入口：

- `http://localhost:3001/exam` → 考生端：输姓名即开考
- `http://localhost:3001/admin/login` → 管理后台，密码 `workshop2026`

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

### Skill 一览（8 个）

| Skill | 类 | 何时用 |
|---|---|---|
| [`/think`](./.qoder/skills/think/SKILL.md) | 认知 | 开工前澄清需求、列 Non-Goals、给候选方案 |
| [`/challenge`](./.qoder/skills/challenge/SKILL.md) | 认知 | `/think` 后扮演反对方挑刺，让方案先经一轮对抗 |
| [`/hunt`](./.qoder/skills/hunt/SKILL.md) | Debug | 遇到 bug 系统化排查根因 |
| [`/check`](./.qoder/skills/check/SKILL.md) | 验证 | 任务完成前审查 diff |
| [`/small-diff`](./.qoder/skills/small-diff/SKILL.md) | 代码 | 实施时控制改动范围，拒绝顺手优化 |
| [`/summary`](./.qoder/skills/summary/SKILL.md) | 知识 | session 结束时总结：commit body / progress.md / 交接 |
| [`/update-context`](./.qoder/skills/update-context/SKILL.md) | 知识 | 任务后把发现写回 business-logic（宽泛沉淀） |
| [`/record-gotcha`](./.qoder/skills/record-gotcha/SKILL.md) | 知识 | 专门把"踩坑"沉淀进 gotchas.md（窄而结构化） |

### 推荐流程

```
00-05  环境就绪 · pnpm install + pnpm dev + 登录后台确认 seed 数据
05-15  Task 1 一次性走完整套方法论
        ├─ /think        ← 列 Goal / Non-Goals / 影响范围 / 候选方案
        ├─ /challenge    ← 扮演反对方挑刺（找致命/严重问题）
        ├─ 开 spec       ← cp -r specs/_template specs/2026-05-task-1-detail/
        ├─ 填 proposal / tasks
        ├─ 实施（/small-diff 心态）
        ├─ /check        ← 看 diff / 跑 tsc / 手测
        ├─ /summary      ← 写 commit body + 更新 progress.md
        └─ 切到 llm-wiki 窗口 /ingest 这份 summary
15-30  Task 2 同上节奏（应该更快，因为流程熟了）
30-50  Task 3 比前两个稍复杂，可咨询 [fe-architect](./.qoder/agents/fe-architect.md) + [be-architect](./.qoder/agents/be-architect.md) 跨角色 review
50-60  最终 /check 对照三任务的产出 + /query 验证 llm-wiki 闭环
```

### 怎么"触发" Skill / Agent / Rule

跟你用的 Coding Agent 工具有关，**约定俗成的方式**有几种：

- **在 chat 里直接说**："用 `/think` Skill 帮我分析 Task 1"——大多数 Agent 会自动加载对应 `SKILL.md`
- **`@mention` 文件**：`@.qoder/skills/think/SKILL.md 按这个流程走`
- **告诉它读 README**："先读 README + AGENTS.md，按推荐流程做 Task 1"
- **Rules**：L0 始终生效不用管；L1 按 globs 自动；L2 智能命中（不用手动）；L3 必须显式 `#mention`

如果你用 **Qoder**：可以直接在专家团模式调用 [`.qoder/agents/*`](./.qoder/agents/)，配合 Skill 用。

---

## CI / Pre-commit Hook · 工程约束驯服 Agent

培训 `coperate-with-ai.md` §六讲的"用工程约束驯服 Agent"在本仓库**真的落地了**——不是 PPT 案例，而是 commit 时会真的拦你。

### 在你这边长这样

```bash
$ pnpm install
✓ 自动激活 .githooks/    ← 不需要单独 setup（package.json prepare 脚本）

$ git commit -m "fix Task 1"
▶ pre-commit · workshop checks

  [1/3] check-no-reward-hack...
        ✓ no reward hacking detected
  [2/3] tsc --noEmit...
        ✓ types ok
  [3/3] eslint...
        ✓ lint ok

✓ all pre-commit checks passed
[workshop abc1234] fix Task 1
```

如果你（或 Agent）有"作弊行为"，会被精确指出：

```text
❌ 检测到 .skip() / .only() / xit() / xdescribe() 被添加。

🤖 GUIDANCE FOR THE AI AGENT:
  跳过测试 = 暂时让 CI 闭眼，不是修问题。
  如果 case 真的应该 skip（外部依赖 down / 平台限制），
  请把它**完整删除**，并在 commit message 解释删除理由。
  .only() 会让 CI 只跑这一个 case，**绝对不允许**入主分支。
```

### 检查项一览（`.githooks/pre-commit` + `scripts/check-no-reward-hack.sh`）

| 检查 | 触发 |
|---|---|
| `tsc --noEmit` | 任何 TS 编译错 |
| `eslint` | 任何 lint 错 |
| 删测试 case | 在 `*.test.ts` / `*.spec.ts` / `__tests__/` 里减少 `it/test/describe` 行 |
| `.skip()` / `.only()` / `xit()` / `xdescribe()` | 任何"跳过测试"标记 |
| `@ts-ignore` / `@ts-expect-error` / `eslint-disable` 没 reason | 必须同行加 `reason: xxx` 注释 |
| 删除 `expect/assert` | 让测试变空壳 |

### 关键点：错误信息是给 Agent 的 prompt

每条拒绝信息**第一行是给人看的诊断**，下面是 `🤖 GUIDANCE FOR THE AI AGENT:`——Agent 读 commit 失败的 stderr 时**会真的把这段当成新指令**，重新尝试时绕开 reward hacking。这是培训分享 §6 的核心 demo。

### 绕不开的（按设计）

- `git commit --no-verify` 在团队约定上视为**主动违规**，code review 会打回
- 改 `eslint.config.mjs` / `tsconfig.json` 让规则变弱：检查不出，但 PR review 会发现

详见 [`.qoder/rules/L0-protect-core.md`](./.qoder/rules/L0-protect-core.md) "不要绕开 CI" 段。

### CI 端（GitHub Actions）

[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) 在 PR + push 时跑同样的 typecheck + lint + build，做双重保险——本地 hook 万一被人 `--no-verify` 绕过，CI 端兜底拦住。

workshop 1 小时内不会真发 PR，但**配置本身是给学员看的模板**：「你回到公司也照这样配就行」。

### 与培训的对应关系

| 培训文档 | 落地点 |
|---|---|
| `coperate-with-ai.md` §6 工程约束驯服 Agent | 整套 hook |
| `coperate-with-ai.md` `--no-verify` 拦截 demo | 嵌入 hook 错误信息的 GUIDANCE |
| `team-skills.md` `/check` Skill | hook 实际上是 `/check` 的强制自动化版本 |
| `L0-protect-core.md` "不要绕开 CI" 段 | 把这条规则**变成可执行的拦截** |

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
├── .githooks/
│   └── pre-commit             commit 前自动跑 typecheck + lint + reward-hack 检查
├── .github/workflows/
│   └── ci.yml                 PR + push 时跑 typecheck + lint + build
├── scripts/
│   └── check-no-reward-hack.sh  检测 Agent reward hacking 信号
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

- [ ] 一份完整的 spec 目录（含 5 文件）
- [ ] Task 1 / 2 / 3 的代码改动（至少跑通 Task 1）
- [ ] Task 的 `/summary` 已 ingest 到 llm-wiki

不追求"3 个全做完且完美"——追求**真的走完了一次方法论闭环**。

---

## 资源

- 培训正文 slides：http://120.79.157.186/
- 配套培训文档：本仓库的 [`content/`](https://github.com/jackwener/vivo/tree/main/content)（在 `jackwener/vivo` 仓库下）
- 出问题：先看 [`.qoder/rules/L0-protect-core.md`](./.qoder/rules/L0-protect-core.md) 的禁忌清单；还有问题问主持人

---

## License

MIT —— 欢迎 fork 作为你们团队的 AI 培训 starter。
