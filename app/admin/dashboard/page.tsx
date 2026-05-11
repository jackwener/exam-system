import { listExams } from "@/lib/kv";
import Link from "next/link";
import AdminSidebar from "@/components/AdminSidebar";
import ClearDataButton from "@/components/ClearDataButton";

function ScoreBadge({ score }: { score: number }) {
  let cls = "font-mono font-semibold text-[13px] px-2.5 py-0.5 rounded";
  if (score >= 80) cls += " text-[var(--success)] bg-[var(--success-soft)]";
  else if (score >= 60) cls += " text-[var(--warning)] bg-[var(--warning-soft)]";
  else cls += " text-[var(--error)] bg-[var(--error-soft)]";
  return <span className={cls}>{score}</span>;
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const exams = await listExams();
  const completed = exams.filter(
    (e) => e.submittedAt && e.grading.status === "completed"
  );
  const sorted = completed.sort(
    (a, b) => b.grading.totalScore - a.grading.totalScore
  );

  const totalCount = sorted.length;
  const avgScore =
    totalCount > 0
      ? Math.round(
          (sorted.reduce((sum, e) => sum + e.grading.totalScore, 0) /
            totalCount) *
            10
        ) / 10
      : 0;
  const passCount = sorted.filter((e) => e.grading.totalScore >= 60).length;
  const passRate =
    totalCount > 0 ? Math.round((passCount / totalCount) * 100) : 0;
  const maxScore =
    totalCount > 0 ? Math.max(...sorted.map((e) => e.grading.totalScore)) : 0;

  const stats = [
    { label: "参考人数", value: totalCount.toString() },
    { label: "平均分", value: avgScore.toString() },
    {
      label: "及格率",
      value: `${passRate}%`,
      color: "var(--success)",
      sub: "≥ 60 分",
    },
    { label: "最高分", value: maxScore.toString() },
  ];

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex-1 p-7">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-bold tracking-tight">成绩总览</h1>
          <div className="flex gap-2">
            <ClearDataButton />
            <a
              href="/api/admin/export"
              className="px-4 py-1.5 text-xs font-medium text-text-muted bg-surface border border-border rounded-md shadow-sm hover:bg-surface-2 transition-all"
            >
              导出 CSV ↓
            </a>
            {/* Workshop · Task 2: 实现"重评失败题"
                  - 新建 POST /api/admin/regrade（lib/grading.ts 已有 regradeFailedQuestions 辅助函数）
                  - 把下面 disabled 按钮改成调用该 API 的客户端组件
                  - 详见 AGENTS.md
            */}
            <button
              disabled
              title="workshop task · 学员实现"
              className="px-4 py-1.5 text-xs font-medium text-text-faint bg-surface-2 border border-dashed border-border rounded-md cursor-not-allowed"
            >
              重评失败题 (待实现)
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-surface border border-border rounded-lg p-4 shadow-sm"
            >
              <div className="text-xs text-text-faint mb-1">{s.label}</div>
              <div
                className="font-mono text-[28px] font-bold tracking-tighter"
                style={{ color: s.color }}
              >
                {s.value}
              </div>
              {s.sub && (
                <div className="text-[11px] text-text-faint mt-0.5">{s.sub}</div>
              )}
            </div>
          ))}
        </div>

        {/* Results table */}
        <div className="bg-surface border border-border rounded-lg shadow-sm overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface-2 border-b border-border">
                <th className="text-left px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-faint">
                  姓名
                </th>
                <th className="text-left px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-faint">
                  选择题 /39
                </th>
                <th className="text-left px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-faint">
                  多选题 /20
                </th>
                <th className="text-left px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-faint">
                  判断题 /20
                </th>
                <th className="text-left px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-faint">
                  简答题 /21
                </th>
                <th className="text-left px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-faint">
                  总分 /100
                </th>
                <th className="text-left px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-faint">
                  提交时间
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((exam) => (
                <tr
                  key={exam.id}
                  className="border-b border-border-subtle last:border-b-0 hover:bg-surface-2 transition-colors"
                >
                  <td className="px-3.5 py-2.5 text-[13px] font-medium text-text">
                    {/* Workshop · Task 1: 实现"答卷详情页"
                          - 点击姓名应该进入答卷详情页（每题的对错 / 学员答案 / AI 评语）
                          - 新建 app/admin/exam/[id]/page.tsx（server component，可直接 getExam()）
                          - 详见 AGENTS.md
                          - 注：现在点击会 404，待你实现 */}
                    <Link
                      href={`/admin/exam/${exam.id}`}
                      className="hover:text-accent transition-colors"
                    >
                      {exam.name}
                    </Link>
                  </td>
                  <td className="px-3.5 py-2.5 text-[13px] text-text-secondary">
                    {exam.grading.breakdown.choice.score}
                  </td>
                  <td className="px-3.5 py-2.5 text-[13px] text-text-secondary">
                    {exam.grading.breakdown.multiChoice?.score ?? 0}
                  </td>
                  <td className="px-3.5 py-2.5 text-[13px] text-text-secondary">
                    {exam.grading.breakdown.trueFalse.score}
                  </td>
                  <td className="px-3.5 py-2.5 text-[13px] text-text-secondary">
                    {exam.grading.breakdown.shortAnswer.score}
                  </td>
                  <td className="px-3.5 py-2.5">
                    <ScoreBadge score={exam.grading.totalScore} />
                  </td>
                  <td className="px-3.5 py-2.5 font-mono text-xs text-text-faint">
                    {exam.submittedAt
                      ? new Date(exam.submittedAt).toLocaleTimeString("zh-CN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3.5 py-8 text-center text-sm text-text-faint"
                  >
                    暂无考试数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
