# 项目评分报告 — team-calibration-mediocre（后端）

- 评分人：Claude@sonnet-4.6
- 日期：2026-04-14
- Spec 版本：`docs/spec.md` @ `a1b2c3d`
- 被评项目 commit：`3e2f1a0`
- 评分耗时：38 分钟

## 总分：54 / 100 — 等级 D

技术栈：Python 3.11 + FastAPI + SQLAlchemy（同步）+ SQLite。同样是任务管理后端：`/api/auth/login` + `/api/tasks` CRUD。功能大致齐全，但"能跑"和"工业级"之间差距明显。

## 维度汇总

| # | 维度 | 得分 | 权重 | 加权 | 一句话 |
|---:|---|---:|---:|---:|---|
| 1 | Spec 一致性 | 7 | 20 | 14.0 | 主流程对齐，分页/confirm 保护/错误码字段偏离 spec |
| 2 | 健壮性 | 5 | 15 | 7.5 | happy path 能走，异常路径多处 500 + 裸 `except: pass` |
| 3 | API 设计 | 6 | 12 | 7.2 | RESTful 基本 OK，但错误响应每接口不同、分页仅 offset |
| 4 | 测试 | 4 | 12 | 4.8 | 覆盖率 34%，只有登录和创建任务两条 happy path |
| 5 | 数据建模 | 5 | 10 | 5.0 | 表结构可用但缺索引，迁移靠 `create_all` 无版本 |
| 6 | 代码分层 | 5 | 10 | 5.0 | controller 里直接写 SQL/业务，服务层名存实亡 |
| 7 | 性能 | 6 | 8 | 4.8 | 单请求还行，列表接口存在 N+1 |
| 8 | 可观测性 | 4 | 7 | 2.8 | 只有 `print()`，无 requestId，无结构化日志 |
| 9 | 文档 | 5 | 6 | 3.0 | README 能启动，但示例 curl 一半跑不通，无接口文档 |

> 有效权重总和：100；N/A 维度：无
> 校对：Σ加权 = 54.1 → 四舍五入到 54

## 逐维度详评

### 1. Spec 一致性 — 7/10（权重 20）

**证据**
- `app/routers/auth.py:8-42` 实现了 `POST /api/auth/login`，字段 `email`/`password`/`token` 与 spec §2.1 对齐
- `app/routers/tasks.py:15-140` 实现 `/api/tasks` CRUD，状态码基本匹配 spec
- 偏离 1：spec §2.2.4 要求 `DELETE /api/tasks/:id?confirm=true` 未带 confirm 返回 428，实现直接删除，无保护（`app/routers/tasks.py:98-112`）
- 偏离 2：spec §2.2.3 要求游标分页 `?cursor=...&limit=...`，实现是 `?page=1&page_size=20`（`app/routers/tasks.py:52`）
- 偏离 3：错误响应 shape 不统一——登录失败返回 `{"msg": "..."}`，任务 404 返回 `{"detail": "..."}`（FastAPI 默认），spec §4 要求 `{error: {code, message}}`
- probe：`.grading/probes/team-calibration-mediocre-spec-endpoints.log` 显示 11 个接口中 8 个行为匹配 spec

**要到 10 差什么**
1. 加回 `confirm=true` 保护，未带时返回 428 + 规范错误码
2. 游标分页替换 offset：用 `WHERE id > :cursor ORDER BY id LIMIT :limit` 并返回 `nextCursor`
3. 统一全局错误响应 shape：`@app.exception_handler(Exception)` 把所有异常转换为 `{error: {code, message}}`

---

### 2. 健壮性 — 5/10（权重 15）

**证据**
- probe：`.grading/probes/team-calibration-mediocre-robustness-summary.md` 显示 8 个 probe 仅 4 个通过
  - 空 body POST `/api/tasks` → 500（❌，`app/routers/tasks.py:40` 直接 `body["title"]` 索引越界，应 422）
  - 超长 title（10000 字符）→ 200 入库（❌，无长度校验）
  - 非本人任务访问 → 500（❌，查询结果 `None` 时 `.user_id` 触发 AttributeError）
  - 重复提交同 payload → 产生两条记录（❌，无幂等）
- 反模式命中 `anti-patterns.md` 「裸 `try/except: pass` 吞异常」：`app/services/task_service.py:78-83`
  ```python
  try:
      db.commit()
  except Exception:
      pass  # 吞掉所有写失败
  ```
- 反模式命中「报错直接把堆栈抛给前端」：`DEBUG=True` 在 `app/main.py:12` 硬编码，500 响应体包含完整 traceback
- 仅基础 happy path 有保护：登录时用 pydantic 校验字段存在（`app/schemas/auth.py:3-8`），这也是该维度得分没更低的原因

**要到 10 差什么**
1. 删掉所有 `except Exception: pass`，替换为明确异常分类（`IntegrityError` → 409，`NotFound` → 404，其他 → 全局 500 处理器统一格式）
2. 所有请求体必须用 pydantic model（带 `max_length`），而不是直接读 `request.json()`
3. 关闭生产 `DEBUG`，加环境变量开关 + 默认 False
4. 写操作加幂等键（`Idempotency-Key` header + 简单内存/Redis 缓存）

