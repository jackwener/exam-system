"use client";

import { Question } from "@/lib/types";

interface ChoiceQuestionProps {
  question: Question;
  answer: string;
  onChange: (answer: string) => void;
}

export default function ChoiceQuestion({ question, answer, onChange }: ChoiceQuestionProps) {
  return (
    <div className="flex flex-col gap-2">
      {question.options?.map((opt) => {
        const selected = answer === opt.label;
        return (
          <button
            key={opt.label}
            onClick={() => onChange(opt.label)}
            className={`flex items-start gap-3 px-4 py-3.5 rounded-lg border-[1.5px] text-left text-sm leading-relaxed transition-all shadow-sm ${
              selected
                ? "border-accent bg-accent-soft text-text ring-[3px] ring-accent-soft"
                : "border-border bg-surface text-text-secondary hover:border-surface-3 hover:bg-surface-2"
            }`}
          >
            <span
              className={`font-mono text-xs font-semibold min-w-[20px] pt-0.5 ${
                selected ? "text-accent" : "text-text-faint"
              }`}
            >
              {opt.label}
            </span>
            <span>{opt.text}</span>
          </button>
        );
      })}
    </div>
  );
}
