# 项目评分报告 — team-calibration-mediocre（前端）

评分人：Claude@sonnet-4.6
日期：2026-04-14
Spec 版本：`docs/spec.md @ f27be3a6`（todo 应用基础版）
被评项目 commit：`e9f8d7c6`（team-calibration-mediocre / main）
评分耗时：约 35 分钟

> 被评项目同样是 todo 应用：登录 / 列表 / 详情 / 新建 / 删除。前端技术栈：React 18 + Vite + TypeScript + 默认 shadcn/ui 未改主题 + 组件内局部 `useState`（无全局 store）。

---

## 总分：55 / 100 — 等级 D

| # | 维度 | 得分 | 权重 | 加权 | 一句话 |
|---|---|---:|---:|---:|---|
| 1 | Spec 一致性 | 7 | 20 | 14.0 | 5 条路由都有，但详情页严重简化，删除无确认 |
| 2 | 主题与审美 | 4 | 12 | 4.8 | 典型"全灰灰白白"，shadcn 默认未改一个颜色 |
| 3 | 动画与流畅度 | 4 | 10 | 4.0 | 基本无过渡；状态切换闪烁 |
| 4 | 状态完备性 | 6 | 10 | 6.0 | loading/success 有；empty 是一行文本；error 是 alert |
| 5 | 代码质量 | 6 | 10 | 6.0 | 组件能跑但耦合重，300 行的页面组件，类型多处 any |
| 6 | 响应式适配 | 6 | 8 | 4.8 | mobile 能用，tablet 断点完全没做 |
| 7 | 表单与输入反馈 | 6 | 8 | 4.8 | 有基础校验；无防重复提交；错误提示仅 alert |
| 8 | 性能 | 6 | 8 | 4.8 | 体积合理但首屏未拆分；一处明显的无限刷接口 |
| 9 | 无障碍 (a11y) | 3 | 8 | 2.4 | 无 focus 环，图标按钮无 aria-label，对比度多处不足 |
| 10 | 微文案 | 5 | 6 | 3.0 | 全是 "OK/Cancel/No data/Error"，零个性 |
| — | **合计** | — | 100 | **54.6 ≈ 55** | D 档，Happy path 能跑但细节崩塌 |

---

## 逐维度详评

### 1. Spec 一致性 — 7/10

**证据**
- Spec §2 5 条路由均存在：
  - `/login` → `src/pages/Login.tsx:1-52`
  - `/tasks` → `src/pages/TaskList.tsx:1-180`
  - `/tasks/:id` → `src/pages/TaskDetail.tsx:1-67`（内容非常单薄）
  - `/tasks/new` → `src/pages/TaskNew.tsx:1-88`
  - 删除 → `TaskList.tsx:114-126` 直接 inline 删除
- Spec §3.3 详情页要求：标题/描述/状态/历史操作/评论 — 本项目只实现了前三项
- Spec §3.4.2 删除必须二次确认 — 本项目**点一下就删**，无任何确认
- Spec §3.2.3 列表支持按状态筛选 — 有三个 tab 但切换后 URL 不变，刷新丢状态

**要到 10 差什么**
1. 详情页补全"历史操作"与"评论"两个区块（spec §3.3 明确要求）
2. 删除加二次确认 dialog —— 现在的实现是严重的安全 UX 问题
3. 列表筛选状态落到 URL query，刷新/分享可恢复
4. 登录页缺少"记住我"与错误提示的位置约束（spec §1.2.4）

---

### 2. 主题与审美 — 4/10

**证据**
- `tailwind.config.ts` 完全是 shadcn init 默认 — 没改一个 token
- 全屏截图 `.grading/shots/team-calibration-mediocre-tasks.png` 呈现典型 AI slop 特征：
  - 页面底色 `bg-gray-50`、卡片 `bg-white`、次要文字 `text-gray-500`
  - 按钮全部 `bg-primary`（shadcn 默认近黑）或 outline 白
  - 所有卡片都是 `rounded-lg shadow` 同一配方
- 字体是系统默认 `ui-sans-serif`，未引入任何品牌字体
- 间距没有系统化，`mt-3`/`mt-4`/`mt-6` 随意混用

**要到 10 差什么**
1. 定义自定义 brand color（至少一个主色 + 一个强调色），避免 shadcn 原味
2. 引入一款内容字体（Inter / Geist / 思源黑体）并自托管
3. 建立 4 / 8 / 12 / 16 / 24 的间距 scale，消灭 `mt-3` 这类魔法数字
4. 卡片阴影与圆角分出"重要/次要"两档，建立视觉层次
5. 对照 anti-patterns.md 的"全灰灰白白"那一条逐项排查

---

### 3. 动画与流畅度 — 4/10

