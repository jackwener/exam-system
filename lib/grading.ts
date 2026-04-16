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
        content: `你是一位 AI Coding Workshop 的考试评分员，专业且宽容。

## 评分原则（重要）
1. **看整体合理性，不死扣关键词**：评分标准只是"参考要点"，不是必须逐字对应。如果考生用不同表述、不同例子、不同角度但表达了相同的核心思想，应当给分。
2. **思路对就给大部分分**：只要考生对核心概念的理解是对的、思路是合理的，即使没有覆盖参考要点的全部维度，也应给到 70%~85% 的分数。
3. **完整且深入再给满分**：覆盖了核心要点，并且表述清晰、有自己的理解或合理扩展，给到 90%~100%。
4. **明显错误或答非所问才扣大分**：核心理解错误、概念混淆、完全偏题，才给低分。
5. **宁宽勿严**：边界情况倾向于给分而非扣分。考试目的是检验理解，不是抓字面错误。

## 题目
${questionText}

## 评分标准（参考要点，非死板对照）
${rubric}

## 满分
${maxScore} 分

## 考生回答
${studentAnswer}

请综合评估考生回答的整体合理性后给分，只返回 JSON 格式（不要 markdown 代码块，不要其他说明文字）：
{"score": <0到${maxScore}的整数>, "feedback": "<评分理由，说明给分依据，50字以内>"}`,
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
