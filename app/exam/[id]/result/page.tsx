"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import ScoreRing from "@/components/ScoreRing";
import { GradingBreakdown } from "@/lib/types";

interface GradingStatus {
  status: "pending" | "grading" | "completed";
  totalScore: number;
  breakdown: GradingBreakdown;
}

export default function ResultPage() {
  const params = useParams();
  const examId = params.id as string;
  const [grading, setGrading] = useState<GradingStatus | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    const poll = async () => {
      try {
        const res = await fetch(`/api/exam/status?id=${examId}`);
        const data = await res.json();
        setGrading(data);

        if (data.status === "completed") {
          clearInterval(timer);
        }
      } catch {
        // retry on next interval
      }
    };

    poll();
    timer = setInterval(poll, 3000);
    return () => clearInterval(timer);
  }, [examId]);

  if (!grading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-text-muted">加载中...</div>
      </div>
    );
  }

  const isGrading = grading.status !== "completed";

  const breakdownRows = [
    { label: "选择题（13 题）", ...grading.breakdown.choice },
    { label: "多选题（5 题）", ...(grading.breakdown.multiChoice ?? { score: 0, max: 20 }) },
    { label: "判断题（10 题）", ...grading.breakdown.trueFalse },
    { label: "简答题（2 题）", ...grading.breakdown.shortAnswer },
  ];

  return (
    <div className="flex-1 flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-[440px] bg-surface border border-border rounded-xl p-10 shadow-lg text-center">
        {isGrading ? (
          <>
            <div className="text-4xl mb-4 animate-spin inline-block">⚙️</div>
            <h2 className="text-lg font-semibold mb-2">AI 正在评分中...</h2>
            <p className="text-sm text-text-muted">
              主观题正在由 AI 评分，请稍等片刻
            </p>
          </>
        ) : (
          <>
            <div className="inline-block text-[13px] font-semibold text-success bg-success-soft px-3.5 py-1 rounded-full mb-6">
              ✓ 评分完成
            </div>

            <ScoreRing score={grading.totalScore} max={100} />
            <div className="font-mono text-sm text-text-faint mb-7">
              / 100 分
            </div>

            <div className="text-left">
              {breakdownRows.map((row) => (
                <div
                  key={row.label}
                  className="flex justify-between items-center py-2.5 border-b border-border-subtle last:border-b-0 text-[13px]"
                >
                  <span className="text-text-muted">{row.label}</span>
                  <span className="font-mono font-semibold text-text">
                    {row.score} / {row.max}
                  </span>
                </div>
              ))}
            </div>

          </>
        )}
      </div>
    </div>
  );
}
