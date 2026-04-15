# 后端作业反模式清单

本文件列出学员后端作业中常见的坏味道。grading agent 评分前应过一遍本清单，按条取证、按维度给出目标分建议。每条格式为：

- **反模式名**：一句话说明为什么坏
  - *取证*：具体 grep / 测试步骤
  - *影响维度*：命中此条时，建议相关 rubric 维度下拉或封顶的目标分

合法维度白名单（rubric 9 大维度）：Spec 一致性 / 健壮性 / API 设计 / 测试 / 数据建模 / 代码分层 / 性能 / 可观测性 / 文档。

---

## 1. 分层坏味道

- **控制器里直接 SQL / ORM**：路由 handler 里直接写 `session.query(...)` / `db.execute("SELECT...")`，完全没有 service / repository 层。
  - *取证*：`grep -rEn "def .*\(.*\):|@app\.(get|post|put|delete)" **/routes/ **/controllers/ **/api/ -A 20 | grep -E "session\.|db\.(query|execute|cursor)|\.objects\."`。
  - *影响维度*：代码分层（建议下拉 2 分，或封顶 ≤ 6）。

- **service 依赖 req/res**：service 层函数签名里出现 `request` / `response` / `ctx`，HTTP 细节泄漏到业务层。
  - *取证*：`grep -rEn "def .*\(.*(request|response|ctx|Request|Response).*\)" **/service*/ **/services/`。
  - *影响维度*：代码分层（建议下拉 2 分，或封顶 ≤ 6）；测试（建议下拉 1 分）。

- **胖 model**：ORM model 类里塞业务编排、跨实体规则、外部调用（邮件、支付）。
  - *取证*：打开主要 model 文件，看类方法里是否有 `requests.post` / `send_email` / 跨 model 组合写入；行数 ≥ 200 也是信号。
  - *影响维度*：代码分层（建议下拉 2 分，或封顶 ≤ 6）；数据建模（建议下拉 1 分）。

- **循环依赖**：service A 调 service B，service B 又调 service A，import 处要靠延迟 import / 局部 import 绕过。
  - *取证*：`grep -rEn "^\s*from .*service.* import|^\s*import .*service" **/services/`；搜索函数体内的 `import`（延迟 import 信号）。
  - *影响维度*：代码分层（建议下拉 2 分，或封顶 ≤ 6）。

- **工具函数当服务用**：没有明确的 service 边界，所有逻辑堆在 `utils.py` / `helpers.py`，随意被任意地方 import。
  - *取证*：`wc -l **/utils*.py **/helpers*.py`；看单文件是否 > 400 行且被 > 10 处 import。
  - *影响维度*：代码分层（建议下拉 1 分）。

- **直接访问他人数据**：服务 A 直接读写服务 B 的表 / 集合，未经过 B 的接口。
  - *取证*：检查每个 service 是否只访问自己命名空间下的 model；跨命名空间 `from other_module.models import` 即命中。
  - *影响维度*：代码分层（建议下拉 2 分，或封顶 ≤ 6）；数据建模（建议下拉 1 分）。

## 2. 健壮性坏味道

- **裸吞异常**：`try: ... except: pass` 或 `except Exception: pass`，错误彻底消失。
  - *取证*：`grep -rEn "except.*:\s*$" . -A 1 | grep -E "pass|continue|\.\.\."`；或直接 `grep -rEn "except:|except Exception:" .`。
  - *影响维度*：健壮性（建议封顶 ≤ 4）；可观测性（建议下拉 1 分）。

- **宽泛 except 无日志**：`except Exception as e:` 只 return 500，不 log、不 raise、不带上下文。
  - *取证*：`grep -rEn "except Exception" . -A 3 | grep -vE "logger|log\.|raise"`。
  - *影响维度*：健壮性（建议下拉 2 分，或封顶 ≤ 6）；可观测性（建议下拉 2 分，或封顶 ≤ 6）。

- **ORM 异常直接回显**：`IntegrityError` / `OperationalError` 的 `str(e)` 直接 `return` 给前端，泄露表名、字段名。
  - *取证*：`grep -rEn "return.*str\(e\)|jsonify\(.*str\(e\)|JSONResponse\(.*str\(e\)" .`。
  - *影响维度*：健壮性（建议下拉 2 分，或封顶 ≤ 6）；API 设计（建议下拉 2 分，或封顶 ≤ 6）。

- **500 暴露堆栈**：生产环境返回 traceback 字符串（`DEBUG=True` 或 handler 里直接 `traceback.format_exc()`）。
  - *取证*：`grep -rEn "DEBUG\s*=\s*True|traceback\.format_exc|traceback\.print_exc" .`；`curl` 触发一个异常接口看 body。
  - *影响维度*：健壮性（建议下拉 2 分，或封顶 ≤ 6）。

- **写操作不幂等**：POST 创建没有 idempotency key / 唯一约束，前端重试会产生两条一样的记录。
  - *取证*：看关键创建路由是否有 `unique` 约束 / idempotency 头；用 `curl` 连打两次同一 payload 比对 DB 行数。
  - *影响维度*：健壮性（建议下拉 2 分，或封顶 ≤ 6）；数据建模（建议下拉 2 分，或封顶 ≤ 6）。

