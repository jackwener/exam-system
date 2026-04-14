import { NextResponse } from "next/server";
import { getExam } from "@/lib/kv";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const examId = searchParams.get("id");

  if (!examId) {
    return NextResponse.json({ error: "参数缺失" }, { status: 400 });
  }

  const exam = await getExam(examId);
  if (!exam) {
    return NextResponse.json({ error: "考试不存在" }, { status: 404 });
  }

  return NextResponse.json({
    status: exam.grading.status,
    totalScore: exam.grading.totalScore,
    breakdown: exam.grading.breakdown,
    scores: exam.grading.status === "completed" ? exam.grading.scores : undefined,
  });
}
