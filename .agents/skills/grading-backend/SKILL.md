---
name: grading-backend
description: Grade a team's backend implementation against its spec on 9 weighted dimensions, producing a markdown report + JSON summary with evidence.
---

# grading-backend

给 AI 培训项目后端实现打分。50 学员分成 ~12 组，按 spec-driven 方式实现本地部署的后端服务。本 skill 让 Claude（或 Qoder / Cursor / Claude Code agent）按统一 rubric 给某一组的后端打分，产出可给学员的 markdown 报告 + 可汇总 leaderboard 的 JSON。

---

## 前置依赖

- **本地可跑**：待评后端能在本机启动（`npm run dev` / `uvicorn ...` / `go run ./...` / `./gradlew bootRun` 等），默认 `http://localhost:8080`（按项目 README 调整），有 health check 端点（`/health` / `/healthz` / `/ping`）或其他就绪信号。
- **Spec 文档位置**：`<project>/docs/spec.md` 或 `<project>/README.md` 或 `<project>/spec/*`。找不到则先向用户确认 spec 路径再开工，不要凭空评分。
- **Node.js 环境**：Node ≥ 18，用来跑 `npx ajv-cli` 校验 JSON、`npx autocannon` 做压测。
- **curl**：所有接口探针和取证命令基于 curl，macOS / Linux 自带即可。
- **输出目录**：所有证据和报告写到待评项目根目录下的 `.grading/`（已由 spec 约定 gitignore）。

**约定的工作目录**：所有 probe 脚本和 `.grading/` 输出都默认在**待评项目根目录**下执行。即评分时：
1. cd 到被评项目（如 `cd group-workshop/group-2`）
2. 用绝对路径调用 probe：`bash $WORKSHOP_ROOT/skills/grading-backend/probes/probe-robustness.sh team-2 http://localhost:8080 /api/items`
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

- **`./anti-patterns.md`** — 后端反模式清单。**打"健壮性"、"代码分层"、"性能"三个维度时必读**，用来识别 controller 里写 SQL、裸 `try/except: pass` 吞异常、循环里 query 造成 N+1、写操作非幂等、错误响应结构每接口不同等典型滑坡。
- **`./examples/good-report.md`** 和 **`./examples/mediocre-report.md`** — 两份标定样例报告。**打分前读一次做分布校准**，避免全班都打 8 分这种分不开档的问题。
- **`./probes/probe-robustness.sh`** — 健壮性探针组合，跑 8 个场景（空 body / 错类型 / 超长字段 / 缺必填 / 越权 / 幂等重放 / 并发冲突 / 未登录）。取证时直接 `bash ./probes/probe-robustness.sh <team> <base-url> <path>`，不要手搓 curl。每个 probe 写 `.grading/probes/<team>-<probe-name>.log`，总表写 `.grading/probes/<team>-robustness-summary.md`。
- **`./probes/probe-performance.sh`** — 基于 `npx autocannon` 的 p50/p95/p99 压测脚本，输出 `.grading/probes/<team>-autocannon.log`（原始 autocannon 输出）和 `.grading/probes/<team>-perf-summary.txt`（解析后的 p50/p95/rps + rubric 建议）。

---

## 评分流程（5 步）

### 步骤 1：定位与启动

1. 确认 spec 路径，记录 `spec_sha`（若 spec 在 git 仓库内）。
2. 读完 spec，列出：接口清单（method + path + 入参 + 出参 + 状态码） / 数据模型 / 权限角色 / 关键写操作。
3. 读 `package.json` / `pyproject.toml` / `go.mod` / `pom.xml` 识别技术栈（Node/Python/Go/Java、ORM、测试框架、日志库），记录 `project_sha`。
4. 启动后端服务，确认 `http://localhost:<port>/<health>` 可访问（curl 拿到 200 或 spec 约定的就绪响应）。如启动失败直接记录在报告"启动阻塞"一节，本维度不硬给 0 分，但在"Spec 一致性"里扣分。

### 步骤 2：收集证据（evidence-first）

**静态证据**：
- 用 Grep/Glob 扫接口清单、分层目录（controller/service/repo）、schema / 迁移、测试目录、日志代码。
- 为每个维度预留至少 1 处 `file:line` 引用。

**动态证据**：