---

### 3. API 设计 — 6/10（权重 12）

**证据**
- RESTful 命名基本合格：`/api/tasks`、`/api/tasks/{id}`，无 `/getTask` 等 RPC 命名
- 状态码部分正确：201 用于创建、204 用于删除（`app/routers/tasks.py:130`）
- 扣分点 1：错误响应每接口不同（见维度 1 证据），这是 `anti-patterns.md` 明确列出的「错误响应结构每个接口都不同」
- 扣分点 2：分页仅支持 offset/limit，大数据集下有重复/漏记录风险；无排序、无过滤参数
- 扣分点 3：无统一错误码枚举，全部是自由字符串 `"task not found"`、`"无权限"`（中英文还混用）
- 扣分点 4：`PATCH` 与 `PUT` 语义混用——`app/routers/tasks.py:85` 的 `PUT` 实际做的是部分更新

**要到 10 差什么**
1. 建一份 `errors.py`：定义 `ErrorCode` 枚举 + `AppError` 基类，全局 handler 输出 `{error: {code, message, details}}`
2. 把 `PUT` 改 `PATCH` 做部分更新；完整替换场景再保留 `PUT`
3. 分页换游标方案；加 `?status=todo&sort=-created_at` 过滤/排序，字段走白名单
4. 错误 message 统一英文（or 统一中文），别混用

---

### 4. 测试 — 4/10（权重 12）

**证据**
- `pytest --cov` 报告：行覆盖 34%，`.grading/probes/team-calibration-mediocre-coverage.log`
- `tests/` 目录仅 2 个文件：`test_login.py`（2 用例：成功 + 密码错误）、`test_create_task.py`（1 用例：创建成功）
- 无集成测；无测试 DB 隔离——`tests/conftest.py:5` 直接用开发库 `dev.db`，测试互相污染
- 关键路径未覆盖：删除、列表分页、越权、confirm 保护、错误路径全部 0 用例
- CI 未配置（`.github/workflows/` 目录不存在）
- 反模式命中「测试只测 happy path」

**要到 10 差什么**
1. 加测试 fixture：每个用例独立 in-memory SQLite 或 transaction rollback 隔离
2. 补集成测覆盖所有 CRUD + 越权 + 分页场景，目标行覆盖 70%+
3. 专门的错误路径测试：400/401/404/409/422 每种至少 1 条
4. 加最小 GitHub Actions：`pytest` + 覆盖率阈值门槛

---

### 5. 数据建模 — 5/10（权重 10）

**证据**
- `app/models.py:1-45` 三个表：User、Task、Session，字段基本合理
- 外键存在：`Task.user_id → User.id`，但未声明 `ondelete="CASCADE"`，删用户时子任务悬挂
- 索引：仅 PK 主键，无任何二级索引；`User.email` 查询频繁但未建索引（explain 输出 `SCAN user` 全表扫，见 `.grading/probes/team-calibration-mediocre-explain.log`）
- 迁移：无 Alembic，靠 `Base.metadata.create_all()` 在启动时建表（`app/main.py:25`）——反模式命中「迁移直接改 schema，无 migration 脚本」
- SQLite 生产使用不合适：并发写直接 `database is locked`，`.grading/probes/...-concurrency.log` 显示 10 并发下 3 次失败
- 无软删除，删除后数据直接消失，审计难

**要到 10 差什么**
1. 引入 Alembic，现有表结构生成 baseline migration，之后所有变更走版本化脚本
2. 加索引：`User.email` 唯一索引、`Task(user_id, status)` 复合索引
3. 外键加 `ondelete` 策略：`CASCADE` 或 `RESTRICT`，显式而不是隐式
4. 生产切 Postgres；SQLite 只留给单测使用

---

### 6. 代码分层 — 5/10（权重 10）

**证据**
- 目录有 `app/routers/`、`app/services/`、`app/models.py` 三层，乍看规范
- 实际上 controller 里直接操作 DB：`app/routers/tasks.py:58-72` 直接 `db.query(Task).filter(...).all()`，绕开 service 层（反模式命中「控制器直接 SQL」）
- service 层只有 2 个方法（`create_task`、`login`），其余业务逻辑全散在 router 里
- 无 repository 层，数据访问全靠 SQLAlchemy session 裸调用，测试时无法 mock
- 循环引用：`services/task_service.py` import `models.User`，`models/user.py` 又 import `services`（通过 lazy import 绕开，`app/models/user.py:3`）
- 错误处理散落：router 里既有 `raise HTTPException`，又有 `return {"error": ...}`，两种风格

**要到 10 差什么**
1. 强制规则：router 不准 import ORM；所有 DB 操作走 `repos/`，router 只调 service
2. 抽 repo 层：`TaskRepo`、`UserRepo`，service 层用构造注入，方便测试
3. 统一错误抛出方式：一律 `raise AppError(code=..., message=...)`，全局 handler 转 response
4. 拆 `services/task_service.py` 单独模块，理清 import 关系（至少让 circular import 消失）

