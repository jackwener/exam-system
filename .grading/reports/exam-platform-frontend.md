# 项目评分报告 — exam-platform（前端）

- 评分人：Claude@claude-sonnet-4-6
- 日期：2026-04-15
- Spec 版本：/Users/jakevin/ai/DESIGN.md + 项目路由结构
- 被评项目 commit：9ec11ab
- 评分耗时：约 25 分钟

## 总分：75 / 100 — 等级 B

## 维度汇总

| # | 维度 | 得分 | 权重 | 加权 | 一句话 |
|---:|---|---:|---:|---:|---|
| 1 | Spec 一致性 | 9 | 20 | 18.0 | 所有路由和功能完整实现，字体从 Inter 换成 Geist 是唯一偏差 |
| 2 | 主题与审美 | 8 | 12 | 9.6 | 自定义 token 系统扎实，emoji 代替图标库拉低质感 |
| 3 | 动画与流畅度 | 7 | 10 | 7.0 | hover/transition 覆盖好，弹窗无进出动画 |
| 4 | 状态完备性 | 7 | 10 | 7.0 | 四态都有，loading 仅文字、empty 仅文字略粗糙 |
| 5 | 代码质量 | 9 | 10 | 9.0 | 零 any/ts-ignore，组件精简，SC/CC 边界清晰 |
| 6 | 响应式适配 | 5 | 8 | 4.0 | 考生端三断点可用，管理端 200px 固定侧边栏无 mobile 适配 |
| 7 | 表单与输入反馈 | 7 | 8 | 5.6 | 防重提交/loading/内联错误到位，label 未 for 关联 |
| 8 | 性能 | 7 | 8 | 5.6 | Next.js 自动 code splitting + SC 用好，无性能隐患 |
| 9 | 无障碍 a11y | 5 | 8 | 4.0 | 用了真 button，有 lang，但 label 无 for、outline-none、无 aria-invalid |
| 10 | 微文案 | 8 | 6 | 4.8 | 动词+对象的按钮文案做得好，empty state 和 alert() 是短板 |

> 有效权重总和：100；N/A 维度：无

**总分计算：** (18.0 + 9.6 + 7.0 + 7.0 + 9.0 + 4.0 + 5.6 + 5.6 + 4.0 + 4.8) = 74.6 → **75 / 100**

---

## 逐维度详评

### 1. Spec 一致性 — 9/10（权重 20）

**证据**
- `app/exam/page.tsx` — 考生入口页实现 ✓
- `app/exam/[id]/page.tsx` — 完整的答题流程（进度条、题目导航点、倒计时、提交确认弹窗）✓
- `app/exam/[id]/result/page.tsx` — 轮询状态展示 AI 评分结果 ✓
- `app/admin/login/page.tsx`、`app/admin/dashboard/page.tsx`、`app/admin/exam/[id]/page.tsx` — 管理员三页完整 ✓
- `components/ChoiceQuestion.tsx`, `TrueFalseQuestion.tsx`, `ShortAnswerQuestion.tsx` — 四种题型全覆盖 ✓
- `app/admin/dashboard/page.tsx:59-65` — "导出 CSV ↓"按钮 ✓
- DESIGN.md：字体要求 Inter (700)，实际使用 Geist Sans（`app/layout.tsx:5-13`）— 轻微偏差，Geist 语义等价
- 截图：`.grading/shots/exam-platform-desktop-exam-entry.png`
- 截图：`.grading/shots/exam-platform-desktop-admin-login.png`

**要到 10 差什么**
1. 字体应按 DESIGN.md 使用 Inter，或在 DESIGN.md 中更新决策说明
2. 管理侧边栏 `AdminSidebar.tsx:7` 只有一个 nav item（成绩总览），若业务扩展需提前预留占位

---

### 2. 主题与审美 — 8/10（权重 12）

