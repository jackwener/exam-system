# 项目评分报告 — team-calibration-good（后端）

- 评分人：Claude@sonnet-4.6
- 日期：2026-04-14
- Spec 版本：`docs/spec.md` @ `a1b2c3d`
- 被评项目 commit：`9f8e7d6`
- 评分耗时：42 分钟

## 总分：85 / 100 — 等级 A

技术栈：Node.js 20 + Express 4 + TypeScript + Prisma + PostgreSQL 15 + Vitest。是一个任务管理（todo）后端：`/api/auth/login` + `/api/tasks` CRUD + 分页 + 删除 confirm 保护。

## 维度汇总

| # | 维度 | 得分 | 权重 | 加权 | 一句话 |
|---:|---|---:|---:|---:|---|
| 1 | Spec 一致性 | 9 | 20 | 18.0 | 接口路径/字段/状态码基本全量对齐，只差一处 cursor 分页格式 |
| 2 | 健壮性 | 8 | 15 | 12.0 | 8 个 probe 通过 7 个，仅重复提交未做幂等键 |
| 3 | API 设计 | 10 | 12 | 12.0 | RESTful 清晰、错误码统一、分页/过滤/排序齐全 |
| 4 | 测试 | 8 | 12 | 9.6 | 行覆盖 83%，关键路径全覆盖，但并发测试偏少 |
| 5 | 数据建模 | 8 | 10 | 8.0 | schema 规范、索引齐全，迁移脚本完备，少 1 个复合索引 |
| 6 | 代码分层 | 9 | 10 | 9.0 | controller/service/repo 三层清晰，依赖注入到位 |
| 7 | 性能 | 8 | 8 | 6.4 | autocannon p95=38ms，列表接口无 N+1 |
| 8 | 可观测性 | 7 | 7 | 4.9 | pino 结构化日志 + requestId，缺 metrics 导出 |
| 9 | 文档 | 8 | 6 | 4.8 | README + OpenAPI + 示例 curl，curl 示例全部跑通 |

> 有效权重总和：100；N/A 维度：无
> 校对：Σ加权 = 84.7 → 四舍五入到 85

## 逐维度详评

### 1. Spec 一致性 — 9/10（权重 20）

**证据**
- `src/routes/auth.ts:12-58` 实现 spec §2.1 `POST /api/auth/login`，请求/响应字段逐项对齐（`email`、`password`、`token`、`user.id`）
- `src/routes/tasks.ts:23-180` 实现 spec §2.2 `/api/tasks` 全部 CRUD，包含 spec §2.2.4 要求的 `DELETE /api/tasks/:id?confirm=true` 二次确认保护
- 错误码表见 `src/lib/errors.ts:1-64`，与 spec §4 的 `VALIDATION_ERROR` / `UNAUTHORIZED` / `NOT_FOUND` / `CONFLICT` 四类一一对应
- probe 日志：`.grading/probes/team-calibration-good-spec-endpoints.log` 显示全部 11 个接口 2xx/4xx 语义正确
- 偏差：spec §2.2.3 要求游标分页响应体为 `{ items, nextCursor }`，实现返回 `{ data, next_cursor }` —— 命名风格与 spec 的 camelCase 不一致

**要到 10 差什么**
1. 把 `data` / `next_cursor` 改为 spec 规定的 `items` / `nextCursor`，避免前端做字段映射
2. spec §2.2.5 的 `PATCH /api/tasks/:id/status` 支持 `done|todo|archived`，实现里少了 `archived` 分支（`src/services/task.service.ts:142`）

---

### 2. 健壮性 — 8/10（权重 15）

**证据**
- probe 汇总：`.grading/probes/team-calibration-good-robustness-summary.md`：8 个健壮性 probe 通过 7 个
  - 空 body POST `/api/tasks` → 400 + `VALIDATION_ERROR`（✓，`src/middleware/validate.ts:18`）
  - 超长 title（10000 字符）→ 400 + 字段级错误（✓，zod schema 在 `src/schemas/task.schema.ts:8` 限 200 字）
  - 未登录访问 `/api/tasks` → 401（✓）
  - 非本人任务越权访问 → 404（避免信息泄漏，`src/services/task.service.ts:67`）
  - 并发同 ID DELETE → 第二次返回 404 而非 500（✓，事务处理）
  - 失败：同一 payload 连续 POST 两次产生两条记录（缺幂等键，`.grading/probes/...-idempotent.log`）
- `grep -rn "catch" src/` 无裸 `catch {}` 吞错；所有 catch 均 `next(err)` 交由统一错误中间件 `src/middleware/error.ts:1-42`

