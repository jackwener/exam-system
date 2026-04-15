---
name: grading-frontend
description: Grade a team's frontend implementation against its spec on 10 weighted dimensions, producing a markdown report + JSON summary with evidence.
---

# grading-frontend

给 AI 培训项目前端实现打分。50 学员分成 ~12 组，按 spec-driven 方式实现本地部署的网站。本 skill 让 Claude（或 Qoder / Cursor / Claude Code agent）按统一 rubric 给某一组的前端打分，产出可给学员的 markdown 报告 + 可汇总 leaderboard 的 JSON。

---

## 前置依赖

- **本地可跑**：待评项目能在本机 `npm run dev` / `pnpm dev` / `yarn dev` 启动，默认 `http://localhost:3000`（按项目 README 调整）。
- **Spec 文档位置**：`<project>/docs/spec.md` 或 `<project>/README.md` 或 `<project>/spec/*`。找不到则先向用户确认 spec 路径再开工，不要凭空评分。
- **Node.js 环境**：Node ≥ 18，用来跑 `npx playwright` 截图、`npx ajv-cli` 校验 JSON。首次使用时 `npx playwright install chromium`。
- **输出目录**：所有证据和报告写到待评项目根目录下的 `.grading/`（已由 spec 约定 gitignore）。

**约定的工作目录**：所有 probe 脚本和 `.grading/` 输出都默认在**待评项目根目录**下执行。即评分时：
1. cd 到被评项目（如 `cd group-workshop/group-2`）
2. 用绝对路径调用 probe：`bash $WORKSHOP_ROOT/skills/grading-frontend/probes/probe-screenshots.sh team-2 http://localhost:3000`
3. `.grading/` 会落到被评项目根下，与该项目共生

---

## 共享契约（必读）

评分开始前，**必须先读完本文件** `## 评分标尺` / `## 报告模板` / `## 证据硬约束` 三段，以及 `../score-schema.json`。这些是 frontend / backend 两个 skill 共用的硬约束，不读会导致输出格式不一致、无法汇总 leaderboard：

1. 见本文件 **## 评分标尺** — 0–10 标尺含义 + S/A/B/C/D 档位定义。**所有维度打分必须对照此标尺**。
2. 见本文件 **## 报告模板** — 统一 Markdown 报告模板。产出的 `report.md` 必须照此结构填充。
3. `../score-schema.json` — JSON 摘要的 schema。产出的 `summary.json` 必须通过此 schema 校验。
4. 见本文件 **## 证据硬约束** — 打分 ≥7 或 ≤4 必须 ≥2 条证据，5–6 分必须 ≥1 条。违反则打分视为无效。

---

## 评分标尺（0–10）

本段是 `grading-frontend` 与 `grading-backend` 两个 skill 共享的**唯一**打分锚点。两侧所有维度得分都必须按本表落点，再用证据说明为什么不是相邻的锚点。

### 1. 分数锚点

| 分数 | 名称 | 判定标准 |
|---:|---|---|
| **10** | 工业级范本 | 可直接作为下一届教学样例；评分人找不到该维度的改进空间；相对已见过的最好学员作业也明显领先 |
| **9** | 优秀 | 核心完全到位，仅 1–2 处非关键瑕疵（例如边缘场景文案、极端断点、冷路径日志） |
| **7** | 良好 | 主流程到位，但存在 ≥3 处可改进；不影响交付但明显看得出赶工痕迹 |
| **5** | 及格 | Happy path 能跑，但明显粗糙；有 1 类系统性漏洞（如缺状态、缺校验）但未致命 |
| **3** | 不及格 | 该项存在尝试痕迹但严重不完整；主要子项缺失或逻辑错误 |
| **0** | 未实现 | 完全缺失，或实现了但跑不起来 |
| **N/A** | 不适用 | spec 明确未要求，或该维度在本项目栈上无意义；**必须写原因**，不计入总分 |

**允许的分数**：0、3、5、7、9、10 是锚点；1/2/4/6/8 仅在证据支持"介于两锚点之间"时使用。不允许出现小数。

### 2. 打分操作规则

1. **先选锚点，再微调**：拿到证据后先对齐最接近的锚点（10/9/7/5/3/0），再用证据决定 ±1 微调。禁止"先拍个 8 再补证据"。
2. **高低分必须有证据**：
   - `score ≥ 7` → 至少 2 条证据
   - `score ≤ 4` → 至少 2 条证据
   - `5–6` → 至少 1 条证据
   - 详细规则见本文件 `## 证据硬约束` 段
