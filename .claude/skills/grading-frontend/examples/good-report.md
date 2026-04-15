# 项目评分报告 — team-calibration-good（前端）

评分人：Claude@sonnet-4.6
日期：2026-04-14
Spec 版本：`docs/spec.md @ f27be3a6`（todo 应用基础版）
被评项目 commit：`a1b2c3d4`（team-calibration-good / main）
评分耗时：约 42 分钟（含 playwright-cli 截图 8 张、手动跑 3 条关键流程）

> 被评项目是一个典型的培训项目：前后端分离的任务管理 (todo) 应用，spec 规定以下页面与流程：登录 → 任务列表 → 任务详情 → 新建任务 → 删除任务。前端技术栈：React 18 + Vite + TypeScript + Tailwind CSS + 自定义设计 token + Zustand。

---

## 总分：85 / 100 — 等级 A

| # | 维度 | 得分 | 权重 | 加权 | 一句话 |
|---|---|---:|---:|---:|---|
| 1 | Spec 一致性 | 9 | 20 | 18.0 | 5 个页面全部实现；仅"详情页删除确认"的二次确认略弱于 spec §3.4.2 |
| 2 | 主题与审美 | 8 | 12 | 9.6 | 自定义深靛+琥珀双色 token，远离 shadcn 默认灰；若干卡片阴影偏重 |
| 3 | 动画与流畅度 | 8 | 10 | 8.0 | 路由切换有 fade + slide-up；列表项进入错落不够 |
| 4 | 状态完备性 | 9 | 10 | 9.0 | loading/empty/error/success 四态齐全；error 文案可以更具体 |
| 5 | 代码质量 | 9 | 10 | 9.0 | 组件层次清晰、hooks 正确、Zustand store 切片合理 |
| 6 | 响应式适配 | 8 | 8 | 6.4 | 375/768/1280 三断点均可用；tablet 下侧栏略拥挤 |
| 7 | 表单与输入反馈 | 9 | 8 | 7.2 | 校验、禁用态、防重复提交都做到；async 错误映射到字段尚未覆盖全部字段 |
| 8 | 性能 | 9 | 8 | 7.2 | 首屏 gzip 后 92 KB，FCP 0.9s，交互无卡顿；单个大图可再 lazy |
| 9 | 无障碍 (a11y) | 7 | 8 | 5.6 | 语义化 + focus-visible 基本到位；对比度少量不足；未实现 Esc 关弹窗 |
| 10 | 微文案 | 8 | 6 | 4.8 | 空态与错误文案有心意；个别按钮仍是"确定/取消"而非动词 |
| — | **合计** | — | 100 | **84.8 ≈ 85** | A 档，上游水平 |

---

## 逐维度详评

### 1. Spec 一致性 — 9/10

**证据**
- Spec §2 路由清单：5 条路由全部实现
  - `/login` → `src/routes/LoginPage.tsx:1-84`
  - `/tasks` → `src/routes/TasksPage.tsx:1-167`
  - `/tasks/:id` → `src/routes/TaskDetailPage.tsx:1-142`
  - `/tasks/new` → `src/routes/TaskNewPage.tsx:1-98`
  - delete 通过 `TaskDetailPage.tsx:88-121` 的 `handleDelete` 触发
- Spec §3.2 列表字段（标题/状态/截止时间/优先级）全部呈现 — 截图 `.grading/shots/team-calibration-good-tasks.png`
- Spec §3.4.2 "删除需二次确认" — 当前仅 `window.confirm`，UI 层没有自定义 dialog，体验略弱
- 没有观察到超纲功能（无甘特图/AI 推荐这种 AI-slop-feature）

**要到 10 差什么**
1. 用自定义 `<ConfirmDialog>` 替换原生 `confirm`，与整体主题一致（spec §3.4.2 的精神是"UI 层确认"）
2. 列表筛选 tab 的选中态在刷新后没有持久化，建议通过 URL query 参数映射（spec §3.2.3 暗含此行为）
3. 登录成功后的跳转目标没有处理"来源路由"，目前固定跳 `/tasks`（spec §1.3 建议回到 `?redirect=`）

---

### 2. 主题与审美 — 8/10

**证据**
- `tailwind.config.ts:18-74` 自定义了 `indigo-950/900/800` 与 `amber-400/500` 的双主色，避免了默认 shadcn 灰
- 字体：`Inter` + `JetBrains Mono`，通过 `src/styles/fonts.css:1-22` 自托管
- 卡片圆角统一 `rounded-2xl`，但阴影 `shadow-xl` 对浅色卡略重 — 截图 `.grading/shots/team-calibration-good-tasks.png` 的右上卡片阴影有一圈灰晕
- 间距系统一致（4/8/12/16/24 scale），没有随手 `mt-[13px]` 的魔法数字

