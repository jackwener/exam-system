"use client";

import { Question } from "@/lib/types";

interface TrueFalseQuestionProps {
  // question 字段保留：所有题型组件 props 形状对齐（QuestionCard 统一传入），便于将来扩展（如显示题目元信息）
  question: Question;
  answer: string;
  onChange: (answer: string) => void;
}

export default function TrueFalseQuestion({ answer, onChange }: TrueFalseQuestionProps) {
  const options = [
    { value: "true", label: "✓", desc: "正确" },
    { value: "false", label: "✗", desc: "错误" },
  ];

  return (
    <div className="flex gap-3">
      {options.map((opt) => {
        const selected = answer === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 flex flex-col items-center gap-1 py-5 rounded-lg border-[1.5px] transition-all shadow-sm ${
              selected
                ? "border-accent bg-accent-soft ring-[3px] ring-accent-soft"
                : "border-border bg-surface hover:border-surface-3 hover:bg-surface-2"
            }`}
          >
            <span className={`text-2xl ${selected ? "text-accent" : "text-text-faint"}`}>
              {opt.label}
            </span>
            <span className={`text-xs ${selected ? "text-accent" : "text-text-muted"}`}>
              {opt.desc}
            </span>
          </button>
        );
      })}
    </div>
  );
}