3. **N/A 必须写原因**：`na_reason` 字段必填，格式 `"spec §X.Y 未涉及此项"` 或 `"技术栈 Z 无此概念"`。N/A 不计入总分。
4. **不能同时低分 + 高评**：如果评语是"很好，只差一点"，分数不能 ≤ 5。
5. **锚点冲突时就低不就高**：若一个维度既符合 9 的正面描述也命中 5 的负面描述，取 5（警戒作用）。

### 3. 总分计算

**公式**（N/A 不计入分母）：

```
total = Σ(score_i × weight_i) / Σ(weight_i for dim_i where score_i != null) × 100 / 10
```

等价形式：先对非 N/A 维度算加权平均（0–10），再把有效权重归一化到 100，最后乘 10 映射到 0–100。

**例子**：前端 10 维总权重 100，若 `微文案 (权重 6)` 被判 N/A：
- 有效权重总和 = 94
- 其余 9 维加权和 = Σ(score_i × weight_i)
- `total = (Σ / 94) × 10`

### 4. 总分档位

| 档位 | 分数区间 | 含义 |
|:---:|:---:|---|
| **S** | ≥ 90 | 可作为本届教学样例 |
| **A** | 80–89 | 合格交付，小范围打磨即可上线 |
| **B** | 70–79 | 主流程 OK，系统性问题需要返工 |
| **C** | 60–69 | 能 demo，不能交付；多处结构性缺陷 |
| **D** | < 60 | 未达培训目标，需重做关键模块 |

档位只用于班级 leaderboard 横向对比，学员反馈以**维度得分 + 证据 + 改进清单**为主。

---

## 报告模板

两个 grading skill 产出的 `.grading/reports/<team>-<side>.md` **必须**严格按本模板。字段缺一不可；无信息时填 `—`，**不要省略行**。模板本体用四个反引号包裹的 Markdown 代码块呈现，复制时去掉最外层反引号。

### 使用说明

- 占位符形如 `{队伍名}`，落地时替换为实际值
- 维度详评块按 `grading-frontend` 10 维 / `grading-backend` 9 维完整展开，不能合并或省略
- 任一维度证据不足时，score 填 `null`，`na_reason` 填 `EVIDENCE_MISSING: ...`，并在末尾"评分风险"段汇总
- 报告的同级必须存在对应 JSON：`<team>-<side>.json`，schema 见 `../score-schema.json`

### 模板

````markdown
# 项目评分报告 — {队伍名}（{前端 | 后端}）

- 评分人：{Claude@model-id / 助教姓名}
- 日期：{YYYY-MM-DD}
- Spec 版本：{git sha 或 docs/spec.md 路径}
- 被评项目 commit：{sha}
- 评分耗时：{xx 分钟}

## 总分：{score} / 100 — 等级 {S | A | B | C | D}

## 维度汇总

| # | 维度 | 得分 | 权重 | 加权 | 一句话 |
|---:|---|---:|---:|---:|---|
| 1 | {维度名} | {0–10 或 N/A} | {w} | {score×w/10} | {一句话概述} |
| 2 | ... | ... | ... | ... | ... |

> 有效权重总和：{Σw_non-NA}；N/A 维度：{列表或 "无"}

## 逐维度详评

### 1. {维度名} — {score}/10（权重 {w}）

**证据**
- `path/to/file.ext:L12-L40` — {这条证据说明了什么}
- 截图：`.grading/shots/{team}-{view}.png`
- 命令：`curl -s localhost:8080/api/x` → `.grading/probes/{team}-x.log`

**要到 10 差什么**
1. {具体、可操作的改进建议}
2. {...}
3. {...}

---

### 2. {维度名} — {score}/10（权重 {w}）

（同样模板，完整列出所有维度）

---

## 亮点

- {值得表扬的 2–4 条，要带证据}

## 最该优先修的 3 件事

1. **{问题}** — 影响：{哪个维度掉了多少分}；改法：{一两句话说清}
2. ...
3. ...

## 评分风险（可选）

