import { NextResponse } from "next/server";
import { listExams, getExam } from "@/lib/kv";
import { regradeFailedQuestions } from "@/lib/grading";

// Auth is enforced by proxy.ts for /api/admin/:path*.

// POST body:
//   { examId: string }  — regrade a single exam
//   { all: true }       — regrade every exam with at least one failed subjective question
//
// For the batch mode, we process exams with bounded concurrency to avoid
// hammering the GLM API.
const BATCH_CONCURRENCY = 3;

async function processInBatches<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    // Single exam mode
    if (body.examId) {
      const exam = await getExam(body.examId);
      if (!exam) {
        return NextResponse.json({ error: "考试不存在" }, { status: 404 });
      }
      const summary = await regradeFailedQuestions(exam);
      return NextResponse.json({
        ok: true,
        examId: exam.id,
        name: exam.name,
        ...summary,
      });
    }

    // Batch mode: regrade every exam with at least one failed subjective.
    if (body.all === true) {
      const exams = await listExams();
      const targets = exams.filter(
        (e) =>
          e.submittedAt &&
          Object.values(e.grading.scores || {}).some((s) =>
            (s.feedback || "").includes("评分失败")
          )
      );

      const results = await processInBatches(
        targets,
        BATCH_CONCURRENCY,
        async (exam) => {
          const summary = await regradeFailedQuestions(exam);
          return {
            examId: exam.id,
            name: exam.name,
            ...summary,
          };
        }
      );

      const totalAttempted = results.reduce((sum, r) => sum + r.attempted, 0);
      const totalRecovered = results.reduce((sum, r) => sum + r.recovered, 0);
      const totalScoreDelta = results.reduce((sum, r) => sum + r.scoreDelta, 0);
      const examsFullyRecovered = results.filter(
        (r) => r.stillFailing.length === 0
      ).length;

      return NextResponse.json({
        ok: true,
        examsProcessed: results.length,
        examsFullyRecovered,
        totalAttempted,
        totalRecovered,
        totalScoreDelta,
        details: results,
      });
    }

    return NextResponse.json(
      { error: "参数缺失：需要 examId 或 all=true" },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "重评失败";
    console.error("Regrade error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
