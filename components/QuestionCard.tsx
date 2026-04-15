"use client";

import { Question } from "@/lib/types";
import ChoiceQuestion from "./ChoiceQuestion";
import MultiChoiceQuestion from "./MultiChoiceQuestion";
import TrueFalseQuestion from "./TrueFalseQuestion";
import ShortAnswerQuestion from "./ShortAnswerQuestion";

interface QuestionCardProps {
  question: Question;
  answer: string;
  onChange: (answer: string) => void;
}

export default function QuestionCard({ question, answer, onChange }: QuestionCardProps) {
  return (
    <div>
      <div className="text-xs font-semibold text-accent mb-4 tracking-wide">
        {question.section}
      </div>
      <div className="text-base font-semibold text-text mb-5 leading-relaxed tracking-tight">
        {question.number}. {question.text}
      </div>

      {question.type === "choice" && (
        <ChoiceQuestion question={question} answer={answer} onChange={onChange} />
      )}
      {question.type === "multiChoice" && (
        <MultiChoiceQuestion question={question} answer={answer} onChange={onChange} />
      )}
      {question.type === "trueFalse" && (
        <TrueFalseQuestion question={question} answer={answer} onChange={onChange} />
      )}
      {(question.type === "shortAnswer" || question.type === "scenario") && (
        <ShortAnswerQuestion question={question} answer={answer} onChange={onChange} />
      )}
    </div>
  );
}