仅当出现以下情况时填写，否则删除整节：
- 证据不足被判 `EVIDENCE_MISSING` 的维度列表
- 评分人对某维度存疑但无法进一步取证的原因
- 项目未跑起来 / spec 缺失等影响评分可信度的事实
````

### 校验清单（写完报告后自检）

- [ ] 总分 = Σ(加权列) × 10 / Σ(有效权重)，数值对得上
- [ ] 每个维度都有至少一条引用（证据 / 截图 / 日志 / spec 条目）
- [ ] 所有 N/A 都有 `na_reason`
- [ ] "最该优先修的 3 件事" 每条都回指了具体维度
- [ ] 对应 JSON 已写入 `.grading/reports/<team>-<side>.json`

---

## 证据硬约束

本段是**打分是否有效**的判定规则。`grading-frontend` 和 `grading-backend` 两个 skill 在写入每个维度分数前**必须**先检查本表；证据不达标的打分视为无效。

设计目的：防止 agent 在缺乏实际观察的情况下拍脑袋打分。**宁可多一个 `EVIDENCE_MISSING`，不要编一个好看的分数**。

### 1. 证据条数规则

| 分数段 | 最少证据条数 | 说明 |
|---:|:---:|---|
| **9–10** | **3** | 高分必须可复现；至少覆盖：1 条代码引用 + 1 条运行期证据（截图/probe/log） + 1 条 spec 比对 |
| **7–8** | **2** | 需同时体现"主流程到位"与"非关键瑕疵" |
| **5–6** | **1** | 一条即可，但必须能指出具体缺陷 |
| **3–4** | **2** | 低分不能靠印象；必须列出 ≥2 个具体失败点 |
| **0** | **1** | 至少证明"真的没有"：grep 结果、spec 条目 + 代码库缺失、启动失败日志 |
| **N/A** | **1** | 必须引用 spec 条目或技术栈说明，证明该项"不适用" |

### 2. 证据合法形式

每条证据必须是以下 4 类之一，**不得**为自然语言转述：

1. **代码引用**：`path/to/file.ext:L{start}-L{end}` 或 `path/to/file.ext:L{line}`
   - 路径必须相对项目根
   - 必须真实存在（评分前 open / grep 确认过）
2. **截图**：`.grading/shots/<team>-<view>.png`
   - 文件必须存在；后端维度一般不使用
   - 可附简短说明："登录页 desktop 1280×800，有 layout shift"
3. **命令日志**：`.grading/probes/<team>-<probe>.log` 或在证据行内直接给出命令与关键输出
   - 形如：`curl -s -o /dev/null -w "%{http_code}" localhost:8080/api/x -d '{}' → 500`
   - 压测结果引用 autocannon 输出文件
4. **Spec 引用**：`spec §3.2` / `docs/spec.md:L120-L145` / issue 链接
   - 判定 N/A 或 Spec 一致性时必用

### 3. 违规处理

#### 3.1 证据不足

若按 §1 无法凑够所需证据条数：

1. `score` 置为 `null`
2. `na_reason` 写为 `"EVIDENCE_MISSING: 需要 N 条证据，仅能取得 M 条（已尝试：<动作清单>）"`
3. 在报告末尾 `## 评分风险` 段落列出该维度
4. 该维度**不计入总分分母**（与正常 N/A 一致），但在评分风险段标注"非 spec 排除项"

#### 3.2 证据伪造 / 占位

评分人/agent 若写入以下任一形式的证据，该维度直接作废并降级为 `EVIDENCE_MISSING`：

- 路径不存在的 file:line（lint：评分后用 `test -f` 批量校验）
- 截图文件不存在或大小为 0
- 命令日志内容与结论自相矛盾
- 描述性语言（"代码组织得不错"）未附具体引用

#### 3.3 高低分无证据

- `score ≥ 7` 但证据 < 2 条 → 降为 6，或标 `EVIDENCE_MISSING`
- `score ≤ 4` 但证据 < 2 条 → 升为 5，或标 `EVIDENCE_MISSING`

选择哪个处理取决于评分人对维度的把握；两种方式都必须在"评分风险"中注明。

### 4. 证据收集建议顺序

先做便宜的、可批量的，再做昂贵的：

1. **静态** (cheap)：`grep` / `rg` 扫关键词、看 package.json / schema / migration
2. **Spec 对齐**：逐条把 spec 检查项对到代码文件
3. **运行期**：启 dev server / 后端服务，跑截图脚本 / probe 脚本
4. **交互**：走完主流程，看 console / network / 日志
5. **测试**：跑 test suite，看覆盖率与失败清单

