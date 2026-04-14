import { getExam } from "@/lib/kv";
import { questions } from "@/lib/questions";
import { answers } from "@/lib/answers";
import { notFound } from "next/navigation";
import Link from "next/link";
import ScoreRing from "@/components/ScoreRing";
import AdminSidebar from "@/components/AdminSidebar";

export const dynamic = "force-dynamic";

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const exam = await getExam(id);
  if (!exam) notFound();

  const answerMap = new Map(answers.map((a) => [a.questionId, a]));

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex-1 p-7 max-w-[800px]">
      <Link
        href="/admin/dashboard"
        className="text-[13px] text-text-muted hover:text-accent transition-colors mb-4 inline-block"
      >
        ← 返回总览
      </Link>

      <div className="flex items-center gap-6 mb-8">
        <div>
          <h1 className="text-lg font-bold tracking-tight">{exam.name}</h1>
          <p className="text-[13px] text-text-muted mt-1">
            提交于{" "}
            {exam.submittedAt
              ? new Date(exam.submittedAt).toLocaleString("zh-CN")
              : "-"}
          </p>
        </div>
        <ScoreRing score={exam.grading.totalScore} max={100} />
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { label: "选择题", ...exam.grading.breakdown.choice },
          { label: "判断题", ...exam.grading.breakdown.trueFalse },
          { label: "简答题", ...exam.grading.breakdown.shortAnswer },
          { label: "场景分析", ...exam.grading.breakdown.scenario },
        ].map((b) => (
          <div
            key={b.label}
            className="bg-surface border border-border rounded-lg p-3 text-center shadow-sm"
          >
            <div className="text-xs text-text-faint mb-1">{b.label}</div>
            <div className="font-mono text-lg font-bold">
              {b.score}
              <span className="text-text-faint font-normal text-sm">
                /{b.max}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Questions detail */}
      <div className="space-y-4">
        {questions.map((q) => {
          const ans = answerMap.get(q.id);
          const score = exam.grading.scores[q.id];
          const studentAnswer = exam.answers[q.id] || "";

          // Skip scenario parent — show sub-questions instead
          if (q.type === "scenario" && q.subQuestions) {
            let subAnswers: Record<string, string> = {};
            try {
              subAnswers = studentAnswer ? JSON.parse(studentAnswer) : {};
            } catch {
              subAnswers = {};
            }

            return (
              <div
                key={q.id}
                className="bg-surface border border-border rounded-lg p-5 shadow-sm"
              >
                <div className="text-xs font-semibold text-accent mb-2">
                  {q.sectionShort} · {q.maxScore}分
                </div>
                <div className="text-sm font-medium mb-4">{q.number}. {q.text}</div>

                {q.subQuestions.map((sq) => {
                  const subScore = exam.grading.scores[sq.id];
                  return (
                    <div
                      key={sq.id}
                      className="ml-4 mb-4 pb-4 border-b border-border-subtle last:border-b-0 last:mb-0 last:pb-0"
                    >
                      <div className="text-[13px] font-medium text-text-secondary mb-2">
                        {sq.text}
                      </div>
                      <div className="text-[13px] text-text-muted bg-surface-2 rounded-md p-3 mb-2 whitespace-pre-wrap">
                        {subAnswers[sq.id] || "(未作答)"}
                      </div>
                      {subScore && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono font-semibold">
                            {subScore.score}/{subScore.maxScore}分
                          </span>
                          {subScore.feedback && (
                            <span className="text-text-faint">
                              — {subScore.feedback}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          }

          return (
            <div
              key={q.id}
              className="bg-surface border border-border rounded-lg p-5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-accent">
                  {q.sectionShort} · {q.maxScore}分
                </span>
                {score && (
                  <span
                    className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${
                      score.correct === true
                        ? "text-[var(--success)] bg-[var(--success-soft)]"
                        : score.correct === false
                        ? "text-[var(--error)] bg-[var(--error-soft)]"
                        : "text-text-muted bg-surface-2"
                    }`}
                  >
                    {score.score}/{score.maxScore}
                  </span>
                )}
              </div>

              <div className="text-sm font-medium mb-3">
                {q.number}. {q.text}
              </div>

              {/* Student answer */}
              {(q.type === "choice" || q.type === "trueFalse") && (
                <div className="text-[13px] mb-1">
                  <span className="text-text-faint">回答：</span>
                  <span
                    className={`font-medium ${
                      score?.correct ? "text-[var(--success)]" : "text-[var(--error)]"
                    }`}
                  >
                    {studentAnswer || "(未作答)"}
                  </span>
                  {ans?.correctAnswer && studentAnswer !== ans.correctAnswer && (
                    <span className="text-text-faint ml-2">
                      正确答案：{ans.correctAnswer}
                    </span>
                  )}
                </div>
              )}

              {q.type === "shortAnswer" && (
                <div>
                  <div className="text-[13px] text-text-muted bg-surface-2 rounded-md p-3 mb-2 whitespace-pre-wrap">
                    {studentAnswer || "(未作答)"}
                  </div>
                  {score?.feedback && (
                    <div className="text-xs text-text-faint">
                      AI 评语：{score.feedback}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