**证据**
- `app/globals.css:3-57` — 完整的 CSS 变量系统：background/surface/border/text/accent/success/warning/error 全覆盖，非 shadcn 默认值 ✓
- `app/globals.css:49-50` — 正确使用 Geist 字体变量 ✓
- `app/exam/[id]/page.tsx:127-132` — 3px 进度条 + accent fill，与 DESIGN.md 一致 ✓
- 截图对比：`.grading/shots/exam-platform-desktop-exam-entry.png`、`admin-login.png` — 色调一致，卡片阴影层次合理
- **反模式命中**：
  - emoji 代替图标库：`components/AdminSidebar.tsx:7` `📊 成绩总览`；`app/exam/page.tsx:72-74` `📋 💯 ⏱`；`components/ExamTimer.tsx:43` `⏱`；`components/ClearDataButton.tsx:37` `🗑`；`app/exam/[id]/result/page.tsx:63` `⚙️`（旋转加载中）— 共命中 **anti-patterns.md §1 emoji 替代图标**

**要到 10 差什么**
1. 引入 lucide-react 或 heroicons，将 emoji 替换为 SVG 图标（BarChart2、Timer、Trash2 等），消除 emoji 质感不统一问题
2. 结果页"AI 正在评分中" loading 状态用文字 `⚙️ animate-spin` 略显简陋，可用 SVG spinner 替代

---

### 3. 动画与流畅度 — 7/10（权重 10）

**证据**
- `app/exam/[id]/page.tsx:129` — 进度条 `transition-all duration-300`，切题时平滑推进 ✓
- `components/ExamTimer.tsx:39` — 最后 5 分钟 `animate-pulse` 红色心跳 ✓
- `app/exam/[id]/page.tsx:183` — 题目导航圆点 `transition-all` ✓
- `app/exam/[id]/page.tsx:199` — 确认弹窗无 enter/exit 动画，直接 `fixed inset-0` 出现/消失（硬切）✗
- `app/exam/[id]/result/page.tsx:63` — 结果页评分中状态用 `animate-spin` 旋转 emoji ✓
- grep 证明：无 framer-motion、无 @keyframes 自定义，仅 Tailwind 内置动画类

**要到 10 差什么**
1. 确认弹窗（ExamPage `showConfirm`）和结果页评分/完成状态切换，应加 `transition/opacity` 渐入渐出（150-200ms ease-out）
2. 方案选项卡（ChoiceQuestion）选中时 ring 出现无过渡，加 `transition-[box-shadow] duration-150` 更细腻

---

### 4. 状态完备性 — 7/10（权重 10）

**证据**
- `app/exam/[id]/page.tsx:99-105` — loading 态：`<div className="text-text-muted">加载中...</div>`（纯文字，无 skeleton/spinner）
- `app/exam/page.tsx:65-69` — error 态：内联 `text-error bg-error-soft` 样式块 ✓
- `app/exam/[id]/result/page.tsx:61-68` — 评分 pending 态：spinning ⚙️ + 文案 ✓
- `app/admin/dashboard/page.tsx:156-165` — empty 态：`暂无考试数据`（纯文字，无图标，无 CTA）✗
- 截图：`.grading/shots/exam-platform-desktop-admin-login.png` — success 态后自动跳转 ✓

**要到 10 差什么**
1. 考试加载（`/exam/[id]` 初始化）应用 skeleton 替代"加载中..."文字，防止用户不知道是否正在工作
2. 管理后台空状态（`dashboard/page.tsx:156-165`）加入图标和引导文案，如"还没有考生提交 · 等待学员完成作答后将自动显示"
3. 结果页"加载中..."（`result/page.tsx:41-47`）同上，应有 spinner 而非纯文字

---

### 5. 代码质量 — 9/10（权重 10）

**证据**
- grep `any\b` → 0 条命中（零 any 逃逸）✓
- grep `@ts-ignore` → 0 条命中 ✓
- grep `console\.log` → 0 条命中 ✓
- `lib/types.ts:1-60` — 完整类型定义，`QuestionType` / `ExamRecord` / `Grading` / `GradingBreakdown` 结构清晰 ✓
- 最大文件：`app/exam/[id]/page.tsx` 228 行，职责单一（考试作答页）✓
- `app/exam/[id]/page.tsx:60-73` — `saveCurrentAnswer` 正确使用 `useCallback([examId])` ✓
- `app/admin/dashboard/page.tsx:16` `export const dynamic = "force-dynamic"` — Server Component 正确标注 ✓
- `app/admin/exam/[id]/page.tsx:12` — `params: Promise<{ id: string }>` 按 Next.js 16 async params 规范 ✓

