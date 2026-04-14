import { NextResponse } from "next/server";
import { listExams } from "@/lib/kv";

export async function GET() {
  const exams = await listExams();
  const completed = exams.filter(
    (e) => e.submittedAt && e.grading.status === "completed"
  );

  const header = "姓名,选择题,判断题,简答题,场景分析,总分,提交时间\n";
  const rows = completed
    .sort((a, b) => b.grading.totalScore - a.grading.totalScore)
    .map((e) => {
      const time = e.submittedAt
        ? new Date(e.submittedAt).toLocaleString("zh-CN")
        : "";
      return [
        e.name,
        e.grading.breakdown.choice.score,
        e.grading.breakdown.trueFalse.score,
        e.grading.breakdown.shortAnswer.score,
        e.grading.breakdown.scenario.score,
        e.grading.totalScore,
        time,
      ].join(",");
    })
    .join("\n");

  const csv = "\uFEFF" + header + rows; // BOM for Excel Chinese support

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="exam-results-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
