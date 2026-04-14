"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EXAM_CONFIG } from "@/lib/questions";

export default function ExamEntry() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleStart() {
    if (!name.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/exam/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "创建考试失败");
        setLoading(false);
        return;
      }

      router.push(`/exam/${data.id}`);
    } catch {
      setError("网络错误，请重试");
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-[400px] bg-surface border border-border rounded-xl p-10 shadow-lg">
        <div className="text-xs font-semibold tracking-widest uppercase text-accent-text mb-5">
          AI Coding Workshop
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-1.5">
          {EXAM_CONFIG.title}
        </h1>
        <p className="text-sm text-text-muted mb-7 leading-relaxed">
          请输入姓名后开始答题。提交后不可修改。
        </p>

        <label className="block text-[13px] font-medium text-text-secondary mb-1.5">
          姓名
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleStart()}
          placeholder="输入你的姓名"
          className="w-full px-3.5 py-2.5 bg-surface border-[1.5px] border-border rounded-md text-sm text-text outline-none transition-all focus:border-accent focus:ring-[3px] focus:ring-accent-soft placeholder:text-text-faint mb-5"
          autoFocus
        />

        {error && (
          <div className="text-sm text-error bg-error-soft rounded-md px-3 py-2 mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-4 mb-6 text-[13px] text-text-muted">
          <span>📋 {EXAM_CONFIG.totalQuestions} 题</span>
          <span>💯 {EXAM_CONFIG.totalScore} 分</span>
          <span>⏱ {EXAM_CONFIG.duration / 60} 分钟</span>
        </div>

        <button
          onClick={handleStart}
          disabled={!name.trim() || loading}
          className="w-full py-2.5 bg-accent text-white font-semibold text-sm rounded-md transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_1px_3px_rgba(37,99,235,0.3)]"
        >
          {loading ? "正在创建考试..." : "开始考试"}
        </button>
      </div>
    </div>
  );
}
