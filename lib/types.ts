export type QuestionType = "choice" | "multiChoice" | "trueFalse" | "shortAnswer" | "scenario";

export interface QuestionOption {
  label: string; // "A", "B", "C", "D"
  text: string;
}

export interface SubQuestion {
  id: string;
  text: string;
  maxScore: number;
}

export interface Question {
  id: string;
  type: QuestionType;
  section: string; // "一、选择题（每题 3 分，共 39 分）"
  sectionShort: string; // "选择题"
  number: number; // 题号
  text: string;
  options?: QuestionOption[]; // 选择题/判断题
  subQuestions?: SubQuestion[]; // 场景分析题的子问
  maxScore: number;
}

export interface Answer {
  questionId: string;
  correctAnswer?: string; // 客观题标准答案: "B", "true", "false"
  rubric?: string; // 主观题评分标准
}

export interface QuestionScore {
  score: number;
  maxScore: number;
  correct?: boolean;
  feedback?: string;
}

export interface GradingBreakdown {
  choice: { score: number; max: number };
  multiChoice: { score: number; max: number };
  trueFalse: { score: number; max: number };
  shortAnswer: { score: number; max: number };
  // Scenario questions are no longer part of the total score (many students
  // lost sc1 answers to network issues). Field kept optional so historical
  // records in Redis still parse.
  scenario?: { score: number; max: number };
}

export interface Grading {
  status: "pending" | "grading" | "completed";
  scores: Record<string, QuestionScore>;
  totalScore: number;
  breakdown: GradingBreakdown;
}

export interface ExamRecord {
  id: string;
  name: string;
  startedAt: number;
  submittedAt: number | null;
  answers: Record<string, string>;
  grading: Grading;
}
