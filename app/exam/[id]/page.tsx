"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { questions, EXAM_CONFIG } from "@/lib/questions";
import ExamTimer from "@/components/ExamTimer";
import QuestionCard from "@/components/QuestionCard";
import { ExamRecord } from "@/lib/types";

export default function ExamPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;

  const [exam, setExam] = useState<ExamRecord | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Load exam record to get answers and timing
  useEffect(() => {
    fetch(`/api/exam/load?id=${examId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          router.push("/exam");
          return;
        }
        setExam(data);
        setAnswers(data.answers || {});
        setLoading(false);

        // If already submitted, go to result
        if (data.submittedAt) {
          router.push(`/exam/${examId}/result`);
        }
      })
      .catch(() => router.push("/exam"));
  }, [examId, router]);

  // Auto-save answer when switching questions
  const saveCurrentAnswer = useCallback(
    async (qId: string, answer: string) => {
      try {
        await fetch("/api/exam/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ examId, questionId: qId, answer }),
        });
      } catch {
        // Silent fail, answer is in local state
      }
    },
    [examId]
  );

  const handleAnswerChange = (answer: string) => {
    const q = questions[currentIndex];
    setAnswers((prev) => ({ ...prev, [q.id]: answer }));
    saveCurrentAnswer(q.id, answer);
  };

  // Arrow keys to navigate between questions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in a text field
      const target = e.target as HTMLElement;
      if (
        target.tagName === "TEXTAREA" ||
        target.tagName === "INPUT" ||
        target.isContentEditable
      ) {
        return;
      }

      // Skip if any modifier key is pressed
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentIndex((i) => Math.min(questions.length - 1, i + 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await fetch("/api/exam/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId }),
      });
      router.push(`/exam/${examId}/result`);
    } catch {
      setSubmitting(false);
    }
  };

  const handleTimeUp = () => {
    handleSubmit();
  };

  if (loading || !exam) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-text-muted">加载中...</div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).filter((k) => answers[k]).length;
  const isLast = currentIndex === questions.length - 1;

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-surface border-b border-border">
        <div className="text-sm font-semibold text-text tracking-tight">
          {EXAM_CONFIG.title}
        </div>
        <div className="text-[13px] text-text-muted">{exam.name}</div>
        <ExamTimer
          startedAt={exam.startedAt}
          duration={EXAM_CONFIG.duration}
          onTimeUp={handleTimeUp}
        />
      </div>

      {/* Progress bar */}
      <div className="h-[3px] bg-surface-2">
        <div
          className="h-[3px] bg-accent transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[720px] mx-auto px-10 py-8">
          <QuestionCard
            question={currentQuestion}
            answer={answers[currentQuestion.id] || ""}
            onChange={handleAnswerChange}
          />
        </div>
      </div>

      {/* Bottom nav */}
      <div className="border-t border-border bg-surface px-6 py-3">
        <div className="max-w-[720px] mx-auto flex items-center justify-between">
          <button
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="px-5 py-2 text-[13px] font-medium text-text-muted bg-surface border border-border rounded-md shadow-sm hover:bg-surface-2 hover:text-text disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            ← 上一题
          </button>

          <div className="flex flex-col items-center">
            <span className="font-mono text-[13px] text-text-faint">
              {currentIndex + 1} / {questions.length}
            </span>
            <span className="text-[10px] text-text-faint mt-0.5">
              提示：← / → 切换题目
            </span>
          </div>

          {isLast ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="px-5 py-2 text-[13px] font-semibold text-white bg-accent rounded-md shadow-[0_1px_3px_rgba(37,99,235,0.3)] hover:bg-accent-hover transition-all"
            >
              提交试卷
            </button>
          ) : (
            <button
              onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
              className="px-5 py-2 text-[13px] font-medium text-white bg-accent rounded-md shadow-[0_1px_3px_rgba(37,99,235,0.3)] hover:bg-accent-hover transition-all"
            >
              下一题 →
            </button>
          )}
        </div>

        {/* Question dots navigation */}
        <div className="max-w-[720px] mx-auto mt-3 flex flex-wrap gap-1 justify-center">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={`w-6 h-6 text-[10px] font-mono rounded transition-all ${
                i === currentIndex
                  ? "bg-accent text-white"
                  : answers[q.id]
                  ? "bg-accent-soft text-accent"
                  : "bg-surface-2 text-text-faint hover:bg-surface-3"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Confirm dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl p-6 max-w-sm mx-4 shadow-xl border border-border">
            <h3 className="text-base font-semibold mb-2">确认提交？</h3>
            <p className="text-sm text-text-muted mb-1">
              已答 {answeredCount} / {questions.length} 题
            </p>
            <p className="text-sm text-text-muted mb-5">
              提交后不可修改，确定要提交吗？
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 text-sm font-medium border border-border rounded-md hover:bg-surface-2 transition-all"
              >
                继续答题
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-2 text-sm font-semibold text-white bg-accent rounded-md hover:bg-accent-hover disabled:opacity-50 transition-all"
              >
                {submitting ? "提交中..." : "确认提交"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