每跑完一步把产物落盘到 `.grading/`，在报告证据行里引用相对路径即可。

---

## 配套资源

按需读取（不是每次都读全部）：

- **`./anti-patterns.md`** — AI slop 前端反模式清单。**打"主题与审美"和"代码质量"两个维度时必读**，用来识别默认 shadcn 灰白调、无主题色、按钮都 `bg-blue-500`、空态只写 "No data" 等典型滑坡。
- **`./examples/good-report.md`** 和 **`./examples/mediocre-report.md`** — 两份标定样例报告。**打分前读一次做分布校准**，避免全班都打 8 分这种分不开档的问题。
- **`./probes/probe-screenshots.sh`** — 批量跑 4 态 + 3 断点截图（login / dashboard / empty / error × desktop / tablet / mobile）。取证时直接 `bash ./probes/probe-screenshots.sh <team> <base-url>` 即可，不要手搓 playwright 命令。
- **`./probes/probe-performance.sh`** — 跑 Lighthouse 测关键页面性能，输出 `.grading/probes/<team>-lighthouse.json`（原始 Lighthouse JSON）和 `.grading/probes/<team>-lighthouse-mapping.txt`（rubric 映射建议）。
- **`./probes/probe-a11y.sh`** — 跑 axe-core CLI 扫关键页面的 a11y 违规项，输出 `.grading/probes/<team>-axe.json` 和 `.grading/probes/<team>-axe-summary.txt`。

---

## 评分流程（5 步）

### 步骤 1：定位与启动

1. 确认 spec 路径，记录 `spec_sha`（若 spec 在 git 仓库内）。
2. 读完 spec，列出：路由清单 / 核心组件 / 主流程（登录、提交、列表、详情、管理等）。
3. 读 `package.json` 识别技术栈（React/Vue、TS/JS、Tailwind/CSS-in-JS、状态管理等），记录 `project_sha`。
4. 启动 dev server，确认 `http://localhost:<port>` 可访问。

### 步骤 2：收集证据（evidence-first）

**静态证据**：
- 用 Grep/Glob 扫组件树、路由表、全局样式、TS 类型、状态管理。
- 为每个维度预留至少 1 处 `file:line` 引用。

**动态证据**：
```bash
# 一次性把主要页面的 3 断点 × 4 态截图跑完
bash ./probes/probe-screenshots.sh <team> http://localhost:3000

# 性能 & a11y
bash ./probes/probe-performance.sh <team> http://localhost:3000
bash ./probes/probe-a11y.sh <team> http://localhost:3000
```

所有截图落到 `.grading/shots/<team>-*.png`，所有 probe 日志落到 `.grading/probes/<team>-*.log`。

如果 `playwright` 不可用，fallback 为：提示评分人手动放置截图到 `.grading/shots/` 后再继续。

**交互证据**：手动或用 playwright 过一遍主流程（登录 → 核心 CRUD → 提交 → 错误路径），记录 console / network 异常。

### 步骤 3：按 10 维度逐条打分

> ⚠️ 取证不足时的强制行为
>
> - 维度打分 ≥7 或 ≤4 时，证据条数低于 evidence-requirements.md 规定的最低条数 → score 必须置 null，na_reason 写 "EVIDENCE_MISSING: 已尝试 X、Y，未能取得 Z"
> - 这与 "spec 未要求" 的 N/A 是两回事：N/A 写 "N/A — spec §X.Y 未规定"
> - 所有 EVIDENCE_MISSING 维度必须在报告底部 "## 评分风险" 段汇总列出

对照本文件下方 rubric（以及本文件 `## 评分标尺` 段），逐维度 0–10 打分。每一条打分必须附证据（file:line / 截图路径 / probe log 行号）。spec 未要求的维度写 "N/A — 原因"，不计入总分。

### 步骤 4：产出 report.md + summary.json

按本文件 `## 报告模板` 段填 `.grading/reports/<team>-frontend.md`；按 `../score-schema.json` 填 `.grading/reports/<team>-frontend.json`。每维度附"要到 10 差什么"2–4 条。

### 步骤 5：自检（必须通过）