**证据**
- 路由切换无任何过渡，页面是生硬替换
- Tab 切换 `TaskList.tsx:48-66` 直接 `setState`，内容闪一下换掉
- Hover 只改 bg-color，无 transition duration
- 删除后列表直接消失一项，无 collapse/fade
- 新建成功跳回列表，新项也无高亮
- 录屏 `.grading/shots/team-calibration-mediocre-interaction.gif` 整体观感"很 90 年代"

**要到 10 差什么**
1. 路由层加 fade 或 slide 过渡（Framer Motion 的 AnimatePresence 十几行代码）
2. 全局给 button/link 加 `transition-colors duration-200` 起步
3. 列表项 enter/exit 动画（height + opacity）
4. Success toast 用 slide-in-from-top + auto-dismiss
5. 注意不要过度动画（每次都弹个 bounce 也是 AI slop），refer anti-patterns §"无意义 bounce"

---

### 4. 状态完备性 — 6/10

**证据**
- Loading：`TaskList.tsx:32-36` 显示 `"Loading..."` 纯文字（不是 skeleton，也不是 spinner）
- Success：新建后 toast `"Created!"`（来自 sonner 默认）
- Empty：`TaskList.tsx:82-84` `<p>No data</p>` —— 这是典型 AI slop 反模式
- Error：`TaskList.tsx:38-41` `if (error) alert(error.message)` —— alert 是灾难
- 四态截图 `.grading/shots/team-calibration-mediocre-{loading,empty,error}.png` 全齐，正好坐实打分

**要到 10 差什么**
1. Loading 态换成 skeleton（列表行骨架）而不是 "Loading..."
2. Empty 态加插画 + 说明 + 行动 CTA，彻底抛弃 "No data"
3. Error 态用页面内组件替代 alert，提供"重试"按钮
4. 网络错/权限错/422 三种 error 分别呈现（现在全糊在一起）

---

### 5. 代码质量 — 6/10

**证据**
- `TaskList.tsx` 单文件 180 行，包含数据获取 + 筛选 + 渲染 + 删除逻辑，没有拆分
- 多处 `any`：`src/api/index.ts:14` `function fetchJson<T = any>`、组件 props 直接 `props: any`（5 处）
- `useEffect` 依赖数组缺项：`TaskDetail.tsx:22` 依赖了外部 `id` 但数组写的是 `[]`（ESLint 被禁）
- 状态散在组件内，跨页面共享靠 localStorage 手动同步（`src/lib/storage.ts`）
- 没有 API 层抽象，每个页面直接 `fetch(...)`
- tsconfig `strict` 未开（`"strict": false`）

**要到 10 差什么**
1. 打开 `strict: true` 并清理 `any`
2. 抽出 `src/api/` 层，每个资源一个模块，统一 error handling
3. 引入轻量 store（Zustand 或 Context）取代 localStorage 手动同步
4. 把 180 行 `TaskList.tsx` 拆为 `TaskList` + `TaskFilter` + `TaskRow` + `useTasks` hook
5. 恢复 ESLint `react-hooks/exhaustive-deps`，修复所有 warning

---

### 6. 响应式适配 — 6/10

**证据**
- mobile 375 截图：`.grading/shots/team-calibration-mediocre-mobile-375.png` — 列表可用，但顶部 header 按钮挤成一行溢出
- tablet 768 截图：`.grading/shots/team-calibration-mediocre-tablet-768.png` — 直接走 desktop 布局，侧栏占 30% 宽度很挤
- 代码里只用到 `md:`，没有 `sm:` `lg:` `xl:`，说明只做了 2 档
- 表单在 mobile 下 input 字号 14px，会触发 iOS 自动缩放

**要到 10 差什么**
1. 设计至少 3 个断点（mobile / tablet / desktop）并逐页验证
2. mobile input 字号统一 ≥ 16px
3. 顶部 action bar 在窄屏折叠为"更多"菜单
4. 侧栏在 ≤ 1024 折叠为抽屉或 icon-only

---

### 7. 表单与输入反馈 — 6/10

**证据**
- 校验：`TaskNew.tsx:34-41` 有必填校验，但仅 `if (!title) return alert("title required")` — 又是 alert
- 提交中按钮未 disabled，可以双击连发两次请求 — 录屏 `.grading/shots/team-calibration-mediocre-double-submit.gif` 重复创建一条
- 错误提示全部 alert，不在字段下显示
- 没有字符计数、没有异步校验
- 登录表单密码没有"显示/隐藏"切换

**要到 10 差什么**
1. 用 react-hook-form + zod 承接校验，错误显示在字段下方
2. 提交中 button disabled，并发 mutation 加 idempotency key
3. alert 全部替换为内联错误 + toast 组合
4. textarea 加字符计数（spec §3.3.2 有 500 字上限）
5. 密码字段加显隐切换

---

### 8. 性能 — 6/10

