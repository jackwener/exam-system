"use client";

import { Question } from "@/lib/types";

interface ShortAnswerQuestionProps {
  question: Question;
  answer: string;
  onChange: (answer: string) => void;
}

export default function ShortAnswerQuestion({ question, answer, onChange }: ShortAnswerQuestionProps) {
  // Scenario questions have sub-questions
  if (question.subQuestions && question.subQuestions.length > 0) {
    // Parse answer as JSON object { sc1a: "...", sc1b: "...", sc1c: "..." }
    let subAnswers: Record<string, string> = {};
    try {
      subAnswers = answer ? JSON.parse(answer) : {};
    } catch {
      subAnswers = {};
    }

    const updateSub = (subId: string, value: string) => {
      const updated = { ...subAnswers, [subId]: value };
      onChange(JSON.stringify(updated));
    };

    return (
      <div className="flex flex-col gap-6">
        {question.subQuestions.map((sub) => (
          <div key={sub.id}>
            <div className="text-sm font-medium text-text-secondary mb-2">
              {sub.text}
            </div>
            <textarea
              value={subAnswers[sub.id] || ""}
              onChange={(e) => updateSub(sub.id, e.target.value)}
              placeholder="在此输入你的回答..."
              className="w-full min-h-[120px] px-4 py-3.5 bg-surface border-[1.5px] border-border rounded-lg text-sm text-text leading-relaxed resize-y outline-none transition-all focus:border-accent focus:ring-[3px] focus:ring-accent-soft placeholder:text-text-faint shadow-sm"
            />
          </div>
        ))}
      </div>
    );
  }

  // Simple short answer
  return (
    <div>
      <textarea
        value={answer}
        onChange={(e) => onChange(e.target.value)}
        placeholder="在此输入你的回答..."
        className="w-full min-h-[160px] px-4 py-3.5 bg-surface border-[1.5px] border-border rounded-lg text-sm text-text leading-relaxed resize-y outline-none transition-all focus:border-accent focus:ring-[3px] focus:ring-accent-soft placeholder:text-text-faint shadow-sm"
      />
    </div>
  );
}