```bash
# 健壮性：对主要写接口跑一遍 8 个 probe
bash ./probes/probe-robustness.sh <team> http://localhost:8080 /api/items

# 性能：对 GET 主列表接口 & POST 主写接口各压一次
bash ./probes/probe-performance.sh <team> http://localhost:8080 /api/items

# 测试套件（按栈择一）
npm test -- --coverage        # Node
pytest --cov                  # Python
go test -cover ./...          # Go

# 手工 curl：对 spec 列出的每个接口至少调一次，记录 method + path + 状态码 + 响应体
curl -i -X GET  http://localhost:8080/api/items
curl -i -X POST http://localhost:8080/api/items -H 'Content-Type: application/json' -d '{"name":"demo"}'
```

所有 probe 日志落到 `.grading/probes/<team>-*.log`，手工 curl 的关键输出也要 `tee` 进 `.grading/probes/<team>-curl.log`。

**交互证据**：按 spec 的主业务流（注册 → 登录 → 创建 → 查询 → 更新 → 删除，或 spec 指定流程）串一遍，记录每步状态码、响应体片段、异常。

### 步骤 3：按 9 维度逐条打分

> ⚠️ 取证不足时的强制行为
>
> - 维度打分 ≥7 或 ≤4 时，证据条数低于 evidence-requirements.md 规定的最低条数 → score 必须置 null，na_reason 写 "EVIDENCE_MISSING: 已尝试 X、Y，未能取得 Z"
> - 这与 "spec 未要求" 的 N/A 是两回事：N/A 写 "N/A — spec §X.Y 未规定"
> - 所有 EVIDENCE_MISSING 维度必须在报告底部 "## 评分风险" 段汇总列出

对照本文件下方 rubric（以及本文件 `## 评分标尺` 段），逐维度 0–10 打分。每一条打分必须附证据（file:line / curl log 行号 / probe log 行号 / 测试输出行号）。spec 未要求的维度写 "N/A — 原因"，不计入总分。

### 步骤 4：产出 report.md + summary.json

按本文件 `## 报告模板` 段填 `.grading/reports/<team>-backend.md`；按 `../score-schema.json` 填 `.grading/reports/<team>-backend.json`。每维度附"要到 10 差什么"2–4 条。

### 步骤 5：自检（必须通过）

```bash
# JSON schema 校验
npx ajv-cli validate -s skills/score-schema.json \
  -d .grading/reports/<team>-backend.json

# 证据数量自检（每维度统计 file:line + probe log + curl log 引用总数）
grep -cE "\.(ts|js|py|go|java|sql|log):" .grading/reports/<team>-backend.md
```

自检不过则回到步骤 2 补证据，不得放过。

---

## 9 个评分维度（权重合计 100）

| # | 维度 | 权重 |
|---|---|---:|
| 1 | Spec 一致性 | 20 |
| 2 | 健壮性 | 15 |
| 3 | API 设计 | 12 |
| 4 | 测试 | 12 |
| 5 | 数据建模 | 10 |
| 6 | 代码分层 | 10 |
| 7 | 性能 | 8 |
| 8 | 可观测性 | 7 |
| 9 | 文档 | 6 |

---

### 1. Spec 一致性（权重 20）

**关注点**
- spec 列出的每个接口（method + path）是否都实现了。
- 入参字段、出参字段、状态码、错误码是否与 spec 对齐。
- 权限 / 角色分支（如管理员接口）是否完整。
- 既不偷工减料，也不无关超纲。

**锚点**
- 10：spec 列出的所有接口 100% 实现；入参 / 出参 / 状态码 / 错误码完全对齐；超纲功能明确标注为增强。
- 9：所有接口都实现，仅 1–2 处非关键字段或错误码与 spec 微差（如 response 里多了一个无害字段、错误码用 400 而 spec 要 422），核心路径 100% 对齐。
- 8：主要接口 + 次要接口全部实现，spec 边角有遗漏（如 1 个非主路径查询参数未支持、1 个 soft-delete 恢复接口缺失），业务闭环完整。
- 7：主要接口齐全，但遗漏 1–2 个次要接口或 2–3 处字段细节 / 状态码错位。
- 5：核心 CRUD 在，但多处字段偏离 spec，或 1 个关键接口（如审核、权限切换）未实现。
- 3：大段偏离 spec，只实现了 demo 级接口，真实业务流程缺失。

