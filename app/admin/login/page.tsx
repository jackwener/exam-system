"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin() {
    if (!password) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        setError("密码错误");
        setLoading(false);
        return;
      }

      router.push("/admin/dashboard");
    } catch {
      setError("网络错误");
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-[360px] bg-surface border border-border rounded-xl p-8 shadow-lg">
        <div className="text-xs font-semibold tracking-widest uppercase text-text-faint mb-4">
          Admin
        </div>
        <h1 className="text-xl font-bold tracking-tight mb-6">管理员登录</h1>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          placeholder="输入管理密码"
          className="w-full px-3.5 py-2.5 bg-surface border-[1.5px] border-border rounded-md text-sm outline-none transition-all focus:border-accent focus:ring-[3px] focus:ring-accent-soft placeholder:text-text-faint mb-4"
          autoFocus
        />

        {error && (
          <div className="text-sm text-error bg-error-soft rounded-md px-3 py-2 mb-4">
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={!password || loading}
          className="w-full py-2.5 bg-accent text-white font-semibold text-sm rounded-md hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? "登录中..." : "登录"}
        </button>
      </div>
    </div>
  );
}
