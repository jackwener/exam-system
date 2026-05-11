---
name: record-gotcha
description: 把本次踩到的坑写进 .qoder/business-logic/gotchas.md，每条强制 4 段结构（现象 / 根因 / 正确做法 / 反例）。比 /update-context 更窄、更结构化——只管 gotcha 这一类。
---

# /record-gotcha · 沉淀一条踩坑到团队记忆

## 使用场景

发现以下任一情况后**立刻**用：

- 自己（或 Agent）踩到一个**未来其他人也会踩**的坑
- `/hunt` 找到 root cause 后，确认这是**会重复出现**的问题
- 修了一个 bug，发现"根因不在显眼处"——别人遇到很难自己找出
- 发现某个 API / 配置 / 库的**非显然用法**（文档里没明确说但必须这样用）

**不适用**的场景（用 [`/update-context`](../update-context/SKILL.md) 而不是本 Skill）：

- 一般性的项目进度更新
- 模块说明 / 决策记录 / 流程说明
- 不属于"坑"的发现（如"我学到 X 这个工具的用法"）

## 目标

让"我刚刚花 30 分钟才找出来的根因"变成"未来任何人/Agent 5 秒就能避开的指南"。这是 **Compounding Engineering** 最具体的实现——一次踩坑、永久免疫。

## 必须步骤

### 1. 选定写入位置

| 坑的性质 | 写到哪 |
|---|---|
| 通用 / 跨领域 | `.qoder/business-logic/gotchas.md`（不存在就新建） |
| 评分 / 题型相关 | 追加到 [`grading-pipeline.md`](../../business-logic/grading-pipeline.md) 或 [`question-types.md`](../../business-logic/question-types.md) 的 "Known Gotchas" 段 |
| 鉴权相关 | 追加到 [`admin-auth.md`](../../business-logic/admin-auth.md) |

### 2. 按 4 段结构写

**每条 gotcha 必须有这 4 段**，缺一不可：

```markdown
## <一句话标题，描述现象>

### 现象
（观察到了什么——可粘贴 / 复现的报错、行为）

### 根因
（为什么会这样——技术 / 业务 / 配置上的解释）

### 正确做法
（以后遇到类似情况该怎么做——可粘贴的代码 / 命令 / 步骤）

### 反例（可选但强烈推荐）
（曾经被尝试但行不通的做法 + 为什么行不通）
```

### 3. 加代码位置引用（如适用）

正确做法里如果涉及代码，**精确到文件:行号**：

```markdown
### 正确做法
用 `lib/grading.ts:438` 的 `regradeFailedQuestions` 而不是自己重新评分。
```

不要写"参考 grading.ts 里的某个函数"——一是不可点，二是函数名漂移后引用失效。

### 4. 标日期 + 来源

每条末尾加：

```markdown
> 沉淀于 2026-05-12，来自 #task-2 实施过程；下次 review 时间 2026-08-12
```

3 个月后未被触发 / 复读的 gotcha 可考虑删除（避免积累成噪音池）。

## 禁止事项

- ❌ 不允许把**单次调试日志**当 gotcha——"我试了 A 不行试了 B 不行" 是工作过程，不是知识沉淀
- ❌ 不允许写"未来可能有用"的猜测——只写**已经被实际验证过的发现**
- ❌ 不允许只写"现象 + 修复"——必须有"根因"，否则别人不知道为什么这是坑
- ❌ 不允许 4 段都堆在一段——结构本身是给读者的索引
- ❌ 不允许一次 record 5 条以上 gotcha——优先级排序，挑最值得的 1-2 条；其余进 `/update-context` 的"待整理"

## 输出格式

```markdown
将以下内容追加到 `.qoder/business-logic/gotchas.md`（位置：文档末尾，或某个相关章节后）：

---

## payment_succeeded webhook 可能重复发送

### 现象
线上发现少数订单的 `total_paid` 字段是预期值的 2-3 倍。检查日志发现，
同一个 `payment_id` 收到了多次 `payment_succeeded` webhook。

### 根因
第三方支付平台的 retry 机制——我们处理慢（> 5s）或返回非 2xx 时，对方会
按指数退避重试。这是 webhook 的标准行为，不是 bug。

### 正确做法
所有 webhook 入口必须基于 `event.id` 做幂等：
```ts
// lib/webhook/idempotency.ts:42
if (await isProcessed(event.id)) return ack();
```

### 反例
用 order 当前状态作为幂等依据是错的——状态可能因为并发请求已经变化。

> 沉淀于 2026-05-12，来自 task-2 实施过程；下次 review 时间 2026-08-12
```

## 与其他 Skill 的关系

- 通常由 [`/hunt`](../hunt/SKILL.md) 找到根因后**立即**触发
- 范围比 [`/update-context`](../update-context/SKILL.md) 窄——后者还能写决策 / 模块说明 / 进度
- 沉淀好后的 gotcha 会被 [`/think`](../think/SKILL.md) 在"影响范围分析"阶段自动读到
- 任务结束的总结（[`/summary`](../summary/SKILL.md)）可以引用本次 record 的 gotcha