**取证方法**
1. 把 spec 接口清单与代码里的路由注册逐一对应：
   ```bash
   # Node/Express 举例
   grep -rnE "app\.(get|post|put|patch|delete)|router\.(get|post|put|patch|delete)" src/
   # FastAPI
   grep -rnE "@(app|router)\.(get|post|put|patch|delete)" .
   # Go/Gin
   grep -rnE "\.(GET|POST|PUT|PATCH|DELETE)\(" .
   ```
2. 对 spec 的每个接口手工 curl 一遍，记录状态码与响应体。
3. 缺失项记录 spec 章节号 + 期望行为 + 实际行为。

**证据要求**
- 至少 4 条 `file:line` 引用到路由 / handler 文件。
- 一份 spec vs 实现的对齐表（报告里用 markdown 表格：接口 / spec 要求 / 实际 / 状态）。
- 至少 3 条 curl log 覆盖关键接口。

---

### 2. 健壮性（权重 15）

**关注点**
- 所有异常路径是否被处理（不是 `try/except: pass` 吞错）。
- 输入是否校验（类型、范围、必填、长度）。
- 关键写操作是否幂等（重试不重复创建）。
- 并发冲突是否考虑（乐观锁 / 事务）。
- 未登录 / 越权访问是否正确拒绝。

**锚点（基于 `probe-robustness.sh` 8 个 probe 的通过数）**
- 10：≥7 个 probe 通过；有明确错误码体系；关键写操作幂等；并发路径有锁或事务。
- 9：8 个 probe 通过 7 个，仅 1 处边界返回 500 而非结构化错误（如超长字段未截断就抛 DB error）；幂等 / 并发 / 错误码体系完整。
- 8：6/8 probe 合理（主操作幂等做了，越权 / 未登录拒绝正确），1–2 处边界未处理但返回的是统一错误结构而非堆栈。
- 7：≥5 个 probe 通过；主路径健壮，边界 / 并发有 1–2 处疏漏。
- 5：≥3 个 probe 通过；happy path 能跑，异常路径多处直接 500。
- 3：<3 个 probe 通过；基本没做异常处理，或报错直接把堆栈抛给前端。

**取证方法**
1. 跑 `bash ./probes/probe-robustness.sh <team> <base-url> <path>`，记录 8 个 probe 的通过数（每个 probe 有期望状态码）。
2. 检查响应码和错误信息格式是否统一：
   ```bash
   grep -rnE "try\s*\{|try:" src/ | head -20
   grep -rnE "except\s*:|catch\s*\(\s*\)" src/        # 裸 except / catch
   grep -rnE "pass\s*$|// ignore" src/
   ```
3. 对同一写接口用 `curl` 打两次相同 payload，看是否产生两条记录（幂等）。

**证据要求**
- 1 份 `<team>-robustness-summary.md`（标注通过数 `X/8`）+ 至少 3 份 `<team>-<probe-name>.log`。
- 至少 3 个 probe 的 curl + 响应摘录（报告里贴片段）。
- 至少 2 条 `file:line` 引用校验 / 错误处理代码。

---

### 3. API 设计（权重 12）

**关注点**
- RESTful 路径语义（资源复数名词、层级清晰）或 RPC 风格的一致性。
- 状态码用对（200/201/204/400/401/403/404/409/422/500）。
- 错误响应结构统一（如 `{code, message, details}`），不是每接口一种形状。
- 分页 / 过滤 / 排序有约定（`?page=&size=` 或 cursor）。
- 请求 / 响应字段命名一致（camelCase 或 snake_case 二选一不混用）。

**锚点**
- 10：路径和状态码全部合规；错误结构统一；分页 / 过滤 / 排序标准化；字段命名统一。
- 9：路径 / 状态码 / 错误结构全部合规，分页和命名统一，仅 1 处过滤参数风格与全站不完全一致（如一个接口用 `q` 其他用 `keyword`）。
- 8：RESTful 合规且错误结构统一，分页做了但 1 个接口返回 201 而 spec 约定 200（或反之），字段命名统一。
- 7：整体合规，但 1–2 个状态码错位（如 POST 成功返 200 而不是 201）或 1 处错误结构不一致。
- 5：多数接口能用，但状态码乱用、错误结构每接口一种、分页无约定。
- 3：全部 200 + `{ok: false}`，无状态码体系，路径随意。

**取证方法**
1. 搜路由注册 + 手工 curl 一遍关键接口看响应结构：
   ```bash
   for p in /api/items /api/users /api/auth/login; do
     curl -s -o - -w "\n[HTTP %{http_code}]\n" http://localhost:8080$p
   done
   ```
