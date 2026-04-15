"use client";

import { Question } from "@/lib/types";

interface MultiChoiceQuestionProps {
  question: Question;
  answer: string; // comma-separated labels, e.g. "A,C,D"
  onChange: (answer: string) => void;
}

export default function MultiChoiceQuestion({
  question,
  answer,
  onChange,
}: MultiChoiceQuestionProps) {
  const selected = new Set(answer ? answer.split(",") : []);

  const toggle = (label: string) => {
    const next = new Set(selected);
    if (next.has(label)) next.delete(label);
    else next.add(label);
    // Keep alphabetical order
    const sorted = Array.from(next).sort();
    onChange(sorted.join(","));
  };

  return (
    <div>
      <div className="text-xs text-text-faint mb-2">
        💡 多选题（可选多项，全部选对得满分，少选得半分，选错不得分）
      </div>
      <div className="flex flex-col gap-2">
        {question.options?.map((opt) => {
          const isSelected = selected.has(opt.label);
          return (
            <button
              key={opt.label}
              onClick={() => toggle(opt.label)}
              className={`flex items-start gap-3 px-4 py-3.5 rounded-lg border-[1.5px] text-left text-sm leading-relaxed transition-all shadow-sm ${
                isSelected
                  ? "border-accent bg-accent-soft text-text ring-[3px] ring-accent-soft"
                  : "border-border bg-surface text-text-secondary hover:border-surface-3 hover:bg-surface-2"
              }`}
            >
              <span
                className={`flex items-center justify-center w-5 h-5 rounded border-[1.5px] font-mono text-[11px] font-semibold shrink-0 mt-0.5 ${
                  isSelected
                    ? "border-accent bg-accent text-white"
                    : "border-border bg-surface text-text-faint"
                }`}
              >
                {isSelected ? "✓" : opt.label}
              </span>
              <span>{opt.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