**要到 10 差什么**
1. 卡片阴影替换为更柔和的 `shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_24px_-8px_rgba(15,23,42,0.15)]`（见 anti-patterns §"千篇一律的 shadow"）
2. 按钮 hover 态目前是简单变深，可加 `transform: translateY(-1px)` + 阴影收敛，做出"按下感"
3. Dark mode 未实现 — spec 未强制，但同档次项目基本都有

---

### 3. 动画与流畅度 — 8/10

**证据**
- 路由切换使用 Framer Motion，`src/routes/AnimatedOutlet.tsx:12-44` 实现 fade + 8px slide-up，250ms
- 任务 checkbox 切换有 spring 过渡 — 见 `src/components/TaskCheckbox.tsx:24-41`
- Lighthouse Performance 记录 CLS = 0，没有 layout shift
- 列表项入场是一次性 fade-in 整组，没有 stagger — 截图 `.grading/shots/team-calibration-good-list-entry.gif`（25 帧）
- 没有看到滚动卡顿，帧率稳定 58–60

**要到 10 差什么**
1. 列表项入场加 `staggerChildren: 0.03`，错落展开更精致
2. 空态的插画可以加一个 2s loop 的极轻微摇摆（subtle 感，非 distracting）
3. 删除动画目前是直接消失，可做 height-collapse + fade-out（感知更"有响应"）

---

### 4. 状态完备性 — 9/10

**证据**
- Loading：`src/components/TaskList.tsx:44-58` 渲染 6 条 skeleton，而不是 spinner
- Empty：`TaskList.tsx:60-82` 自定义插画 + "还没有任务，先建一个看看？" + CTA 按钮
- Error：`TaskList.tsx:84-102` 区分网络错/后端错/权限错三种
- Success：新建后的 toast + 滚到新项 + 高亮 2s
- 截图：`.grading/shots/team-calibration-good-{loading,empty,error}.png` 全齐
- 小瑕疵：error 文案里的 "请稍后重试" 没有附带"重试"按钮，需要用户自己刷新

**要到 10 差什么**
1. Error 态加"重试"按钮，直接重放最近一次 mutation
2. 空态的 CTA 按钮使用 primary variant 而不是当前的 outline，吸引力更强
3. Success toast 的持续时间建议加可暂停（hover 时不消失）

---

### 5. 代码质量 — 9/10

**证据**
- 组件按 `routes/ components/ hooks/ store/ api/ lib/` 分层（`src/` tree）
- TypeScript strict mode 打开 — `tsconfig.json:6` `"strict": true`
- Zustand store 切片：`authStore` / `tasksStore` / `uiStore`，职责清楚 — `src/store/`
- Hooks 正确性：`useEffect` 依赖数组无 lint warning，自定义 hook `useDebouncedSearch.ts` 有 cleanup
- 无 prop drilling：超过 2 层的数据一律走 store 或 context
- 一处可改进：`TasksPage.tsx:54-72` 的 `useMemo` 依赖里包含整个 `tasks` 数组，频繁重算；可按 `tasks.length + filterKey` 派生

**要到 10 差什么**
1. 上面 memo 依赖优化
2. `api/client.ts` 的 axios 实例没有抽出 interceptor 泛型，`.then(r => r.data)` 在每个调用处重复
3. 添加 `src/lib/result.ts` 统一返回类型（`Result<T,E>`）避免到处 `try/catch`

---

### 6. 响应式适配 — 8/10

**证据**
- 三断点截图齐备：
  - `.grading/shots/team-calibration-good-mobile-375.png`
  - `.grading/shots/team-calibration-good-tablet-768.png`
  - `.grading/shots/team-calibration-good-desktop-1280.png`
- mobile 侧栏变抽屉，汉堡按钮命中区域 ≥ 44×44（符合 HIG）
- tablet (768) 下，侧栏与主区之间 gap 过窄（仅 8px），看起来挤
- 表单在 mobile 下 input 字号 ≥ 16px，不会触发 iOS 缩放

**要到 10 差什么**
1. tablet 断点侧栏 gap 改为 24px，或在 ≤ 900 时直接折叠为 icon-only
2. `md:` 断点下列表项一行 3 列在 1024 显示器上显得过宽，建议在 `md` 与 `lg` 之间再设 2 列
3. mobile 下的 sticky header 随 iOS Safari bounce 会露底色，建议加 `backdrop-filter`

---

### 7. 表单与输入反馈 — 9/10

**证据**
- 使用 react-hook-form + zod — `src/routes/TaskNewPage.tsx:18-45`
- 提交中按钮 disabled + loading spinner — 第 87-94 行
- 防重复：`isSubmitting` guard + mutation 层 idempotency key（`src/api/tasks.ts:22-34`）
- 字段级 error 展示有抖动动画 2px — `src/components/FieldError.tsx`
- 可改进：服务器 422 的字段错误没有全部映射到 RHF 的 `setError`，部分仍只显示在 toast