2. 抽取 3–5 条错误响应，对比形状是否一致。
3. 分页接口：`curl "http://localhost:8080/api/items?page=1&size=10"` 看是否识别。

**证据要求**
- 至少 5 条 curl log 覆盖成功 / 失败 / 分页三类。
- 至少 2 条 `file:line` 引用统一错误处理中间件（或反面证据说明缺失）。
- 一份错误响应结构对比表（报告里 3–5 行即可）。

---

### 4. 测试（权重 12）

**关注点**
- 是否有自动化测试（单元 + 集成）。
- 关键路径（登录、核心写操作、错误分支）是否覆盖。
- 测试是否真跑通，不是 skip 一片。
- 覆盖率数据。

**锚点（基于测试覆盖率）**
- 10：覆盖率 ≥70%；覆盖关键 happy + error 路径；集成测试真打接口；CI 本地 `npm test` / `pytest` / `go test` 一次绿。
- 9：覆盖率 ≥65% 且 happy + error 路径都覆盖，集成测试真打接口，仅 1 个次要错误分支（如幂等冲突）未测。
- 8：覆盖率 ≥55%，主要 happy + 核心 error 分支都有集成测试，次要模块仅单元测试未做集成覆盖。
- 7：覆盖率 ≥50%；主要 happy path 覆盖，error 路径少量。
- 5：覆盖率有但多数只 happy path，或集成测试缺失仅单元测试。
- 3：几乎没有测试（<20% 或只有 1–2 个 sanity test）或大量 skip / TODO。

**取证方法**
1. 按栈跑测试 + 覆盖率：
   ```bash
   npm test -- --coverage              # Node
   pytest --cov --cov-report=term       # Python
   go test -cover ./...                 # Go
   ./gradlew test jacocoTestReport       # Java
   ```
   把输出 tee 到 `.grading/probes/<team>-test.log`。
2. 统计测试文件数与被跳过的用例：
   ```bash
   grep -rnE "\.skip|@pytest\.mark\.skip|t\.Skip\(|xit\(|xdescribe\(" .
   ```
3. 抽一个 error 路径测试用例读 5–10 行，看是否真的断言了错误码而非只跑过。

**证据要求**
- 1 份 test 输出 log（含覆盖率数字）。
- 至少 3 条 `file:line` 引用测试文件（good case）或缺失（bad case）。
- 一条 skip 统计：`skip 数 / 总数`。

---

### 5. 数据建模（权重 10）

**关注点**
- schema / 模型定义与 spec 对齐（字段、类型、约束、关系）。
- 主键、外键、唯一索引、必要索引齐全。
- 有 migration 脚本 / 版本化，不是手改表。
- 字段命名、类型选择合理（时间用 `timestamptz` / `datetime`，金额不用 float）。

**锚点**
- 10：schema 与 spec 100% 对齐；外键 / 唯一约束 / 索引完整；有 migration 版本链；命名和类型都合理。
- 9：schema 对齐且约束完整，migration 版本链干净，仅缺 1 个次要查询索引（不影响主热路径）。
- 8：字段类型 / 外键 / 主键 / 唯一约束都对，migration 存在，但 1 处复合索引缺失或 1 个字段用 `text` 而 spec 建议 `varchar(n)`。
- 7：schema 对齐，但缺 1–2 个索引或 1 处外键缺失，migration 有但不规整。
- 5：schema 勉强能跑，多处字段类型错位（如用 varchar 存时间），索引全无。
- 3：无 schema 定义 / 无 migration，或字段跟 spec 大幅偏离。

**取证方法**
1. 找 schema 文件：
   ```bash
   find . -type f \( -name "*.sql" -o -name "schema.prisma" -o -name "models.py" -o -name "entity*.go" -o -name "*Entity.java" \) | head
   find . -type d -name "migrations" -o -name "migrate"
   ```
2. 对每个核心表记录：字段 / 类型 / 约束 / 索引，对照 spec。
3. 看 migration 目录是否有版本编号、是否 down script 齐全。

**证据要求**
- 至少 3 条 `file:line` 引用 schema / model / migration 文件。
- 一份核心表字段对照表（表名 / 字段 / 类型 / spec 期望 / 实际）。
- 索引清单（从 `CREATE INDEX` 或 ORM 注解里抽）。

---

### 6. 代码分层（权重 10）