- **无输入校验**：handler 直接信任 body，字段类型 / 长度 / 必填 / 范围都不校验，崩在下游。
  - *取证*：看是否有 pydantic / marshmallow / zod / joi 等 schema；否则在 handler 里手工 `if not ... raise`？均无则命中。
  - *影响维度*：健壮性（建议下拉 2 分，或封顶 ≤ 6）；API 设计（建议下拉 1 分）。

## 3. 性能坏味道

- **N+1 查询**：`for x in xs: db.query(Child).filter(child.parent_id == x.id)`，循环里发 SQL。
  - *取证*：`grep -rEn "for .* in .*:\s*$" . -A 5 | grep -E "session\.(query|execute)|\.objects\.(filter|get)|await .*\.(find|findOne)"`；开 SQL echo 复现请求。
  - *影响维度*：性能（建议封顶 ≤ 4）；数据建模（建议下拉 1 分）。

- **无索引的高频查询**：常用 `WHERE` 字段未加索引（如 `user_id`、`created_at`、`status`）。
  - *取证*：看 migration / `__table_args__` / `index=True`；`EXPLAIN` 主查询看是否走全表扫描。
  - *影响维度*：性能（建议下拉 2 分，或封顶 ≤ 6）；数据建模（建议下拉 1 分）。

- **全量返回**：`GET /items` 不带分页，一口气返回上万条；前端卡死。
  - *取证*：`grep -rEn "return.*\.all\(\)|\.findAll\(|\.execute\(.*select \* from" .`；看路由是否有 `limit/offset/cursor/page`。
  - *影响维度*：性能（建议下拉 2 分，或封顶 ≤ 6）；API 设计（建议下拉 1 分）。

- **异步框架里同步阻塞**：FastAPI/Starlette/Koa 里用 `requests.get` / `time.sleep` / 同步 DB 驱动，堵死 event loop。
  - *取证*：`grep -rEn "import requests|requests\.(get|post)|time\.sleep" .`；确认项目是异步框架。
  - *影响维度*：性能（建议下拉 2 分，或封顶 ≤ 6）；代码分层（建议下拉 1 分）。

- **大对象全量序列化**：一个 `Order` 拉出 200 个 `OrderItem` 全序列化回前端，没有投影 / 分页。
  - *取证*：手动调接口看 payload 大小；搜 `.to_dict()` / `model_dump()` 是否递归加载全部关联。
  - *影响维度*：性能（建议下拉 2 分，或封顶 ≤ 6）；API 设计（建议下拉 1 分）。

- **无缓存的重复计算**：同一个请求周期里反复调用昂贵函数 / 查询，未用 `functools.lru_cache` / request-scoped cache。
  - *取证*：看高频 util 是否有缓存；在热点函数 `print` 计数复现同一请求内多次调用。
  - *影响维度*：性能（建议下拉 1 分）。

## 4. API / 可观测性坏味道

- **错误响应结构不统一**：有的接口 `{error: ...}`、有的 `{msg: ...}`、有的直接字符串、有的 `{detail: ...}`。
  - *取证*：抽 5 个不同路由故意触发 400/404/500，比对 body shape。
  - *影响维度*：API 设计（建议下拉 2 分，或封顶 ≤ 6）。

- **状态码乱用**：POST 创建返 200（应 201）、删除成功返 204 却带 body、校验失败返 500（应 400/422）。
  - *取证*：`curl -i` 主要路由；搜 `status_code=200` 在创建/删除处。
  - *影响维度*：API 设计（建议下拉 2 分，或封顶 ≤ 6）。

- **print 当日志**：代码里到处 `print(...)` / `console.log(...)` 当日志用，既无级别也无结构。
  - *取证*：`grep -rEn "^\s*print\(|console\.log\(" . | grep -v test | wc -l` ≥ 10。
  - *影响维度*：可观测性（建议下拉 2 分，或封顶 ≤ 6）。

- **日志无上下文**：有 logger 但不带 `request_id` / `user_id` / `trace_id`，出了事无法串联。
  - *取证*：看 middleware 是否注入 `request_id`；抽一条日志看字段是否只有 message。
  - *影响维度*：可观测性（建议下拉 2 分，或封顶 ≤ 6）。

- **接口文档缺失或对不上**：README 没写接口、Swagger/OpenAPI 缺字段或与实际参数不一致。
  - *取证*：对比 `docs/` / `openapi.json` / `README` 里的字段与实际 handler 的 pydantic schema。
  - *影响维度*：文档（建议下拉 2 分，或封顶 ≤ 6）。

- **动词用错**：删除用 `GET /delete?id=1`、查询用 `POST /search`（不可缓存不可收藏）、修改用 `GET`。
  - *取证*：`grep -rEn "@app\.(get|post|put|delete|patch)\([^)]*(delete|remove|create|update)" .`。
  - *影响维度*：API 设计（建议下拉 2 分，或封顶 ≤ 6）。

- **无健康检查 / 版本信息**：服务没有 `/health` / `/version` / `/metrics`，运维无从监控。
  - *取证*：`grep -rEn "/health|/healthz|/ready|/version|/metrics" .`；至少应有 `/health`。
  - *影响维度*：可观测性（建议下拉 1 分）。