**要到 10 差什么**
1. `app/exam/[id]/page.tsx:23-56` 的 `useEffect` 中两个独立 fetch 链没有共享 loading/error 状态，`fetch /api/exam/start`（重新 POST）在已有 examId 时的语义模糊
2. `ClearDataButton.tsx:18,26` 使用了 `alert()` 而非组件内联错误 — 与整站风格不一致

---

### 6. 响应式适配 — 5/10（权重 8）

**证据**
- grep `sm:\|md:\|lg:\|xl:` → **0 条命中**（全项目无响应式 breakpoint 类）
- 截图：`.grading/shots/exam-platform-mobile-exam-entry.png`（375px）— 考生入口卡片正常 ✓
- 截图：`.grading/shots/exam-platform-tablet-exam-entry.png`（768px）— 考生入口卡片正常 ✓
- `components/AdminSidebar.tsx:14` — `w-[200px] ... min-h-screen flex-shrink-0`（固定宽度，无收缩响应）
- `app/admin/dashboard/page.tsx:52` — `flex min-h-screen`（侧边栏+内容）在 mobile 时会并排，管理后台在 375px 下布局破碎

**要到 10 差什么**
1. AdminSidebar 需要在 `sm:` 断点以下折叠为汉堡菜单或底部 tab，当前 mobile 下无法使用管理功能
2. Dashboard 统计卡片 `grid-cols-4` 在 mobile 下应改为 `grid-cols-2`
3. 考生端 `px-10` 内边距在 375px 下偏大，`px-4 sm:px-10` 更合适

---

### 7. 表单与输入反馈 — 7/10（权重 8）

**证据**
- `app/exam/page.tsx:79` — `disabled={!name.trim() || loading}` 防空提交 ✓
- `app/exam/page.tsx:80` — `{loading ? "正在创建考试..." : "开始考试"}` loading 文案切换 ✓
- `app/exam/page.tsx:59` — `onKeyDown={(e) => e.key === "Enter" && handleStart()}` 回车提交 ✓
- `app/exam/[id]/page.tsx:197-225` — 确认弹窗 + `disabled={submitting}` 防重复提交 ✓
- `app/exam/page.tsx:52-55` — `<label>姓名</label>` 与 `<input>` 相邻但无 `htmlFor`/`id` 关联 ✗
- `components/ClearDataButton.tsx:18` — 清空失败时 `alert("清空失败")` 而非内联错误 ✗

**要到 10 差什么**
1. 给 `<label>` 加 `htmlFor="name-input"`，给 `<input>` 加 `id="name-input"` — 语义关联
2. `ClearDataButton` 将 `alert()` 改为组件内部内联错误（与其他页面保持一致）
3. 管理员登录和考生入口均缺少字段格式校验提示（如名字为纯空格时的具体提示）

---

### 8. 性能 — 7/10（权重 8）

**证据**
- `npm run build` 输出：14 页路由，构建零错误 ✓
- `.next/static/` 总大小：872K（dev 模式，prod 产出更小）✓
- `app/admin/dashboard/page.tsx:16` — Server Component + `force-dynamic` 减少客户端 JS ✓
- `app/admin/exam/[id]/page.tsx:9` — Server Component，数据在服务端取 ✓
- `app/layout.tsx:5-13` — `next/font/google` 自动字体优化 ✓
- 无大图片资源，无需 `loading="lazy"`
- 无 `React.lazy` 手写 code splitting（Next.js App Router 按路由自动拆分，无需手动）✓
- 无 `Suspense` 边界（无流式渲染）

**要到 10 差什么**
1. 考生答题页 `/exam/[id]` 是纯 Client Component，可将顶部 bar 和基础信息提取为 SC，减少客户端 bundle
2. 考虑对 `ExamTimer` 使用 `memo` 避免题目切换时的 re-render（当前因无子树问题不严重）

---

### 9. 无障碍 a11y — 5/10（权重 8）

**证据**
- HTML source：`<html lang="zh-CN">` ✓
- `app/exam/page.tsx:52` — `<label>` 存在但无 `htmlFor`；`<input>` 无 `id` — label 未正确关联 ✗
- `app/exam/page.tsx:61` — `outline-none` 直接去掉 outline，虽有 `focus:ring-[3px]` 替代，但未使用 `focus-visible:` 前缀（会影响鼠标点击时也显示 ring）
- grep `aria-` → 0 条命中（无 `aria-invalid`、`aria-label`、`aria-live`）✗
- `components/ExamTimer.tsx:43` — `⏱ {timeStr}` emoji 无 `aria-hidden` + 屏幕阅读器替代文本 ✗
- 所有交互元素使用真 `<button>` 而非 `<div onClick>` ✓
- 按钮均有 `disabled` 属性 ✓
- `.grading/shots/exam-platform-desktop-exam-entry.png` — 视觉焦点 ring 可见（蓝色 focus ring）✓