**关注点**
- controller / handler / route 层只做参数解析和响应包装，不写业务。
- service / usecase 层承载业务逻辑，不直接写 SQL。
- repository / dao 层封装数据访问，controller 不绕过它直接拿 ORM。
- 跨层依赖方向单一（controller → service → repo），不反向依赖。

**锚点（基于 grep controller 里是否有 SQL/ORM 调用）**
- 10：三层清晰；controller 内无 SQL / ORM 调用；service 内无 http 响应组装；循环依赖为 0。
- 9：controller 全部是薄壳（参数解析 + 转发 service），service 不碰 http，仅 1 处 repo 里拼了一点点业务判断应归 service。
- 8：分层整体清晰，controller 基本只做转发，但 1 个 handler 里直接调了一次 ORM（如简单 count 查询绕过 repo），依赖方向仍单向。
- 7：整体分层，但有 1–2 个 controller 顺手调了 ORM 或在 handler 里拼了复杂业务。
- 5：有分层意图但大量泄漏：controller 里经常直接 `prisma.xxx` / `db.query`，service 里写 `res.json(...)`。
- 3：一锅端，所有逻辑都在 route handler 里，没有 service / repo 概念。

**取证方法**
1. Grep controller 目录有无直接 SQL / ORM：
   ```bash
   # Node/TS
   grep -rnE "prisma\.|knex\(|db\.query|createQueryBuilder|sequelize\." src/controllers src/routes src/handlers 2>/dev/null
   # Python
   grep -rnE "session\.query|db\.execute|cursor\.execute" app/api app/routes 2>/dev/null
   # Go
   grep -rnE "db\.Query|db\.Exec|gorm\.|sqlx\." internal/handler internal/controller 2>/dev/null
   ```
   命中越多越说明泄漏。
2. 抽 2 个 controller 文件读头 30 行，看逻辑是否"薄"。
3. 画依赖箭头（口述即可）：`controller -> service -> repo` 是否单向。

**证据要求**
- 至少 1 组 grep 统计：「controller 目录命中 SQL/ORM 次数 / 总 controller 文件数」。
- 至少 3 条 `file:line`（好的 service / 坏的泄漏各举例）。
- 一句话描述依赖方向。

---

### 7. 性能（权重 8）

**关注点**
- 关键接口响应时间（p50 / p95 / p99）。
- 无 N+1 查询（循环里发请求 / query）。
- 合理的索引支撑主查询。
- 有必要的缓存 / 批处理（spec 要求时）。

**锚点（基于 autocannon p95，10 并发 5 秒，本地）**
- 10：主 GET 列表接口 p95 < 100ms；写接口 p95 < 300ms；N+1 零命中。
- 9：主 GET p95 < 150ms，写 p95 < 400ms，N+1 零命中，仅 1 处次要聚合查询未加索引但 p95 仍在可接受区间。
- 8：主 GET p95 < 200ms，写 p95 < 500ms，热路径无 N+1，冷路径（如后台导出）存在 1 处 N+1 但不影响生产体验。
- 7：p95 < 300ms；偶有 1–2 处 N+1 但不在热路径。
- 5：p95 < 800ms；热路径明显 N+1 或缺索引。
- 3：p95 ≥ 800ms 或直接接口超时 / 打挂服务。

**取证方法**
1. 跑 `bash ./probes/probe-performance.sh <team> <base-url> <path>`，读 p50/p95/p99。
2. 检查 N+1：
   ```bash
   # 找循环里调 query / repo 的反模式
   grep -rnE "for\s|forEach|\.map\(" src/ | grep -E "repo\.|query|findBy"
   ```
3. 对主查询看 EXPLAIN（可选）：`EXPLAIN SELECT ... FROM items WHERE ...`。

**证据要求**
- 1 份 `<team>-autocannon.log` + 1 份 `<team>-perf-summary.txt`（含 p50/p95/p99）。
- 至少 2 条 `file:line` 体现 N+1 或优化手段（或反面证据）。
- 一条关于索引 / 缓存 / 批处理的结论。

---

### 8. 可观测性（权重 7）

**关注点**
- 有结构化日志（JSON 或至少 key=value），不是满屏 `print` / `console.log`。
- 关键操作有 trace：请求 ID / 用户 ID / 业务动作。
- 错误日志带上下文（请求体摘要、堆栈）。
- 有 metrics / health 端点（起码 `/health`）。