**要到 10 差什么**
1. 为写操作引入 `Idempotency-Key` header，相同 key 在 24h 内返回首次结果（参考 Stripe 的实现）
2. 对 `PATCH /api/tasks/:id` 加乐观锁：用 `updatedAt` 作 `If-Unmodified-Since` 字段，两客户端并发编辑时返回 409 而非后写覆盖前写

---

### 3. API 设计 — 10/10（权重 12）

**证据**
- RESTful：资源 URI 复数名词，HTTP 动词语义正确；`src/routes/tasks.ts` 无 `/getTask` / `/deleteTask` 这类 RPC 命名
- 错误响应全局统一为 `{ error: { code, message, details? } }`（`src/lib/errors.ts:20`），所有 4xx/5xx 走同一 shape
- 分页：游标分页 + `limit` 参数（1–100 区间校验，`src/schemas/list.schema.ts:4`）
- 过滤/排序：`/api/tasks?status=todo&sort=-createdAt` 支持多字段排序，白名单在 `src/lib/query.ts:12`，拒绝未声明字段
- OpenAPI spec 自动从 zod schema 生成，`docs/openapi.yaml` 可直接导入 Postman / Bruno 跑通

**要到 10 差什么**
本维度已达工业级范本标准。继续保持。唯一可挑毛病：批量删除 `DELETE /api/tasks?ids=...` 未收录在 OpenAPI 中，但 spec 本身也未要求。

---

### 4. 测试 — 8/10（权重 12）

**证据**
- `npm test -- --coverage` 输出：行覆盖 83.4%、分支覆盖 76.1%，报告见 `.grading/probes/team-calibration-good-coverage.log`
- 关键路径：`tests/integration/auth.test.ts`（登录失败 3 次锁定、token 过期刷新）、`tests/integration/tasks.test.ts`（CRUD + 分页 + 越权 + confirm 删除）全通过
- 测试用真实 PostgreSQL（通过 testcontainers），不是 sqlite 替身，接近生产行为
- 单测独立于集成测（`tests/unit/*` vs `tests/integration/*`），`vitest.config.ts:1-25` 分 project 配置
- 缺口：并发/竞态场景测试仅 1 条（`tests/integration/concurrency.test.ts:12`），面对事务隔离级别变化无保障

**要到 10 差什么**
1. 补并发用例：同一任务两客户端并发 PATCH，断言最终状态与更新日志一致
2. 把分支覆盖拉到 85%+：错误分支（DB 连接丢失、JWT secret 缺失）目前未覆盖，可用 mock 注入
3. 加契约测试（Pact 或简版 JSON schema 断言），锁死响应 shape，防止后续 breaking change 漏网

---

### 5. 数据建模 — 8/10（权重 10）

**证据**
- `prisma/schema.prisma:1-88` 建模规范：User / Task / Session 三表，外键 `Task.userId → User.id`，`onDelete: Cascade`
- 索引：`Task.userId + status`、`Task.createdAt`、`User.email`（唯一）均有声明（见 schema 第 42–48 行）
- 迁移：`prisma/migrations/` 下 6 个有序 migration，每个 migration 有 down 脚本，命名含语义（`20260401_add_task_archived_status/`）
- 软删除：`Task.deletedAt` 字段 + 查询 scope 封装在 `src/repos/task.repo.ts:8`，避免 controller 里忘记过滤
- 缺口：分页查询 `WHERE userId=? AND status=? ORDER BY createdAt DESC` 依赖的复合索引缺失，explain 输出见 `.grading/probes/team-calibration-good-explain.log`（Seq Scan on Task）

**要到 10 差什么**
1. 加复合索引 `(userId, status, createdAt DESC)` 并在 migration 里 `CREATE INDEX CONCURRENTLY`
2. 为软删除也加部分索引 `WHERE deletedAt IS NULL`，避免活跃数据集随历史积累而变慢
3. `User.email` 建议加 `CITEXT` 或存储前归一化大小写，防止重复注册

---

### 6. 代码分层 — 9/10（权重 10）

**证据**
- 目录结构清晰：`src/routes/`（controller，只做参数解析 + 调 service + 返回）、`src/services/`（业务逻辑）、`src/repos/`（数据访问，封装 Prisma）
- 反例巡检：`grep -rn "prisma\." src/routes/` 零命中——controller 没有直接访问 DB
- 依赖注入：`src/container.ts:1-38` 用轻量 IoC，service 构造函数接收 repo，测试时可替换
- 统一错误中间件：`src/middleware/error.ts` + 自定义 `AppError` 类，controller 只管抛不管格式化
- 扣分点：`src/services/task.service.ts:210-234` 把 email 通知逻辑直接塞在 service 里，应抽 `NotificationService` 以便以后换渠道

