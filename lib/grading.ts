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

  try {
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

请综合评估考生回答的整体合理性后给分，返回 JSON 格式（不要包含其他内容）：
{"score": <0到${maxScore}的整数>, "feedback": "<评分理由，说明给分依据，50字以内>"}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text);

    return {
      score: Math.min(Math.max(0, Math.round(parsed.score)), maxScore),
      maxScore,
      feedback: parsed.feedback || "",
    };
  } catch (error) {
    console.error(`Grading failed for ${questionId}:`, error);
    return { score: 0, maxScore, feedback: "评分失败，请联系管理员" };
  }
}

export async function gradeExam(exam: ExamRecord): Promise<void> {
  const scores: Record<string, QuestionScore> = {};

  // Grade objective questions instantly
  const objectiveScores = gradeObjective(exam.answers);
  Object.assign(scores, objectiveScores);

  // Grade subjective questions concurrently
  const subjectiveAnswers = answers.filter((a) => a.rubric);
  const subjectiveResults = await Promise.all(
    subjectiveAnswers.map((ans) => {
      const q = questions.find((q) => q.id === ans.questionId);
      if (!q) {
        return Promise.resolve({
          questionId: ans.questionId,
          result: { score: 0, maxScore: 0, feedback: "题目未找到" } as QuestionScore,
        });
      }

      // For scenario sub-questions, get the sub-answer from JSON
      let studentAnswer = exam.answers[ans.questionId] || "";

      // If this is a sub-question (sc1a, sc1b, etc.), find parent and extract
      const parentQ = questions.find(
        (pq) =>
          pq.subQuestions?.some((sq) => sq.id === ans.questionId)
      );
      if (parentQ) {
        try {
          const parentAnswer = exam.answers[parentQ.id] || "{}";
          const subAnswers = JSON.parse(parentAnswer);
          studentAnswer = subAnswers[ans.questionId] || "";
        } catch {
          studentAnswer = "";
        }
      }

      const questionText = parentQ
        ? `${parentQ.text}\n\n${parentQ.subQuestions?.find((sq) => sq.id === ans.questionId)?.text || ""}`
        : q.text;

      return gradeSubjectiveQuestion(
        ans.questionId,
        questionText,
        ans.rubric!,
        q.maxScore,
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
    shortAnswer: { score: 0, max: 10 },
    scenario: { score: 0, max: 24 },
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