**锚点（基于 `console.log` / `print` 占日志语句比例）**
- 10：统一日志库（pino / zap / loguru / slog / logback）；所有接口有请求进入 + 结束日志 + requestId；`print`/`console.log` 数 ≤ 2。
- 9：统一日志库 + 全接口 requestId + 结构化日志，`print`/`console.log` ≤ 5 且都在非生产路径（如 seed 脚本），`/health` 可用。
- 8：结构化日志覆盖主要接口且有 requestId，但 1–2 个次要接口缺请求结束日志，`print`/`console.log` 残留 5–10 处。
- 7：有日志库，但部分关键路径漏打，或偶有 `console.log` 残留（3–10 处）。
- 5：日志库有但只打错误；`print`/`console.log` 占比 > 30%。
- 3：全靠 `print` / `console.log`，没有 requestId / 结构化，错误靠 try/catch 打一句。

**取证方法**
1. 统计日志风格：
   ```bash
   grep -rncE "console\.log|console\.debug|\bprint\(" src/ | sort -t: -k2 -n -r | head
   grep -rncE "logger\.|log\.(info|warn|error|debug)" src/ | sort -t: -k2 -n -r | head
   ```
   算两个总数相除得到 "jank 比例"。
2. 查 `/health` 或 `/metrics`：`curl -i http://localhost:8080/health`。
3. 抽一个 error 分支读，看是否打了上下文。

**证据要求**
- 一组 grep 统计（logger 数 vs print/console.log 数）。
- 至少 2 条 `file:line` 引用日志配置或关键调用。
- 1 条 `/health` 或 `/metrics` 的 curl 响应。

---

### 9. 文档（权重 6）

**关注点**
- README 含启动步骤、依赖、环境变量、示例调用，不假设读者已懂。
- 接口文档（OpenAPI / Swagger / Postman collection / README 章节）存在且与实现同步。
- 示例 curl / 请求体可直接复制跑通。
- 关键设计决策（分层、鉴权、数据模型）有一小段说明。

**锚点**
- 10：README 从零到跑通 5 分钟内完成；OpenAPI 文档完整、可在 `/docs` 打开；有架构图或 ADR。
- 9：README 跑通流畅，OpenAPI 完整且与实现一致，有架构图，仅 ADR / 设计决策说明简略（1–2 条一句话带过）。
- 8：README 启动步骤 + 环境变量 + 示例 curl 齐全，OpenAPI 可打开且主接口字段对齐，无架构图但有一段分层 / 鉴权文字说明。
- 7：README 够用，接口文档有但 1–2 处字段过期；无架构图。
- 5：README 只有 "npm install && npm start"，接口文档靠读代码。
- 3：几乎无文档，spec 之外无任何说明。

**取证方法**
1. 按 README 从零跑一遍（或复查步骤 1 的启动体验），记录卡点。
2. 找接口文档：
   ```bash
   find . -type f \( -name "openapi*.y*ml" -o -name "swagger*.json" -o -name "*.postman_collection.json" \)
   curl -i http://localhost:8080/docs          # Swagger UI
   curl -i http://localhost:8080/openapi.json  # FastAPI / 多数框架
   ```
3. 抽示例 curl 从 README 粘出来跑一次，记录是否通。

**证据要求**
- 至少 2 条 `README.md:line` 或 `docs/*.md:line` 引用。
- 1 次"照 README 跑"的实测结果（通 / 不通 + 卡点）。
- 接口文档位置 + 1 条示例 curl log。

---

## 产出 checklist

评分结束前逐项勾选，任一不通过就回到相应步骤补齐：

- [ ] `.grading/reports/<team>-backend.md` 已按本文件 `## 报告模板` 段结构填完，9 个维度全部评完（或明确标 N/A）。
- [ ] `.grading/reports/<team>-backend.json` 已产出，并通过 `npx ajv-cli validate -s skills/score-schema.json` 校验。
- [ ] 每个维度都有证据引用，且满足本文件 `## 证据硬约束` 段（≥7 / ≤4 分 ≥2 条；5–6 分 ≥1 条）。
- [ ] `.grading/probes/` 含：`<team>-robustness-summary.md` + 各 probe `<team>-<probe-name>.log`、`<team>-autocannon.log` + `<team>-perf-summary.txt`、`<team>-test.log`、`<team>-curl.log`。
- [ ] 报告末尾给出"最该优先修的 3 件事"，每条对应到具体维度和 file:line。