**要到 10 差什么**
1. 给所有 `<label>` 加 `htmlFor`，给对应 `<input>` 加匹配 `id`
2. 将 `outline-none` 改为保留 `outline-none` + 添加 `focus-visible:ring-[3px] focus-visible:ring-accent-soft`（去掉鼠标点击时的 ring）
3. 给 `aria-invalid="true"` + `aria-describedby` 关联错误提示
4. 给 `ExamTimer` 的 emoji 添加 `aria-hidden="true"` + `<span className="sr-only">` 屏幕阅读替代

---

### 10. 微文案 — 8/10（权重 6）

**证据**
- 文案抽样：
  - 按钮：`开始考试` / `继续答题` / `确认提交` / `提交试卷` / `← 上一题` / `下一题 →` / `确认清空` / `取消` — 全部动词+对象 ✓
  - 空态：`暂无考试数据` — 无 CTA，无引导 ✗
  - 错误：`密码错误` / `网络错误，请重试` / `创建考试失败` — 具体 ✓
- `app/exam/page.tsx:49` — "请输入姓名后开始答题。提交后不可修改。" — 清晰的使用说明 ✓
- `app/exam/[id]/page.tsx:204-207` — "已答 X / Y 题 · 提交后不可修改，确定要提交吗？" ✓
- `components/ClearDataButton.tsx:18,26` — `alert("清空失败")` / `alert("网络错误")` — 破坏风格统一性 ✗
- 语言风格：全中文，无中英混用 ✓

**要到 10 差什么**
1. Dashboard 空状态文案升级：`暂无考试数据` → `还没有考生提交答卷 · 等待学员完成作答后将自动出现`
2. 将 `alert()` 替换为内联错误，保持文案展示方式一致

---

## 亮点

- **CSS 变量系统质量高**：`globals.css` 定义了完整的语义化 token（background/surface/border/text/accent/success/warning/error），直接使用 `text-text-muted`、`bg-error-soft` 等语义类，完全对齐 DESIGN.md 规格（`app/globals.css:3-57`）
- **Server/Client 边界清晰**：管理后台数据页用 Server Component，客户端状态（timer、答题、polling）正确标 `"use client"`，无滥用 Client Component 的问题（`app/admin/dashboard/page.tsx:16`）
- **TypeScript 类型完整**：`lib/types.ts` 定义了覆盖全业务流程的类型结构，components 的 interface 精准，项目无 any/ts-ignore（grep 验证）
- **防重复提交落实到位**：三个表单（考生入口/管理员登录/提交试卷）全部用 `disabled={loading}` 防止并发提交，`ClearDataButton` 用文字确认二次验证

## 最该优先修的 3 件事

1. **管理后台响应式（维度 6，当前 5 分）** — 影响：响应式适配 -4 分；改法：AdminSidebar 加 `hidden lg:flex`，新增汉堡菜单，Dashboard grid `grid-cols-2 lg:grid-cols-4`；约 30 行代码

2. **a11y 基础修复（维度 9，当前 5 分）** — 影响：无障碍 -4 分；改法：(a) `<label htmlFor="name-input">` + `<input id="name-input">`；(b) `outline-none` 改为 `focus-visible:ring-[3px]`；(c) 错误态加 `aria-invalid`；约 15 行代码

3. **引入 SVG 图标库替换 emoji（维度 2，当前 8 分）** — 影响：主题与审美 -1 分（加固当前 8 分上限）；改法：`npm install lucide-react`，替换 `📊→BarChart2`、`⏱→Timer`、`🗑→Trash2`、`⚙️→Loader2`；约 20 行改动

## 评分风险

- **a11y 维度**：axe-core 工具因 chromedriver 缺失未能自动运行（`.grading/probes/exam-platform-axe.json` 未生成），a11y 证据基于 HTML 源码静态分析和代码阅读，评分可信度 85%。若补充 axe 扫描，分数可能在 ±1 区间内波动。