---

### 7. 性能 — 6/10（权重 8）

**证据**
- `npx autocannon -d 5 -c 10` 单接口压测 p95=95ms，p99=280ms，可接受但偏高（`.grading/probes/team-calibration-mediocre-autocannon.log`）
- 列表接口存在 N+1（反模式命中「N+1 查询」）：`app/routers/tasks.py:60-68` 先查 tasks，再循环里每个 task `db.query(Tag).filter(task_id=...)` 取 tags，10 条任务打 11 次 SQL（SQL trace `.grading/probes/...-sql-trace.log` 可见）
- 无连接池配置：SQLAlchemy 默认池（5 连接）在压测中频繁 wait
- 无任何缓存策略（应用层 & HTTP 层都没有）
- 得分没更低的原因：单条请求本身不慢，小数据量下用户感知可接受

**要到 10 差什么**
1. 修 N+1：`db.query(Task).options(selectinload(Task.tags))`，或者 JOIN 一次拿全
2. 显式配置连接池：`pool_size=20, max_overflow=10`
3. 列表接口加 ETag，304 短路节省序列化
4. 为"我的今日任务"这种高频只读接口加 60 秒 TTL 缓存

---

### 8. 可观测性 — 4/10（权重 7）

**证据**
- 日志全部是 `print(...)`（反模式命中「日志只有 `print` 或 `console.log`」）：`grep -rn "print(" app/` 命中 24 处
- 无 requestId，日志里不同请求的行混在一起，调试靠肉眼对齐时间戳
- 无结构化输出（JSON），日志收集系统（Loki/ES）没法直接 parse
- 关键写操作无 audit：谁在什么时间删了什么任务查不到
- 无健康检查接口（`/healthz` 不存在），部署方只能靠端口探测

**要到 10 差什么**
1. 换 `structlog` 或 Python 内置 `logging`，统一 JSON 格式，字段含 `ts, level, request_id, event, user_id`
2. 中间件注入 `request_id`（`uuid4()` 或从 `X-Request-Id` 透传）
3. 写操作一律 audit log：`action=task.delete, user_id=..., task_id=..., ok=true`
4. 加 `/healthz`（进程健康）+ `/readyz`（DB 连接）两个端点

---

### 9. 文档 — 5/10（权重 6）

**证据**
- `README.md:1-60` 有启动步骤和技术栈介绍，按步骤能成功起服务
- 示例 curl：README 列了 6 条，实测只有 3 条能跑通——其余因为路径/字段与实现不一致（`.grading/probes/team-calibration-mediocre-readme-curl.log`）
- 无 OpenAPI 文档——虽然 FastAPI 自带 `/docs`，但大量接口缺 `response_model`，Swagger UI 显示的 response 不准（`app/routers/tasks.py:15` 无 `response_model=...`）
- 无 `.env.example`，环境变量清单散落在 README 文字里
- 无部署说明、无回滚说明、无架构图

**要到 10 差什么**
1. 补 `response_model=TaskOut` 到所有路由，让 FastAPI 自动生成的 OpenAPI 准确
2. 加 `.env.example` 列全必需变量并注释
3. README 里 curl 示例要与代码同步更新（CI 里跑一遍就能发现漂移）
4. 加最小架构图（mermaid 即可）：请求 → middleware → router → service → DB

---

## 亮点

- 项目能**启动、登录、创建任务**，端到端 happy path 走通，这在 D 档项目中已经是加分项
- **目录结构有分层意图**（`routers/`、`services/`、`models/`），虽然执行走样，但方向对
- README 的**启动步骤准确可复现**（3 步内跑起来），对阅读者友好
- pydantic 对登录请求体做了**基础校验**，避免该接口出现 500

## 最该优先修的 3 件事

1. **统一错误响应 + 补异常处理** — 影响：Spec 一致性 7→9 + 健壮性 5→7（合计 +7 分）；改法：新建 `errors.py` 定义 `AppError` 和 `ErrorCode` 枚举；加全局 `exception_handler`；删除所有 `except Exception: pass`
2. **controller 剥离 DB 访问** — 影响：代码分层 5→8（+3 分）；改法：新建 `repos/`；router 层禁止 import ORM；service 调 repo，repo 返回 domain model
3. **测试覆盖率 34% → 70%+** — 影响：测试 4→7（+3.6 分）；改法：加 pytest fixture 做 DB 隔离；每个 router 至少补 5 个用例（happy + 4xx 各分支 + 越权）

## 评分风险

- SQLite 在并发测试下出现 `database is locked`，部分 probe 执行被迫降并发度（`-c 2`），若换成 Postgres 可能得分变化 ±1 分
- `/docs` Swagger UI 存在但 response model 不准，文档维度若只以"有无 Swagger UI"判定可达 6 分，本报告以"文档是否准确可用"为准打 5 分

<!-- 校对：7×20 + 5×15 + 6×12 + 4×12 + 5×10 + 5×10 + 6×8 + 4×7 + 5×6 = 140+75+72+48+50+50+48+28+30 = 541; 541/10 = 54.1 ≈ 54 -->
