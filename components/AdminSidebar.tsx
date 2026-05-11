"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin/dashboard", label: "📊 成绩总览" },
  // Workshop · Task 3: 实现"题型正确率统计"页
  //   - 新建 app/admin/stats/page.tsx
  //   - 统计每道客观题的正确率 / 每个题型的平均得分
  //   - 详见 AGENTS.md
  { href: "/admin/stats", label: "📈 题型正确率 (待实现)" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[200px] bg-surface border-r border-border min-h-screen flex-shrink-0">
      <div className="px-4 py-4 text-xs font-semibold tracking-widest uppercase text-text-faint border-b border-border">
        Admin
      </div>
      <nav className="py-2">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-4 py-2 text-[13px] transition-all ${
                active
                  ? "bg-accent-soft text-accent font-medium"
                  : "text-text-muted hover:bg-surface-2 hover:text-text"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
