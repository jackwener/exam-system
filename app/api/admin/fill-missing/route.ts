import { NextResponse } from "next/server";
import { listExams, getExam } from "@/lib/kv";
import { fillMissingObjectives } from "@/lib/grading";

// Auth is enforced by proxy.ts for /api/admin/:path*.
//
// POST body:
//   { examId: string }  — fill missing objective answers on a single exam
//   { all: true }       — fill missing objective answers on all submitted exams
//
// Policy: any objective question (choice / multiChoice / trueFalse) with an
// empty answer is credited as correct (full score). This compensates for
// answer-save requests lost to transient network issues during the exam.

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    if (body.examId) {
      const exam = await getExam(body.examId);
      if (!exam) {
        return NextResponse.json({ error: "考试不存在" }, { status: 404 });
      }
      const summary = await fillMissingObjectives(exam);
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

      // No API calls involved — safe to run concurrently without throttling.
      const results = await Promise.all(
        targets.map(async (exam) => {
          const summary = await fillMissingObjectives(exam);
          return {
            examId: exam.id,
            name: exam.name,
            ...summary,
          };
        })
      );

      const totalFilled = results.reduce((sum, r) => sum + r.filled, 0);
      const totalScoreDelta = results.reduce(
        (sum, r) => sum + r.scoreDelta,
        0
      );
      const examsAffected = results.filter((r) => r.filled > 0).length;

      return NextResponse.json({
        ok: true,
        examsProcessed: results.length,
        examsAffected,
        totalFilled,
        totalScoreDelta,
        details: results.filter((r) => r.filled > 0),
      });
    }

    return NextResponse.json(
      { error: "参数缺失：需要 examId 或 all=true" },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "修复失败";
    console.error("Fill-missing error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