**要到 10 差什么**
1. 抽 `NotificationService` 并通过接口依赖注入，service 层保持纯业务
2. repo 层全部返回 domain model 而非 Prisma raw（当前 `task.repo.ts:45` 直接返回 `Prisma.Task`，service 层偶尔出现 `null` vs `undefined` 混用）

---

### 7. 性能 — 8/10（权重 8）

**证据**
- 压测：`npx autocannon -d 10 -c 20 http://localhost:8080/api/tasks` 结果：p50=12ms、p95=38ms、p99=71ms、0 失败，日志 `.grading/probes/team-calibration-good-autocannon.log`
- N+1 巡检：列表接口在 `src/services/task.service.ts:78` 用 Prisma `include: { tags: true }` 单次 JOIN 查询；启用 `prisma.$on('query')` 打印显示 1 次 SQL 即拿全量数据（`.grading/probes/...-sql-trace.log`）
- 连接池：`DATABASE_URL` 显式 `connection_limit=20`，压测下未见等待
- 扣分点：热点接口未加 HTTP cache 头（ETag / Cache-Control），同样数据 GET 两次仍完整查库

**要到 10 差什么**
1. 列表接口加 ETag（基于最大 `updatedAt`），304 可省一次序列化
2. 为只读热点（`GET /api/tasks/stats`）加 60 秒内存缓存（`lru-cache`），当前每次查库

---

### 8. 可观测性 — 7/10（权重 7）

**证据**
- 结构化日志：`src/lib/logger.ts:1-24` 用 pino，所有中间件/service 注入 `requestId`（`src/middleware/request-id.ts:1-18`）
- 关键写操作有 audit 日志：`src/middleware/audit.ts:8-40` 对 `POST/PATCH/DELETE` 打 `action + userId + resourceId`
- 慢查询阈值：Prisma middleware 超过 200ms 打 warn（`src/lib/prisma.ts:18-30`）
- 扣分点：无 metrics 导出（Prometheus / OpenTelemetry），只能靠日志事后回溯；无分布式 trace id 透传

**要到 10 差什么**
1. 接入 OpenTelemetry，导出 HTTP 延迟直方图 + DB 查询直方图，起码能画 p95 曲线
2. 健康检查分 `/healthz`（进程活着）和 `/readyz`（下游 DB 可达）两种，当前只有一个

---

### 9. 文档 — 8/10（权重 6）

**证据**
- `README.md:1-180` 包含：技术栈、启动步骤、环境变量清单、测试命令、常见问题 5 条
- OpenAPI 文档自动生成：`docs/openapi.yaml`（从 zod schema 推导），Swagger UI 挂在 `/docs` 路由
- 示例 curl：README 里 7 条示例逐条 copy 到终端均能跑通（`.grading/probes/team-calibration-good-readme-curl.log`）
- `.env.example` 覆盖全部必需变量，有注释说明含义
- 扣分点：缺部署/回滚说明；无架构图；CONTRIBUTING 缺失

**要到 10 差什么**
1. 补一张数据流图（客户端 → middleware → service → repo → DB），放 README 顶部
2. 增加"回滚 migration"的命令示例，避免学员在失败后手忙脚乱

---

## 亮点

- **错误响应格式全局统一**（`src/lib/errors.ts` + `src/middleware/error.ts`），这是大多数学员项目的最大失分点，本项目彻底避开
- **测试用 testcontainers 起真 Postgres**，而不是 sqlite 凑数，行为与生产一致
- **controller/service/repo 分层彻底**，`grep` 验证无跨层调用，接近工业级代码结构
- **游标分页实现规范**（而非简单 offset/limit），大数据量下不会出现重复/漏数据

## 最该优先修的 3 件事

1. **补幂等键** — 影响：健壮性 8→10（+3 分）；改法：引入 `Idempotency-Key` header + Redis 24h 缓存首次响应
2. **加复合索引 `(userId, status, createdAt DESC)`** — 影响：数据建模 8→9 + 性能 8→9（合计 +1.8 分）；改法：新 migration + `CREATE INDEX CONCURRENTLY`
3. **接入 OpenTelemetry** — 影响：可观测性 7→9（+1.4 分）；改法：加 `@opentelemetry/sdk-node`，导出到本地 Jaeger，观测 p95 即可

<!-- 校对：9×20 + 8×15 + 10×12 + 8×12 + 8×10 + 9×10 + 8×8 + 7×7 + 8×6 = 180+120+120+96+80+90+64+49+48 = 847; 847/10 = 84.7 ≈ 85 -->
