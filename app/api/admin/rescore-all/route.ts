import { NextResponse } from "next/server";
import { listExams, getExam } from "@/lib/kv";
import { rescoreExam } from "@/lib/grading";

// Auth enforced by proxy.ts.
//
// POST body:
//   { examId: string }  — rescore one exam under the current point schema
//   { all: true }       — rescore every submitted exam
//
// This does not call any LLM; it only rescales existing score/correct fields
// to the new maxScore values defined in questions.ts.

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    if (body.examId) {
      const exam = await getExam(body.examId);
      if (!exam) {
        return NextResponse.json({ error: "考试不存在" }, { status: 404 });
      }
      const summary = await rescoreExam(exam);
      return NextResponse.json({
        ok: true,
        examId: exam.id,
        name: exam.name,
        ...summary,
      });
    }

    if (body.all === true) {
      const exams = await listExams();
      const targets = exams.filter((e) => e.submittedAt);
      const results = await Promise.all(
        targets.map(async (exam) => {
          const summary = await rescoreExam(exam);
          return {
            examId: exam.id,
            name: exam.name,
            ...summary,
          };
        })
      );
      const totalDelta = results.reduce((sum, r) => sum + r.delta, 0);
      return NextResponse.json({
        ok: true,
        examsProcessed: results.length,
        totalDelta,
        avgNewTotal:
          results.length > 0
            ? Math.round(
                (results.reduce((sum, r) => sum + r.newTotal, 0) /
                  results.length) *
                  10
              ) / 10
            : 0,
        details: results,
      });
    }

    return NextResponse.json(
      { error: "参数缺失：需要 examId 或 all=true" },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "重评失败";
    console.error("Rescore error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
