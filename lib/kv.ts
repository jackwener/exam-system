import { Redis } from "@upstash/redis";
import { nanoid } from "nanoid";
import { ExamRecord, Grading } from "./types";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

const EXAM_PREFIX = "exam:";
const INDEX_KEY = "exam:index";

export async function createExam(name: string): Promise<ExamRecord> {
  // Check for duplicate name
  const existing = await listExams();
  const duplicate = existing.find(
    (e) => e.name === name && e.submittedAt !== null
  );
  if (duplicate) {
    throw new Error(`姓名 "${name}" 已经参加过考试`);
  }

  const id = nanoid(10);
  const record: ExamRecord = {
    id,
    name,
    startedAt: Date.now(),
    submittedAt: null,
    answers: {},
    grading: {
      status: "pending",
      scores: {},
      totalScore: 0,
      breakdown: {
        choice: { score: 0, max: 39 },
        trueFalse: { score: 0, max: 20 },
        shortAnswer: { score: 0, max: 16 },
        scenario: { score: 0, max: 25 },
      },
    },
  };

  await redis.set(`${EXAM_PREFIX}${id}`, record);

  // Add to index
  const index = (await redis.get<string[]>(INDEX_KEY)) || [];
  index.push(id);
  await redis.set(INDEX_KEY, index);

  return record;
}

export async function getExam(id: string): Promise<ExamRecord | null> {
  return redis.get<ExamRecord>(`${EXAM_PREFIX}${id}`);
}

export async function saveAnswer(
  id: string,
  questionId: string,
  answer: string
): Promise<void> {
  const exam = await getExam(id);
  if (!exam) throw new Error("考试不存在");
  if (exam.submittedAt) throw new Error("考试已提交，无法修改");

  exam.answers[questionId] = answer;
  await redis.set(`${EXAM_PREFIX}${id}`, exam);
}

export async function submitExam(id: string): Promise<ExamRecord> {
  const exam = await getExam(id);
  if (!exam) throw new Error("考试不存在");
  if (exam.submittedAt) throw new Error("考试已提交");

  exam.submittedAt = Date.now();
  exam.grading.status = "grading";
  await redis.set(`${EXAM_PREFIX}${id}`, exam);
  return exam;
}

export async function updateGrading(
  id: string,
  grading: Grading
): Promise<void> {
  const exam = await getExam(id);
  if (!exam) throw new Error("考试不存在");

  exam.grading = grading;
  await redis.set(`${EXAM_PREFIX}${id}`, exam);
}

export async function listExams(): Promise<ExamRecord[]> {
  const index = (await redis.get<string[]>(INDEX_KEY)) || [];
  const exams = await Promise.all(
    index.map((id) => getExam(id))
  );
  return exams.filter((e): e is ExamRecord => e !== null);
}

export async function clearAllExams(): Promise<number> {
  const index = (await redis.get<string[]>(INDEX_KEY)) || [];
  if (index.length === 0) return 0;

  // Delete all exam records
  await Promise.all(
    index.map((id) => redis.del(`${EXAM_PREFIX}${id}`))
  );

  // Clear the index
  await redis.del(INDEX_KEY);

  return index.length;
}