**证据**
- Bundle gzip 后 165 KB —— 对 todo 应用偏大，主因是全量引入 lodash
- `src/App.tsx:8` `import _ from 'lodash'` —— 替换成 `lodash-es` + tree-shake，或直接用原生
- 有一处明显 bug：`TaskList.tsx:54-62` 的 `useEffect` 依赖 `filters`，但 `filters` 是内部新建对象，导致每次 render 都重新 fetch —— 真的是"无限刷接口"，Network tab `.grading/probes/team-calibration-mediocre-network.log` 有连续 20 次请求
- 无 code splitting，所有路由打包在一起
- Lighthouse Performance 68 / FCP 1.6s / LCP 2.9s / CLS 0.12 —— CLS 主要来自图片无 width/height

**要到 10 差什么**
1. **立刻修那个无限 useEffect**（把 filters 用 `useMemo` 稳定或直接展开依赖）
2. 换 `lodash-es` 并只 import 用到的方法
3. 路由级 `lazy()` + `Suspense`，首屏只加载登录与列表
4. 图片统一加 `width`/`height` 或 `aspect-ratio`，消除 CLS
5. 考虑给列表接口加 SWR

---

### 9. 无障碍 (a11y) — 3/10

**证据**
- 全局 CSS `src/index.css:12` 写了 `*:focus { outline: none }` — **反模式**：彻底废掉了键盘用户的可见焦点
- 图标按钮：`<button><TrashIcon/></button>`（6 处），无 `aria-label`
- 表单 label 未关联 input（仅靠视觉接近）— `TaskNew.tsx:45-58`
- 对比度：`text-gray-400 on bg-white` 出现 4 处，计算值 3.0:1，未达 AA
- 无 landmark：整页是 `<div>` 套 `<div>`，没有 `<main>` `<nav>`
- 键盘：Tab 到列表项后按回车无反应（只绑了 onClick）
- 截图 `.grading/shots/team-calibration-mediocre-focus-invisible.png` 可看到 Tab 焦点完全看不见

**要到 10 差什么**
1. **删除 `*:focus { outline: none }` 这条规则**（头号优先）
2. 为所有图标按钮补 `aria-label`
3. `<label htmlFor>` 正确关联，或用包裹式 `<label><input/></label>`
4. 提高辅助文字对比度 ≥ 4.5:1（gray-400 → gray-600）
5. 加 landmark 标签（header/nav/main/aside/footer）
6. 列表项如果是按钮语义，直接用 `<button>` 或加 `role="button" + onKeyDown`

---

### 10. 微文案 — 5/10

**证据**
- 按钮全部 `OK` / `Cancel` / `Submit`，没有一个动词具体到行为
- 空态：`No data`（AI slop 黑名单第一条）
- 错误：`Something went wrong` / `Error`
- 登录失败：`Login failed`（没告诉用户为什么）
- 对比 anti-patterns.md §"微文案懒政"，命中 5/7 条

**要到 10 差什么**
1. 所有主按钮文案动词化：`创建任务` / `保存修改` / `永久删除`
2. 空态写出具体场景 + CTA：`还没有任务，先建一个？`
3. 错误分类文案：网络错、权限错、校验错分别写清楚"怎么办"
4. 登录失败区分"账号不存在"/"密码错误"/"账号已锁定"（后端若未给信息，前端至少说"用户名或密码错误"而不是泛化 failed）

---

## 亮点

1. **5 条路由都存在**：Happy path 可以完整跑通登录 → 建任务 → 看列表 → 删除，说明核心流程把握到位
2. **Toast 与 loading 文本至少存在**：没有完全裸奔
3. **TypeScript + Vite 栈搭得对**：技术选型没问题，问题都出在"最后一公里"

---

## 最该优先修的 3 件事

1. **删除 `*:focus { outline: none }` 并补齐 aria-label**（§9，一行 CSS + 6 处 aria，立刻从 a11y 黑名单脱出，+2~3 分）
2. **修复 `TaskList` 的无限刷接口 + 删除无确认**（§1 + §8，一条是安全 UX、一条是性能事故，都是"看到就要修"级别）
3. **全局替换 alert / "No data" / "OK/Cancel"**（§4 + §7 + §10，文案 + 内联 error 组件化，一次改动吃三个维度分）

---

<!-- 校对：
维度分数 × 权重：
1. Spec 一致性       7 × 20 = 140
2. 主题与审美        4 × 12 =  48
3. 动画与流畅度      4 × 10 =  40
4. 状态完备性        6 × 10 =  60
5. 代码质量          6 × 10 =  60
6. 响应式适配        6 ×  8 =  48
7. 表单与输入反馈    6 ×  8 =  48
8. 性能              6 ×  8 =  48
9. 无障碍 (a11y)     3 ×  8 =  24
10. 微文案           5 ×  6 =  30
sum = 140+48+40+60+60+48+48+48+24+30 = 546
total = 546 / 10 = 54.6 → 55 分（D 档）
-->
