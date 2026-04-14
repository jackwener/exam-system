"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ClearDataButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const router = useRouter();

  async function handleClear() {
    if (confirmText !== "清空") return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/clear", { method: "POST" });
      if (!res.ok) {
        alert("清空失败");
        setLoading(false);
        return;
      }
      setOpen(false);
      setConfirmText("");
      router.refresh();
    } catch {
      alert("网络错误");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-1.5 text-xs font-medium text-[var(--error)] bg-surface border border-[var(--error)] rounded-md shadow-sm hover:bg-[var(--error-soft)] transition-all"
      >
        🗑 清空数据
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl p-6 max-w-sm mx-4 shadow-xl border border-border">
            <h3 className="text-base font-semibold mb-2 text-[var(--error)]">
              ⚠️ 清空所有考试数据
            </h3>
            <p className="text-sm text-text-muted mb-4 leading-relaxed">
              此操作将删除所有考生答卷和成绩，不可恢复。请在下方输入 <span className="font-mono font-semibold text-text">清空</span> 以确认。
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="输入「清空」确认"
              className="w-full px-3 py-2 bg-surface border-[1.5px] border-border rounded-md text-sm outline-none focus:border-[var(--error)] mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setOpen(false);
                  setConfirmText("");
                }}
                className="flex-1 py-2 text-sm font-medium border border-border rounded-md hover:bg-surface-2 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleClear}
                disabled={confirmText !== "清空" || loading}
                className="flex-1 py-2 text-sm font-semibold text-white bg-[var(--error)] rounded-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {loading ? "清空中..." : "确认清空"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