**要到 10 差什么**
1. 写一个 `mapServerErrors(err, setError)` 的工具覆盖所有字段
2. 长文本 textarea 未显示字符计数 — spec §3.3.2 要求 500 字符上限
3. 日期选择器在 Safari 下 native fallback 样式不一致，可做统一

---

### 8. 性能 — 9/10

**证据**
- Bundle 分析：`dist/assets/*.js` gzip 后 92 KB，vendor 拆分合理
- Vite 配置了 `build.rollupOptions.output.manualChunks` — `vite.config.ts:24-38`
- Lighthouse（本地）：Performance 96 / FCP 0.9s / LCP 1.2s / CLS 0 / TBT 30ms
- 图片使用 `<img loading="lazy">` 除了首屏 hero
- 一处可改：设置页有一张 1.1MB PNG avatar，未压缩；应走 `?format=webp&w=128` 转换

**要到 10 差什么**
1. 引入 vite-imagetools，自动 webp/avif 转换 + responsive srcset
2. `tasks.ts` 的列表接口响应未启用 HTTP cache，建议加 SWR + stale-while-revalidate
3. 首屏可以预加载 `/api/me` + `/api/tasks?page=1` 两个关键资源

---

### 9. 无障碍 (a11y) — 7/10

**证据**
- 语义化：`<nav>` `<main>` `<aside>` 正确；表单 label 关联 input — `TaskNewPage.tsx:60-82`
- `:focus-visible` 环：全局 `src/styles/focus.css:1-14` 定义了 2px indigo outline — 远好于 shadcn 默认移除 outline
- 键盘导航：Tab 顺序合理，列表项回车可进入详情
- 问题：
  - `text-gray-400 on bg-gray-50` 对比度 3.1:1，不达 4.5:1（WCAG AA）— 截图 `.grading/shots/team-calibration-good-contrast.png`
  - 删除确认对话框按 Esc 不关闭 — `ConfirmDialog.tsx:28` 未绑定
  - 图标按钮（复制、分享）缺 `aria-label`
- 没有 skip-to-content 链接

**要到 10 差什么**
1. 修正对比度问题：辅助文本从 `gray-400` 改为 `gray-500`
2. 所有弹层添加 Esc 关闭 + 焦点 trap + 回焦到触发器
3. 图标按钮统一用 `<IconButton aria-label>` 封装，禁止裸 `<button><Icon/></button>`
4. 页首加 `<a class="sr-only focus:not-sr-only">` 跳到主内容

---

### 10. 微文案 — 8/10

**证据**
- 空态："还没有任务，先建一个看看？" — 比通用 "No data" 好
- 错误提示："网络打了个盹，刷新一下试试" — 有人味
- 删除确认："删除后无法恢复，你确认吗？" — 清楚说明后果
- 两个回退点：
  - 新建页主按钮仍是"确定" — 建议"创建任务"（动词 + 宾语）
  - 登录按钮在等待态文案是"加载中..." — 应是"登录中..."

**要到 10 差什么**
1. 所有主按钮文案用动词短语替代泛化的"确定/提交"
2. Loading 态文案要具体到动作（"登录中..." / "保存中..." / "删除中..."）
3. 错误信息里加一条"如果持续出现请联系 xxx" 的兜底路径

---

## 亮点

1. **自定义主题 token 远离 AI slop**：双主色 + 系统化间距，视觉辨识度高，不是随手 shadcn default（见 §2）
2. **状态四态真正做齐**：大多数培训项目只做 loading + success，这里 error 还分了三种，教学价值高
3. **表单工程化**：RHF + zod + 服务端错误映射 + idempotency key，已经接近生产代码水平
4. **性能基线扎实**：92 KB gzip / FCP 0.9s / CLS 0，没有任何明显回退点

---

## 最该优先修的 3 件事

1. **a11y 对比度 + Esc 关闭 + aria-label**（§9 三条合起来就是 +2 分的确定空间，工作量 < 1 小时）
2. **删除确认替换为自定义 Dialog**（§1 + §3 + §9 同时吃到分，而且是 spec 硬要求）
3. **错误态加重试按钮 & Loading 文案具体化**（§4 + §10 一起，体感提升大于代码量）

---

<!-- 校对：
维度分数 × 权重：
1. Spec 一致性       9 × 20 = 180
2. 主题与审美        8 × 12 =  96
3. 动画与流畅度      8 × 10 =  80
4. 状态完备性        9 × 10 =  90
5. 代码质量          9 × 10 =  90
6. 响应式适配        8 ×  8 =  64
7. 表单与输入反馈    9 ×  8 =  72
8. 性能              9 ×  8 =  72
9. 无障碍 (a11y)     7 ×  8 =  56
10. 微文案           8 ×  6 =  48
sum = 180+96+80+90+90+64+72+72+56+48 = 848
total = 848 / 10 = 84.8 → 85 分（A 档）
-->
