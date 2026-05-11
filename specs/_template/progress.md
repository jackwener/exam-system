# Progress · {{需求名}}

> 这个文件是 Agent 的**短期记忆外置**。
> 每次 session 结束**必须**更新——否则下次会话开始时 Agent 完全失忆。

## Current Status

> 一句话说当前在哪、刚做完什么。

**例**：

> T1（route handler）已完成并手测通过。当前在 T2（写 RegradeButton 组件）。

## Last Session Summary

> 上次 session 做了什么、产出了什么、踩了什么坑。

**例**：

> 2026-05-11 14:30-15:10
> - 实现了 `app/api/admin/regrade/route.ts`
> - 单测：构造一个有失败题的 exam → POST 调用 → 返回 `recovered: 1` ✓
> - 踩坑：忘了 `proxy.ts` 已经做了鉴权，自己又写了一次密码校验——已删除冗余代码

## Blockers

> 当前阻塞什么？等谁的输入？

**例**：

> 等 Designer 确认 button 文案是"重评失败题"还是"重新评分"。

## Next Step

> 下次 session 一上来该做什么。具体到操作粒度。

**例**：

> 1. 复制 `ClearDataButton.tsx` 改写成 `RegradeButton.tsx`
> 2. 注入到 dashboard 的"导出 CSV"按钮旁边
> 3. 手测全流程

## Open Questions

> 还没确认的设计 / 实现问题，列出来等下次 session 一并解决。

- toast 用 `alert()` 还是写个轻量 `<Toast>` 组件？
- 重评失败时按钮 loading 转圈还是禁用？

---

**更新约定**：每次 session 结束前 1 分钟 commit 这个文件。即便没"完成" task，**也要**记下"做到哪了 / 下次从哪继续"。