```bash
# JSON schema 校验
npx ajv-cli validate -s skills/score-schema.json \
  -d .grading/reports/<team>-frontend.json

# 证据数量自检（每维度统计 file:line + 截图 + log 引用总数）
grep -cE "\.(tsx?|jsx?|vue|css|png|log):" .grading/reports/<team>-frontend.md
```

自检不过则回到步骤 2 补证据，不得放过。

---

## 10 个评分维度（权重合计 100）

| # | 维度 | 权重 |
|---|---|---:|
| 1 | Spec 一致性 | 20 |
| 2 | 主题与审美 | 12 |
| 3 | 动画与流畅度 | 10 |
| 4 | 状态完备性 | 10 |
| 5 | 代码质量 | 10 |
| 6 | 响应式适配 | 8 |
| 7 | 表单与输入反馈 | 8 |
| 8 | 性能 | 8 |
| 9 | 无障碍 (a11y) | 8 |
| 10 | 微文案 | 6 |

---

### 1. Spec 一致性（权重 20）

**关注点**
- spec 列出的每一条路由 / 页面 / 组件是否都实现了。
- 核心流程字段、状态、文案是否与 spec 对齐，没有偷工减料也没有无关超纲。
- 权限 / 角色分支（如管理员页面）是否完整。

**锚点**
- 10：spec 列出的所有页面和流程 100% 实现；字段、状态码、文案与 spec 完全一致；超纲功能明确标注为增强。
- 9：所有 spec 页面都实现，仅 1–2 个非关键字段或文案与 spec 微差（如详情页副标题文案差一个字、次要表头顺序略有不同），核心字段 / 状态码 / 路由 100% 对齐。
- 8：主流程和所有主要页面完整对齐 spec，spec 边角有遗漏（如非主路径的 1–2 个交互细节、1 个次要筛选项未实现），不影响核心业务闭环。
- 7：主流程对齐，但遗漏 1–2 个次要页面或 2–3 处字段细节。
- 5：核心页面都在，但多处字段偏离 spec，或 1 个关键流程（如提交 / 审核）未实现。
- 3：大段偏离 spec，或只实现了 demo 页面，真实业务流程缺失。

**取证方法**
1. 把 spec 的路由清单和 `src/routes` / `app/` 目录对应关系列表。
2. 核心流程逐步点一遍，截图 + 对照 spec 条款。
3. 对每个缺失项记录 spec 章节号 + 期望行为。

**证据要求**
- 至少 3 条 `file:line` 引用到组件 / 路由文件。
- 至少 2 张主流程截图。
- 一张 spec vs 实现的对齐表（在报告里用 markdown 表格）。

---

### 2. 主题与审美（权重 12）

**关注点**
- 配色是否有主题色，不是一地灰白。
- 字体、字号层次、间距是否成体系（不是全用默认）。
- 卡片、阴影、圆角是否有设计感（不是默认 `rounded-lg shadow`）。
- AI slop 味（见 `./anti-patterns.md`）。

**锚点**
- 10：有明确主题色系（主 / 辅 / 强调），自定义字体栈，间距节奏一致，视觉层次清晰到像一个真产品。
- 9：配色几近完美，字体 / 间距成体系，但有 1 处对比度差一点点（如次要文本 gray-500 on gray-50）或 1 个按钮 hover 颜色没定义。
- 8：主题色 / 字体 / 卡片风格都立住了，少数次要页面（如 404 / 设置）沿用了默认组件外观未统一改皮。
- 7：有基本主题色和字体选择，多数页面一致，但 1–2 个页面掉档或默认组件未改皮。
- 5：能看出改过样式，但主题不明、灰白主导，大量 shadcn 默认外观。
- 3：通篇灰白 + 默认 `bg-blue-500` 按钮 + `gray-100` 背景，典型 AI slop。

**取证方法**
1. 读 `./anti-patterns.md`，对照本项目截图逐条判断命中了哪些反模式。
2. 看 `tailwind.config.*` / `theme/*` / 全局 CSS，确认是否真的定义了主题 token。
3. 多张截图拼对比：不同页面的按钮、卡片、标题层次是否一致。

**证据要求**
- 至少 3 张截图覆盖 3 个不同页面。
- 至少 1 条 `tailwind.config.*:line` 或 `theme.ts:line` 的引用。
- 反模式命中清单（至少覆盖 `anti-patterns.md` 中前 5 条）。

