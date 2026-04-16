import Anthropic from "@anthropic-ai/sdk";
import { questions } from "./questions";
import { answers } from "./answers";
import { ExamRecord, Grading, QuestionScore } from "./types";
import { updateGrading } from "./kv";

const anthropic = new Anthropic({
  baseURL: process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com",
});

function gradeMultiChoice(
  studentAnswer: string,
  correctAnswer: string,
  maxScore: number
): QuestionScore {
  const studentSet = new Set(
    studentAnswer
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  const correctSet = new Set(
    correctAnswer
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );

  // Unanswered
  if (studentSet.size === 0) {
    return { score: 0, maxScore, correct: false };
  }

  // Any wrong selection → 0 points
  for (const s of studentSet) {
    if (!correctSet.has(s)) {
      return { score: 0, maxScore, correct: false };
    }
  }

  // All correct answers selected → full score
  const allSelected = [...correctSet].every((c) => studentSet.has(c));
  if (allSelected) {
    return { score: maxScore, maxScore, correct: true };
  }

  // Partial correct (no wrong selections, but missing some) → half score
  return {
    score: Math.floor(maxScore / 2),
    maxScore,
    correct: false,
  };
}

function gradeObjective(
  examAnswers: Record<string, string>
): Record<string, QuestionScore> {
  const scores: Record<string, QuestionScore> = {};

  for (const ans of answers) {
    if (!ans.correctAnswer) continue;

    const q = questions.find((q) => q.id === ans.questionId);
    if (!q) continue;

    const studentAnswer = examAnswers[ans.questionId] || "";

    if (q.type === "multiChoice") {
      scores[ans.questionId] = gradeMultiChoice(
        studentAnswer,
        ans.correctAnswer,
        q.maxScore
      );
    } else {
      const correct = studentAnswer === ans.correctAnswer;
      scores[ans.questionId] = {
        score: correct ? q.maxScore : 0,
        maxScore: q.maxScore,
        correct,
      };
    }
  }

  return scores;
}

// Strip markdown code fence and extract first JSON object from text.
// Models often wrap JSON in ```json ... ``` even when instructed not to.
function extractJson(text: string): string {
  const trimmed = text.trim();
  // Try fenced block first: ```json ... ``` or ``` ... ```
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) return fenceMatch[1].trim();
  // Fallback: first { ... last }
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

async function callGradingApi(
  questionText: string,
  rubric: string,
  maxScore: number,
  studentAnswer: string
): Promise<{ score: number; feedback: string }> {
  const response = await anthropic.messages.create({
    model: "glm-4.7",
    max_tokens: 400,
    temperature: 0,
    messages: [
      {
        role: "user",
        content: `你是一位 AI Coding Workshop 的考试评分员，你的首要原则是**合情合理就给分**。

## 核心原则（最重要）
**只要考生的回答在逻辑上合情合理、理解方向正确，就应该给高分。不要死扣参考答案的字面表述，不要因为"没用到特定词汇"而扣分。**

## 评分梯度（严格遵守）
- **90%~100%（满分或接近）**：核心观点对，论述合理。允许表述不同、角度不同、例子不同。哪怕与参考答案措辞完全不一样，只要表达的意思和参考答案相通，或者考生提出了其他合理的观点，都应给这个档。
- **70%~90%（多数分数）**：理解大体正确，覆盖了大部分要点，可能有局部不完整或个别表述不够精准。这是"合情合理"答案的默认档位。
- **50%~70%**：抓住了问题核心，但论述较浅或覆盖面不足。
- **30%~50%**：部分理解，但有明显偏差或严重遗漏。
- **0%~30%**：严重偏题、概念错误、基本未作答。仅限这种情况。

## 禁止行为
- ❌ 不要因为考生没用到参考答案里的关键词就扣分
- ❌ 不要因为举的例子不同就扣分
- ❌ 不要因为表述顺序不同就扣分
- ❌ 不要因为篇幅短但核心正确就扣分
- ❌ 不要"挑刺"式评分 — 边界情况一律倾向给分

## 扣分举证原则
如果你决定给低于 70% 的分数，**必须**在 feedback 里明确指出考生回答中具体的错误或缺失。如果说不出具体错误点，就应该给 70% 以上。

## 题目
${questionText}

## 评分标准（仅作参考，考生用其他合理方式回答也应给分）
${rubric}

## 满分
${maxScore} 分

## 考生回答
${studentAnswer}

请依据上述原则评分。如果考生回答合情合理，哪怕与参考不完全一致，也应给高分。只返回 JSON（不要 markdown 代码块）：
{"score": <0到${maxScore}的整数>, "feedback": "<评分理由，50字以内>"}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const jsonStr = extractJson(text);
  const parsed = JSON.parse(jsonStr);
  return {
    score: Number(parsed.score),
    feedback: String(parsed.feedback || ""),
  };
}

async function gradeSubjectiveQuestion(
  questionId: string,
  questionText: string,
  rubric: string,
  maxScore: number,
  studentAnswer: string
): Promise<QuestionScore> {
  if (!studentAnswer.trim()) {
    return { score: 0, maxScore, feedback: "未作答" };
  }

  // Retry once on failure — GLM occasionally returns malformed JSON
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await callGradingApi(
        questionText,
        rubric,
        maxScore,
        studentAnswer
      );
      return {
        score: Math.min(Math.max(0, Math.round(result.score)), maxScore),
        maxScore,
        feedback: result.feedback,
      };
    } catch (error) {
      lastError = error;
      console.error(
        `Grading attempt ${attempt} failed for ${questionId}:`,
        error
      );
    }
  }
  console.error(`All grading attempts failed for ${questionId}:`, lastError);
  return { score: 0, maxScore, feedback: "评分失败，请联系管理员" };
}

export async function gradeExam(exam: ExamRecord): Promise<void> {
  const scores: Record<string, QuestionScore> = {};

  // Grade objective questions instantly
  const objectiveScores = gradeObjective(exam.answers);
  Object.assign(scores, objectiveScores);

  // Grade subjective questions concurrently.
  // Answer IDs may be either top-level question IDs (sa1, sa2) or
  // scenario sub-question IDs (sc1a, sc1b, sc1c). For sub-questions we
  // look up the parent scenario and extract the sub-answer from its JSON blob.
  const subjectiveAnswers = answers.filter((a) => a.rubric);
  const subjectiveResults = await Promise.all(
    subjectiveAnswers.map((ans) => {
      // Try top-level question first.
      const topQ = questions.find((q) => q.id === ans.questionId);

      // Otherwise try to find a parent scenario that contains this sub-question.
      const parentQ = topQ
        ? null
        : questions.find((pq) =>
            pq.subQuestions?.some((sq) => sq.id === ans.questionId)
          );
      const subQ = parentQ?.subQuestions?.find(
        (sq) => sq.id === ans.questionId
      );

      if (!topQ && !subQ) {
        console.error(`Question not found for answer ${ans.questionId}`);
        return Promise.resolve({
          questionId: ans.questionId,
          result: {
            score: 0,
            maxScore: 0,
            feedback: "题目未找到",
          } as QuestionScore,
        });
      }

      // Resolve student answer
      let studentAnswer: string;
      if (parentQ && subQ) {
        try {
          const parentAnswer = exam.answers[parentQ.id] || "{}";
          const subAnswers = JSON.parse(parentAnswer);
          studentAnswer = subAnswers[ans.questionId] || "";
        } catch {
          studentAnswer = "";
        }
      } else {
        studentAnswer = exam.answers[ans.questionId] || "";
      }

      // Resolve question text and max score
      const questionText =
        parentQ && subQ ? `${parentQ.text}\n\n${subQ.text}` : topQ!.text;
      const maxScore = subQ ? subQ.maxScore : topQ!.maxScore;

      return gradeSubjectiveQuestion(
        ans.questionId,
        questionText,
        ans.rubric!,
        maxScore,
        studentAnswer
      ).then((result) => ({ questionId: ans.questionId, result }));
    })
  );

  for (const { questionId, result } of subjectiveResults) {
    scores[questionId] = result;
  }

  // Calculate breakdown
  const breakdown = {
    choice: { score: 0, max: 26 },
    multiChoice: { score: 0, max: 20 },
    trueFalse: { score: 0, max: 20 },
    shortAnswer: { score: 0, max: 20 },
    scenario: { score: 0, max: 14 },
  };

  for (const q of questions) {
    if (q.type === "choice" && scores[q.id]) {
      breakdown.choice.score += scores[q.id].score;
    } else if (q.type === "multiChoice" && scores[q.id]) {
      breakdown.multiChoice.score += scores[q.id].score;
    } else if (q.type === "trueFalse" && scores[q.id]) {
      breakdown.trueFalse.score += scores[q.id].score;
    } else if (q.type === "shortAnswer" && scores[q.id]) {
      breakdown.shortAnswer.score += scores[q.id].score;
    } else if (q.type === "scenario") {
      // Scenario scores are in sub-questions
      if (q.subQuestions) {
        for (const sq of q.subQuestions) {
          if (scores[sq.id]) {
            breakdown.scenario.score += scores[sq.id].score;
          }
        }
      }
    }
  }

  const totalScore =
    breakdown.choice.score +
    breakdown.multiChoice.score +
    breakdown.trueFalse.score +
    breakdown.shortAnswer.score +
    breakdown.scenario.score;

  const grading: Grading = {
    status: "completed",
    scores,
    totalScore,
    breakdown,
  };

  await updateGrading(exam.id, grading);
}