---

### 3. 动画与流畅度（权重 10）

**关注点**
- 页面切换 / 弹窗 / Toast / 菜单的过渡是否自然，不是突变。
- 微交互（hover、按压、图标反馈）是否有。
- 无明显 layout shift，列表加载不跳动。
- 主交互保持 60fps，不卡顿。

**锚点**
- 10：关键过渡用 spring / cubic-bezier，有进入 / 离开动画；微交互覆盖主要按钮；无 layout shift；滚动和拖拽流畅。
- 9：主流程过渡都做了且曲线合理，微交互覆盖充分，仅 1 处 Toast 或弹窗离场略生硬（直接消失而非 fade-out）。
- 8：主要页面切换 / 弹窗过渡自然，有 hover / active 反馈，偶有 1 处列表加载时图片未占位导致轻微 layout shift。
- 7：主要过渡做了 fade / slide，微交互覆盖部分按钮，偶有 1–2 处抖动。
- 5：只有默认 Tailwind `transition`，弹窗 / 路由硬切，hover 仅变色。
- 3：零动画，UI 突变，列表加载瞬间 reflow 一大片。

**取证方法**
1. 录屏或跑 playwright 的 trace（`--trace on`）观察过渡。
2. 搜 `transition` / `motion` / `framer-motion` / `@keyframes` 的使用。
3. 在 DevTools Performance 面板看关键交互的 FPS。

**证据要求**
- 至少 1 段 trace 截图或录屏帧。
- 至少 2 条 `file:line` 证明动画实现（或证明没有）。

---

### 4. 状态完备性（权重 10）

**关注点**
- loading / empty / error / success 四态在关键列表和详情页是否都覆盖。
- loading 有 skeleton 或 spinner，不白屏。
- empty 有引导（不只是 "No data"）。
- error 有可操作出路（重试、返回）。

**锚点**
- 10：所有主要数据组件都实现了 4 态，空态有插画或引导 CTA，错误态有重试按钮且区分网络 / 业务错误。
- 9：主要组件 4 态齐全且各态都有 CTA，仅 1 处空态缺插画 / 引导图（但仍有文案引导），或 error 未区分 offline vs 业务错误。
- 8：关键列表和详情页 4 态都在且可用，次要页面（如设置、帮助）缺 empty 态或 error 态回退到默认 error boundary。
- 7：主流程四态到位，但 1–2 个次要页面缺 empty 或 error。
- 5：只有 loading + success，empty 是 "No data"，error 是 `alert(err)`。
- 3：接口慢就白屏，接口错就崩白页或 console 报错。

**取证方法**
1. 用 DevTools Network 面板把关键接口设为 Slow 3G + 手动 Fail，分别截图。
2. 把数据清空 / mock 空数组看 empty 态。
3. `bash ./probes/probe-screenshots.sh` 已内置 empty / error view 的路由截图。

**证据要求**
- 至少 4 张截图覆盖 loading / empty / error / success。
- 至少 2 条 `file:line` 引用组件的状态分支代码。

---

### 5. 代码质量（权重 10）

**关注点**
- 组件拆分粒度合理（不是一个 500 行的巨型组件）。
- TypeScript 类型真实有效，不是满屏 `any`。
- hooks 使用正确（依赖数组齐全，无不必要 re-render）。
- 没有严重 prop drilling，状态管理有章法。
- 复用度（公共组件、常量、工具函数）。

**锚点**
- 10：目录分层清晰，组件 ≤ 200 行，类型覆盖 100%，hooks 无警告，状态管理边界清楚，复用充分。
- 9：分层和类型都到位，仅 1–2 处 `any` 出现在第三方类型缺口位置且有注释，组件行数和 hooks 依赖都干净。
- 8：整体架构清晰、复用良好，个别组件接近 300 行但职责单一，或有 1 处轻度 prop drilling（≤3 层）。
- 7：整体干净，偶有 1–2 处 `any` 或轻微 prop drilling，但架构能看懂。
- 5：能跑，但有巨型组件或 `any` 满天飞，hooks 依赖数组乱填。
- 3：意大利面式代码，大量 console.log，类型形同虚设，复制粘贴成灾。

**取证方法**
1. Grep `any`、`@ts-ignore`、`console.log` 数量。
2. 按文件行数排序，挑最长的几个 component 文件看。
3. 抽 2–3 个 hook 检查依赖数组。
4. 对照 `./anti-patterns.md` 中的前端代码反模式。

**证据要求**
- 至少 4 条 `file:line` 引用（好的和差的都要有）。
- 一组 grep 统计数据（any / ts-ignore / console.log 计数）。

---

### 6. 响应式适配（权重 8）

**关注点**
- desktop (≥1280) / tablet (768–1279) / mobile (<768) 三个断点都能看、能用。
- 布局不断裂，按钮不压成一坨。
- 手势和触达（最小 44px 触控区域）。

**锚点**
- 10：三断点均精心布局，mobile 有专门导航（抽屉 / tab bar），内容优先级调整合理。
- 9：三断点都精心布局且 mobile 有专属导航，仅 1 处次要弹窗在 mobile 下略宽 / 按钮组偶尔换行。
- 8：desktop / tablet / mobile 都可用且 mobile 导航做了重构，但 1–2 个次要页面（如长表格）在 mobile 下需要横向滚动。
- 7：三断点可用，但 mobile 多处拥挤或需要横向滚动。
- 5：只在 desktop 看着正常，mobile 勉强能用但布局错乱。
- 3：只做 desktop，mobile 直接溢出 / 重叠 / 不可点。

**取证方法**
1. `bash ./probes/probe-screenshots.sh` 已生成 3 断点截图。
2. 查 `tailwind.config` 断点设置和组件里 `sm:` / `md:` / `lg:` 分布。

**证据要求**
- 3 断点 × 至少 2 个页面 = 至少 6 张截图。
- 至少 2 条 `file:line` 体现断点处理代码。

---

### 7. 表单与输入反馈（权重 8）

**关注点**
- 客户端校验（必填、格式、长度）。
- 错误提示贴近字段，不是 alert。
- 提交过程中按钮禁用 + loading，防重复提交。
- 成功后有明确反馈（toast / 跳转 / inline success）。

**锚点**
- 10：全表单含行内校验 + 提交防抖 + 成功态 toast，键盘可 tab 过全部字段，有 `aria-invalid` 标注。
- 9：所有表单行内校验 + 防重复提交 + 成功反馈到位，仅 1 处缺 `aria-invalid` 或 1 处错误样式与全站不完全统一。
- 8：主表单校验 / 禁用态 / 成功反馈完整，次要表单（如反馈、设置）仅做必填校验未覆盖格式 / 长度。
- 7：主表单有基本校验和禁用态，1–2 处错误提示样式不统一。
- 5：只有后端兜底校验，错误用 alert，能双击提交产生两条记录。
- 3：没校验，没禁用，错了崩掉，没有任何反馈。

**取证方法**
1. 对每个表单跑：空提交 / 非法格式 / 超长字段 / 快速连点提交，截图 + 录 network。
2. 搜 `useForm` / `zod` / `yup` / `disabled` / `isSubmitting` 的使用。

**证据要求**
- 至少 3 张截图（空提交 / 非法 / 成功）。
- 至少 2 条 `file:line` 引用校验逻辑。
- 一条 network log 证明是否防重复提交。

---

### 8. 性能（权重 8）

**关注点**
- 首屏 TTFB + FCP + LCP 合理（本地 dev 下 LCP < 2s 可接受）。
- bundle 体积合理，无重复依赖、无未用的大库。
- 长列表虚拟化、图片懒加载。
- 交互响应（INP）流畅。

**锚点**
- 10：Lighthouse Performance ≥ 90（本地 dev 下），关键页面 LCP < 1.5s，bundle < 500KB gzip，长列表虚拟化。
- 9：Lighthouse 85–89，LCP < 2s，bundle 500–700KB gzip，图片懒加载和 code splitting 都做了，仅缺长列表虚拟化。
- 8：Lighthouse 80–84，首屏可接受（LCP < 2.5s），bundle 合理但有 1 处未 code-split 的路由或未压缩的大图。
- 7：Lighthouse 75–89，有明显可优化点但不影响体验。
- 5：Lighthouse 50–74，首屏偏慢或 bundle 臃肿（> 1MB gzip 无理由）。
- 3：Lighthouse < 50，切页面要等几秒，JS 主线程长期占满。

**取证方法**
1. `bash ./probes/probe-performance.sh` 生成 TTFB / FCP / LCP 数据。
2. `npm run build` 看产物大小；`npx source-map-explorer` 看 bundle 组成（可选）。
3. 搜 `React.lazy` / `import()` / `loading="lazy"` / 虚拟列表库使用。

**证据要求**
- 至少 1 份 `<team>-lighthouse.json` + `<team>-lighthouse-mapping.txt`。
- 至少 1 条 build 产物大小数据。
- 至少 2 条 `file:line` 体现优化手段或缺失。

---

### 9. 无障碍 a11y（权重 8）

**关注点**
- 键盘可导航（Tab 顺序合理，焦点可见）。
- 语义化标签（button / a / label / heading 层级）。
- 颜色对比度达 WCAG AA（正文 4.5:1，大字 3:1）。
- ARIA 属性用对（不滥用）。
- `focus-visible` 样式存在。

**锚点**
- 10：axe 扫描零严重违规，全键盘可操作，`focus-visible` 清晰，表单有 label 关联，对比度全过。
- 9：axe 零严重 + 零中等违规，仅 1–2 条 minor（如冗余 role、landmark 命名），键盘 / 焦点 / 对比度全过。
- 8：axe 仅 1 条中等违规（如单处对比度 4.3:1），键盘可用且 `focus-visible` 覆盖主要交互元素，label 全关联。
- 7：axe 有 1–2 条中等违规，键盘可用但焦点环偶尔消失。
- 5：多条对比度不足，部分按钮用 `<div>`，无 `focus-visible`。
- 3：大量 `<div onClick>`，Tab 键按下去什么都不响应。

**取证方法**
1. `bash ./probes/probe-a11y.sh` 跑 axe-core，看违规清单。
2. 手动 Tab 一遍关键页面。
3. 搜 `role=` / `aria-` / `focus-visible` / `<label` 的使用密度。

**证据要求**
- 1 份 `<team>-axe.json` + `<team>-axe-summary.txt`。
- 至少 2 条 `file:line` 引用（正或反面）。
- 至少 1 张键盘焦点截图。

---

### 10. 微文案（权重 6）

**关注点**
- 按钮文案是动词 + 对象，不是 "OK" / "Submit"。
- 空态文案告诉用户下一步做什么。
- 错误信息具体且可操作（不是 "Something went wrong"）。
- 文案风格统一（全站同一人称、同一语气）。

**锚点**
- 10：所有按钮、空态、错误态的文案都经过润色，一致、具体、有品牌语气。
- 9：主要按钮 / 空态 / 错误文案都具体且一致，仅 1–2 条次要操作按钮沿用了"确定 / 取消"通用文案。
- 8：关键流程文案具体有引导（空态有 CTA、错误有可操作指引），但错误信息在 2–3 处直接透传后端 message 未本地化。
- 7：关键按钮和空态文案良好，但错误信息偶有通用模板。
- 5：按钮是 "提交" / "确定"，空态是 "暂无数据"，错误是 "操作失败"。
- 3：混用中英文，或全英文但像机翻，文案语气不统一。

**取证方法**
1. 把所有按钮 / 空态 / 错误文案抽样列表（grep 关键 string）。
2. 看同一操作在不同页面的按钮文案是否一致。

**证据要求**
- 至少 1 份文案抽样表（按钮 / 空态 / 错误 各 ≥ 3 条）。
- 至少 2 条 `file:line` 引用具体文案位置。

---

## 产出 checklist

评分结束前逐项勾选，任一不通过就回到相应步骤补齐：

- [ ] `.grading/reports/<team>-frontend.md` 已按本文件 `## 报告模板` 段结构填完，10 个维度全部评完（或明确标 N/A）。
- [ ] `.grading/reports/<team>-frontend.json` 已产出，并通过 `npx ajv-cli validate -s skills/score-schema.json` 校验。
- [ ] 每个维度都有证据引用，且满足本文件 `## 证据硬约束` 段（≥7 / ≤4 分 ≥2 条；5–6 分 ≥1 条）。
- [ ] `.grading/shots/` 含至少 3 断点 × 4 态的截图；`.grading/probes/` 含 `<team>-lighthouse.json` + `<team>-lighthouse-mapping.txt` + `<team>-axe.json` + `<team>-axe-summary.txt`。
- [ ] 报告末尾给出"最该优先修的 3 件事"，每条对应到具体维度和 file:line。
